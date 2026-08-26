#!/usr/bin/env node
/**
 * validate-settings.mjs — settings.yaml / settings.yaml.template 语法与脱敏校验器
 *
 * 用法：
 *   node validate-settings.mjs                        # 校验 ~/.dsh/settings.yaml
 *   node validate-settings.mjs settings.yaml.template # 校验指定文件
 *   node validate-settings.mjs a.yaml b.yaml          # 批量校验
 *
 * 退出码：0 = 全部通过；1 = 存在错误（调用方应视为构建失败 / 触发自愈）
 *
 * 两层校验：
 *   1. 文本层（零依赖，任何机器都能跑）：裸标量、未加引号的 % 开头值、Tab 缩进、
 *      占位符落在非敏感键上（旧脱敏脚本 maxTokens: <FILL-IN> 类事故）
 *   2. 文档层（能找到 yaml 模块时）：真正的 yaml.parseDocument 严格解析 +
 *      占位符键白名单 + 数值字段类型断言
 *
 * 本脚本不打印任何字段值，只打印键名、行号和规则编号。
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const PLACEHOLDER = '<FILL-IN>'

/**
 * 允许出现 <FILL-IN> 的键名（小写比较）。脱敏脚本与校验器共用同一份白名单。
 *
 * 注意 apiKeyEnv **不在**此列表：它不是密钥，而是「凭据槽位名」（credential-ref），
 * 真密钥存在 ~/.dsh/.credentials.yaml（已被 .gitignore 排除）。DSH 会用
 * /^[A-Za-z_][A-Za-z0-9_]*$/ 校验它，写成 <FILL-IN> 会导致 llm-pi-ai 启动即抛
 * `credential ref "<FILL-IN>" must match ...`，所有 provider 全部不可用。
 */
export const SENSITIVE_KEYS = new Set([
  'apikey',
  'api_key',
  'apisecret',
  'api_secret',
  'token',
  'accesstoken',
  'authtoken',
  'refreshtoken',
  'sessiontoken',
  'secret',
  'clientsecret',
  'password',
  'passwd',
  'credential',
  'credentials',
  'cookie',
  'bearer',
  'storagestatepath',
])

/** 必须是数字的键名，防止占位符或字符串污染 */
const NUMERIC_KEYS = new Set(['contextwindow', 'maxtokens'])

/**
 * 必须是合法「凭据槽位名」的键。DSH 的 dsh-credentials 用同一条正则校验，
 * 不合法会在 host-boot 阶段抛 TypeError 并让整个 llm-pi-ai provider 表失效。
 */
const CREDENTIAL_REF_KEYS = new Set(['apikeyenv'])
export const CREDENTIAL_REF_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

