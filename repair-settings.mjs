#!/usr/bin/env node
/**
 * repair-settings.mjs — 原地修复被脱敏脚本损坏的 settings.yaml，保留已填写的真实密钥
 *
 * 用法：
 *   node repair-settings.mjs                       # 修复 ~/.dsh/settings.yaml
 *   node repair-settings.mjs <path>                # 修复指定文件
 *   node repair-settings.mjs <path> --dry-run      # 只看会怎么改，不写文件
 *
 * 退出码：0 = 已修复或本来就健康；1 = 无法自动修复（需人工处理）
 *
 * 为什么需要它：
 *   install.ps1 早期做法是"检测到损坏就用模板覆盖"，那会把队友已经填好的
 *   68 个 provider 的真实 apiKey 全部冲掉。本脚本只动损坏的那几行。
 *
 * 修复规则（只处理脱敏事故造成的两种损坏形态）：
 *   R1 裸标量 <FILL-IN>（无 key 的孤立行）
 *      上一行是 `  <provider-id>:` 时 → 还原成 `  displayName: <provider-id>`
 *      （事故正是把 `displayName: xxx` 整行吞成裸标量，provider id 就是原值）
 *      否则 → 删除该行（无法重建内容时，丢一个可选字段也比整个文件解析失败好）
 *   R2 数值字段被替换成占位符（maxTokens / contextWindow: <FILL-IN>）
 *      → 删除该行，让 DSH 回落到该 provider 的默认值
 *
 * 不碰任何已填写的值：apiKey / apiKeyEnv 一律原样保留，无论是密钥还是 <FILL-IN>。
 */
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { lintText, lintDocument, matchKeyLine, CREDENTIAL_REF_RE } from './validate-settings.mjs'

const PLACEHOLDER_RE = /^<FILL[-_]?IN>$/i
const NUMERIC_KEYS = new Set(['maxtokens', 'contextwindow'])

/** provider id → 凭据槽位名，沿用本仓库 <PROVIDER_ID>_API_KEY 约定 */
function slotNameFor(providerId) {
  const base = String(providerId)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const safe = /^[A-Z_]/.test(base) ? base : `P_${base}`
  return `${safe}_API_KEY`
}

/** 在已输出的行里向上找缩进更小的那个父键（即 provider id） */
function findEnclosingKey(emitted, ownIndent) {
  for (let i = emitted.length - 1; i >= 0; i--) {
    const l = emitted[i]
    if (!l.trim() || l.trim().startsWith('#')) continue
    const kv = matchKeyLine(l)
    if (!kv) continue
    const indent = (/^[ ]*/.exec(l)?.[0].length ?? 0) + kv.dash.length
    if (indent < ownIndent && kv.rest.trim() === '') return kv.key
  }
  return null
}

