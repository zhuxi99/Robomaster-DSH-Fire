/**
 * sanitize-settings.mjs — 把本机 ~/.dsh/settings.yaml 脱敏生成 settings.yaml.template
 *
 * 用法（在仓库根目录）：
 *   node sanitize-settings.mjs
 *
 * 处理：
 *   1. 敏感字段（apiKey / apiKeyEnv / token / secret / password / credential …）的
 *      「同一行的值」→ <FILL-IN>；键名、缩进、注释、其余字段一律原样保留
 *   2. /home/zhuxi 等本机绝对路径 → "%USERPROFILE%"（带引号，避免 YAML 指令字符错误）
 *   3. 输出到 settings.yaml.template（不会修改原文件），并对产物做严格 YAML 断言
 *
 * 设计原则（v2，修复 fastaitoken 事故）：
 *   - 逐行处理，正则绝不跨行：`\s` 含 \n，跨行匹配会把下一行的 `displayName: x`
 *     整体吃掉并替换成裸标量 `<FILL-IN>`，正是 line 818 崩溃的根因
 *   - 键名「完全匹配」白名单，不做子串匹配：`fastaitoken` 不再因为含 token 被命中
 *   - 只有「同行存在非空值」才替换；键的值为空（父级 mapping / 块标量）时不动，
 *     块标量整块替换为单行占位
 *   - 生成后立即用 validate-settings.mjs 严格校验，不合法直接非零退出、不落盘
 *
 * 注意：本脚本不打印任何敏感值，只输出替换统计与键名。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import {
  SENSITIVE_KEYS,
  lintText,
  lintDocument,
  matchKeyLine,
  CREDENTIAL_REF_RE,
} from './validate-settings.mjs'

const SRC = process.argv[2] ? String(process.argv[2]) : join(homedir(), '.dsh', 'settings.yaml')
const OUT = process.argv[3] ? String(process.argv[3]) : join(process.cwd(), 'settings.yaml.template')
const PLACEHOLDER = '<FILL-IN>'

/**
 * 分发用的默认模型（归一化，避免跟随源机漂移）。
 * 必须选队友也能自行申请到凭据的站点；改这里就能改全队默认。
 */
const DEFAULT_PROVIDER = 'o10'
const DEFAULT_MODEL = 'gemini-3.7-flash'
const DEFAULT_EFFORT = 'high'

let content
try {
  content = readFileSync(SRC, 'utf8')
} catch {
  console.error(`无法读取 ${SRC}`)
  process.exit(1)
}

const before = content.length
const eol = content.includes('\r\n') ? '\r\n' : '\n'
const lines = content.split(/\r?\n/)

const stats = {
  redacted: 0,
  blockRedacted: 0,
  paths: 0,
  skippedEmpty: [],
  keysHit: new Map(),
  suspectRefs: [],
}

/** 把值切成 [value, comment]；不解析引号内的 #，宁可保守不动注释 */
function splitComment(rest) {
  const trimmedStart = rest.replace(/^[ \t]*/, '')
  if (!trimmedStart) return { value: '', comment: '' }
  let inSingle = false
  let inDouble = false
  for (let i = 0; i < rest.length; i++) {
    const c = rest[i]
    if (c === "'" && !inDouble) inSingle = !inSingle
    else if (c === '"' && !inSingle) inDouble = !inDouble
    else if (c === '#' && !inSingle && !inDouble && (i === 0 || /[ \t]/.test(rest[i - 1]))) {
      return { value: rest.slice(0, i).trim(), comment: rest.slice(i) }
    }
  }
  return { value: rest.trim(), comment: '' }
}

const isSensitive = (key) => SENSITIVE_KEYS.has(String(key).toLowerCase())

