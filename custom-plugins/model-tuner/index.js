export const name = 'model-tuner'
export const inject = ['webServer', 'settings', 'credentials', 'llm']

const ROOT = '/__dsh-model-tuner'
const NS = 'llm-pi-ai'
const MAX_BODY = 524288

function own() { return Object.create(null) }
function text(value) { return typeof value === 'string' ? value.trim() : '' }
function clean(value) { return text(value).replace(/^[\s\u0000'"([{]+|[\s\u0000'".,;:)}\]]+$/g, '') }
function copy(value) {
  if (Array.isArray(value)) return value.map(copy)
  if (!value || typeof value !== 'object') return value
  const result = own()
  for (const key of Object.keys(value)) result[key] = copy(value[key])
  return result
}
function setOp(path, value) {
  const operation = own()
  operation.op = 'set'
  operation.path = path.slice()
  operation.value = copy(value)
  return operation
}
function failure(message) { const error = new Error(message); error.publicMessage = message; return error }
function publicMessage(error, fallback) { return error && typeof error.publicMessage === 'string' ? error.publicMessage : fallback }
function isUrl(value) {
  const item = clean(value)
  return /^https?:\/\/[^\s"'<>]+$/i.test(item) && !/^https?:\/\/[^/]*@/i.test(item)
}
function isKey(value) {
  const item = clean(value)
  return item.length >= 8 && item.length <= 4096 && !/^https?:\/\//i.test(item) && !/^\$\{|^<[^>]+>$|^your[_ -]?/i.test(item) && !/[\s<>]/.test(item) && /[A-Za-z0-9]/.test(item)
}
function add(list, value, score) {
  const item = clean(value)
  if (!item) return
  const prior = list.find((entry) => entry.value === item)
  if (prior) prior.score = Math.max(prior.score, score)
  else list.push({ value: item, score })
}
function parseConnection(input) {
  const raw = typeof input === 'string' ? input.slice(0, MAX_BODY) : ''
  const urls = [], keys = [], models = [], providers = []
  const urlField = /(base.?url|api.?url|endpoint|server|host|url)/i
  const keyField = /(api.?key|access.?token|authorization|bearer|secret|token|key)/i
  const modelField = /(^|[_-])(model|models|model.?id|model.?name|default.?model|review.?model)($|[_-])/i
  const providerField = /(provider|provider.?name|model.?provider)/i
  const inspect = (field, value) => {
    const name = String(field || '')
    if (urlField.test(name) && isUrl(value)) add(urls, value, 150)
    if (keyField.test(name)) {
      const bearer = /^Bearer\s+(.+)$/i.exec(text(value))
      const candidate = bearer ? bearer[1] : value
      if (isKey(candidate)) add(keys, candidate, bearer ? 170 : 150)
    }
    if (modelField.test(name) && typeof value === 'string' && value.trim().length < 256) add(models, value, 120)
    if (providerField.test(name) && typeof value === 'string' && value.trim().length < 128 && !isUrl(value)) add(providers, value, 100)
  }
  const visit = (value, field) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (modelField.test(String(field || '')) && item && typeof item === 'object' && typeof item.id === 'string') add(models, item.id, 130)
        else visit(item, field)
      }
      return
    }
    if (value && typeof value === 'object') {
      for (const pair of Object.entries(value)) visit(pair[1], pair[0])
      return
    }
    inspect(field, value)
  }
  try { visit(JSON.parse(raw), '') } catch {}
  let match
  const assignment = /(?:^|[\n,{;])\s*(?:export\s+)?["']?([A-Za-z][A-Za-z0-9_.-]*)["']?\s*(?:=|:)\s*(?:"([^"]*)"|'([^']*)'|([^\s,;<>}\]]+))/g
  while ((match = assignment.exec(raw)) !== null) inspect(match[1], match[2] !== undefined ? match[2] : match[3] !== undefined ? match[3] : match[4])
  const modelArray = /(?:^|[\n,{;])\s*(?:models?|model.?ids?)\s*(?:=|:)\s*\[([^\]]*)\]/gi
  while ((match = modelArray.exec(raw)) !== null) {
    const quoted = /["']([^"']+)["']/g
    let item
    while ((item = quoted.exec(match[1])) !== null) add(models, item[1], 125)
  }
  const freeUrl = /https?:\/\/[^\s<>"']+/gi
  while ((match = freeUrl.exec(raw)) !== null) if (isUrl(match[0])) add(urls, match[0], 30)
  const bearer = /\bBearer\s+([^\s,;<>"']{8,})/gi
  while ((match = bearer.exec(raw)) !== null) if (isKey(match[1])) add(keys, match[1], 115)
  const prefixed = /\b(?:sk|rk|pk|ak)-[A-Za-z0-9_-]{8,}\b|\bAIza[A-Za-z0-9_-]{20,}\b/gi
  while ((match = prefixed.exec(raw)) !== null) if (isKey(match[0])) add(keys, match[0], 105)
  const generic = /\b(?:api[_ -]?key|access[_ -]?token|authorization|bearer|secret|token|key)\s*[:=]\s*(?:Bearer\s+)?([^\s,;<>"']+)/gi
  while ((match = generic.exec(raw)) !== null) if (isKey(match[1])) add(keys, match[1], 95)
  const best = (list) => { list.sort((left, right) => right.score - left.score); return list.length ? list[0].value : '' }
  return {
    baseURL: best(urls),
    apiKey: best(keys),
    providerName: best(providers),
    models: [...new Set(models.sort((left, right) => right.score - left.score).map((item) => item.value))].filter((id) => id && id.length < 256).slice(0, 100),
  }
}
function modelId(value) { return typeof value === 'string' ? value.trim() : value && typeof value.id === 'string' ? value.id.trim() : '' }
function capacity(value, label) {
  if (value === undefined || value === null || value === '') return undefined
  const match = /^(\d+)([kKmM])?$/.exec(String(value).trim().replace(/,/g, ''))
  if (!match) throw failure(label + ' 必须是正整数，或使用 k/m 后缀。')
  const amount = Number(match[1]) * (match[2] ? match[2].toLowerCase() === 'k' ? 1000 : 1000000 : 1)
  if (!Number.isSafeInteger(amount) || amount < 1) throw failure(label + ' 必须是正整数。')
  return amount
}
function snapshot(ctx) {
  const value = ctx.settings.get(NS)
  if (!value || typeof value !== 'object' || !value.providers || typeof value.providers !== 'object') throw failure('没有可读取的模型提供方配置。')
  const descriptor = ctx.settings.describe({ redactSecrets: true }).find((entry) => String(entry.ns) === NS)
  return { value, revision: descriptor && descriptor.revision }
}
function listRows(ctx) {
  const current = snapshot(ctx), result = []
  for (const pair of Object.entries(current.value.providers)) {
    const providerId = pair[0]
    const provider = pair[1] && typeof pair[1] === 'object' ? pair[1] : {}
    const models = Array.isArray(provider.models) ? provider.models : []
    for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
      const raw = models[modelIndex], id = modelId(raw)
      if (!id) continue
      const model = raw && typeof raw === 'object' ? raw : {}
      result.push({
        providerId,
        providerName: typeof provider.displayName === 'string' && provider.displayName ? provider.displayName : providerId,
        modelIndex,
        id,
        name: typeof model.name === 'string' ? model.name : '',
        contextWindow: Number.isSafeInteger(model.contextWindow) ? model.contextWindow : null,
        maxTokens: Number.isSafeInteger(model.maxTokens) ? model.maxTokens : null,
      })
    }
  }
  return { current, result }
}
function discoveryApi(value) {
  const api = text(value)
  return ['openai-responses', 'openai-completions', 'anthropic-messages'].includes(api) ? api : 'openai-responses'
}
async function discoverModels(ctx, body) {
  const baseURL = text(body && body.baseURL).replace(/\/+$/, '')
  if (!isUrl(baseURL)) throw failure('API 地址必须是 http 或 https URL。')
  const apiKey = text(body && body.apiKey)
  if (apiKey && (!isKey(apiKey) || /[\r\n]/.test(apiKey))) throw failure('API 密钥格式无效。')
  const request = { baseURL, api: discoveryApi(body && body.api) }
  const providerId = text(body && body.providerId)
  if (providerId) request.provider = providerId
  if (apiKey) request.apiKey = apiKey
  try {
    const discovered = await ctx.llm.discoverModels(NS, request)
    const models = []
    for (const item of Array.isArray(discovered) ? discovered : []) {
      const id = modelId(item)
      if (!id) continue
      const row = own()
      row.id = id
      if (typeof item.name === 'string' && item.name.trim()) row.name = item.name.trim()
      if (Number.isSafeInteger(item.contextWindow)) row.contextWindow = item.contextWindow
      if (Number.isSafeInteger(item.maxTokens)) row.maxTokens = item.maxTokens
      models.push(row)
    }
    return models.slice(0, 100)
  } catch (error) {
    const rawMessage = error && typeof error.message === 'string' ? error.message : publicMessage(error, '模型目录拉取失败。')
    const safeMessage = apiKey ? rawMessage.split(apiKey).join('[已隐藏]') : rawMessage
    throw failure(safeMessage || '模型目录拉取失败。')
  }
}
async function applyLimits(ctx, body) {
  if (!body || !Array.isArray(body.targets) || !body.targets.length) throw failure('请至少选择一个模型。')
  if (body.targets.length > 500) throw failure('一次最多修改 500 个模型。')
  const contextWindow = capacity(body.contextWindow, '上下文上限')
  const maxTokens = capacity(body.maxTokens, '最大输出 tokens')
  if (contextWindow === undefined && maxTokens === undefined) throw failure('至少填写一个要修改的数值。')
  const data = listRows(ctx)
  const selected = new Set(body.targets.map((target) => {
    if (!target || typeof target.providerId !== 'string' || !Number.isSafeInteger(target.modelIndex) || target.modelIndex < 0) throw failure('模型选择项无效。')
    return target.providerId + '@@' + target.modelIndex
  }))
  const operations = []
  let changed = 0
  for (const pair of Object.entries(data.current.value.providers)) {
    const providerId = pair[0]
    const provider = pair[1] && typeof pair[1] === 'object' ? pair[1] : {}
    const models = (Array.isArray(provider.models) ? provider.models : []).map(copy)
    let touched = false
    for (let index = 0; index < models.length; index += 1) {
      if (!selected.has(providerId + '@@' + index)) continue
      let model = models[index]
      if (!model || typeof model !== 'object' || Array.isArray(model)) {
        const replacement = own()
        replacement.id = modelId(model)
        model = replacement
      }
      const nextContext = contextWindow === undefined ? model.contextWindow : contextWindow
      const nextMax = maxTokens === undefined ? model.maxTokens : maxTokens
      if (Number.isSafeInteger(nextContext) && Number.isSafeInteger(nextMax) && nextMax > nextContext) throw failure((modelId(model) || '选中模型') + ' 的最大输出不能超过上下文上限。')
      if (contextWindow !== undefined) model.contextWindow = contextWindow
      if (maxTokens !== undefined) model.maxTokens = maxTokens
      models[index] = model
      touched = true
      changed += 1
    }
    if (touched) operations.push(setOp(['providers', providerId, 'models'], models))
  }
  if (!changed) throw failure('没有找到选中的模型。')
  await ctx.settings.mutate(NS, operations, data.current.revision)
  return changed
}
function allocateId(input, label, providers) {
  const explicit = text(input), source = explicit || text(label) || 'custom-provider'
  let id = source.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'custom-provider'
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id)) throw failure('提供方 ID 无效。')
  if (!providers[id]) return id
  if (explicit) throw failure('提供方 ID 已存在。')
  let suffix = 2
  while (providers[id + '-' + suffix]) suffix += 1
  return id + '-' + suffix
}
async function createProvider(ctx, body) {
  const data = snapshot(ctx)
  const displayName = text(body.displayName).slice(0, 128)
  const providerId = allocateId(body.providerId, displayName, data.value.providers)
  const baseURL = text(body.baseURL).replace(/\/$/, '')
  if (!isUrl(baseURL)) throw failure('API 地址必须是 http 或 https URL。')
  const sourceModels = Array.isArray(body.models) ? body.models : String(body.models || '').split(/[\n,，]+/)
  const ids = [...new Set(sourceModels.map(modelId).filter(Boolean))].slice(0, 100)
  if (!ids.length) throw failure('至少填写一个模型 ID。')
  const apiKey = text(body.apiKey)
  if (apiKey && (!isKey(apiKey) || /[\r\n]/.test(apiKey))) throw failure('API 密钥格式无效。')
  const ref = providerId.toUpperCase().replace(/[^A-Z0-9]+/g, '_') + '_API_KEY'
  const profile = own()
  profile.displayName = displayName || providerId
  profile.api = ['openai-responses', 'openai-completions', 'anthropic-messages'].includes(body.api) ? body.api : 'openai-responses'
  profile.baseURL = baseURL
  profile.models = ids.map((id) => { const model = own(); model.id = id; return model })
  if (apiKey) profile.apiKeyEnv = ref
  if (apiKey) await ctx.credentials.set(ref, apiKey)
  try {
    await ctx.settings.mutate(NS, [setOp(['providers', providerId], profile)], data.revision)
    return providerId
  } catch (error) {
    if (apiKey) try { await ctx.credentials.unset(ref) } catch {}
    throw error
  }
}
function send(response, status, value) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' })
  response.end(JSON.stringify(value))
}
function readBody(request) {
  return new Promise((resolve, reject) => {
    let raw = '', size = 0, done = false
    const failOnce = (error) => { if (!done) { done = true; reject(error) } }
    request.setEncoding('utf8')
    request.on('data', (chunk) => {
      if (done) return
      size += chunk.length
      if (size > MAX_BODY) { failOnce(failure('请求内容过大。')); if (request.resume) request.resume() }
      else raw += chunk
    })
    request.on('end', () => {
      if (done) return
      done = true
      try {
        const value = raw ? JSON.parse(raw) : {}
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw failure('请求 JSON 必须是对象。')
        resolve(value)
      } catch (error) { reject(error && error.publicMessage ? error : failure('请求 JSON 无效。')) }
    })
    request.on('error', failOnce)
  })
}
function only(request, response, method) {
  if (request.method === method) return true
  response.writeHead(405, { allow: method, 'cache-control': 'no-store' })
  response.end()
  return false
}

const PAGE = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>模型批量配置</title>
<style>
:root{color-scheme:dark;--bg:#121316;--panel:#1c1f25;--border:#2b313b;--border-strong:#3c4450;--text:#e7eaef;--text-2:#a9b1bc;--text-3:#7e8794;--accent:#2fb38a;--accent-hover:#45c69d;--accent-soft:#16302a;--accent-text:#7fd6b8;--danger:#f97066;--focus:rgba(47,179,138,.4);--shadow:0 2px 8px rgba(0,0,0,.6);--radius:8px;--radius-sm:6px;--font:system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;--mono:ui-monospace,'SF Mono',Menlo,Consolas,monospace}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 var(--font)}
.page{max-width:1120px;margin:0 auto;padding:20px 16px 48px}
.muted{color:var(--text-3)}
.hint{font-size:12px;margin:2px 0 0}
.head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:14px}
.head h1{font-size:20px;line-height:1.3;margin:0}
.head p{margin:4px 0 0}
.stats{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.stat{flex:1;min-width:110px;background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:10px 14px;display:flex;flex-direction:column;gap:2px}
.stat strong{font-size:20px;font-variant-numeric:tabular-nums;line-height:1.2}
.stat span{font-size:12px;color:var(--text-3)}
.panel{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:16px;margin-bottom:14px}
.panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:2px}
.panel-head h2{font-size:15px;margin:0}
.chip{font-size:12px;padding:3px 10px;border-radius:999px;background:var(--accent-soft);color:var(--accent-text);border:1px solid transparent}
.chip.empty{background:transparent;color:var(--text-3);border-color:var(--border)}
.button,.back{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:0 14px;border:1px solid var(--border-strong);border-radius:var(--radius-sm);background:var(--panel);color:var(--text);font:500 13px/1 var(--font);text-decoration:none;cursor:pointer;white-space:nowrap;transition:background .12s ease,border-color .12s ease}
.button:hover,.back:hover{background:rgba(255,255,255,.05)}
.button:disabled{cursor:not-allowed;opacity:.4}
.button.busy{cursor:progress}
.button.primary{background:var(--accent);border-color:var(--accent);color:#121316;font-weight:600}
.button.primary:hover:not(:disabled){background:var(--accent-hover);border-color:var(--accent-hover)}
.button.primary:disabled{background:var(--accent);border-color:var(--accent);opacity:.35}
.toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin:12px 0}
.field{display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--text-2)}
.field .input,.field .select,.field .area{font-size:13px}
.grow{flex:1;min-width:170px}
.grow2{flex:2;min-width:230px}
.input,.select,.area{width:100%;border:1px solid var(--border-strong);border-radius:var(--radius-sm);padding:8px 10px;background:rgba(0,0,0,.2);color:var(--text);font:inherit;outline:none}
.input:focus,.select:focus,.area:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--focus)}
.area{min-height:110px;resize:vertical;font-family:var(--mono);font-size:12.5px;line-height:1.5}
.area.short{min-height:76px}
.list-wrap{position:relative;border:1px solid var(--border);border-radius:var(--radius-sm);max-height:430px;overflow:auto;background:rgba(0,0,0,.1)}
.table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:13px}
.table th{position:sticky;top:0;z-index:2;background:var(--panel);border-bottom:1px solid var(--border-strong);padding:8px 10px;text-align:left;font-size:12px;font-weight:600;color:var(--text-2);white-space:nowrap}
.table th.col-num{text-align:right}
.table td{padding:8px 10px;border-bottom:1px solid var(--border);vertical-align:middle;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.table tbody tr:last-child td{border-bottom:0}
.table tbody tr:hover{background:rgba(255,255,255,.02)}
.table tbody tr.selected{background:var(--accent-soft)}
.table td.col-num{text-align:right;font-variant-numeric:tabular-nums}
.table input[type=checkbox]{width:16px;height:16px;accent-color:var(--accent);cursor:pointer;margin:0;vertical-align:middle}
.col-check{width:44px}
.col-model{width:34%}
.col-provider{width:32%}
.col-num{width:17%}
.model-name{display:block;overflow:hidden;text-overflow:ellipsis;font-weight:600}
.model-id{display:block;overflow:hidden;text-overflow:ellipsis;color:var(--text-3);font-size:12px}
.table tbody[hidden]{display:none}
.list-state{padding:30px 16px;text-align:center;color:var(--text-3);font-size:13px}
.list-state.error{color:var(--danger)}
.list-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:8px;min-height:24px}
.check-label{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--text-2);cursor:pointer;user-select:none}
.check-label input{width:16px;height:16px;accent-color:var(--accent);cursor:pointer;margin:0}
.meta-right{display:inline-flex;align-items:center;gap:12px}
.retry-link{background:none;border:0;color:var(--accent);font:inherit;text-decoration:underline;cursor:pointer;padding:0}
.batchbar{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)}
.batchbar .field{flex:1;min-width:150px;max-width:220px}
.batchbar .hint{flex-basis:100%}
.batchbar .status{flex-basis:100%}
.status{min-height:20px;font-size:13px;padding:6px 0 0}
.status.ok{color:var(--accent-text)}
.status.error{color:var(--danger);font-weight:500}
.import{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:20px;margin-top:14px;align-items:start}
.import-left,.import-form{display:flex;flex-direction:column;gap:10px}
.btn-row{display:flex;gap:10px;flex-wrap:wrap}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
button:focus-visible,a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
@media(max-width:720px){
  .head{flex-direction:column;align-items:stretch}
  .back{width:100%}
  .button,.back{min-height:44px}
  .toolbar .field{flex-basis:100%;min-width:0}
  .import{grid-template-columns:1fr}
  .grid-2{grid-template-columns:1fr}
  .batchbar .field{flex-basis:100%;max-width:none}
  .table thead{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
  .table,.table tbody,.table tr,.table td{display:block;width:100%}
  .table tr{border-bottom:1px solid var(--border);padding:6px 4px}
  .table tr:last-child{border-bottom:0}
  .table td{border:0;padding:3px 10px;max-width:none;white-space:normal;overflow:visible;text-overflow:clip;display:flex;gap:10px;justify-content:space-between;align-items:baseline}
  .table td::before{content:attr(data-label);flex:0 0 auto;color:var(--text-3);font-size:12px;font-weight:600}
  .table td.col-check{justify-content:flex-start;align-items:center}
  .table td.col-model .model-name,.table td.col-model .model-id{flex:1;text-align:right}
  .table tbody[hidden]{display:none!important}
  .list-meta{justify-content:space-between}
}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
</style>
<main class="page">
  <header class="head">
    <div>
      <h1>模型批量配置</h1>
      <p class="muted">按模型 ID 跨提供方选择，批量设置上下文上限与最大输出。</p>
    </div>
    <a class="back" href="/?dsh-desktop-mode=compatibility&amp;dsh-desktop-platform=linux">返回主界面</a>
  </header>
  <section class="stats" aria-label="数据概览">
    <div class="stat"><strong id="statModels">&ndash;</strong><span>模型实例</span></div>
    <div class="stat"><strong id="statProviders">&ndash;</strong><span>提供方</span></div>
    <div class="stat"><strong id="statIds">&ndash;</strong><span>唯一模型 ID</span></div>
  </section>
  <section class="panel" aria-labelledby="batchTitle">
    <div class="panel-head">
      <h2 id="batchTitle">批量参数设置</h2>
      <span id="selectedInfo" class="chip empty" role="status" aria-live="polite">未选择模型</span>
    </div>
    <div class="toolbar">
      <label class="field grow2">搜索模型<input id="search" class="input" type="search" placeholder="匹配模型 ID、名称、提供方…" autocomplete="off"></label>
      <label class="field grow">提供方<select id="providerFilter" class="select"><option value="">全部提供方</option></select></label>
      <label class="field grow">模型 ID<input id="same" class="input" list="ids" placeholder="输入或选择模型 ID" autocomplete="off"><datalist id="ids"></datalist></label>
      <button id="sameBtn" class="button" type="button">选择同 ID</button>
      <button id="clearBtn" class="button" type="button">清除选择</button>
    </div>
    <div class="list-wrap">
      <table class="table">
        <thead><tr>
          <th class="col-check">选择</th>
          <th class="col-model">模型</th>
          <th class="col-provider">提供方</th>
          <th class="col-num">上下文</th>
          <th class="col-num">最大输出</th>
        </tr></thead>
        <tbody id="tbody" hidden></tbody>
      </table>
      <div id="listState" class="list-state" role="status" aria-live="polite">加载中…</div>
    </div>
    <div class="list-meta">
      <span id="shownCount" class="muted">显示 &ndash; / &ndash;</span>
      <span class="meta-right">
        <label class="check-label"><input id="headCheck" type="checkbox" disabled><span>全选当前结果</span></label>
        <button id="retryBtn" class="retry-link" type="button" hidden>重试加载</button>
      </span>
    </div>
    <form id="limits" class="batchbar">
      <label class="field">上下文上限<input id="cw" class="input" placeholder="128k" autocomplete="off"></label>
      <label class="field">最大输出 tokens<input id="mt" class="input" placeholder="16384" autocomplete="off"></label>
      <p class="hint muted">支持 128k、1m 等 k/m 后缀；留空表示不修改该项。</p>
      <button id="applyBtn" class="button primary" type="submit" disabled>应用到 0 个模型</button>
      <div id="batchStatus" class="status" role="status" aria-live="polite"></div>
    </form>
  </section>
  <section class="panel" aria-labelledby="importTitle">
    <div class="panel-head"><h2 id="importTitle">自定义提供方导入</h2></div>
    <div class="import">
      <div class="import-left">
        <label class="field">连接文本<textarea id="raw" class="area" placeholder="支持 JSON、TOML、INI、环境变量、Bearer 和普通连接文本"></textarea></label>
        <p class="hint muted">连接文本可能包含敏感信息，仅在本地处理，不记录、不外发。</p>
        <div class="btn-row">
          <button id="parseBtn" class="button" type="button">提取字段</button>
          <button id="discoverBtn" class="button" type="button">拉取模型</button>
          <button id="clearSecretBtn" class="button" type="button">清除敏感输入</button>
        </div>
        <div id="importStatus" class="status" role="status" aria-live="polite"></div>
      </div>
      <form id="createForm" class="import-form">
        <div class="grid-2">
          <label class="field">提供方 ID<input id="pid" class="input" placeholder="留空自动生成" autocomplete="off"></label>
          <label class="field">显示名称<input id="pname" class="input" autocomplete="off"></label>
        </div>
        <label class="field">协议<select id="api" class="select"><option value="openai-responses">OpenAI Responses</option><option value="openai-completions">OpenAI Completions</option><option value="anthropic-messages">Anthropic Messages</option></select></label>
        <label class="field">API 地址<input id="base" class="input" placeholder="https://api.example.com/v1" autocomplete="off"></label>
        <label class="field">API 密钥<input id="secret" class="input" type="password" autocomplete="new-password"></label>
        <label class="field">模型 ID<textarea id="models" class="area short" placeholder="每行一个模型 ID"></textarea></label>
        <button id="createBtn" class="button primary" type="submit">创建提供方</button>
      </form>
    </div>
  </section>
</main>
<script>
(()=>{
  var root='/__dsh-model-tuner';
  function by(id){return document.getElementById(id)}
  var tbody=by('tbody'),listState=by('listState'),shownCount=by('shownCount'),retryBtn=by('retryBtn');
  var search=by('search'),providerFilter=by('providerFilter'),headCheck=by('headCheck');
  var same=by('same'),ids=by('ids'),sameBtn=by('sameBtn'),clearBtn=by('clearBtn');
  var batchStatus=by('batchStatus'),importStatus=by('importStatus');
  var cw=by('cw'),mt=by('mt'),applyBtn=by('applyBtn');
  var raw=by('raw'),pid=by('pid'),pname=by('pname'),api=by('api'),base=by('base'),secret=by('secret'),modelsArea=by('models');
  var parseBtn=by('parseBtn'),discoverBtn=by('discoverBtn'),createBtn=by('createBtn'),clearSecretBtn=by('clearSecretBtn');
  var limitsForm=by('limits'),createForm=by('createForm');
  var selectedKeys=new Set();
  var state={models:[],search:'',provider:''};

  function setStatus(el,value,error){
    el.textContent=value||'';
    el.className='status '+(error?'error':'ok');
    el.setAttribute('role',error?'alert':'status');
  }
  function post(path,value){
    return fetch(root+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value)}).then(function(response){
      return response.json().then(function(payload){
        if(!response.ok)throw Error(payload.error||'请求失败。');
        return payload;
      },function(){throw Error('服务器返回无效响应。')});
    });
  }
  function fmt(value){
    if(value===null||value===undefined||value==='')return '默认';
    if(value>=1000000&&value%1000000===0)return (value/1000000)+'m';
    if(value>=1000&&value%1000===0)return (value/1000)+'k';
    return String(value);
  }
  function keyOf(item){return item.providerId+'@@'+item.modelIndex}
  function visibleModels(){
    var q=state.search.toLowerCase();
    return state.models.filter(function(item){
      if(state.provider&&item.providerName!==state.provider&&item.providerId!==state.provider)return false;
      if(!q)return true;
      var name=item.name||'';
      return item.id.toLowerCase().indexOf(q)>=0||name.toLowerCase().indexOf(q)>=0||item.providerName.toLowerCase().indexOf(q)>=0||item.providerId.toLowerCase().indexOf(q)>=0;
    });
  }
  function updateSelectionUI(){
    var n=selectedKeys.size,info=by('selectedInfo');
    info.textContent=n?('已选择 '+n+' 个模型'):'未选择模型';
    info.className='chip '+(n?'':'empty');
    refreshApply();
  }
  function refreshApply(){
    var hasValue=cw.value.trim()||mt.value.trim();
    applyBtn.disabled=selectedKeys.size===0||!hasValue;
    applyBtn.textContent='应用到 '+selectedKeys.size+' 个模型';
  }
  function refreshHeadCheck(shown){
    var any=shown.length>0;
    var all=any&&shown.every(function(item){return selectedKeys.has(keyOf(item))});
    var some=shown.some(function(item){return selectedKeys.has(keyOf(item))});
    headCheck.checked=all;
    headCheck.indeterminate=any&&some&&!all;
    headCheck.disabled=!any;
  }
  function render(){
    var shown=visibleModels(),total=state.models.length;
    tbody.replaceChildren();
    shown.forEach(function(item){
      var tr=document.createElement('tr');
      if(selectedKeys.has(keyOf(item)))tr.className='selected';
      var tdCheck=document.createElement('td');
      tdCheck.className='col-check';tdCheck.dataset.label='选择';
      var box=document.createElement('input');
      box.type='checkbox';
      box.checked=selectedKeys.has(keyOf(item));
      box.setAttribute('aria-label','选择 '+item.id+' / '+item.providerName);
      box.dataset.providerId=item.providerId;
      box.dataset.modelIndex=item.modelIndex;
      box.addEventListener('change',function(){
        var key=keyOf(item);
        if(box.checked)selectedKeys.add(key);else selectedKeys.delete(key);
        tr.className=box.checked?'selected':'';
        updateSelectionUI();
        refreshHeadCheck(shown);
      });
      tdCheck.append(box);
      tr.append(tdCheck);
      var tdModel=document.createElement('td');
      tdModel.className='col-model';tdModel.dataset.label='模型';
      var name=document.createElement('span');
      name.className='model-name';
      name.textContent=item.name||item.id;
      name.title=item.name||item.id;
      tdModel.append(name);
      if(item.name){
        var idLine=document.createElement('span');
        idLine.className='model-id';
        idLine.textContent=item.id;
        idLine.title=item.id;
        tdModel.append(idLine);
      }
      tr.append(tdModel);
      var tdProv=document.createElement('td');
      tdProv.className='col-provider';tdProv.dataset.label='提供方';
      tdProv.textContent=item.providerName;
      tdProv.title=item.providerName;
      tr.append(tdProv);
      var tdCw=document.createElement('td');
      tdCw.className='col-num';tdCw.dataset.label='上下文';
      tdCw.textContent=fmt(item.contextWindow);
      tdCw.title=item.contextWindow===null?'默认':String(item.contextWindow);
      tr.append(tdCw);
      var tdMt=document.createElement('td');
      tdMt.className='col-num';tdMt.dataset.label='最大输出';
      tdMt.textContent=fmt(item.maxTokens);
      tdMt.title=item.maxTokens===null?'默认':String(item.maxTokens);
      tr.append(tdMt);
      tbody.append(tr);
    });
    shownCount.textContent='显示 '+shown.length+' / 共 '+total;
    if(total===0){
      listState.className='list-state';
      listState.textContent='暂无模型数据。';
      tbody.hidden=true;
    }else if(shown.length===0){
      listState.className='list-state';
      listState.textContent='没有匹配的模型，试试调整搜索或筛选。';
      tbody.hidden=true;
    }else{
      listState.textContent='';
      tbody.hidden=false;
    }
    refreshHeadCheck(shown);
  }
  function buildProviderFilter(models){
    var names=[],seen={},current=providerFilter.value;
    models.forEach(function(item){
      if(!seen[item.providerName]){seen[item.providerName]=true;names.push(item.providerName)}
    });
    names.sort();
    providerFilter.replaceChildren();
    providerFilter.append(new Option('全部提供方',''));
    names.forEach(function(name){providerFilter.append(new Option(name,name))});
    providerFilter.value=names.indexOf(current)>=0?current:'';
    state.provider=providerFilter.value;
  }
  function buildDatalist(models){
    var values=[],seen={};
    models.forEach(function(item){
      if(!seen[item.id]){seen[item.id]=true;values.push(item.id)}
    });
    values.sort();
    ids.replaceChildren();
    values.forEach(function(value){ids.append(new Option(value,value))});
  }
  function updateStats(models){
    var providers=new Set(),unique=new Set();
    models.forEach(function(item){providers.add(item.providerName);unique.add(item.id)});
    by('statModels').textContent=String(models.length);
    by('statProviders').textContent=String(providers.size);
    by('statIds').textContent=String(unique.size);
  }
  function load(){
    listState.className='list-state';
    listState.textContent='加载中…';
    listState.setAttribute('role','status');
    retryBtn.hidden=true;
    return fetch(root+'/data',{cache:'no-store'}).then(function(response){
      return response.json().then(function(payload){
        if(!response.ok)throw Error(payload.error||'无法加载模型。');
        var models=payload.models||[];
        state.models=models;
        selectedKeys.clear();
        buildProviderFilter(models);
        buildDatalist(models);
        updateStats(models);
        updateSelectionUI();
        render();
      },function(){throw Error('服务器返回无效响应。')});
    }).catch(function(error){
      listState.className='list-state error';
      listState.textContent='加载失败：'+error.message;
      listState.setAttribute('role','alert');
      retryBtn.hidden=false;
      tbody.hidden=true;
    });
  }
  headCheck.addEventListener('change',function(){
    var shown=visibleModels();
    shown.forEach(function(item){
      var key=keyOf(item);
      if(headCheck.checked)selectedKeys.add(key);else selectedKeys.delete(key);
    });
    render();
    updateSelectionUI();
  });
  search.addEventListener('input',function(){state.search=search.value.trim();render()});
  providerFilter.addEventListener('change',function(){state.provider=providerFilter.value;render()});
  cw.addEventListener('input',refreshApply);
  mt.addEventListener('input',refreshApply);
  sameBtn.addEventListener('click',function(){
    var id=same.value.trim();
    if(!id){setStatus(batchStatus,'请输入模型 ID。',true);return}
    var matches=state.models.filter(function(item){return item.id===id});
    if(!matches.length){setStatus(batchStatus,'未找到模型 ID：'+id+'。',true);return}
    selectedKeys.clear();
    matches.forEach(function(item){selectedKeys.add(keyOf(item))});
    render();
    updateSelectionUI();
    setStatus(batchStatus,'已选择 '+matches.length+' 个 '+id+' 实例。',false);
  });
  clearBtn.addEventListener('click',function(){
    selectedKeys.clear();
    render();
    updateSelectionUI();
    setStatus(batchStatus,'已清除选择。',false);
  });
  retryBtn.addEventListener('click',load);
  limitsForm.addEventListener('submit',function(event){
    event.preventDefault();
    var targets=[];
    state.models.forEach(function(item){
      if(selectedKeys.has(keyOf(item)))targets.push({providerId:item.providerId,modelIndex:item.modelIndex});
    });
    if(!targets.length){setStatus(batchStatus,'请先选择要修改的模型。',true);return}
    var contextWindow=cw.value.trim(),maxTokens=mt.value.trim();
    if(!contextWindow&&!maxTokens){setStatus(batchStatus,'请至少填写一个要修改的数值。',true);return}
    var pattern=/^[0-9]+[kKmM]?$/;
    if(contextWindow&&!pattern.test(contextWindow)){setStatus(batchStatus,'上下文上限格式无效，支持 128k、1m 等格式。',true);return}
    if(maxTokens&&!pattern.test(maxTokens)){setStatus(batchStatus,'最大输出格式无效，支持 16384、32k 等格式。',true);return}
    if(targets.length>50){
      if(!window.confirm('将把设置应用到 '+targets.length+' 个模型，是否继续？'))return;
    }
    applyBtn.disabled=true;
    applyBtn.classList.add('busy');
    setStatus(batchStatus,'正在应用…',false);
    post('/apply',{targets:targets,contextWindow:contextWindow,maxTokens:maxTokens}).then(function(result){
      setStatus(batchStatus,'已更新 '+result.changed+' 个模型。',false);
      return load();
    }).catch(function(error){
      setStatus(batchStatus,error.message,true);
    }).finally(function(){
      applyBtn.classList.remove('busy');
      refreshApply();
    });
  });
  parseBtn.addEventListener('click',function(){
    if(!raw.value.trim()){setStatus(importStatus,'请先粘贴连接文本。',true);return}
    parseBtn.disabled=true;
    parseBtn.classList.add('busy');
    setStatus(importStatus,'正在提取字段…',false);
    post('/parse',{text:raw.value}).then(function(result){
      base.value=result.baseURL||'';
      secret.value=result.apiKey||'';
      pname.value=result.providerName||'';
      modelsArea.value=(result.models||[]).join(String.fromCharCode(10));
      setStatus(importStatus,'已提取字段，请检查后创建。',false);
    }).catch(function(error){
      setStatus(importStatus,error.message,true);
    }).finally(function(){
      parseBtn.disabled=false;
      parseBtn.classList.remove('busy');
    });
  });
  discoverBtn.addEventListener('click',function(){
    if(!base.value.trim()){setStatus(importStatus,'请先填写 API 地址。',true);return}
    discoverBtn.disabled=true;
    discoverBtn.classList.add('busy');
    setStatus(importStatus,'正在拉取模型目录…',false);
    post('/discover',{providerId:pid.value,api:api.value,baseURL:base.value,apiKey:secret.value}).then(function(result){
      var values=(result.models||[]).map(function(model){return typeof model==='string'?model:model.id}).filter(Boolean);
      modelsArea.value=values.join(String.fromCharCode(10));
      setStatus(importStatus,'已拉取 '+values.length+' 个模型。',false);
    }).catch(function(error){
      setStatus(importStatus,error.message,true);
    }).finally(function(){
      discoverBtn.disabled=false;
      discoverBtn.classList.remove('busy');
    });
  });
  clearSecretBtn.addEventListener('click',function(){
    raw.value='';
    secret.value='';
    setStatus(importStatus,'已清除连接文本与 API 密钥。',false);
  });
  createForm.addEventListener('submit',function(event){
    event.preventDefault();
    createBtn.disabled=true;
    createBtn.classList.add('busy');
    setStatus(importStatus,'正在创建提供方…',false);
    post('/create',{providerId:pid.value,displayName:pname.value,api:api.value,baseURL:base.value,apiKey:secret.value,models:modelsArea.value}).then(function(result){
      secret.value='';
      setStatus(importStatus,'已创建提供方 '+result.providerId+'。',false);
      return load();
    }).catch(function(error){
      setStatus(importStatus,error.message,true);
    }).finally(function(){
      createBtn.disabled=false;
      createBtn.classList.remove('busy');
    });
  });
  updateSelectionUI();
  refreshApply();
  load();
})();
</script>
`

export function apply(ctx) {
  ctx.effect(() => {
    const disposers = [
      ctx.webServer.register({ kind: 'exact', path: ROOT, handler(request, response) { if (!only(request, response, 'GET')) return; response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); response.end(PAGE) } }),
      ctx.webServer.register({ kind: 'exact', path: ROOT + '/data', handler(request, response) { if (!only(request, response, 'GET')) return; try { send(response, 200, { ok: true, models: listRows(ctx).result }) } catch (error) { send(response, 400, { ok: false, error: publicMessage(error, '无法读取模型设置。') }) } } }),
      ctx.webServer.register({ kind: 'exact', path: ROOT + '/parse', async handler(request, response) { if (!only(request, response, 'POST')) return; try { send(response, 200, Object.assign({ ok: true }, parseConnection((await readBody(request)).text))) } catch (error) { send(response, 400, { ok: false, error: publicMessage(error, '无法解析连接配置。') }) } } }),
      ctx.webServer.register({ kind: 'exact', path: ROOT + '/discover', async handler(request, response) { if (!only(request, response, 'POST')) return; try { send(response, 200, { ok: true, models: await discoverModels(ctx, await readBody(request)) }) } catch (error) { send(response, 400, { ok: false, error: publicMessage(error, '模型目录拉取失败。') }) } } }),
      ctx.webServer.register({ kind: 'exact', path: ROOT + '/apply', async handler(request, response) { if (!only(request, response, 'POST')) return; try { send(response, 200, { ok: true, changed: await applyLimits(ctx, await readBody(request)) }) } catch (error) { send(response, 400, { ok: false, error: publicMessage(error, '模型设置未修改。') }) } } }),
      ctx.webServer.register({ kind: 'exact', path: ROOT + '/create', async handler(request, response) { if (!only(request, response, 'POST')) return; try { send(response, 200, { ok: true, providerId: await createProvider(ctx, await readBody(request)) }) } catch (error) { send(response, 400, { ok: false, error: publicMessage(error, '提供方未创建。') }) } } }),

    ]
    return () => { for (const dispose of disposers) dispose() }
  }, 'model tuner routes')
}