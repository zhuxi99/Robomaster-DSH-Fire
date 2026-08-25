import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'robomaster-core'
export const inject = ['promptManager', 'systemPrompt', 'tools']

const GROUPS = Object.freeze(['机械组', '视觉组', '算法组', '电控组', '硬件组', '导航组', '运营组'])

// This is the non-Web representation of the legacy Studio starter canvas.
// User-authored prompt text remains in $DSH_HOME/prompts and is never replaced.
const STARTER_BLUEPRINT = Object.freeze({
  version: 1,
  source: 'dsh-robomaster-studio starter workspace',
  nodes: Object.freeze([
    Object.freeze({ id: 'team', type: 'common', group: '通用', label: '队伍通用规范', section: 'robomaster:team-guidance', action: 'insert', text: '你服务于 RoboMaster 队伍。回答优先给出可执行步骤、明确假设、风险和验证方式。不要编造队内事实；缺少关键上下文时先询问。', enabled: true }),
    Object.freeze({ id: 'project', type: 'common', group: '通用', label: '项目强约束', section: 'robomaster:project-constraints', action: 'insert', text: '这是一个 RoboMaster 项目。涉及硬件、软件或机械变更时，说明接口、依赖、测试影响和待确认项。', enabled: true }),
    Object.freeze({ id: 'hardware', type: 'target', group: '硬件', label: '硬件', section: 'robomaster:hardware', action: 'insert', text: '处理硬件任务时，优先核对电源、接口、电平、额定参数、封装和可测试性；将不确定参数明确标为待确认。', enabled: true }),
    Object.freeze({ id: 'jlc', type: 'target', group: '硬件', label: '嘉立创建库 / PCB', section: 'robomaster:jlc-pcb', action: 'insert', text: '处理嘉立创或立创 EDA 相关任务时，给出封装、BOM、设计规则和下单前检查清单。', enabled: true }),
    Object.freeze({ id: 'embedded', type: 'target', group: '嵌入式', label: '嵌入式', section: 'robomaster:embedded', action: 'insert', text: '处理嵌入式任务时，说明目标 MCU、外设、时序、中断上下文、通信协议和可复现的验证步骤。', enabled: true })
  ]),
  edges: Object.freeze([
    Object.freeze({ id: 'e1', source: 'team', target: 'hardware', enabled: true }),
    Object.freeze({ id: 'e2', source: 'project', target: 'hardware', enabled: true }),
    Object.freeze({ id: 'e3', source: 'hardware', target: 'jlc', enabled: true }),
    Object.freeze({ id: 'e4', source: 'team', target: 'embedded', enabled: true }),
    Object.freeze({ id: 'e5', source: 'project', target: 'embedded', enabled: true })
  ]),
  profiles: Object.freeze([
    Object.freeze({ id: 'hw-jlc', label: '硬件 / 嘉立创建库', description: '硬件组基础组合。修改节点或连接后需要重新发布。', presetName: 'robomaster-hardware-jlc', nodeIds: Object.freeze(['team', 'project', 'hardware', 'jlc']) })
  ])
})

const CORE_CONTEXT = [
  'RoboMaster Studio 的无 Web 核心已加载。它复用 DSH 的 promptManager 和 ~/.dsh/prompts 持久化预设。',
  '可管理队伍通用、项目约束、机械、视觉、算法、电控、硬件、导航、运营和嵌入式提示词段。',
  '不要把暂定参数或未确认比赛规则写成事实；涉及机械、电源、接口、PCB、嵌入式或安全时，明确待确认项和验证步骤。',
  '本核心不会自动扫描工作区、联网或上传资料；只有收到明确工具调用时才会读取、保存或切换预设。'
].join('\n')

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function getManager(ctx) {
  const manager = ctx.get('promptManager')
  if (manager === undefined) throw new Error('dsh-prompt-manager service unavailable')
  return manager
}

function listPresets(manager) {
  const list = manager.listPresets()
  return {
    active: list.active,
    presets: list.presets.map(({ name, label, description, ruleCount, kind }) => ({ name, label, description, ruleCount, kind }))
  }
}

function presentPreset(preset, active, includeText) {
  if (preset === null || preset === undefined) return { found: false, name: '', active: false, rules: [] }
  return {
    found: true,
    name: preset.name,
    active: active === preset.name,
    label: preset.label,
    description: preset.description,
    rules: preset.overrides.map(rule => ({
      action: rule.action,
      section: rule.section,
      ...(includeText && rule.text !== undefined ? { text: rule.text } : {}),
      ...(rule.order !== undefined ? { order: rule.order } : {}),
      ...(rule.after !== undefined ? { after: rule.after } : {})
    }))
  }
}

const presetRule = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: { type: 'string', required: true, description: 'insert, replace, or remove' },
    section: { type: 'string', required: true },
    text: { type: 'string' },
    order: { type: 'number' },
    after: { type: 'string' },
    top: { type: 'boolean' }
  }
}

