# RoboMaster DSH Desktop 插件包

RoboMaster 战队 DSH Desktop 的 Windows 一键安装包：桌面版插件、提示词、预设与配置的打包分发仓库。

> 由 Linux 开发环境整理而来，所有路径与依赖已做 Windows 兼容处理。

## 目录结构

```
.
├── profiles/desktop/          # desktop profile 配置（Windows 化）
│   ├── package.json           # 插件清单（相对路径 link，无平台专属依赖）
│   └── cordis.patch.yml       # 加载器补丁（含 dsh-cad 手动 insert）
├── custom-plugins/            # 队内自研插件源码（4 个）
│   ├── robomaster-studio/     # 工作台插件
│   ├── dsh-robomaster-core/   # 机器人核心工具
│   ├── model-tuner/           # 模型批量配置
│   └── dsh-restart-desktop/   # 桌面重启按钮
├── third-party/               # 第三方 CAD 插件（已构建，Windows 免编译）
│   ├── dsh-cad-review/        # v0.2.0 DXF 图纸确定性审查
│   ├── dsh-3d-model-viewer/   # v0.1.1 3D 模型查看 + LLM JSON 转译
│   └── dsh-cad/               # v0.1.0 OCCT 参数化建模工作台（含 lib/ 构建产物）
├── prompts/                   # 提示词节点（active.yml + 机械准则）
├── presets/liangshen/         # Agent 预设
├── memories/                  # 用户档案 USER.md + 全局记忆 MEMORY.md + memory.md（已脱敏路径）
├── install.ps1                # Windows 一键安装
├── sanitize-settings.mjs      # settings.yaml 脱敏脚本（生成 settings.yaml.template）
└── .gitignore                 # 敏感数据排除清单
```

## Windows 安装（机械组）

1. 安装 [Node.js ≥ 22](https://nodejs.org) 与 DSH Desktop
2. 安装 pnpm：`npm i -g pnpm`
3. 克隆/下载本仓库
4. 右键 `install.ps1` → 使用 PowerShell 运行（或 `powershell -ExecutionPolicy Bypass -File .\install.ps1`）
5. 完整重启 DSH Desktop

脚本会：复制插件到 `%USERPROFILE%\.dsh\`、写入 desktop profile 配置、复制提示词/预设/记忆、`pnpm install` 装依赖。

## 安装后验证

| 插件 | 验证方式 |
|---|---|
| dsh-cad-review | 会话里说"审查 XX.dxf"，或终端 `dsh-cad-review review 图纸.dxf` |
| dsh-3d-model-viewer | 右侧"三维模型查看器"面板加载 OBJ/STL/STEP |
| dsh-cad | 会话 "3D" tab 出现，可让 AI 调用 cad_view/cad_volume 等 |

## 数据分类（本仓库上传策略）

**包含**：用户档案、全局长期记忆（已脱敏本机路径）、提示词、Agent 预设、自研插件源码、第三方插件、desktop 配置。
**排除**（.gitignore 强制）：聊天记录、API Keys、项目记忆、每日日志、知识图谱数据库、浏览器登录态、node_modules。

## 备注

- `dsh-cad-review` 的 `workspaceRoot` 默认是 DSH 启动目录；可在 `%USERPROFILE%\.dsh\profiles\desktop\cordis.patch.yml` 配置固定目录与审查策略（requiredLayers/forbiddenLayers 等）
- `settings.yaml` 首次安装会复制模板（若仓库中有），请填入自己的 API Key；**本仓库不含任何密钥**
- 升级插件：`dsh plugin --profile desktop add github:<owner>/<repo>#<commit>`
- 第三方插件均有独立上游仓库，许可见各插件目录