const KEY_LINE_RE = /^([ \t]*)(-[ \t]+)?(["']?)([A-Za-z0-9_.\-/]+)\3[ \t]*:(.*)$/

/** 解析一行，返回 { indent, dash, key, rest } 或 null */
export function matchKeyLine(line) {
  const m = KEY_LINE_RE.exec(line)
  if (!m) return null
  return { indent: m[1], dash: m[2] || '', key: m[4], rest: m[5] }
}

export function isSensitiveKey(key) {
  return SENSITIVE_KEYS.has(String(key).toLowerCase())
}

/** 文本层校验：零依赖，返回 { errors, warnings } */
export function lintText(text) {
  const errors = []
  const warnings = []
  const lines = text.split(/\r?\n/)

  lines.forEach((line, i) => {
    const no = i + 1
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return

    if (trimmed === PLACEHOLDER || /^<FILL[-_]?IN>$/i.test(trimmed)) {
      errors.push(`E001 第 ${no} 行：无 key 的裸占位标量（会触发 "Implicit keys need to be on a single line"）`)
      return
    }
    if (/^\t/.test(line) || /^ *\t/.test(line)) {
      errors.push(`E002 第 ${no} 行：使用了 Tab 缩进，YAML 不允许`)
    }

    const kv = matchKeyLine(line)
    const rest = kv ? kv.rest.trim() : null

    // 未加引号且以 % 开头的值（%USERPROFILE% 占位替换的经典事故）
    const bareValue = kv ? rest : /^-[ \t]+(.*)$/.exec(trimmed)?.[1]?.trim()
    if (bareValue && /^%/.test(bareValue)) {
      errors.push(`E003 第 ${no} 行：值以 % 开头且未加引号（YAML 保留指令字符），应写成 "..." 形式`)
    }

    if (kv && rest === PLACEHOLDER && !isSensitiveKey(kv.key)) {
      errors.push(`E004 第 ${no} 行：占位符落在非敏感键 ${kv.key} 上（脱敏规则误伤）`)
    }
    if (kv && NUMERIC_KEYS.has(kv.key.toLowerCase()) && rest && !/^-?\d+$/.test(rest)) {
      errors.push(`E005 第 ${no} 行：${kv.key} 必须是整数`)
    }
    // 凭据槽位名必须是合法标识符。写成 <FILL-IN> 会让 DSH 在 host-boot 阶段抛
    // `credential ref "<FILL-IN>" must match ...`，整张 provider 表随之失效。
    if (kv && CREDENTIAL_REF_KEYS.has(kv.key.toLowerCase()) && rest) {
      const unquoted = rest.replace(/^["']|["']$/g, '')
      if (!CREDENTIAL_REF_RE.test(unquoted)) {
        errors.push(
          `E006 第 ${no} 行：${kv.key} 必须是合法凭据槽位名（${CREDENTIAL_REF_RE.source}）；` +
            `它不是密钥、不该被脱敏，真密钥存在 .credentials.yaml`,
        )
      }
    }
    if (kv && isSensitiveKey(kv.key) && rest === '') {
      const next = lines[i + 1] ?? ''
      const nextIndent = /^[ ]*/.exec(next)?.[0].length ?? 0
      const ownIndent = kv.indent.length + kv.dash.length
      if (next.trim() && nextIndent <= ownIndent) {
        warnings.push(`W001 第 ${no} 行：敏感键 ${kv.key} 值为空`)
      }
    }
  })

  if (text.includes('\r\n') && /(?<!\r)\n/.test(text)) {
    warnings.push('W002 文件混用 CRLF 与 LF 换行')
  }
  return { errors, warnings }
}

/** 尝试加载 yaml 模块（本地 / DSH profile / 开发 checkout），失败返回 null */
export async function loadYamlModule() {
  try {
    return await import('yaml')
  } catch {}
  const bases = [
    process.cwd(),
    join(homedir(), '.dsh', 'profiles', 'desktop'),
    join(homedir(), 'deepseek-harness-desktop', 'dsh-plugin-desktop'),
  ]
  for (const base of bases) {
    try {
      const req = createRequire(join(base, '__resolve__.cjs'))
      const entry = req.resolve('yaml')
      const mod = await import(pathToFileURL(entry).href)
      return mod?.default ?? mod
    } catch {}
  }
  return null
}

function walk(node, path, visit) {
  if (node === null || typeof node !== 'object') {
    visit(path, node)
    return
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, [...path, String(i)], visit))
    return
  }
  for (const [k, v] of Object.entries(node)) walk(v, [...path, k], visit)
}

/** 文档层校验：需要 yaml 模块 */
export async function lintDocument(text) {
  const YAML = await loadYamlModule()
  if (!YAML) return { available: false, errors: [], warnings: ['W003 未找到 yaml 模块，已跳过严格解析（仅文本层校验）'] }

  const errors = []
  const warnings = []
  const doc = YAML.parseDocument(text, { prettyErrors: true, strict: true })
  for (const e of doc.errors) errors.push(`E100 YAML 解析失败：${e.message}`)
  if (errors.length) return { available: true, errors, warnings }

  let data
  try {
    data = doc.toJS()
  } catch (e) {
    return { available: true, errors: [`E101 YAML 求值失败：${e.message}`], warnings }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { available: true, errors: ['E102 顶层必须是 mapping'], warnings }
  }

  walk(data, [], (path, value) => {
    const leaf = path[path.length - 1] ?? ''
    if (typeof value === 'string' && /^<FILL[-_]?IN>$/i.test(value.trim()) && !isSensitiveKey(leaf)) {
      errors.push(`E103 占位符落在非敏感键上：${path.join('.')}`)
    }
    if (NUMERIC_KEYS.has(String(leaf).toLowerCase()) && value != null && typeof value !== 'number') {
      errors.push(`E104 ${path.join('.')} 必须是数字`)
    }
    if (CREDENTIAL_REF_KEYS.has(String(leaf).toLowerCase()) && value != null) {
      if (typeof value !== 'string' || !CREDENTIAL_REF_RE.test(value)) {
        errors.push(
          `E106 ${path.join('.')} 不是合法凭据槽位名（须匹配 ${String(CREDENTIAL_REF_RE)}）` +
            '；DSH 会在 host-boot 抛 credential ref 错误并让全部 provider 失效',
        )
      }
    }
  })

  const providers = data['llm-pi-ai']?.providers
  if (providers && typeof providers === 'object') {
    for (const [id, p] of Object.entries(providers)) {
      if (!p || typeof p !== 'object' || Array.isArray(p)) {
        errors.push(`E105 provider ${id} 不是 mapping（脱敏很可能吞掉了它的子键）`)
        continue
      }
      for (const req of ['displayName', 'api']) {
        if (!(req in p)) warnings.push(`W004 provider ${id} 缺少 ${req}`)
      }
      if (Array.isArray(p.models)) {
        p.models.forEach((m, i) => {
          if (!m || typeof m !== 'object' || !('id' in m)) warnings.push(`W005 provider ${id} models[${i}] 缺少 id`)
        })
      }
    }
  } else {
    warnings.push('W006 未找到 llm-pi-ai.providers')
  }
  return { available: true, errors, warnings, providerCount: providers ? Object.keys(providers).length : 0 }
}

/** 校验单个文件，返回 { file, ok, errors, warnings, strict, providerCount } */
export async function validateFile(file) {
  const text = readFileSync(file, 'utf8')
  const t = lintText(text)
  const d = await lintDocument(text)
  return {
    file,
    ok: t.errors.length === 0 && d.errors.length === 0,
    errors: [...t.errors, ...d.errors],
    warnings: [...t.warnings, ...d.warnings],
    strict: d.available,
    providerCount: d.providerCount ?? null,
  }
}

async function main(argv) {
  const files = argv.length ? argv.map((f) => resolve(f)) : [join(homedir(), '.dsh', 'settings.yaml')]
  let failed = 0
  for (const file of files) {
    let r
    try {
      r = await validateFile(file)
    } catch (e) {
      console.error(`❌ ${file}\n   E000 无法读取：${e.message}`)
      failed++
      continue
    }
    const mode = r.strict ? 'strict yaml + text lint' : 'text lint only'
    if (r.ok) {
      console.log(`✅ ${file}  [${mode}]${r.providerCount != null ? `  providers=${r.providerCount}` : ''}`)
    } else {
      failed++
      console.error(`❌ ${file}  [${mode}]`)
      for (const e of r.errors) console.error(`   ${e}`)
    }
    for (const w of r.warnings) console.warn(`   ⚠️  ${w}`)
  }
  process.exit(failed ? 1 : 0)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await main(process.argv.slice(2))
}
