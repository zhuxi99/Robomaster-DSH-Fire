# 跨会话记忆

## DSH 桌面端关键信息（2026-04-28 确认）

- **桌面端 profile 路径**: `%USERPROFILE%/.dsh/profiles/desktop`
- **桌面端用的 profile 名称是 `desktop`，不是 `web`**
- 对桌面端插件做任何操作必须用 `dsh plugin --profile desktop`，不能用 `--profile web`
- `web` profile 路径: `%USERPROFILE%/.dsh/profiles/web`（纯 CLI `dsh web` 用）
- 桌面端由 `dsh-plugin-desktop`（Electron）启动，读取 `~/.dsh/profiles/desktop`
- 桌面端 Electron 主进程默认监听端口会变，web 服务在 electron 内部；boot manifest 通过渲染进程端口可 fetch
- Electron 窗口配置：`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`
- 主进程未注册 `beforeunload` 拦截器，也未给 renderer 暴露任何 IPC bridge
- Electron `window.close` handler 仅做 `event.preventDefault(); window.hide()`，不拦截 `location.reload()`

## 插件状态（2026-04-28 清理后）

- `dsh-live-reload`: 保留，热刷新插件（web + desktop 都已安装）
  - web: `github:xuhurdern-beep/dsh-live-reload` (npm dep)
  - desktop: `github:xuhurdern-beep/dsh-live-reload` (npm dep)
- `dsh-restart-desktop`: 新建，在 Settings → General 中添加"重启 DSH"按钮（desktop profile）
  - 源目录: `~/.dsh/plugins/dsh-restart-desktop/`
  - link 依赖: `link:~/.dsh/plugins/dsh-restart-desktop`
  - 安装: `dsh plugin --profile desktop add link:~/.dsh/plugins/dsh-restart-desktop`
  - 机制: POST `/restart-desktop` → `ctx.desktopRuntime.requestRestart()`（优雅重启，非强制关闭）
- `dsh-reload-plugins`: 已删除（用户自写的旧重启按钮，源目录 `~/.dsh/plugins/dsh-reload-plugins` 也已删）
- `dsh-hot-reload`: 已删除（web + desktop 都已删）
- `dsh-client-auto-continue`: 保留（对话自动续写，非重载插件）

## 桌面端 dsh-live-reload 客户端补丁状态（2026-04-28）

**已回退，当前使用官方干净版本**（与 web 端一致）。

之前的补丁尝试（注入 `isDesktop`/`softReload()`）导致 Electron 窗口异常退出，已还原。

## 踩坑记录

- `dsh plugin add/remove` 成功后常常静默无输出，不是失败
- `link:` 类型依赖（如 dsh-reload-plugins）remove 后 node_modules 符号链接目录会残留，要手动 `rm -rf`
- 桌面端和 CLI web 端是不同 profile，改插件要分别操作
- 原生 `dsh-hot-reload` 只针对 cordis.patch.yml 改动，不覆盖市场动态安装的 bundle（需要手动点"插件刷新"）
- `dsh-live-reload` host 端（src/index.js）在 refresh 失败时不会 reload，只有 `data.ok === true` 才走前端重载路径
- **不要**直接在 `node_modules` 内修改 `client.js`，除非有持久化机制（如 pnpm patch）
