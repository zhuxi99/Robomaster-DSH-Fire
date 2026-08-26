# 🔥 太原工业学院 · 火线战队 DSH Desktop 整合包

> **⚡ 火线战队专属** —— 由**太原工业学院火线战队**（RoboMaster）研发组打造，专为战队机械组定制的 **DeepSeek Harness Desktop (Windows) 一键安装配置套件**，开箱即用，与负责人标准开发环境完全一致。**全部插件离线打包，零 GitHub 依赖**——即使原插件仓库已下架，安装依旧稳定可用。

> | 平台 | Node.js | pnpm | DSH Desktop | 插件 | 安全 |
> | :---: | :---: | :---: | :---: | :---: | :---: |
> | Windows 10/11 x64 | ≥ 22 | ≥ 10 | v2.0.0 | 17 个全离线 | 零密钥泄露 |

---

## 📑 目录

- [📖 项目简介](#-项目简介)
- [✨ 特性一览](#-特性一览)
- [🧩 插件清单](#-插件清单)
- [📂 目录结构](#-目录结构)
- [🚀 快速开始](#-快速开始)
- [🔍 安装后验证](#-安装后验证)
- [🔒 数据安全声明](#-数据安全声明)
- [❓ 常见问题 (FAQ)](#-常见问题-faq)
- [📝 备注与上游来源](#-备注与上游来源)

---

## 📖 项目简介

本仓库是 **太原工业学院火线战队（RoboMaster）** 研发组为战队定制的 DSH Desktop 环境配置整合包。针对 Windows 系统进行了完整的依赖解耦与路径相对化改造，内置 DXF 图纸确定性审查、参数化建模与机械工作流工具链，帮助机械组队员省去复杂的环境配置流程，一键同步火线战队核心工作流。

| 核心维度 | 说明 |
| :--- | :--- |
| **所属战队** | 🔥 太原工业学院 · 火线战队（RoboMaster） |
| **适配平台** | Windows 10 / 11 (x64) |
| **核心用途** | 机械图纸审查、参数化辅助建模、队内提示词与预设同步、模型批量配置 |
| **安装方式** | 双击 `install.bat` 一键安装（无需敲命令） |
| **插件来源** | 火线战队自研插件 + GitHub 社区插件（**已离线打包**）+ npm 官方依赖 |
| **数据安全** | 敏感配置与历史数据已全量脱敏，无密钥泄露风险 |

---

## ✨ 特性一览

- 🛠️ **两大 CAD 核心套件**：预置已构建的 DXF 图纸审查和 OCCT 参数化建模工作台，Windows 免编译。
- 📦 **火线战队自研插件全家桶**：集成 RoboMaster 工作台、核心机器人工具、模型批量配置及桌面快速重启插件。
- 📀 **11 个 GitHub 插件全离线打包**：所有 `github:` 来源的社区插件均已打成 `.tgz` 随仓库分发，Windows 安装时**完全不需要访问 GitHub**——即使原仓库下架（如 `dsh-web-default-session`，其原仓库 `wjy9902/dsh-web-default-session` 已确认下架），安装也不受影响。仅从 npm 官方 registry 拉取标准依赖。
- 🧬 **graph-memory 跨平台原生依赖就绪**：内置 sqlite 原生模块的 **win32-x64 预编译**，Windows 免编译直接使用。
- ⚡ **双击即可安装**：内置 `install.bat`，火线战队机械组队友**双击文件**就能自动完成全部安装，无需打开终端敲任何命令。
- 🔒 **敏感数据零泄漏**：聊天记录、API Keys、私有项目记忆与本地数据库均已严格隔离并被 `.gitignore` 排除。
- 🎯 **开箱即用规范**：集成火线战队机械准则提示词节点与专用 Agent 预设，确保全队输出标准一致。

---

## 🧩 插件清单

整合包共安装 **17 个自研/第三方插件**（4 自研 + 2 CAD + 11 个社区插件离线打包），另有若干 npm 官方依赖随 profile 自动安装。

### 🔥 火线战队自研插件（`custom-plugins/` → `.dsh/plugins/`）

| 插件 | 版本 | 说明 |
| :--- | :--- | :--- |
| **robomaster-studio** | `0.1.0` | RoboMaster 工作台插件（节点 + 工作流入口） |
| **dsh-robomaster-core** | `0.1.0` | 机器人核心工具集 |
| **model-tuner** | `0.1.2` | 模型批量配置工具 |
| **dsh-restart-desktop** | `1.0.0` | 桌面快速重启辅助插件 |

### CAD 插件（`third-party/` → `.dsh/pack/third-party/`，源码目录形式）

| 插件 | 版本 | 说明 |
| :--- | :--- | :--- |
| **dsh-cad-review** | `v0.2.0` | DXF 图纸确定性审查插件（结构化规则审查） |
| **dsh-cad** | `v0.1.0` | OCCT 参数化建模工作台（含 `lib/` 构建产物） |

### 社区插件（`third-party/*.tgz` → `.dsh/pack/third-party/`，离线打包）

| 插件 | 版本 | 说明 |
| :--- | :--- | :--- |
| **dsh-at-file** | `0.6.0` | `@` 文件引用与工作区跳转 |
| **dsh-auto-collapse** | `0.1.3` | 会话工具卡片与 Think 块自动折叠 |
| **dsh-live-reload** | `0.2.0` | 插件/前端热重载 |
| **dsh-memory-evolve** | `0.1.0` | 分层记忆 + 自我进化 + 技能/待办管理 |
| **dsh-model-search** | `0.1.0` | 模型快速搜索 |
| **dsh-prompt-manager** | `0.1.0` | 提示词管理与发布 |
| **dsh-shortcuts** | `1.1.0` | 快捷键绑定 |
| **dsh-web-default-session** | `1.0.0` | 默认工作目录会话 ⚠️ **原仓库已下架，此 tgz 为唯一可用来源** |
| **dsh-webui-perf** | `0.1.0` | WebUI 性能优化 |
| **graph-memory** | `1.6.0-beta.1` | 知识图谱记忆（含 win32-x64 sqlite 预编译） |
| **oss-prompt-optimizer** | `1.3.6` | 提示词优化引擎 |

### npm 官方依赖（随 `pnpm install` 自动安装）

`dsh-better-sidebar`、`dsh-context`、`dsh-find-plugin`、`dsh-web-search-pro`、`dshmarket`、`@linxin666/dsh-skins`、`@linxin666/dsh-client-ui-skin-harbor`、`@liustack/modlens`、`@nanmicoder/dsh-auto-mode`、`@struktoai/mirage-dsh` 等（从 npm registry 拉取，不依赖 GitHub）。

---

## 📂 目录结构

```text
zhuxi99/Robomaster-DSH-Fire/
├── profiles/desktop/          # desktop profile 配置（已针对 Windows 环境适配）
│   ├── package.json           # 插件清单（本地 .tgz / 相对路径 link，无平台专属依赖）
│   ├── pnpm-workspace.yaml    # pnpm 工作区配置（关闭 peer 自动安装、批准原生构建脚本）
│   └── cordis.patch.yml       # 加载器补丁（含 dsh-cad 手动 insert 配置）
├── custom-plugins/            # 队内自研插件源码（共 4 个）
│   ├── robomaster-studio/     # 工作台插件
│   ├── dsh-robomaster-core/   # 机器人核心工具
│   ├── model-tuner/           # 模型批量配置工具
│   └── dsh-restart-desktop/   # 桌面重启辅助插件
├── third-party/               # 第三方插件（离线打包 / 源码目录，Windows 免编译）
│   ├── dsh-cad-review/        # v0.2.0 DXF 图纸确定性审查插件
│   ├── dsh-cad/               # v0.1.0 OCCT 参数化建模工作台（含 lib/ 构建产物）
│   ├── dsh-at-file-0.6.0.tgz              # ↓ 以下均为 GitHub 插件离线打包（11 个）
│   ├── dsh-auto-collapse-0.1.3.tgz
│   ├── dsh-live-reload-0.2.0.tgz
│   ├── dsh-memory-evolve-0.1.0.tgz
│   ├── dsh-model-search-0.1.0.tgz
│   ├── dsh-prompt-manager-0.1.0.tgz
│   ├── dsh-shortcuts-1.1.0.tgz
│   ├── dsh-web-default-session-1.0.0.tgz  # ⚠️ 原仓库已下架，此 tgz 是唯一可用来源
│   ├── dsh-webui-perf-0.1.0.tgz
│   ├── graph-memory-1.6.0-beta.1.tgz      # 含 win32-x64 sqlite 预编译
│   └── oss-prompt-optimizer-1.3.6.tgz
├── prompts/                   # 提示词资产（active.yml + 机械设计准则）
├── presets/liangshen/         # Agent 角色与工作流预设
├── memories/                  # 脱敏用户档案 USER.md + 全局记忆 MEMORY.md + memory.md
├── install.bat                # 🖱️ 双击一键安装入口（推荐，无需敲命令）
├── install.ps1                # Windows 自动化安装脚本主体
├── sanitize-settings.mjs      # settings.yaml 脱敏生成脚本（生成 settings.yaml.template）
└── .gitignore                 # 敏感数据与本地运行时文件排除清单
```

---

## 🚀 快速开始

### 1. 环境前置准备

在安装前，请确保你的 Windows 电脑已具备以下基础环境：
- **操作系统**：Windows 10 / 11 (x64)
- **Node.js**：`≥ 22.0.0`
- **pnpm**：`≥ 10.0.0`（如未安装，可在终端运行 `npm i -g pnpm` 安装）
- **DSH 运行环境**：已安装的 DSH 客户端（或使用命令行启动）

### 2. 克隆仓库

打开终端或 PowerShell 执行：

```bash
git clone https://github.com/zhuxi99/Robomaster-DSH-Fire.git
cd Robomaster-DSH-Fire
```

### 3. 运行一键安装

> 💡 **最简单的方式：直接双击 `install.bat`**，它会自动完成全部配置与插件注入——复制全部 17 个离线插件、提示词、预设及记忆，并完成本地依赖安装，全程不需要打开终端、不需要敲任何命令。**零外部客户端下载，纯本地离线注入**。

| 方式 | 操作 | 适合人群 |
| :--- | :--- | :--- |
| **🖱️ 双击（推荐）** | 在文件资源管理器中**双击 `install.bat`** | 所有人，最简单 |
| **右键运行** | 右键 `install.ps1` → **使用 PowerShell 运行** | 习惯右键菜单 |
| **命令行** | 在仓库根目录打开 PowerShell 运行下方命令 | 熟悉终端的用户 |

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

> ⚠️ 如果之前安装报过错，先执行 `git pull` 拉到最新代码，再双击 `install.bat` 重试。
>
> 🌐 **关于联网需求**：所有 17 个自研/第三方插件均已随仓库离线分发，**不访问 GitHub 下载插件**；安装过程不下载任何额外的客户端安装包，仅从 npm registry 安装标准包依赖。

### 4. 关键：重启客户端

> ⚠️ **重要提示**：安装完成后，**必须完整退出并重新打开 DSH Desktop**（点击托盘退出或关闭进程后重启），**仅刷新页面无法加载新安装的插件**。

---

## 🔍 安装后验证

重新启动 DSH Desktop 后，请对照下表验证插件是否加载正常：

| 插件名称 | 版本 | 验证方式 | 预期效果 |
| :--- | :--- | :--- | :--- |
| **dsh-cad-review** | `v0.2.0` | 在会话中发送：`审查 XX.dxf`<br>或在终端运行：`dsh-cad-review review 图纸.dxf` | 输出结构化 DXF 规则审查报告 |
| **dsh-cad** | `v0.1.0` | 打开会话中的 **"3D"** Tab，或让 AI 调用 `cad_view` / `cad_volume` 工具 | 调出 OCCT 参数化建模与体积计算组件 |
| **robomaster-studio** | `0.1.0` | 查看侧边栏/工作台入口 | 出现 RoboMaster 工作台节点 |
| **model-tuner** | `0.1.2` | 打开模型批量配置页面 | 可批量调整模型档位 |
| **dsh-restart-desktop** | `1.0.0` | 使用桌面重启命令 | 触发 DSH Desktop 完整重启 |
| **dsh-web-default-session** | `1.0.0` | 新建会话 | 默认进入工作目录，无需手动选文件夹 |
| **graph-memory** | `1.6.0-beta.1` | 会话内记忆/图谱功能 | 记忆节点可读写，SQLite 正常初始化 |
| **dsh-auto-collapse** | `0.1.3` | 触发工具卡片 / Think 块 | 自动折叠为一行，带运行中状态 |
| **dsh-prompt-manager** | `0.1.0` | 打开提示词管理 | 可查看/发布提示词资产 |

> 💡 也可到 **设置 → 插件** 页面查看全部已加载插件，确认无报错项。

---

## 🔒 数据安全声明

> 🛡️ **安全提示**：
> 1. 本整合包仓库为公开仓库，**不包含任何私有 API Key、Token 或凭据**。
> 2. 所有的个人聊天记录、项目专属记忆、每日操作日志、知识图谱本地 SQLite 数据库等均已被 `.gitignore` 严格排除，不会上传或外泄。
> 3. 配置文件均使用模板生成（如 `settings.yaml.template`），队友安装时会自动使用本地空模板初始化。

---

## ❓ 常见问题 (FAQ)

<details>
<summary><b>Q1: 安装时报错 / 提示脚本执行权限受限怎么办？</b></summary>

**首选：直接双击 `install.bat`**——它已内置 `-ExecutionPolicy Bypass` 参数，不受系统脚本执行策略限制，大多数权限问题双击即可解决。

如果仍然报错，可以手动放开执行策略后重试：
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
或者使用绕过策略运行：
```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```
</details>

<details>
<summary><b>Q2: 插件原 GitHub 仓库下架了，安装会受影响吗？</b></summary>

**不会。** 本整合包中的所有 GitHub 社区插件（共 11 个）均已提前离线打包为 `.tgz` 随仓库分发，Windows 端通过 `file:` 本地引用安装，**安装过程完全不需要访问 GitHub**。

已确认下架的示例：`dsh-web-default-session` 的原仓库 `wjy9902/dsh-web-default-session` 已被作者删除，但其 `1.0.0` 的离线包仍随本仓库分发，功能不受影响。
</details>

<details>
<summary><b>Q3: 安装时提示 peer 依赖或 build 脚本问题？</b></summary>

整合包已在 `profiles/desktop/pnpm-workspace.yaml` 中预置处理：
- `autoInstallPeers: false` —— 关闭 peer 依赖自动解析，避免 `>=0.1.0 <0.2.0-0` 类无匹配版本报错；
- `allowBuilds` —— 显式批准原生模块构建脚本（如 `@photostructure/sqlite` 的 `node-gyp-build`、`node-pty`、`tree-sitter-bash` 等）。

正常安装不应出现此类问题；若出现，请确认已 `git pull` 到最新版本（pnpm-workspace.yaml 已入库）。
</details>

<details>
<summary><b>Q4: 如何修改 dsh-cad-review 审查图纸的默认目录和审查策略？</b></summary>

`dsh-cad-review` 默认以 DSH 启动目录作为 `workspaceRoot`。如果需要固定图纸工作区或调整规则，可以在 `profiles/desktop/cordis.patch.yml` 中找到 `dsh-cad-review` 的配置节点，修改对应的路径和审查参数，保存后重启 DSH Desktop 即可生效。
</details>

<details>
<summary><b>Q5: 后续仓库更新了新插件或提示词，队员如何升级同步？</b></summary>

在仓库目录下拉取最新代码后，**重新双击 `install.bat`** 即可：
```powershell
git pull origin main
```
然后双击 `install.bat`（或运行 `powershell -ExecutionPolicy Bypass -File .\install.ps1`）。
安装完成后记得**完整重启 DSH Desktop**。
</details>

<details>
<summary><b>Q6: 第三方插件源码中包含 Linux 路径（如 `/tmp/`, `/usr/bin/`），Windows 能正常使用吗？</b></summary>

**能正常使用。** 这些路径仅存在于测试代码和 FreeCAD 搜索候选列表中，不影响 Windows 环境下的核心功能。`dsh-cad` 已针对 Windows 进行了路径适配（会搜索 `C:\Program Files\` 下的 FreeCAD 安装），且所有运行时逻辑均使用 `os.tmpdir()` 等跨平台 API。如果你需要在 Windows 上运行这些测试用例，测试框架会自动使用系统临时目录。
</details>

<details>
<summary><b>Q7: graph-memory 需要编译原生模块吗？</b></summary>

**不需要。** `graph-memory` 依赖的 `@photostructure/sqlite@1.2.1` 已内置 **win32-x64 预编译二进制**（含在离线打包中），Windows 安装时通过 `node-gyp-build` 直接加载预编译产物，无需 Visual Studio / 编译工具链。整合包已在 `pnpm-workspace.yaml` 的 `allowBuilds` 中批准该构建脚本。
</details>

---

## 📝 备注与上游来源

- 本整合包中的 CAD 插件（`dsh-cad-review`, `dsh-cad`）及 GitHub 社区插件（`dsh-at-file`, `dsh-auto-collapse`, `dsh-live-reload`, `dsh-memory-evolve`, `dsh-model-search`, `dsh-prompt-manager`, `dsh-shortcuts`, `dsh-web-default-session`, `dsh-webui-perf`, `graph-memory`, `oss-prompt-optimizer` 共 11 个）均归原作者所有，各自遵循独立的开源许可证。
- 社区插件已通过 `pnpm pack` 打包为 `.tgz` 离线分发，**即使原 GitHub 仓库下架，安装不受影响**。其中 `dsh-web-default-session` 原仓库 `wjy9902/dsh-web-default-session` 已确认下架，仓库内 tgz 为其唯一可用来源。
- `graph-memory` 的 sqlite 原生依赖已从本地 vendor 包切换为 npm registry 版本（`@photostructure/sqlite@1.2.1`，与 vendor 内容一致且含 win32-x64 预编译），保证 Windows 端跨平台可用。
- 队内自研插件由 **太原工业学院火线战队（RoboMaster）研发组** 维护。如有 Bug 反馈或功能需求，请在队内群或提交 Issue 联系。
