# dsh-robomaster-core

Web-free RoboMaster Studio compatibility layer for DeepSeek Harness.

The legacy `dsh-robomaster-studio` HTML editor remains in the Web/Desktop
profiles. This package keeps its prompt-manager-backed capabilities available
to stdio profiles through `robomaster_*` agent tools, without a browser server.

The shared prompt store is `$DSH_HOME/prompts` (normally `~/.dsh/prompts`).
No preset, credential, session, or legacy Web plugin data is removed.
