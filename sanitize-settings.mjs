/**
 * sanitize-settings.mjs — 把本机 ~/.dsh/settings.yaml 脱敏生成 settings.yaml.template
 *
 * 用法（在仓库根目录）：
 *   node sanitize-settings.mjs
 *
 * 处理：
 *   1. 敏感字段（key/token/secret/password/credential/apiKey 等）的值 → <FILL-IN>
 *   2. /home/zhuxi 等本机绝对路径 → %USERPROFILE% 说明
 *   3. 输出到 settings.yaml.template（不会修改原文件）
 *
 * 注意：本脚本不打印任何敏感值，只输出替换统计。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const SRC = join(homedir(), '.dsh', 'settings.yaml')
const OUT = join(process.cwd(), 'settings.yaml.template')

let content
try {
  content = readFileSync(SRC, 'utf8')
} catch {
  console.error(`无法读取 ${SRC}`)
  process.exit(1)
}

const before = content.length
let replacements = 0

// 1. 敏感字段值替换（保留缩进与字段名）
// 匹配明确的敏感属性（apiKey / token / secret / password / credential / apiKeyEnv 等）
content = content.replace(
  /^(\s*(?:apiKey|apikey|api_key|apiKeyEnv|token|secret|password|credential|accessToken|authToken)\s*:\s+).+$/gim,
  (m, prefix) => { replacements++; return `${prefix}<FILL-IN>` }
)

// 2. 本机绝对路径 → 占位说明
const homePath = homedir().replace(/\\/g, '/')
const reHome = new RegExp(homePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
const pathHits = (content.match(reHome) || []).length
content = content.replace(reHome, '%USERPROFILE%')

// 3. 常见浏览器登录态 / storageState 路径值
content = content.replace(/(storageStatePath\s*:\s*).+$/gim, (m, prefix) => { replacements++; return `${prefix}<FILL-IN>` })

writeFileSync(OUT, content)
console.log(`✅ 已生成 ${OUT}`)
console.log(`   - 替换敏感字段: ${replacements} 处`)
console.log(`   - 路径占位替换: ${pathHits} 处`)
console.log(`   - 大小: ${before} B → ${content.length} B`)
console.log('⚠️  请人工检查 template 中没有残留本机信息后再上传 GitHub')
