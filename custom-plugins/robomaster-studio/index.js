export const name = 'robomaster-studio'
export const inject = ['webServer']
const PAGE = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RoboMaster Agent 工作台</title>
<style>
:root {
  color-scheme: dark;
  --bg: #070a11;
  --panel: #0d1527;
  --panel2: #090e1a;
  --panel3: #131f37;
  --line: #1e293b;
  --line-light: #334155;
  --text: #f1f5f9;
  --text-muted: #94a3b8;
  --cyan: #00f2fe;
  --cyan-dim: #0284c7;
  --amber: #f59e0b;
  --amber-dim: #b45309;
  --red: #f43f5e;
  --blue: #38bdf8;
  --green: #10b981;
  --accent: #6366f1;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  background-image: 
    radial-gradient(ellipse at 15% 0%, rgba(56, 189, 248, 0.08) 0%, transparent 60%),
    radial-gradient(ellipse at 85% 100%, rgba(99, 102, 241, 0.08) 0%, transparent 60%);
  color: var(--text);
  font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  overflow-x: hidden;
}
.app {
  max-width: 1680px;
  margin: auto;
  padding: 14px;
}
.top {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--line);
  padding-bottom: 12px;
  margin-bottom: 12px;
  background: rgba(13, 21, 39, 0.7);
  backdrop-filter: blur(10px);
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--line);
}
.brand {
  flex: 1;
  min-width: 240px;
}
.brand h1 {
  font-size: 17px;
  font-weight: 700;
  margin: 0;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
}
.brand h1 .tag-rm {
  font-size: 11px;
  background: linear-gradient(135deg, var(--cyan-dim), var(--accent));
  color: #fff;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 800;
}
.brand p {
  color: var(--text-muted);
  margin: 2px 0 0;
  font-size: 11px;
}
.btn, select, input, textarea {
  font: inherit;
  color: var(--text);
  background: var(--panel2);
  border: 1px solid var(--line-light);
  border-radius: 5px;
  transition: all 0.15s ease;
}
.btn {
  height: 28px;
  padding: 0 10px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}
.btn:hover {
  border-color: var(--blue);
  background: #152238;
}
.btn.primary {
  background: linear-gradient(135deg, #0284c7, #2563eb);
  color: #fff;
  border-color: #38bdf8;
  font-weight: 600;
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.25);
}
.btn.primary:hover {
  background: linear-gradient(135deg, #0369a1, #1d4ed8);
}
.btn.warn { color: var(--amber); border-color: rgba(245, 158, 11, 0.4); }
.btn.danger { color: var(--red); border-color: rgba(244, 63, 94, 0.4); }
.btn.danger:hover { background: rgba(244, 63, 94, 0.15); border-color: var(--red); }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }

.card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}
.row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.grow { flex: 1; }
.muted { color: var(--text-muted); font-size: 12px; }
.status { font-size: 12px; color: var(--text-muted); }

.grid {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}
.side { display: flex; flex-direction: column; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
.field label { font-size: 11px; color: var(--text-muted); font-weight: 500; }
input, select { height: 28px; padding: 0 8px; width: 100%; font-size: 12px; }
input:focus, select:focus, textarea:focus { outline: none; border-color: var(--blue); box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2); }
textarea {
  width: 100%;
  min-height: 100px;
  padding: 8px;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.45;
}
.work { display: flex; flex-direction: column; gap: 12px; min-width: 0; }

.canvaswrap {
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel2);
  padding: 8px;
  position: relative;
  box-shadow: inset 0 0 30px rgba(0,0,0,0.5);
}
.canvas {
  position: relative;
  width: 1120px;
  height: 620px;
  overflow: hidden;
  background-color: #060a12;
  background-image: 
    linear-gradient(rgba(30, 41, 59, 0.4) 1px, transparent 1px),
    linear-gradient(90deg, rgba(30, 41, 59, 0.4) 1px, transparent 1px),
    radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.03) 0%, transparent 80%);
  background-size: 20px 20px, 20px 20px, 100% 100%;
  border-radius: 6px;
}
.zone {
  position: absolute;
  top: 14px;
  bottom: 14px;
  border: 1px dashed;
  border-radius: 6px;
  pointer-events: auto;
  z-index: 1;
  transition: all 0.2s ease;
}
.zone b {
  position: absolute;
  top: -10px;
  left: 10px;
  background: #060a12;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  border-radius: 3px;
}
.zone.common {
  left: 14px;
  width: 310px;
  border-color: rgba(0, 242, 254, 0.35);
  background: rgba(0, 242, 254, 0.015);
}
.zone.common b { color: var(--cyan); border: 1px solid rgba(0, 242, 254, 0.3); }
.zone.target {
  left: 340px;
  right: 14px;
  border-color: rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.015);
}
.zone.target b { color: var(--amber); border: 1px solid rgba(245, 158, 11, 0.3); }

