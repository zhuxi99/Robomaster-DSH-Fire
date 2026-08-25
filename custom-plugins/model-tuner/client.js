// dsh-model-tuner client half — a settings section card with a link
// to the model batch configuration page.
window.__ModuleLoader__.load({
  id: 'dsh-model-tuner-runtime',
  factory: (require) => {
    const module = { exports: {} }
    const React = require('react')
    const { useCallback } = require('react')
    const createElement = React.createElement

    const styles = {
      card: {
        background: 'var(--dsw-alias-bg-module-platform)',
        border: '1px solid var(--dsw-alias-border-l2)',
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      },
      row: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
      title: { fontSize: 13, fontWeight: 500, lineHeight: 1.5, margin: 0 },
      hint: { fontSize: 12, lineHeight: 1.6, margin: 0, color: 'var(--dsw-alias-label-tertiary)' },
      button: {
        boxSizing: 'border-box',
        height: 28,
        font: 'inherit',
        cursor: 'pointer',
        border: '1px solid var(--dsw-alias-border-l2)',
        color: 'var(--dsw-alias-label-primary)',
        background: 'var(--dsw-alias-bg-layer-1)',
        borderRadius: 14,
        padding: '0 12px',
        fontSize: 12,
        lineHeight: '26px'
      },
      primary: { border: 'none', background: 'var(--dsw-alias-button-primary-fill)', color: 'var(--dsw-alias-label-primary-foreground, #fff)' }
    }

    function ModelTunerSection() {
      const open = useCallback(() => {
        location.href = '/__dsh-model-tuner'
      }, [])
      return createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        createElement('h3', { style: styles.title }, '模型管理'),
        createElement('div', { style: styles.card },
          createElement('div', { style: styles.row },
            createElement('span', { style: { fontSize: 13, fontWeight: 500 } }, '模型批量配置'),
            createElement('span', { style: { flex: 1 } }),
            createElement('button', { style: { ...styles.button, ...styles.primary }, onClick: open }, '打开')
          ),
          createElement('p', { style: styles.hint }, '批量管理模型实例的上下文上限与最大输出，按模型 ID 跨提供方选择并批量设置。')
        )
      )
    }

    function apply(ctx) {
      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'model-tuner',
        order: 21,
        label: () => '模型管理',
        inject: () => ({})
      }, ModelTunerSection))
    }

    const inject = ['slots']
    module.exports = { apply, inject }
    return module.exports
  }
})