function registerTools(ctx, manager) {
  ctx.tools.register(defineTool({
    name: 'robomaster_context',
    description: 'Return the stable RoboMaster team context and the supported groups for this local deployment. This is read-only and has no Web dependency.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          context: { type: 'string', required: true },
          groups: { type: 'array', required: true, items: { type: 'string' } },
          activePreset: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true }
        }
      },
      render: (_args, value) => [{ type: 'text', text: `RoboMaster core ready; groups: ${value.groups.join(', ')}; active preset: ${value.activePreset ?? '(none)'}.` }]
    },
    execute() {
      return { context: CORE_CONTEXT, groups: [...GROUPS], activePreset: manager.active }
    }
  }))

  ctx.tools.register(defineTool({
    name: 'robomaster_get_blueprint',
    description: 'Return the Web-free RoboMaster Studio starter node/edge/profile blueprint. It is a read-only compatibility reference; user presets remain in the prompt store.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          version: { type: 'integer', required: true },
          source: { type: 'string', required: true },
          nodes: { type: 'array', required: true, items: { type: 'json' } },
          edges: { type: 'array', required: true, items: { type: 'json' } },
          profiles: { type: 'array', required: true, items: { type: 'json' } }
        }
      },
      render: (_args, value) => [{ type: 'text', text: `Starter blueprint: ${value.nodes.length} nodes, ${value.edges.length} edges, ${value.profiles.length} profile(s).` }]
    },
    execute() {
      return clone(STARTER_BLUEPRINT)
    }
  }))

  ctx.tools.register(defineTool({
    name: 'robomaster_list_presets',
    description: 'List RoboMaster-compatible prompt presets from the shared DSH prompt store, including the active preset. Read-only.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          active: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
          presets: { type: 'array', required: true, items: { type: 'json' } }
        }
      },
      render: (_args, value) => [{ type: 'text', text: `RoboMaster presets: ${value.presets.length}; active: ${value.active ?? '(none)'}.` }]
    },
    execute() {
      return listPresets(manager)
    }
  }))

  ctx.tools.register(defineTool({
    name: 'robomaster_get_preset',
    description: 'Read one shared DSH prompt preset. Text is omitted by default to keep responses short; set includeText=true when the full rule text is needed.',
    parameters: {
      name: { type: 'string', required: true },
      includeText: { type: 'boolean', description: 'Include full rule text.' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          found: { type: 'boolean', required: true },
          name: { type: 'string', required: true },
          active: { type: 'boolean', required: true },
          label: { type: 'string' },
          description: { type: 'string' },
          rules: { type: 'array', required: true, items: { type: 'json' } }
        }
      },
      render: (_args, value) => [{ type: 'text', text: value.found ? `${value.name}: ${value.rules.length} rule(s)${value.active ? '; active' : ''}.` : `Preset ${value.name || '(empty)'} not found.` }]
    },
    execute(args) {
      return presentPreset(manager.getPreset(args.name), manager.active, args.includeText === true)
    }
  }))

  ctx.tools.register(defineTool({
    name: 'robomaster_activate_preset',
    description: 'Activate one existing shared RoboMaster prompt preset for subsequent model steps. This changes the DSH global active pointer; it never deletes or rewrites preset files.',
    parameters: {
      name: { type: 'string', required: true, description: 'Existing preset name.' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: { active: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true } }
      },
      render: (_args, value) => [{ type: 'text', text: `Active RoboMaster preset: ${value.active ?? '(none)'}.` }]
    },
    execute(args) {
      return manager.setActive(args.name)
    }
  }))

  ctx.tools.register(defineTool({
    name: 'robomaster_save_preset',
    description: 'Create or update a RoboMaster prompt preset in the shared DSH prompt store. The manager validates section names and actions before atomically writing the YAML file.',
    parameters: {
      name: { type: 'string', required: true, description: 'Lowercase preset id: letters, digits, hyphen, underscore.' },
      label: { type: 'string' },
      description: { type: 'string' },
      overrides: { type: 'array', required: true, items: presetRule }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', required: true },
          active: { type: 'boolean', required: true },
          ruleCount: { type: 'integer', required: true }
        }
      },
      render: (_args, value) => [{ type: 'text', text: `Saved ${value.name} (${value.ruleCount} rule(s))${value.active ? '; currently active' : ''}.` }]
    },
    execute(args) {
      const existing = manager.getPreset(args.name)
      const payload = {
        name: args.name,
        ...(args.label !== undefined ? { label: args.label } : {}),
        ...(args.description !== undefined ? { description: args.description } : {}),
        overrides: args.overrides
      }
      const saved = existing === null || existing?.kind === 'builtin'
        ? manager.createPreset(payload)
        : manager.updatePreset(payload)
      return { name: saved.name, active: manager.active === saved.name, ruleCount: saved.overrides.length }
    }
  }))
}

export function apply(ctx) {
  const manager = getManager(ctx)
  registerTools(ctx, manager)
  ctx.systemPrompt.section({
    name: 'robomaster:core',
    order: 111,
    text: CORE_CONTEXT
  })
}