svg.edges { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; z-index: 2; }
.edge-path { stroke: rgba(56, 189, 248, 0.82); stroke-width: 2.5; fill: none; vector-effect: non-scaling-stroke; stroke-linecap: round; stroke-linejoin: round; marker-end: url(#rbst-edge-arrow); filter: url(#rbst-edge-glow); transition: stroke 0.2s, stroke-width 0.2s, opacity 0.2s; }
.edge-path:hover { stroke: var(--cyan); stroke-width: 3.5; }
.edge-path.edge-shadow { stroke: rgba(0, 242, 254, 0.7); stroke-width: 8; opacity: 0.2; filter: url(#rbst-edge-shadow); marker-end: none; }

.node {
  position: absolute;
  width: 216px;
  height: 114px;
  border: 1px solid var(--line-light);
  border-radius: 6px;
  background: rgba(13, 21, 39, 0.95);
  backdrop-filter: blur(4px);
  overflow: hidden;
  z-index: 3;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
  transition: border-color 0.15s, box-shadow 0.15s;
  cursor: pointer;
}
.node:hover {
  border-color: var(--blue);
  box-shadow: 0 6px 20px rgba(56, 189, 248, 0.2);
}
.node.selected {
  border-color: var(--cyan);
  outline: 2px solid var(--cyan);
  box-shadow: 0 0 16px rgba(0, 242, 254, 0.35);
  z-index: 4;
}
.node.off { opacity: 0.45; filter: grayscale(0.6); }
.nodehead {
  height: 28px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  cursor: grab;
  touch-action: none;
  background: #132238;
  font-size: 11px;
  font-weight: 600;
  user-select: none;
  border-bottom: 1px solid var(--line);
}
.node.target .nodehead { background: #261c10; }
.dot { width: 7px; height: 7px; border-radius: 50%; background: var(--cyan); box-shadow: 0 0 6px var(--cyan); }
.target .dot { background: var(--amber); box-shadow: 0 0 6px var(--amber); }
.tag {
  border: 1px solid var(--line-light);
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
  background: rgba(0,0,0,0.3);
}
.nodebody { padding: 8px; display: flex; flex-direction: column; gap: 3px; }
.nodebody strong { font-size: 12px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nodebody span { font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nodebody code { font-size: 10px; color: #7dd3fc; background: rgba(125, 211, 252, 0.08); padding: 1px 4px; border-radius: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* 悬浮设置面板自适应与防裁切优化 */
.editor {
  position: absolute;
  width: 320px;
  max-width: calc(100% - 28px);
  max-height: calc(100% - 28px);
  overflow: auto;
  overscroll-behavior: contain;
  background: rgba(13, 21, 39, 0.98);
  border: 1px solid var(--cyan);
  border-radius: 8px;
  z-index: 10;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.75), 0 0 15px rgba(0, 242, 254, 0.2);
  padding: 12px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  backdrop-filter: blur(10px);
}
.editorhead {
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -12px -12px 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--line);
  font-size: 12px;
  font-weight: 600;
  background: #152238;
}
.editor textarea { min-height: 90px; }
.editor .field { margin-top: 6px; }

.nodeport {
  position: absolute;
  z-index: 5;
  width: 20px;
  height: 20px;
  border: 1px solid var(--blue);
  border-radius: 50%;
  background: #090e1a;
  color: var(--blue);
  padding: 0;
  cursor: crosshair;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  transition: all 0.15s ease;
}
.nodeport:hover {
  background: var(--blue);
  color: #000;
  box-shadow: 0 0 8px var(--blue);
}
.nodeport.out { right: -10px; top: 48px; }
.nodeport.in { left: -10px; top: 48px; }
.pending-port { background: var(--cyan) !important; color: #000 !important; box-shadow: 0 0 10px var(--cyan) !important; }

.edgegrid { display: grid; grid-template-columns: minmax(140px,1fr) minmax(140px,1fr) auto; gap: 8px; }
.edgeslist { max-height: 160px; overflow-y: auto; }
.edgeitem {
  display: flex;
  align-items: center;
  gap: 8px;
  border-top: 1px solid var(--line);
  padding: 6px 0;
  font-size: 12px;
  min-width: 0;
}
.edgeitem .grow { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.profile-drop {
  border: 1px dashed var(--blue);
  border-radius: 6px;
  padding: 8px;
  margin-top: 8px;
  color: #7dd3fc;
  text-align: center;
  font-size: 11px;
  background: rgba(56, 189, 248, 0.05);
  transition: all 0.15s;
}
.drop-hot { background: rgba(56, 189, 248, 0.2) !important; border-color: var(--cyan) !important; color: #fff !important; }

.membergrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; }
.profilecard { min-height: 140px; display: flex; flex-direction: column; gap: 8px; }
.badge { font-size: 10px; border: 1px solid var(--line-light); border-radius: 3px; padding: 1px 5px; color: var(--text-muted); }
.badge.live { color: var(--green); border-color: rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.1); }
.badge.missing { color: var(--amber); border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.1); }

.notice {
  border-left: 3px solid var(--amber);
  padding: 8px 10px;
  background: rgba(245, 158, 11, 0.08);
  color: #fde68a;
  font-size: 12px;
  border-radius: 0 4px 4px 0;
}
.toast {
  position: fixed;
  right: 20px;
  bottom: 20px;
  max-width: 420px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid var(--blue);
  border-radius: 6px;
  padding: 9px 14px;
  opacity: 0;
  transform: translateY(8px);
  transition: 0.2s ease;
  pointer-events: none;
  z-index: 99999;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  font-size: 12px;
}
.toast.show { opacity: 1; transform: none; }
.toast.error { border-color: var(--red); color: #fecdd3; }

@media (max-width: 900px) {
  .grid { grid-template-columns: 1fr; }
  .side { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
  .app { padding: 8px; }
  .canvaswrap { padding: 4px; }
}
</style>
</head>
<body>
<div class="app">
  <div id="root"></div>
</div>
<div id="toast" class="toast"></div>
<script>
(()=>{
  const KEY='dsh.robomaster.studio.v1', W=1120, H=620, NW=216, NH=114;
  const $ = s => document.querySelector(s), root = $('#root'), toast = $('#toast');
  const uid = p => p + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function starter() {
    const now = Date.now();
    return {
      version: 1,
      mode: 'builder',
      activeWorkspaceId: 'starter',
      memberDefaults: {},
      ui: { editor: { x: 760, y: 80 } },
      workspaces: [{
        id: 'starter',
        name: 'RoboMaster 起步工作区',
        description: '通用规范、项目约束和专业技术树模板。',
        path: '',
        createdAt: now,
        updatedAt: now,
        nodes: [
          { id: 'team', type: 'common', group: '通用', label: '队伍通用规范', section: 'robomaster:team-guidance', action: 'insert', placement: 'end', after: '', order: 0, text: '你服务于 RoboMaster 队伍。回答优先给出可执行步骤、明确假设、风险和验证方式。不要编造队内事实；缺少关键上下文时先询问。', enabled: true, x: 35, y: 55 },
          { id: 'project', type: 'common', group: '通用', label: '项目强约束', section: 'robomaster:project-constraints', action: 'insert', placement: 'end', after: '', order: 0, text: '这是一个 RoboMaster 项目。涉及硬件、软件或机械变更时，说明接口、依赖、测试影响和待确认项。', enabled: true, x: 35, y: 245 },
          { id: 'hardware', type: 'target', group: '硬件', label: '硬件', section: 'robomaster:hardware', action: 'insert', placement: 'end', after: '', order: 0, text: '处理硬件任务时，优先核对电源、接口、电平、额定参数、封装和可测试性；将不确定参数明确标为待确认。', enabled: true, x: 370, y: 55 },
          { id: 'jlc', type: 'target', group: '硬件', label: '嘉立创建库 / PCB', section: 'robomaster:jlc-pcb', action: 'insert', placement: 'end', after: '', order: 0, text: '处理嘉立创或立创 EDA 相关任务时，给出封装、BOM、设计规则和下单前检查清单。', enabled: true, x: 710, y: 55 },
          { id: 'embedded', type: 'target', group: '嵌入式', label: '嵌入式', section: 'robomaster:embedded', action: 'insert', placement: 'end', after: '', order: 0, text: '处理嵌入式任务时，说明目标 MCU、外设、时序、中断上下文、通信协议和可复现的验证步骤。', enabled: true, x: 370, y: 330 }
        ],
        edges: [
          { id: 'e1', source: 'team', target: 'hardware', enabled: true },
          { id: 'e2', source: 'project', target: 'hardware', enabled: true },
          { id: 'e3', source: 'hardware', target: 'jlc', enabled: true },
          { id: 'e4', source: 'team', target: 'embedded', enabled: true },
          { id: 'e5', source: 'project', target: 'embedded', enabled: true }
        ],
        profiles: [
          { id: 'hw-jlc', label: '硬件 / 嘉立创建库', description: '硬件组基础组合。修改节点或连接后需要重新发布。', presetName: 'robomaster-hardware-jlc', nodeIds: ['team', 'project', 'hardware', 'jlc'], publishedAt: null, publishedName: null, updatedAt: now }
        ]
      }]
    };
  }

  function normalize(raw) {
    if (!raw || !Array.isArray(raw.workspaces) || !raw.workspaces.length) return starter();
    raw.mode = raw.mode === 'member' ? 'member' : 'builder';
    raw.memberDefaults = raw.memberDefaults || {};
    raw.ui = raw.ui || { editor: { x: 760, y: 80 } };
    raw.workspaces.forEach(w => {
      w.nodes = w.nodes || [];
      w.edges = w.edges || [];
      w.profiles = w.profiles || [];
      w.nodes.forEach(n => {
        n.type = n.type === 'target' ? 'target' : 'common';
        n.enabled = n.enabled !== false;
        n.x = clamp(Number(n.x) || 35, 0, W - NW);
        n.y = clamp(Number(n.y) || 55, 0, H - NH);
        n.action = ['insert', 'replace', 'remove'].includes(n.action) ? n.action : 'insert';
        n.placement = ['end', 'top', 'after', 'number'].includes(n.placement) ? n.placement : 'end';
      });
    });
    if (!raw.workspaces.some(w => w.id === raw.activeWorkspaceId)) raw.activeWorkspaceId = raw.workspaces[0].id;
    return raw;
  }

  let state;
  try { state = normalize(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch(e) { state = starter(); }
  let selectedNode = null, selectedProfile = null, remote = { loaded: false, names: [], active: null }, drag = null;

  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
  function ws() { return state.workspaces.find(w => w.id === state.activeWorkspaceId) || state.workspaces[0]; }
  function node() { return ws().nodes.find(n => n.id === selectedNode) || null; }
  function profile() { return ws().profiles.find(p => p.id === selectedProfile) || ws().profiles[0] || null; }

  function tell(text, bad) {
    toast.textContent = text;
    toast.className = 'toast show' + (bad ? ' error' : '');
    clearTimeout(tell.t);
    tell.t = setTimeout(() => toast.className = 'toast', 3800);
  }

  async function api(url, payload) {
    const r = await fetch(url, {
      method: payload ? 'POST' : 'GET',
      headers: payload ? { 'Content-Type': 'application/json' } : {},
      body: payload ? JSON.stringify(payload) : undefined
    });
    const d = await r.json().catch(() => ({ ok: false, error: '响应不是 JSON' }));
    if (!r.ok || d.ok === false) throw new Error(d.error || '请求失败');
    return d;
  }

  async function refreshRemote() {
    try {
      const d = await api('/robomaster-studio/api/presets');
      const list = d.list || {};
      const rows = Array.isArray(list) ? list : (list.presets || []);
      remote = { loaded: true, names: rows.map(x => x.name), active: d.active || list.active || null };
    } catch(e) {
      remote = { loaded: false, names: [], active: null };
    }
    render();
  }

  function invalidate(ids) {
    ws().profiles.forEach(p => {
      if (ids.some(id => p.nodeIds.includes(id))) {
        p.publishedAt = null;
        p.updatedAt = Date.now();
      }
    });
  }

  function ensure() {
    const w = ws();
    if (!w.nodes.some(n => n.id === selectedNode)) selectedNode = null;
    const preferred = state.memberDefaults[w.id];
    if (!w.profiles.some(p => p.id === selectedProfile)) selectedProfile = w.profiles.some(p => p.id === preferred) ? preferred : (w.profiles[0]?.id || null);
  }

  function nodeRule(n) {
    const r = { action: n.action, section: n.section };
    if (n.action !== 'remove') r.text = n.text;
    if (n.placement === 'top') r.order = -1000;
    if (n.placement === 'after') r.after = n.after;
    if (n.placement === 'number') r.order = Number(n.order || 0);
    return r;
  }

  function ordered(p) {
    const w = ws(), chosen = w.nodes.filter(n => p.nodeIds.includes(n.id) && n.enabled), m = new Map(chosen.map(n => [n.id, n])), wait = {}, next = {};
    chosen.forEach(n => { wait[n.id] = []; next[n.id] = []; });
    w.edges.filter(e => e.enabled && m.has(e.source) && m.has(e.target)).forEach(e => {
      wait[e.target].push(e.source);
      next[e.source].push(e.target);
    });
    const stable = (a, b) => a.y - b.y || a.x - b.x || a.label.localeCompare(b.label);
    const ready = chosen.filter(n => !wait[n.id].length).sort(stable), out = [];
    while (ready.length) {
      const n = ready.shift();
      out.push(n);
      next[n.id].forEach(id => {
        wait[id] = wait[id].filter(x => x !== n.id);
        if (!wait[id].length) ready.push(m.get(id));
      });
      ready.sort(stable);
    }
    const cycle = chosen.filter(n => !out.includes(n)).sort(stable);
    return { nodes: out.concat(cycle), cycle: cycle.length > 0 };
  }

  function check(p) {
    const errors = [], o = ordered(p), sections = {};
    if (!/^[a-z][a-z0-9_-]*$/.test(p.presetName || '')) errors.push('预设名需以小写字母开头，且只含小写字母、数字、-、_。');
    if (!o.nodes.length) errors.push('组合没有已启用的节点。');
    o.nodes.forEach(n => {
      if (!/^[a-z][a-z0-9_.:-]*$/.test(n.section || '')) errors.push('“' + n.label + '”段名不合法。');
      if (n.action !== 'remove' && !String(n.text || '').trim()) errors.push('“' + n.label + '”缺少提示词内容。');
      if (n.placement === 'after' && !n.after) errors.push('“' + n.label + '”缺少锚点段。');
      if (n.action === 'insert' && sections[n.section]) errors.push('段名 ' + n.section + ' 有多个新增节点。');
      sections[n.section] = 1;
    });
    return { errors, rules: o.nodes.map(nodeRule), cycle: o.cycle };
  }

  function render() {
    ensure();
    const w = ws(), p = profile();
    root.innerHTML = \`
      <div class="top">
        <div class="brand">
          <h1><span class="tag-rm">RM</span>RoboMaster Agent 工作台</h1>
          <p>\${state.mode === 'builder' ? '负责人视图：组织通用规则、科技树与可发布 Agent 组合' : '队员视图：选择项目与负责人发布的 Agent 预设组合'}</p>
        </div>
        <div class="row">
          <button class="btn \${state.mode === 'builder' ? 'primary' : ''}" data-action="mode-builder">配置科技树</button>
          <button class="btn \${state.mode === 'member' ? 'primary' : ''}" data-action="mode-member">队员使用</button>
          <button class="btn" data-action="toggle-transfer">\${state.transfer ? '关闭导入导出' : '导入/导出'}</button>
          <button class="btn exit-btn" data-close-workbench="1">返回 DSH</button>
        </div>
      </div>
      \${state.mode === 'builder' ? builder(w, p) : member(w)}
      \${state.transfer ? transfer() : ''}
    \`;
    scheduleDrawEdges();
  }

  function workspaceSide(w) {
    return \`
      <div class="card side">
        <div class="row"><strong style="font-size:13px;color:#fff;">项目工作区</strong></div>
        <div class="field">
          <label>当前项目</label>
          <select data-field="workspace">
            \${state.workspaces.map(x => \`<option value="\${x.id}" \${x.id === w.id ? 'selected' : ''}>\${esc(x.name)}</option>\`).join('')}
          </select>
        </div>
        <div class="field">
          <label>项目名称</label>
          <input data-work="name" value="\${esc(w.name)}">
        </div>
        <div class="field">
          <label>工作区说明</label>
          <input data-work="description" value="\${esc(w.description || '')}" placeholder="可选说明">
        </div>
        <div class="row" style="margin-top:6px;">
          <input id="new-workspace" placeholder="新工作区名称" class="grow" style="height:28px;">
          <button class="btn" data-action="new-workspace">+ 新建</button>
        </div>
        <div class="row" style="margin-top:4px;">
          <button class="btn grow" data-action="duplicate-workspace">复制副本</button>
          <button class="btn danger" data-action="delete-workspace" \${state.workspaces.length <= 1 ? 'disabled' : ''}>删除</button>
        </div>
      </div>
    \`;
  }

  function builder(w, p) {
    return \`
      <div class="grid">
        \${workspaceSide(w)}
        <div class="work">
          <div class="card" style="padding:10px 14px;">
            <div class="row">
              <strong style="font-size:13px;color:#fff;">提示词科技树画布</strong>
              <span class="muted">拖动安排节点；点击节点编辑参数；拖动端口快速连接</span>
              <div class="grow"></div>
              <button class="btn" data-action="add-common" style="color:var(--cyan);border-color:rgba(0,242,254,0.4);">+ 通用规则</button>
              <button class="btn" data-action="add-target" style="color:var(--amber);border-color:rgba(245,158,11,0.4);">+ 科技树节点</button>
            </div>
          </div>
          \${canvas(w)}
          <div class="card">
            <div class="row" style="margin-bottom:8px;">
              <strong style="font-size:13px;color:#fff;">连接拓扑管理</strong>
              <span class="muted">有向连接决定 Agent 预设内部段落的装配与拓扑排序</span>
            </div>
            <div class="row edgegrid">
              <select id="edge-source">
                <option value="">选择起点节点...</option>
                \${w.nodes.map(n => \`<option value="\${n.id}">\${esc(n.label)}</option>\`).join('')}
              </select>
              <select id="edge-target">
                <option value="">选择目标节点...</option>
                \${w.nodes.map(n => \`<option value="\${n.id}">\${esc(n.label)}</option>\`).join('')}
              </select>
              <button class="btn primary" data-action="add-edge">建立连接</button>
            </div>
            <div class="edgeslist" style="margin-top:8px;">
              \${w.edges.map(e => edgeRow(w, e)).join('')}
            </div>
          </div>
          \${profiles(w, p)}
        </div>
      </div>
    \`;
  }

  function canvas(w) {
    const n = node();
    return \`
      <div class="canvaswrap">
        <div id="canvas" class="canvas">
          <div class="zone common"><b>通用规范分区 · 拖入转移</b></div>
          <div class="zone target"><b>科技树 / 针对性能力分区 · 拖入转移</b></div>
          <svg id="edge-svg" class="edges"></svg>
          \${w.nodes.map(n => \`
            <div class="node \${n.type} \${n.id === selectedNode ? 'selected' : ''} \${!n.enabled ? 'off' : ''}"
                 data-node="\${n.id}" style="left:\${n.x}px;top:\${n.y}px">
              <div class="nodehead" data-drag-node="\${n.id}">
                <span class="dot"></span>
                <span class="tag">\${esc(n.type === 'target' ? n.group : '通用')}</span>
                <span class="grow" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">\${esc(n.label)}</span>
                <span class="tag" style="opacity:0.7;">\${n.enabled ? '已启用' : '停用'}</span>
              </div>
              <div class="nodebody">
                <strong>\${esc(n.label)}</strong>
                <code>\${esc(n.section)}</code>
                <span>\${esc(n.text || '（空提示词内容）')}</span>
              </div>
            </div>
          \`).join('')}
          \${n ? editor(n) : ''}
        </div>
      </div>
    \`;
  }

  function editor(n) {
    const rawPos = state.ui.editor || { x: 760, y: 80 };
    // 严格限制在画布安全视口内，防止右侧和底部被裁切
    const edX = clamp(rawPos.x, 12, Math.max(12, W - 348));
    const edY = clamp(rawPos.y, 12, Math.max(12, H - 360));
    return \`
      <div id="editor" class="editor" style="left:\${edX}px;top:\${edY}px;">
        <div class="editorhead" data-drag-editor="1">
          <span style="color:var(--cyan);font-weight:700;">⚙ 节点属性配置</span>
          <div class="row" style="gap:4px;">
            <button class="btn danger" style="height:22px;padding:0 6px;font-size:11px;" data-action="delete-node">删除</button>
            <button class="btn" style="height:22px;padding:0 6px;font-size:11px;" data-close-editor="1">关闭 ✕</button>
          </div>
        </div>
        <div class="field">
          <label>节点名称</label>
          <input data-node-field="label" value="\${esc(n.label)}">
        </div>
        <div class="field">
          <label>分类分组</label>
          <input data-node-field="group" value="\${esc(n.group || '')}">
        </div>
        <div class="field">
          <label>系统提示词段名 (Section ID)</label>
          <input data-node-field="section" value="\${esc(n.section)}">
        </div>
        <div class="row" style="margin-top:6px;">
          <div class="field grow">
            <label>覆盖动作</label>
            <select data-node-field="action">
              \${['insert|新增段 (Insert)','replace|替换段 (Replace)','remove|移除段 (Remove)'].map(x => {
                let [a, b] = x.split('|');
                return \`<option value="\${a}" \${n.action === a ? 'selected' : ''}>\${b}</option>\`;
              }).join('')}
            </select>
          </div>
          <div class="field grow">
            <label>排序规则</label>
            <select data-node-field="placement">
              \${['end|末尾追加','top|顶部优先','after|指定段之后','number|数值权重'].map(x => {
                let [a, b] = x.split('|');
                return \`<option value="\${a}" \${n.placement === a ? 'selected' : ''}>\${b}</option>\`;
              }).join('')}
            </select>
          </div>
        </div>
        \${n.placement === 'after' ? \`
          <div class="field">
            <label>锚点段名 (After Section)</label>
            <input data-node-field="after" value="\${esc(n.after || '')}">
          </div>
        \` : ''}
        \${n.placement === 'number' ? \`
          <div class="field">
            <label>数值权重 (Order)</label>
            <input type="number" data-node-field="order" value="\${esc(n.order || 0)}">
          </div>
        \` : ''}
        \${n.action !== 'remove' ? \`
          <div class="field">
            <label>提示词内容 (System Prompt Content)</label>
            <textarea data-node-field="text">\${esc(n.text || '')}</textarea>
          </div>
        \` : ''}
        <div class="row" style="margin-top:10px;">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;">
            <input type="checkbox" data-node-enabled="1" \${n.enabled ? 'checked' : ''} style="width:auto;height:auto;">
            <span>启用此节点</span>
          </label>
        </div>
      </div>
    \`;
  }

  function edgeRow(w, e) {
    const a = w.nodes.find(n => n.id === e.source), b = w.nodes.find(n => n.id === e.target);
    return \`
      <div class="edgeitem">
        <label style="display:flex;align-items:center;gap:4px;">
          <input type="checkbox" data-edge-enabled="\${e.id}" \${e.enabled ? 'checked' : ''} style="width:auto;height:auto;">
        </label>
        <span class="grow">\${esc(a?.label || e.source)} <span style="color:var(--blue);">→</span> \${esc(b?.label || e.target)}</span>
        <button class="btn danger" style="height:22px;padding:0 6px;font-size:11px;" data-delete-edge="\${e.id}">删除</button>
      </div>
    \`;
  }

  function profiles(w, p) {
    return \`
      <div class="card">
        <div class="row" style="margin-bottom:8px;">
          <strong style="font-size:13px;color:#fff;">Agent 组合与发布</strong>
          \${w.profiles.length ? \`
            <select data-field="profile" style="width:auto;max-width:240px;">
              \${w.profiles.map(x => \`<option value="\${x.id}" \${p && x.id === p.id ? 'selected' : ''}>\${esc(x.label)}</option>\`).join('')}
            </select>
          \` : ''}
          \${p ? \`<span class="badge \${p.publishedAt ? 'live' : ''}">\${p.publishedAt ? '已发布' : '草稿未发布'}</span>\` : ''}
          <div class="grow"></div>
          <button class="btn" data-action="new-profile">+ 新组合</button>
        </div>
        \${p ? \`
          <div class="row">
            <div class="field grow">
              <label>组合名称</label>
              <input data-profile-field="label" value="\${esc(p.label)}">
            </div>
            <div class="field grow">
              <label>DSH 预设标识名 (Preset ID)</label>
              <input data-profile-field="presetName" value="\${esc(p.presetName)}">
            </div>
          </div>
          <div class="field">
            <label>组合描述</label>
            <input data-profile-field="description" value="\${esc(p.description || '')}" placeholder="简短说明该 Agent 的适用场景">
          </div>
          <div class="field">
            <label>包含的节点（勾选或从上方画布拖拽节点加入）</label>
            <div class="row" style="gap:6px;margin-top:4px;">
              \${w.nodes.map(n => \`
                <label style="background:var(--panel2);border:1px solid var(--line);border-radius:4px;padding:3px 8px;font-size:11px;display:flex;align-items:center;gap:4px;cursor:pointer;">
                  <input type="checkbox" data-profile-node="\${n.id}" \${p.nodeIds.includes(n.id) ? 'checked' : ''} style="width:auto;height:auto;">
                  \${esc(n.label)}
                </label>
              \`).join('')}
            </div>
          </div>
          <div class="row" style="margin-top:12px;gap:8px;">
            <button class="btn" data-action="default-profile">设为项目默认</button>
            <button class="btn primary" data-action="publish">发布预设到 DSH</button>
            <button class="btn primary" data-action="publish-activate" style="background:linear-gradient(135deg,#10b981,#059669);border-color:#34d399;">发布并立即激活</button>
            <div class="grow"></div>
            <button class="btn danger" data-action="delete-profile">删除组合</button>
          </div>
        \` : '<div class="muted">当前工作区暂无 Agent 组合，请点击上方“+ 新组合”进行创建。</div>'}
      </div>
    \`;
  }

  function member(w) {
    return \`
      <div class="card">
        <div class="row" style="margin-bottom:12px;">
          <strong style="font-size:14px;color:#fff;">队员预设中心</strong>
          <span class="muted">选择所需技术岗位预设，激活后自动应用于本地所有模型会话</span>
          <div class="grow"></div>
          <select data-field="workspace" style="width:auto;max-width:240px;">
            \${state.workspaces.map(x => \`<option value="\${x.id}" \${x.id === w.id ? 'selected' : ''}>\${esc(x.name)}</option>\`).join('')}
          </select>
        </div>
        <div class="notice" style="margin-bottom:12px;">
          \${remote.loaded ? (remote.active ? '当前本地 DSH 全局活跃预设：<b>' + esc(remote.active) + '</b>' : '当前本地 DSH 未激活任何全局预设') : '正在连接 DSH Prompt Manager 服务...'}
        </div>
        <div class="membergrid">
          \${w.profiles.map(p => memberCard(p)).join('')}
        </div>
      </div>
    \`;
  }

  function memberCard(p) {
    const missing = !!p.publishedAt && remote.loaded && !remote.names.includes(p.presetName);
    const isActive = remote.active === p.presetName;
    return \`
      <div class="card profilecard" style="\${isActive ? 'border-color:var(--cyan);box-shadow:0 0 16px rgba(0,242,254,0.2);' : ''}">
        <div class="row">
          <strong style="font-size:13px;color:#fff;">\${esc(p.label)}</strong>
          <div class="grow"></div>
          <span class="badge \${isActive ? 'live' : (missing ? 'missing' : (p.publishedAt ? 'live' : ''))}">
            \${isActive ? '正在使用' : (missing ? '预设缺失' : (p.publishedAt ? '已就绪' : '草稿'))}
          </span>
        </div>
        <p style="font-size:12px;color:var(--text-muted);flex:1;">\${esc(missing ? '本地未找到此预设，请联系负责人发布。' : (p.description || '暂无描述'))}</p>
        <button class="btn \${isActive ? '' : 'primary'}" data-member-activate="\${p.id}" \${(!p.publishedAt || missing || isActive) ? 'disabled' : ''}>
          \${isActive ? '✓ 当前正在生效' : (!p.publishedAt ? '等待负责人发布' : (missing ? '预设缺失' : '激活使用此预设'))}
        </button>
      </div>
    \`;
  }

  function transfer() {
    return \`
      <div class="card" style="margin-top:14px;">
        <div class="row" style="margin-bottom:8px;">
          <strong style="font-size:13px;color:#fff;">队伍数据包导入 / 导出</strong>
          <span class="muted">支持跨设备同步科技树拓扑与配置</span>
        </div>
        <div class="row" style="margin-bottom:8px;">
          <button class="btn" data-action="export">生成导出 JSON</button>
          <button class="btn primary" data-action="import">导入下方 JSON</button>
        </div>
        <textarea id="transfer" style="min-height:140px;">\${esc(state.transferText || '')}</textarea>
      </div>
    \`;
  }

  let edgeFrame = 0;

  function scheduleDrawEdges() {
    if (edgeFrame) return;
    const raf = window.requestAnimationFrame || (fn => window.setTimeout(fn, 0));
    edgeFrame = raf(() => {
      edgeFrame = 0;
      drawEdges();
    });
  }

  function drawEdges() {
    const svg = $('#edge-svg');
    if (!svg) return;

    const w = ws();
    const nodes = Object.fromEntries(w.nodes.map(n => [n.id, n]));
    const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;

    const paths = w.edges.filter(e => e.enabled).map(e => {
      const a = nodes[e.source];
      const b = nodes[e.target];
      if (!a || !b) return '';

      const x1 = number(a.x) + NW;
      const y1 = number(a.y) + NH / 2;
      const x2 = number(b.x);
      const y2 = number(b.y) + NH / 2;
      const direction = x2 >= x1 ? 1 : -1;
      const span = Math.max(48, Math.min(220, Math.abs(x2 - x1) * 0.5 || 48));
      const c1x = x1 + direction * span;
      const c2x = x2 - direction * span;
      const d = 'M ' + x1 + ' ' + y1 + ' C ' + c1x + ' ' + y1 + ', ' + c2x + ' ' + y2 + ', ' + x2 + ' ' + y2;

      return '<path class="edge-path edge-shadow" d="' + d + '"></path>' +
        '<path class="edge-path" d="' + d + '" marker-end="url(#rbst-edge-arrow)"></path>';
    }).join('');

    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', String(W));
    svg.setAttribute('height', String(H));
    svg.innerHTML =
      '<defs>' +
        '<marker id="rbst-edge-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">' +
          '<path d="M 0 0 L 10 5 L 0 10 Z" fill="#38bdf8"></path>' +
        '</marker>' +
        '<filter id="rbst-edge-glow" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">' +
          '<feGaussianBlur stdDeviation="2.5" result="blur"></feGaussianBlur>' +
          '<feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>' +
        '</filter>' +
        '<filter id="rbst-edge-shadow" x="-50%" y="-50%" width="200%" height="200%">' +
          '<feGaussianBlur stdDeviation="4"></feGaussianBlur>' +
        '</filter>' +
      '</defs>' + paths;
  }

  function addNode(type) {
    const w = ws(), count = w.nodes.filter(n => n.type === type).length;
    const n = {
      id: uid('node'),
      type,
      group: type === 'target' ? '未分组' : '通用',
      label: type === 'target' ? '新的科技树能力' : '新的通用规范',
      section: 'robomaster:' + type + '-' + Date.now().toString(36).slice(-5),
      action: 'insert',
      placement: 'end',
      after: '',
      order: 0,
      text: '',
      enabled: true,
      x: type === 'target' ? 420 : 40,
      y: clamp(60 + count * 120, 0, H - NH)
    };
    w.nodes.push(n);
    selectedNode = n.id;
    save();
    render();
  }

  function patchNode(field, value) {
    const n = node();
    if (!n) return;
    n[field] = value;
    invalidate([n.id]);
    save();
    render();
  }

  function setWorkspace(id) {
    state.activeWorkspaceId = id;
    selectedNode = null;
    selectedProfile = null;
    save();
    render();
  }

  async function publish(activate) {
    const p = profile();
    if (!p) return;
    const v = check(p);
    if (v.errors.length) return tell(v.errors[0], true);
    if (activate && !confirm('启用会切换本机 DSH 的全局活跃预设，并影响所有会话的下一次模型步骤。继续吗？')) return;
    try {
      await api('/robomaster-studio/api/publish', {
        name: p.presetName,
        label: p.label,
        description: p.description,
        overrides: v.rules
      });
      p.publishedAt = Date.now();
      p.publishedName = p.presetName;
      save();
      await refreshRemote();
      if (activate) await activateProfile(p);
      else tell(v.cycle ? '已发布；循环节点按画布拓扑排序。' : '已成功发布为 DSH 提示词预设。');
    } catch(e) {
      tell('发布失败：' + e.message, true);
    }
  }

  async function activateProfile(p) {
    if (!p?.publishedAt) return tell('请先发布该组合。', true);
    if (remote.loaded && !remote.names.includes(p.presetName)) return tell('本机未找到预设“' + p.presetName + '”。', true);
    if (!confirm('启用“' + p.label + '”会切换本机 DSH 的全局活跃预设，并影响所有会话的下一次模型步骤。继续吗？')) return;
    try {
      await api('/robomaster-studio/api/activate', { name: p.presetName });
      state.memberDefaults[ws().id] = p.id;
      save();
      await refreshRemote();
      tell('已激活并正在使用“' + p.label + '”。');
    } catch(e) {
      tell('启用失败：' + e.message, true);
    }
  }

  // 事件委托交互
  root.addEventListener('change', e => {
    const t = e.target, w = ws(), p = profile();
    if (t.matches('[data-field="workspace"]')) return setWorkspace(t.value);
    if (t.matches('[data-field="profile"]')) { selectedProfile = t.value; render(); return; }
    if (t.matches('[data-work]')) { w[t.dataset.work] = t.value; w.updatedAt = Date.now(); save(); return; }
    if (t.matches('[data-node-field]')) return patchNode(t.dataset.nodeField, t.value);
    if (t.matches('[data-node-enabled]')) return patchNode('enabled', t.checked);
    if (t.matches('[data-profile-field]') && p) {
      p[t.dataset.profileField] = t.value;
      p.publishedAt = null;
      p.updatedAt = Date.now();
      save();
      render();
      return;
    }
    if (t.matches('[data-profile-node]') && p) {
      p.nodeIds = t.checked ? [...new Set([...p.nodeIds, t.dataset.profileNode])] : p.nodeIds.filter(x => x !== t.dataset.profileNode);
      p.publishedAt = null;
      save();
      render();
      return;
    }
    if (t.matches('[data-edge-enabled]')) {
      const edge = w.edges.find(x => x.id === t.dataset.edgeEnabled);
      if (edge) {
        edge.enabled = t.checked;
        w.profiles.forEach(p => {
          if (p.nodeIds.includes(edge.source) && p.nodeIds.includes(edge.target)) p.publishedAt = null;
        });
        save();
        scheduleDrawEdges();
      }
    }
  });

  root.addEventListener('input', e => {
    if (e.target.id === 'transfer') state.transferText = e.target.value;
  });

  root.addEventListener('click', async e => {
    if (e.target.closest('[data-close-workbench]')) {
      window.location.assign(new URL('/?dsh-desktop-mode=compatibility&dsh-desktop-platform=linux', window.location.origin).toString());
      return;
    }
    if (e.target.closest('[data-close-editor]')) {
      e.preventDefault();
      e.stopPropagation();
      selectedNode = null;
      render();
      return;
    }
    const a = e.target.closest('[data-action]')?.dataset.action, w = ws(), p = profile();
    if (e.target.closest('[data-node]') && !e.target.closest('[data-drag-node]') && !e.target.closest('.nodeport')) {
      selectedNode = e.target.closest('[data-node]').dataset.node;
      render();
      return;
    }
    if (e.target.closest('[data-delete-edge]')) {
      const id = e.target.closest('[data-delete-edge]').dataset.deleteEdge, edge = w.edges.find(x => x.id === id);
      w.edges = w.edges.filter(x => x.id !== id);
      if (edge) w.profiles.forEach(p => {
        if (p.nodeIds.includes(edge.source) && p.nodeIds.includes(edge.target)) p.publishedAt = null;
      });
      save();
      render();
      return;
    }
    if (e.target.closest('[data-member-activate]')) {
      return activateProfile(w.profiles.find(x => x.id === e.target.closest('[data-member-activate]').dataset.memberActivate));
    }
    if (!a) return;

    if (a === 'mode-builder' || a === 'mode-member') {
      state.mode = a === 'mode-builder' ? 'builder' : 'member';
      save();
      render();
    }
    if (a === 'toggle-transfer') {
      state.transfer = !state.transfer;
      state.transferText = state.transfer ? JSON.stringify(state, null, 2) : state.transferText;
      render();
    }
    if (a === 'new-workspace') {
      const name = $('#new-workspace').value.trim() || '新项目工作区';
      const nw = { id: uid('workspace'), name, description: '', path: '', nodes: [], edges: [], profiles: [], createdAt: Date.now(), updatedAt: Date.now() };
      state.workspaces.push(nw);
      state.activeWorkspaceId = nw.id;
      selectedNode = null;
      selectedProfile = null;
      save();
      render();
      tell('已创建工作区“' + name + '”。');
    }
    if (a === 'duplicate-workspace') {
      const cp = JSON.parse(JSON.stringify(w)), m = {};
      cp.id = uid('workspace');
      cp.name += '（副本）';
      cp.nodes.forEach(n => { const old = n.id; n.id = uid('node'); m[old] = n.id; });
      cp.edges.forEach(x => { x.id = uid('edge'); x.source = m[x.source]; x.target = m[x.target]; });
      cp.profiles.forEach(x => { x.id = uid('profile'); x.nodeIds = x.nodeIds.map(i => m[i]); x.publishedAt = null; x.publishedName = null; });
      state.workspaces.push(cp);
      state.activeWorkspaceId = cp.id;
      selectedNode = null;
      selectedProfile = null;
      save();
      render();
      tell('已复制工作区。');
    }
    if (a === 'delete-workspace' && state.workspaces.length > 1 && confirm('删除当前工作区？已发布的 DSH 预设不会被删除。')) {
      state.workspaces = state.workspaces.filter(x => x.id !== w.id);
      delete state.memberDefaults[w.id];
      state.activeWorkspaceId = state.workspaces[0].id;
      selectedNode = null;
      selectedProfile = null;
      save();
      render();
    }
    if (a === 'add-common') addNode('common');
    if (a === 'add-target') addNode('target');
    if (a === 'delete-node') {
      const n = node();
      if (n && confirm('删除节点“' + n.label + '”？')) {
        w.profiles = w.profiles.map(p => {
          if (!p.nodeIds.includes(n.id)) return p;
          return { ...p, nodeIds: p.nodeIds.filter(i => i !== n.id), publishedAt: null, updatedAt: Date.now() };
        });
        w.nodes = w.nodes.filter(x => x.id !== n.id);
        w.edges = w.edges.filter(x => x.source !== n.id && x.target !== n.id);
        selectedNode = null;
        save();
        render();
      }
    }
    if (a === 'add-edge') {
      const source = $('#edge-source').value, target = $('#edge-target').value;
      if (!source || !target || source === target) return tell('请选择不同的起点和终点。', true);
      if (w.edges.some(x => x.source === source && x.target === target)) return tell('该连接已存在。', true);
      w.edges.push({ id: uid('edge'), source, target, enabled: true });
      w.profiles.forEach(p => {
        if (p.nodeIds.includes(source) && p.nodeIds.includes(target)) p.publishedAt = null;
      });
      save();
      render();
    }
    if (a === 'new-profile') {
      const np = {
        id: uid('profile'),
        label: '新 Agent 组合',
        description: '',
        presetName: 'robomaster-profile-' + Date.now().toString(36).slice(-5),
        nodeIds: w.nodes.filter(n => n.enabled).map(n => n.id),
        publishedAt: null,
        publishedName: null,
        updatedAt: Date.now()
      };
      w.profiles.push(np);
      selectedProfile = np.id;
      save();
      render();
    }
    if (a === 'delete-profile' && p && confirm('删除当前组合？已发布的 DSH 预设不会被删除。')) {
      w.profiles = w.profiles.filter(x => x.id !== p.id);
      if (state.memberDefaults[w.id] === p.id) delete state.memberDefaults[w.id];
      selectedProfile = null;
      save();
      render();
    }
    if (a === 'default-profile' && p) {
      state.memberDefaults[w.id] = p.id;
      save();
      tell('已保存为此项目的默认选择。');
    }
    if (a === 'publish') await publish(false);
    if (a === 'publish-activate') await publish(true);
    if (a === 'export') {
      state.transferText = JSON.stringify(state, null, 2);
      render();
      tell('已生成队伍包文本。');
    }
    if (a === 'import') {
      try {
        const x = JSON.parse(state.transferText || '');
        if (!x || !Array.isArray(x.workspaces) || !x.workspaces.length) throw new Error('队伍包必须包含 workspaces 数组。');
        const incoming = normalize(x);
        incoming.workspaces.forEach(nw => {
          if (state.workspaces.some(old => old.id === nw.id)) {
            nw.id = uid('workspace');
            nw.name += '（导入）';
          }
          nw.profiles.forEach(p => { p.publishedAt = null; p.publishedName = null; });
        });
        state.workspaces.push(...incoming.workspaces);
        state.activeWorkspaceId = incoming.workspaces[0].id;
        selectedNode = null;
        selectedProfile = null;
        save();
        render();
        tell('已导入工作区为草稿。');
      } catch(err) {
        tell('导入失败：' + err.message, true);
      }
    }
  });

  // 画布节点与设置面板拖动
  const finishDrag = () => {
    if (!drag) return;

    const completed = drag;
    const active = completed.captureEl;

    if (active && completed.pointerId != null && active.releasePointerCapture) {
      try {
        if (!active.hasPointerCapture || active.hasPointerCapture(completed.pointerId)) {
          active.releasePointerCapture(completed.pointerId);
        }
      } catch (_) {}
    }

    drag = null;
    document.body.classList.remove('rbst-dragging');

    if (completed.kind === 'node' && !completed.moved) {
      selectedNode = completed.id;
      render();
      return;
    }

    save();
  };

  const updateDrag = event => {
    if (!drag) return;
    if (drag.pointerId != null && event.pointerId != null && event.pointerId !== drag.pointerId) return;

    const dx = event.clientX - drag.sx;
    const dy = event.clientY - drag.sy;

    if (!drag.moved && Math.hypot(dx, dy) < 2) return;
    drag.moved = true;
    document.body.classList.add('rbst-dragging');

    if (drag.kind === 'node') {
      const n = ws().nodes.find(x => x.id === drag.id);
      if (!n) return finishDrag();

      n.x = clamp(drag.x + dx, 0, W - NW);
      n.y = clamp(drag.y + dy, 0, H - NH);

      const el = document.querySelector('[data-node="' + drag.id + '"]');
      if (el) {
        el.style.left = n.x + 'px';
        el.style.top = n.y + 'px';
      }
      scheduleDrawEdges();
    } else {
      state.ui.editor = {
        x: clamp(drag.x + dx, 12, Math.max(12, W - 348)),
        y: clamp(drag.y + dy, 12, Math.max(12, H - 360))
      };

      const el = $('#editor');
      if (el) {
        el.style.left = state.ui.editor.x + 'px';
        el.style.top = state.ui.editor.y + 'px';
      }
    }

    if (event.cancelable) event.preventDefault();
  };

  root.addEventListener('pointerdown', event => {
    if (event.button !== 0 && event.pointerType !== 'touch') return;

    const handle = event.target.closest('[data-drag-node]');
    if (handle) {
      const n = ws().nodes.find(x => x.id === handle.dataset.dragNode);
      if (!n) return;

      selectedNode = n.id;
      drag = {
        kind: 'node',
        id: n.id,
        x: n.x,
        y: n.y,
        sx: event.clientX,
        sy: event.clientY,
        moved: false,
        pointerId: event.pointerId,
        captureEl: handle
      };

      try { handle.setPointerCapture(event.pointerId); } catch (_) {}
      event.preventDefault();
      return;
    }

    const editorHandle = event.target.closest('[data-drag-editor]');
    if (editorHandle && !event.target.closest('[data-close-editor]') && !event.target.closest('[data-action]')) {
      const ed = state.ui.editor || { x: 760, y: 80 };
      drag = {
        kind: 'editor',
        x: ed.x,
        y: ed.y,
        sx: event.clientX,
        sy: event.clientY,
        moved: false,
        pointerId: event.pointerId,
        captureEl: editorHandle
      };

      try { editorHandle.setPointerCapture(event.pointerId); } catch (_) {}
      event.preventDefault();
    }
  });

  window.addEventListener('pointermove', updateDrag, { passive: false });
  window.addEventListener('pointerup', finishDrag, true);
  window.addEventListener('pointercancel', finishDrag, true);
  window.addEventListener('blur', finishDrag);
  document.addEventListener('lostpointercapture', finishDrag, true);

  root.addEventListener('click', event => {
    const canvas = event.target.closest('#canvas');
    if (!canvas || event.target.closest('[data-node],.editor,.nodeport')) return;
    selectedNode = null;
    render();
  });

  // Esc 键关闭编辑器
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && (selectedNode !== null || $('#editor'))) {
      event.preventDefault();
      selectedNode = null;
      render();
    }
  });

  // 端口与拖拽增强
  const enhanceDnD = () => {
    document.querySelectorAll('.node').forEach(el => {
      if (el.dataset.enhanced === '1') return;
      el.dataset.enhanced = '1';
      el.setAttribute('draggable', 'false');
      const body = el.querySelector('.nodebody');
      if (body) {
        body.setAttribute('draggable', 'true');
        body.dataset.nodeDndSource = el.dataset.node;
      }
      const outPort = document.createElement('button');
      outPort.className = 'nodeport out';
      outPort.type = 'button';
      outPort.draggable = true;
      outPort.title = '拖到另一个节点端口或点击创建连线';
      outPort.textContent = '>';
      outPort.dataset.portOut = el.dataset.node;
      const inPort = document.createElement('button');
      inPort.className = 'nodeport in';
      inPort.type = 'button';
      inPort.title = '作为连线的目标终点';
      inPort.textContent = '>';
      inPort.dataset.portIn = el.dataset.node;
      el.append(outPort, inPort);
    });
    const panel = [...root.querySelectorAll('.card')].find(el => el.textContent.includes('Agent 组合与发布'));
    if (panel && !panel.querySelector('.profile-drop')) {
      const drop = document.createElement('div');
      drop.className = 'profile-drop';
      drop.textContent = '把画布节点拖到这里，加入当前 Agent 组合';
      drop.dataset.profileDrop = '1';
      panel.append(drop);
    }
  };

  const addDroppedEdge = (source, target) => {
    const w = ws();
    if (!source || !target || source === target) return;
    if (w.edges.some(edge => edge.source === source && edge.target === target)) return tell('该连线已经存在。', true);
    w.edges.push({ id: uid('edge'), source, target, enabled: true });
    invalidate([source, target]);
    save();
    render();
    tell('已建立连线。');
  };

  root.addEventListener('dragstart', event => {
    const port = event.target.closest('[data-port-out]');
    const source = event.target.closest('[data-node-dnd-source]');
    const card = event.target.closest('[data-node]');

    if (!card || !event.dataTransfer || (!port && !source)) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = port ? 'link' : 'move';
    event.dataTransfer.setData(port ? 'text/rbst-edge-source' : 'text/rbst-node', card.dataset.node);
  });

  root.addEventListener('dragover', event => {
    if (event.target.closest('.zone,.profile-drop,[data-port-in]')) {
      event.preventDefault();
      const target = event.target.closest('.zone,.profile-drop,[data-port-in]');
      target.classList.add('drop-hot');
    }
  });

  root.addEventListener('dragleave', event => {
    const target = event.target.closest('.zone,.profile-drop,[data-port-in]');
    if (target) target.classList.remove('drop-hot');
  });

  root.addEventListener('drop', event => {
    const data = event.dataTransfer;
    if (!data) return;
    const source = data.getData('text/rbst-node') || data.getData('text/rbst-edge-source');
    if (!source) return;
    event.preventDefault();
    const port = event.target.closest('[data-port-in]');
    if (port) {
      addDroppedEdge(source, port.dataset.portIn);
      return;
    }
    const profileDrop = event.target.closest('.profile-drop');
    if (profileDrop) {
      const p = profile();
      if (p && !p.nodeIds.includes(source)) {
        p.nodeIds.push(source);
        p.publishedAt = null;
        save();
        render();
        tell('节点已加入当前 Agent 组合。');
      }
      return;
    }
    const zone = event.target.closest('.zone');
    if (zone) {
      const n = ws().nodes.find(item => item.id === source);
      if (!n) return;
      const canvas = document.querySelector('#canvas'), rect = canvas.getBoundingClientRect();
      n.type = zone.classList.contains('target') ? 'target' : 'common';
      if (n.type === 'target' && !n.group) n.group = '未分组';
      n.x = clamp(event.clientX - rect.left - NW / 2, 0, W - NW);
      n.y = clamp(event.clientY - rect.top - NH / 2, 0, H - NH);
      invalidate([n.id]);
      save();
      render();
      tell('节点已转移到“' + (n.type === 'target' ? '针对类型' : '通用类型') + '”。');
    }
  });

  let pendingPort = null;
  root.addEventListener('click', event => {
    const output = event.target.closest('[data-port-out]');
    const input = event.target.closest('[data-port-in]');
    if (output) {
      event.preventDefault();
      event.stopPropagation();
      pendingPort = output.dataset.portOut;
      output.classList.add('pending-port');
      tell('已选起点端口，请点击目标节点端口完成连线。');
      return;
    }
    if (input && pendingPort) {
      event.preventDefault();
      event.stopPropagation();
      const source = pendingPort;
      pendingPort = null;
      addDroppedEdge(source, input.dataset.portIn);
    }
  }, true);

  const dndObserver = new MutationObserver(mutations => {
    enhanceDnD();
    if (mutations.some(mutation => {
      const target = mutation.target;
      return target && target.id !== 'edge-svg' &&
        !(typeof target.closest === 'function' && target.closest('#edge-svg'));
    })) {
      scheduleDrawEdges();
    }
  });
  dndObserver.observe(root, { childList: true, subtree: true });
  const edgeResizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(scheduleDrawEdges)
    : null;
  if (edgeResizeObserver) edgeResizeObserver.observe(root);
  window.addEventListener('resize', scheduleDrawEdges, { passive: true });
  enhanceDnD();
  scheduleDrawEdges();

  const reconcileRemote = async () => {
    await refreshRemote();
    const w = ws();
    let changed = false;
    for (const p of w.profiles) {
      if (p.presetName && !p.publishedAt && remote.loaded && remote.names.includes(p.presetName)) {
        p.publishedAt = Date.now();
        p.updatedAt = Date.now();
        changed = true;
      }
    }
    if (changed) save();
    render();
  };
  reconcileRemote();
  render();
})();
</script>
</body>
</html>`

function send(res, status, value, type) {
  res.writeHead(status, { 'Content-Type': type || 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(typeof value === 'string' || value instanceof Uint8Array ? value : JSON.stringify(value))
}

async function body(req) {
  let out = ''
  for await (const chunk of req) {
    out += typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk)
    if (out.length > 900000) throw new Error('request body too large')
  }
  return out ? JSON.parse(out) : {}
}

function manager(ctx) {
  const service = ctx.get('promptManager')
  if (service === undefined) throw new Error('dsh-prompt-manager service unavailable')
  return service
}

function install(ctx) {
  ctx.inject(['webServer'], scope => {
    const route = (path, handler) => scope.webServer.register({ kind: 'exact', path, handler })
    route('/robomaster-studio', (req, res) => send(res, 200, PAGE, 'text/html; charset=utf-8'))
    route('/robomaster-studio/api/presets', (req, res) => {
      try {
        const service = manager(scope)
        send(res, 200, { ok: true, active: service.active || null, list: service.listPresets() })
      } catch (error) {
        send(res, 500, { ok: false, error: String(error && error.message ? error.message : error) })
      }
    })
    route('/robomaster-studio/api/publish', async (req, res) => {
      try {
        if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'POST required' })
        const payload = await body(req)
        const service = manager(scope)
        const list = service.listPresets()
        const entries = Array.isArray(list) ? list : list.presets || []
        const exists = entries.some(item => item && item.name === payload.name)
        const result = exists ? service.updatePreset(payload) : service.createPreset(payload)
        send(res, 200, { ok: true, result })
      } catch (error) {
        send(res, 400, { ok: false, error: String(error && error.message ? error.message : error) })
      }
    })
    route('/robomaster-studio/api/activate', async (req, res) => {
      try {
        if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'POST required' })
        const payload = await body(req)
        const result = manager(scope).setActive(String(payload.name || ''))
        send(res, 200, { ok: true, result })
      } catch (error) {
        send(res, 400, { ok: false, error: String(error && error.message ? error.message : error) })
      }
    })
  })
}

export function apply(ctx) {
  install(ctx)
  return ctx.webServer.tapIndex(html => {
    if (html.includes('dsh-robomaster-studio-launcher')) return html
    const injection =
      '<style>#dsh-robomaster-studio-launcher{position:fixed;right:16px;bottom:16px;z-index:2147483000;display:flex;align-items:center;gap:7px;padding:8px 11px;border:1px solid #38bdf8;border-radius:6px;background:#0d1527;color:#f1f5f9;font:600 13px system-ui;text-decoration:none;box-shadow:0 5px 18px rgba(0,0,0,0.6)}#dsh-robomaster-studio-launcher:hover{background:#152238;border-color:#00f2fe}#dsh-robomaster-studio-launcher b{color:#00f2fe}</style><a id="dsh-robomaster-studio-launcher" href="/robomaster-studio" title="打开 RoboMaster Agent 工作台" aria-label="打开 RoboMaster Agent 工作台"><b>RM</b><span>RoboMaster</span></a>'
    const close = '</body>'
    return html.includes(close) ? html.replace(close, injection + close) : html + injection
  })
}