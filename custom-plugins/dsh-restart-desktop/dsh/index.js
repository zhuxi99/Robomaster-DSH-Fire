/**
 * dsh-restart-desktop — host half.
 *
 * Registers a same-origin POST route on the dsh web server that triggers an
 * Electron desktop restart through the launcher-provided `desktopRuntime`
 * service. On the desktop profile this is the exact "restart DSH and load
 * plugins" action; everywhere else (CLI `dsh web`, headless) the route
 * answers 503 so the client button can show a clear message.
 *
 * `desktopRuntime` is resolved lazily inside the request handler (not captured
 * at apply time) because it is provided by the desktop-shell plugin and may
 * not be ready when this row first activates.
 *
 * @module dsh-restart-desktop
 */
export const name = 'dsh-restart-desktop'
export const inject = []

/** Safe getter for an optional cordis service (undefined, never throws). */
function optional(ctx, name) {
  try {
    return ctx.get(name)
  } catch {
    return undefined
  }
}

export function apply(ctx) {
  if (typeof ctx.inject !== 'function') return
  ctx.inject(['webServer'], (scope) => {
    try {
      scope.webServer.register({
        name: 'restart-desktop',
        kind: 'exact',
        path: '/restart-desktop',
        handler: async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ ok: false, message: 'method not allowed' }))
            return
          }
          const desktopRuntime = optional(ctx, 'desktopRuntime')
          if (desktopRuntime === undefined || typeof desktopRuntime.requestRestart !== 'function') {
            res.statusCode = 503
            res.setHeader('content-type', 'application/json')
            res.end(
              JSON.stringify({
                ok: false,
                message: '当前运行环境不支持桌面端重启，请手动重启 DSH。',
              }),
            )
            return
          }
          // Flush the response before Electron tears down this generation.
          res.statusCode = 200
          res.setHeader('content-type', 'application/json')
          res.end(
            JSON.stringify({
              ok: true,
              message: '正在重启 DSH，约 10 秒后重新加载页面即可。',
            }),
          )
          setImmediate(() => {
            void desktopRuntime.requestRestart().catch((error) => {
              console.error(`[restart-desktop] desktop restart failed: ${error}`)
            })
          })
        },
      })
    } catch (error) {
      console.error(`[restart-desktop] route skipped: ${error}`)
    }
  })
}
