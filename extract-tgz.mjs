#!/usr/bin/env node
// extract-tgz.mjs —— 纯 Node 实现的 npm tarball 解包器（离线兜底用）
//
// 用途：install.ps1 在 pnpm install 之后自检离线 .tgz 插件是否真的落到
// node_modules 里；若缺失就调用本脚本直接解包，不依赖 Windows 的 tar.exe，
// 也不依赖 pnpm 是否愿意重新处理 file: 依赖。
//
//   node extract-tgz.mjs <package.tgz> <destDir>
//
// npm 打出的 tarball 内所有路径都带一层 `package/` 前缀，解包时统一去掉
// （等价于 tar --strip-components=1）。

import { gunzipSync } from 'node:zlib';
import { readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const BLOCK = 512;

function fail(msg) {
  console.error(`extract-tgz: ${msg}`);
  process.exit(1);
}

/** 读取以 NUL 结尾的定长字段 */
function str(buf, off, len) {
  let end = off;
  const limit = off + len;
  while (end < limit && buf[end] !== 0) end++;
  return buf.toString('utf8', off, end);
}

/** 读取八进制数字字段（兼容 GNU base-256 大数编码） */
function octal(buf, off, len) {
  if (buf[off] & 0x80) {
    // base-256：首字节最高位为 1，其余为大端补码
    let value = 0n;
    for (let i = off + 1; i < off + len; i++) value = (value << 8n) | BigInt(buf[i]);
    return Number(value);
  }
  const text = str(buf, off, len).trim();
  if (!text) return 0;
  const parsed = parseInt(text, 8);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** 去掉首层目录，并阻断 ../ 越界写入 */
function stripFirstComponent(name) {
  const normalized = name.replace(/\\/g, '/').replace(/\/+$/, '');
  const parts = normalized.split('/').filter((p) => p && p !== '.');
  if (parts.some((p) => p === '..')) return null;
  parts.shift();
  return parts.length ? parts.join('/') : null;
}

function parse(tar) {
  const entries = [];
  let offset = 0;
  let pendingName = null; // 来自 pax / GNU longname 的覆盖名

  while (offset + BLOCK <= tar.length) {
    const header = tar.subarray(offset, offset + BLOCK);
    // 连续两个全 0 块表示归档结束
    if (header.every((b) => b === 0)) break;

    const rawName = str(header, 0, 100);
    const prefix = str(header, 345, 155);
    const size = octal(header, 124, 12);
    const type = String.fromCharCode(header[156] || 0x30);
    const dataOffset = offset + BLOCK;
    const padded = Math.ceil(size / BLOCK) * BLOCK;

    let name = prefix ? `${prefix}/${rawName}` : rawName;
    if (pendingName) {
      name = pendingName;
      pendingName = null;
    }

    if (type === 'x' || type === 'g') {
      // pax 扩展头：从中取 path=
      const body = tar.toString('utf8', dataOffset, dataOffset + size);
      const match = /(?:^|\n)\d+ path=([^\n]+)/.exec(body);
      if (match) pendingName = match[1];
    } else if (type === 'L') {
      // GNU longname
      pendingName = str(tar, dataOffset, size);
    } else if (type === '0' || type === '\0' || type === '7') {
      entries.push({ kind: 'file', name, data: tar.subarray(dataOffset, dataOffset + size) });
    } else if (type === '5') {
      entries.push({ kind: 'dir', name });
    }
    // 其余类型（链接、设备等）npm 包里不会出现，忽略

    offset = dataOffset + padded;
  }
  return entries;
}

const [tgzArg, destArg] = process.argv.slice(2);
if (!tgzArg || !destArg) fail('用法：node extract-tgz.mjs <package.tgz> <destDir>');

const tgzPath = path.resolve(tgzArg);
const destDir = path.resolve(destArg);

let tar;
try {
  tar = gunzipSync(readFileSync(tgzPath));
} catch (err) {
  fail(`无法读取或解压 ${tgzPath}：${err.message}`);
}

const entries = parse(tar);
if (!entries.some((e) => e.kind === 'file')) fail(`归档内没有文件：${tgzPath}`);

// 目标目录整体重建，避免旧的符号链接/残留文件混在里面
try {
  rmSync(destDir, { recursive: true, force: true });
} catch {
  /* 目录被占用时继续尝试写入 */
}
mkdirSync(destDir, { recursive: true });

let fileCount = 0;
for (const entry of entries) {
  const rel = stripFirstComponent(entry.name);
  if (!rel) continue;
  const target = path.join(destDir, rel);
  if (!target.startsWith(destDir + path.sep)) continue; // 越界保护
  if (entry.kind === 'dir') {
    mkdirSync(target, { recursive: true });
    continue;
  }
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, entry.data);
  fileCount++;
}

console.log(`extract-tgz: ${path.basename(tgzPath)} -> ${destDir}（${fileCount} 个文件）`);
