# dsh-restart-desktop

One-click "restart DSH" button injected into DeepSeek Harness Desktop's Settings → General panel.

## What it does

Registers a `/restart-desktop` POST route on the harness web server. On the **desktop profile** (Electron), the route calls `ctx.desktopRuntime.requestRestart()`, which tears down the Cordis tree, relaunches the Electron process, and boots the desktop profile again — loading all current bundles.

On non-desktop profiles (CLI `dsh web`, headless), the route returns 503 so the button can surface a graceful fallback message.

## Use case

- After installing/updating a bundle via the market, click the button instead of manually quitting and restarting.
- After editing `~/.dsh/cordis.patch.yml` — works together with `dsh-live-reload` (which hot-reloads patch changes without reload).

## Install

```bash
dsh plugin --profile desktop add link:~/.dsh/plugins/dsh-restart-desktop
```

## Files

```
dsh-restart-desktop/
  package.json          # DSH bundle metadata
  cordis.patch.yml      # Inserts the host row into the loader tree
  dsh/index.js          # Host half: registers the /restart-desktop route
  client/client.js      # Client half: renders the restart button in Settings
```