/** 返回 { text, fixes }：修复后的文本与逐条修复说明 */
export function repairText(input) {
  const eol = input.includes('\r\n') ? '\r\n' : '\n'
  const lines = input.split(/\r?\n/)
  const out = []
  const fixes = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // R1：无 key 的裸占位标量
    if (PLACEHOLDER_RE.test(trimmed)) {
      const indent = /^[ ]*/.exec(line)?.[0] ?? ''
      // 往上找最近的非空行，判断它是不是一个 mapping 父键
      let p = out.length - 1
      while (p >= 0 && out[p].trim() === '') p--
      const prev = p >= 0 ? out[p] : ''
      const prevKv = matchKeyLine(prev)
      const prevIsParent =
        prevKv &&
        prevKv.rest.trim() === '' &&
        (/^[ ]*/.exec(prev)?.[0].length ?? 0) < indent.length

      if (prevIsParent) {
        out.push(`${indent}displayName: ${prevKv.key}`)
        fixes.push(`第 ${i + 1} 行：裸占位标量 → displayName: ${prevKv.key}（还原被吞掉的字段）`)
      } else {
        fixes.push(`第 ${i + 1} 行：裸占位标量 → 已删除（无法重建原字段）`)
      }
      continue
    }

    // R2：数值字段被写成占位符
    const kv = matchKeyLine(line)
    if (kv && NUMERIC_KEYS.has(kv.key.toLowerCase()) && PLACEHOLDER_RE.test(kv.rest.trim())) {
      fixes.push(`第 ${i + 1} 行：${kv.key} 是数值字段却被写成占位符 → 已删除，回落到默认值`)
      continue
    }

    // R3：apiKeyEnv 是「凭据槽位名」而非密钥，被误脱敏成占位符会让 DSH 在
    //     host-boot 抛 credential ref 错误、全部 provider 失效。按 provider id
    //     还原成 <PROVIDER_ID>_API_KEY 约定（真密钥仍在 .credentials.yaml，不受影响）。
    if (kv && kv.key.toLowerCase() === 'apikeyenv' && !CREDENTIAL_REF_RE.test(kv.rest.trim())) {
      const ownIndent = (/^[ ]*/.exec(line)?.[0].length ?? 0) + kv.dash.length
      const providerId = findEnclosingKey(out, ownIndent)
      if (providerId) {
        const slot = slotNameFor(providerId)
        const head = line.slice(0, line.length - kv.rest.length)
        out.push(`${head} ${slot}`)
        fixes.push(`第 ${i + 1} 行：apiKeyEnv 是凭据槽位名不是密钥 → 还原为 ${slot}`)
        continue
      }
      fixes.push(`第 ${i + 1} 行：apiKeyEnv 值非法且无法定位 provider → 已删除该行`)
      continue
    }

    out.push(line)
  }

  return { text: out.join(eol), fixes }
}

async function main(argv) {
  const dryRun = argv.includes('--dry-run')
  const positional = argv.filter((a) => !a.startsWith('--'))
  const file = positional.length ? resolve(positional[0]) : join(homedir(), '.dsh', 'settings.yaml')

  let original
  try {
    original = readFileSync(file, 'utf8')
  } catch (e) {
    console.error(`❌ 无法读取 ${file}：${e.message}`)
    process.exit(1)
  }

  // 已经健康就不动它
  const pre = await lintDocument(original)
  const preText = lintText(original)
  if (pre.errors.length === 0 && preText.errors.length === 0) {
    console.log(`✅ ${file} 语法健康，无需修复${pre.providerCount != null ? `（providers=${pre.providerCount}）` : ''}`)
    process.exit(0)
  }

  console.log(`检测到 ${file} 存在语法问题：`)
  for (const e of [...preText.errors, ...pre.errors]) console.log(`   ${e}`)

  const { text: repaired, fixes } = repairText(original)
  if (!fixes.length) {
    console.error('\n❌ 损坏形态不属于已知的脱敏事故，无法自动修复。')
    console.error('   请用 settings.yaml.template 手工比对，或备份后覆盖为模板重新填写密钥。')
    process.exit(1)
  }

  console.log('\n拟修复：')
  for (const f of fixes) console.log(`   ${f}`)

  const postText = lintText(repaired)
  const post = await lintDocument(repaired)
  const errors = [...postText.errors, ...post.errors]
  if (errors.length) {
    console.error('\n❌ 修复后仍不合法，未写入任何改动：')
    for (const e of errors) console.error(`   ${e}`)
    process.exit(1)
  }

  if (dryRun) {
    console.log('\n（--dry-run）校验通过，但未写入文件。')
    process.exit(0)
  }

  const backup = `${file}.bak-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}`
  copyFileSync(file, backup)
  writeFileSync(file, repaired)

  console.log(`\n✅ 已修复 ${file}`)
  console.log(`   备份: ${backup}`)
  console.log(`   已填写的 apiKey / apiKeyEnv 全部原样保留${post.providerCount != null ? `，providers=${post.providerCount}` : ''}`)
  process.exit(0)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await main(process.argv.slice(2))
}
