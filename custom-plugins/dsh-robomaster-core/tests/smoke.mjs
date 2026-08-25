import assert from 'node:assert/strict'
import { apply } from '../index.js'

const manager = {
  active: 'rm-mechanical-ai-guardrail',
  listPresets: () => ({
    active: 'rm-mechanical-ai-guardrail',
    presets: [{ name: 'rm-mechanical-ai-guardrail', label: 'RM', description: '', ruleCount: 1, kind: 'user' }]
  }),
  getPreset: name => name === 'rm-mechanical-ai-guardrail'
    ? { name, label: 'RM', description: '', kind: 'user', overrides: [{ action: 'insert', section: 'robomaster:test', text: 'x' }] }
    : null,
  setActive: name => ({ active: name }),
  createPreset: payload => ({ name: payload.name, overrides: payload.overrides }),
  updatePreset: payload => ({ name: payload.name, overrides: payload.overrides })
}

const definitions = []
const sections = []
apply({
  get(name) {
    assert.equal(name, 'promptManager')
    return manager
  },
  tools: { register(definition) { definitions.push(definition) } },
  systemPrompt: { section(section) { sections.push(section) } }
})

assert.deepEqual(definitions.map(definition => definition.name), [
  'robomaster_context',
  'robomaster_get_blueprint',
  'robomaster_list_presets',
  'robomaster_get_preset',
  'robomaster_activate_preset',
  'robomaster_save_preset'
])
assert.equal(sections[0].name, 'robomaster:core')
const tools = Object.fromEntries(definitions.map(definition => [definition.name, definition]))
assert.equal((await tools.robomaster_list_presets.execute({})).active, 'rm-mechanical-ai-guardrail')
assert.equal((await tools.robomaster_get_blueprint.execute({})).nodes.length, 5)
assert.equal((await tools.robomaster_get_preset.execute({ name: 'rm-mechanical-ai-guardrail' })).found, true)
assert.equal((await tools.robomaster_save_preset.execute({
  name: 'rm-test',
  overrides: [{ action: 'insert', section: 'robomaster:test', text: 'x' }]
})).name, 'rm-test')
console.log('dsh-robomaster-core smoke: ok')
