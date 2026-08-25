window.__ModuleLoader__.load({
  id: 'dsh-robomaster-studio',
  factory: (require) => {
    const module = { exports: {} }
    const React = require('react')

    const inject = ['slots']
    function SettingsSection() {
      const open = React.useCallback(() => {
        if (window.location.pathname === '/robomaster-studio') return
        window.location.assign(new URL('/robomaster-studio', window.location.origin).toString())
      }, [])
      return React.createElement('div', { style: { display:'flex',flexDirection:'column',gap:12 } },
        React.createElement('h3', { style: { fontSize:13,fontWeight:500,lineHeight:1.5,margin:0 } }, 'RoboMaster'),
        React.createElement('div', { style: { background:'var(--dsw-alias-bg-module-platform)',border:'1px solid var(--dsw-alias-border-l2)',borderRadius:12,padding:'12px 14px',display:'flex',flexDirection:'column',gap:8 } },
          React.createElement('div', { style: { display:'flex',alignItems:'center',gap:8,flexWrap:'wrap' } },
            React.createElement('span', { style: { fontSize:13,fontWeight:500 } }, 'RoboMaster Agent 工作台'),
            React.createElement('span', { style: { flex:1 } }),
            React.createElement('button', { style: { boxSizing:'border-box',height:28,font:'inherit',cursor:'pointer',border:'none',color:'var(--dsw-alias-label-primary-foreground, #fff)',background:'var(--dsw-alias-button-primary-fill)',borderRadius:14,padding:'0 12px',fontSize:12,lineHeight:'26px' }, onClick: open }, '打开')
          ),
          React.createElement('p', { style: { fontSize:12,lineHeight:1.6,margin:0,color:'var(--dsw-alias-label-tertiary)' } }, '管理 RoboMaster 各组的提示词节点与预设组合，配置队伍规范、硬件约束、视觉算法等模块。')
        )
      )
    }
    function apply(ctx) {
      ctx.slots.inject('settings.section', () => ctx.slots.register({name:'settings.section', id:'dsh-robomaster-studio', order:26, label:() => 'RoboMaster', inject:() => ({})}, SettingsSection))
    }
    module.exports = {apply, inject}
    return module.exports
  }
})