const out = []
for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  const kv = matchKeyLine(line)

  // apiKeyEnv 是「凭据槽位名」而非密钥（真密钥在 .credentials.yaml，已被 gitignore），
  // 必须原样保留，否则 DSH 会在 host-boot 抛 credential ref 错误。
  // 但要防一手：万一有人把真密钥直接写进这个字段，不能就这么发出去。
  if (kv && kv.key.toLowerCase() === 'apikeyenv') {
    const v = splitComment(kv.rest).value.replace(/^["']|["']$/g, '')
    if (v && !CREDENTIAL_REF_RE.test(v)) {
      stats.suspectRefs.push({ line: i + 1, key: kv.key })
    }
    out.push(line)
    continue
  }

  if (!kv || !isSensitive(kv.key)) {
    out.push(line)
    continue
  }

  const { value, comment } = splitComment(kv.rest)
  // 注意：kv.rest 是冒号之后的全部内容（含前导空格），所以 head 以 ':' 结尾。
  // 必须显式补回一个空格，否则会产出 `apiKeyEnv:<FILL-IN>`（YAML 要求 ': ' 分隔）。
  const head = `${line.slice(0, line.length - kv.rest.length)} `
  const tail = comment ? ` ${comment.trim()}` : ''

  // 块标量（| / > 及其修饰符）：整块替换成单行占位
  const block = /^[|>][+-]?\d*$/.exec(value)
  if (block) {
    const ownIndent = kv.indent.length + kv.dash.length
    out.push(`${head}${PLACEHOLDER}${tail}`)
    let j = i + 1
    while (j < lines.length) {
      const nxt = lines[j]
      if (nxt.trim() === '') { j++; continue }
      if ((/^[ ]*/.exec(nxt)?.[0].length ?? 0) > ownIndent) { j++; continue }
      break
    }
    i = j - 1
    stats.blockRedacted++
    stats.keysHit.set(kv.key, (stats.keysHit.get(kv.key) ?? 0) + 1)
    continue
  }

  // 值为空：这是父级 mapping 或空配置，替换会造出裸标量 —— 绝不触碰
  if (value === '') {
    out.push(line)
    stats.skippedEmpty.push(`${i + 1}:${kv.key}`)
    continue
  }

  if (value === PLACEHOLDER) {
    out.push(line)
    continue
  }

  out.push(`${head}${PLACEHOLDER}${tail}`)
  stats.redacted++
  stats.keysHit.set(kv.key, (stats.keysHit.get(kv.key) ?? 0) + 1)
}

let result = out.join(eol)

// 2. 本机绝对路径 → "%USERPROFILE%"（必须带引号：YAML 里裸 % 开头是保留指令字符）
const homePath = homedir().replace(/\\/g, '/')
const reHome = new RegExp(homePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
stats.paths = (result.match(reHome) || []).length
if (stats.paths > 0) {
  result = result
    .split(eol)
    .map((line) => {
      if (!reHome.test(line)) return line
      reHome.lastIndex = 0
      const kv = matchKeyLine(line)
      if (!kv) return line.replace(reHome, '%USERPROFILE%')
      const { value, comment } = splitComment(kv.rest)
      if (!value) return line
      const head = line.slice(0, line.length - kv.rest.length)
      const replaced = value.replace(reHome, '%USERPROFILE%')
      const quoted = /^["']/.test(replaced) ? replaced : JSON.stringify(replaced)
      return `${head}${quoted}${comment ? ` ${comment.trim()}` : ''}`
    })
    .join(eol)
}

// 2.5 归一化默认模型：源机换模型时不该让队友的默认模型跟着漂移
//     队友拿不到源机私有 provider 的凭据，默认模型必须指向一个大家都配得起的站点
const DEFAULT_MODEL_BLOCK = [
  'agent-default-model:',
  `  provider: ${DEFAULT_PROVIDER}`,
  `  model: "${DEFAULT_MODEL}"`,
  `  reasoningEffort: ${DEFAULT_EFFORT}`,
].join(eol)

{
  const rl = result.split(eol)
  const start = rl.findIndex((l) => l === 'agent-default-model:')
  if (start !== -1) {
    let end = start + 1
    while (end < rl.length && /^[ \t]/.test(rl[end])) end++
    const before = rl.slice(start, end).join(eol)
    if (before !== DEFAULT_MODEL_BLOCK) {
      rl.splice(start, end - start, ...DEFAULT_MODEL_BLOCK.split(eol))
      result = rl.join(eol)
      stats.defaultModelPinned = true
    }
  }
}

// 3. 落盘前自检：文本层 + 严格 YAML 文档层，任一失败都不写文件
const textLint = lintText(result)
const docLint = await lintDocument(result)
const errors = [...textLint.errors, ...docLint.errors]

const srcProviders = (await lintDocument(content)).providerCount ?? null
const outProviders = docLint.providerCount ?? null
if (srcProviders != null && outProviders != null && srcProviders !== outProviders) {
  errors.push(`E200 provider 数量不一致：源 ${srcProviders} → 模板 ${outProviders}（脱敏吞掉了结构）`)
}
if (lines.length !== result.split(eol).length + stats.blockRedacted * 0) {
  // 行数变化只允许来自块标量折叠
  const delta = lines.length - result.split(eol).length
  if (delta !== 0 && stats.blockRedacted === 0) {
    errors.push(`E201 行数发生非预期变化（${lines.length} → ${result.split(eol).length}）`)
  }
}

for (const r of stats.suspectRefs) {
  errors.push(
    `E007 第 ${r.line} 行：${r.key} 的值不是合法凭据槽位名。` +
      '该字段只应写槽位名（如 FOO_API_KEY）；若这里放的是真密钥，' +
      '请先移到 ~/.dsh/.credentials.yaml 再重新生成模板',
  )
}

if (errors.length) {
  console.error('❌ 脱敏产物未通过校验，已中止写入（原文件与旧模板均未改动）：')
  for (const e of errors) console.error(`   ${e}`)
  process.exit(1)
}

writeFileSync(OUT, result)

console.log(`✅ 已生成 ${OUT}`)
console.log(`   - 替换敏感字段: ${stats.redacted} 处（块标量 ${stats.blockRedacted} 处）`)
console.log(`   - 命中键名: ${[...stats.keysHit.entries()].map(([k, n]) => `${k}×${n}`).join(', ') || '无'}`)
console.log(`   - 路径占位替换: ${stats.paths} 处`)
console.log(`   - provider 数: ${srcProviders ?? '?'} → ${outProviders ?? '?'}`)
console.log(`   - 大小: ${before} B → ${result.length} B`)
console.log(`   - 校验: ${docLint.available ? '严格 YAML 解析通过' : '文本层通过（未找到 yaml 模块）'}`)
for (const w of [...textLint.warnings, ...docLint.warnings]) console.warn(`   ⚠️  ${w}`)
if (stats.skippedEmpty.length) {
  console.warn(`   ⚠️  以下敏感键值为空、已跳过（父级 mapping 或空配置）: ${stats.skippedEmpty.join(', ')}`)
}
console.log('⚠️  请人工检查 template 中没有残留本机信息后再上传 GitHub')
