# 🤖 RoboMaster DSH Desktop 整合包

> 专为 RoboMaster 战队机械组打造的 DeepSeek Harness Desktop (Windows) 一键安装配置套件，开箱即用，与负责人标准开发环境完全一致。

[![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows&logoColor=white)](#-快速开始)
[![Node Version](https://img.shields.io/badge/Node.js-≥22-339933?logo=nodedotjs&logoColor=white)](#-快速开始)
[![pnpm Version](https://img.shields.io/badge/pnpm-≥10-F69220?logo=pnpm&logoColor=white)](#-快速开始)
[![DSH Desktop](https://img.shields.io/badge/DSH-Desktop-8A2BE2)](#-特性一览)
[![Security](https://img.shields.io/badge/Security-No_Secrets-brightgreen)](#-数据安全声明)

---

## 📑 目录

- [📖 项目简介](#-项目简介)
- [✨ 特性一览](#-特性一览)
- [📂 目录结构](#-目录结构)
- [🚀 快速开始](#-快速开始)
- [🔍 安装后验证](#-安装后验证)
- [🔒 数据安全声明](#-数据安全声明)
- [❓ 常见问题 (FAQ)](#-常见问题-faq)
- [📝 备注与上游来源](#-备注与上游来源)

---

## 📖 项目简介

本仓库是针对 RoboMaster 战队定制的 DSH Desktop 环境配置整合包。针对 Windows 系统进行了完整的依赖解耦与路径相对化改造，内置 3D 模型查看、参数化建模与 DXF 图纸确定性审查工具链，帮助机械组队员省去复杂的环境编译配置流程，一键同步队内核心工作流。

| 核心维度 | 说明 |
| :--- | :--- |
| **适配平台** | Windows 10 / 11 (x64) |
| **核心用途** | 机械图纸审查、三维模型查看、参数化辅助建模、队内提示词与预设同步 |
| **安装方式** | 双击 `install.bat` 一键安装（无需敲命令） |
| **数据安全** | 敏感配置与历史数据已全量脱敏，无密钥泄露风险 |

---

## ✨ 特性一览

- 🛠️ **两大 CAD 核心套件**：预置已构建的 DXF 图纸审查和 OCCT 参数化建模工作台，Windows 免编译。
- 📦 **队内自研插件全家桶**：集成 RoboMaster 工作台、核心机器人工具、模型批量配置及桌面快速重启插件。
- ⚡ **双击即可安装**：内置 `install.bat`，机械组队友**双击文件**就能自动完成全部安装，无需打开终端敲任何命令。
- 🔒 **敏感数据零泄漏**：聊天记录、API Keys、私有项目记忆与本地数据库均已严格隔离并被 `.gitignore` 排除。
- 🎯 **开箱即用规范**：集成机械准则提示词节点与专用 Agent 预设，确保全队输出标准一致。

---

## 📂 目录结构

```text
zhuxi99/robomaster-DSH-/
├── profiles/desktop/          # desktop profile 配置（已针对 Windows 环境适配）
│   ├── package.json           # 插件清单（相对路径 link，无平台专属依赖）
│   └── cordis.patch.yml       # 加载器补丁（含 dsh-cad 手动 insert 配置）
├── custom-plugins/            # 队内自研插件源码（共 4 个）
│   ├── robomaster-studio/     # 工作台插件
│   ├── dsh-robomaster-core/   # 机器人核心工具
│   ├── model-tuner/           # 模型批量配置工具
│   └── dsh-restart-desktop/   # 桌面重启辅助插件
├── third-party/               # 第三方 CAD 插件（已预编译，Windows 免编译直接使用）
│   ├── dsh-cad-review/        # v0.2.0 DXF 图纸确定性审查插件
│   └── dsh-cad/               # v0.1.0 OCCT 参数化建模工作台（含 lib/ 构建产物）
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
- **客户端**：**DSH Desktop** 桌面客户端 —— 如果尚未安装，`install.bat` 会自动从 GitHub 下载并静默安装固定版本 **v2.0.0**（约 141MB），无需手动准备

### 2. 克隆仓库

打开终端或 PowerShell 执行：

```bash
git clone https://github.com/zhuxi99/robomaster-DSH-.git
cd robomaster-DSH-
```

### 3. 运行一键安装

> 💡 **最简单的方式：直接双击 `install.bat`**，它会自动完成全部安装步骤——包括自动下载安装 **DSH Desktop v2.0.0**（若本机未装）、复制全部配置、安装依赖，全程不需要打开终端、不需要敲任何命令。安装完成后窗口会自动提示结果。

| 方式 | 操作 | 适合人群 |
| :--- | :--- | :--- |
| **🖱️ 双击（推荐）** | 在文件资源管理器中**双击 `install.bat`** | 所有人，最简单 |
| **右键运行** | 右键 `install.ps1` → **使用 PowerShell 运行** | 习惯右键菜单 |
| **命令行** | 在仓库根目录打开 PowerShell 运行下方命令 | 熟悉终端的用户 |

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

> ⚠️ 如果之前用旧版 `install.ps1` 安装报过错，先执行 `git pull` 拉到最新代码，再双击 `install.bat` 重试。
>
> 📌 **关于 DSH Desktop 版本**：本整合包固定使用 v2.0.0（GitHub 官方直链），不跟随自动更新，保证配置稳定兼容。若本机已安装其他版本，脚本会**保持现状不覆盖**，避免破坏已有环境。

### 4. 关键：重启客户端

> ⚠️ **重要提示**：安装完成后，**必须完整退出并重新打开 DSH Desktop**（点击托盘退出或关闭进程后重启），**仅刷新页面无法加载新安装的插件**。

---

## 🔍 安装后验证

重新启动 DSH Desktop 后，请对照下表验证 CAD 插件及核心功能是否加载正常：

| 插件名称 | 版本 | 验证方式 | 预期效果 |
| :--- | :--- | :--- | :--- |
| **dsh-cad-review** | `v0.2.0` | 在会话中发送：`审查 XX.dxf`<br>或在终端运行：`dsh-cad-review review 图纸.dxf` | 输出结构化 DXF 规则审查报告 |
| **dsh-cad** | `v0.1.0` | 打开会话中的 **"3D"** Tab，或让 AI 调用 `cad_view` / `cad_volume` 工具 | 调出 OCCT 参数化建模与体积计算组件 |

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
<summary><b>Q2: 如何修改 dsh-cad-review 审查图纸的默认目录和审查策略？</b></summary>

`dsh-cad-review` 默认以 DSH 启动目录作为 `workspaceRoot`。如果需要固定图纸工作区或调整规则，可以在 `profiles/desktop/cordis.patch.yml` 中找到 `dsh-cad-review` 的配置节点，修改对应的路径和审查参数，保存后重启 DSH Desktop 即可生效。
</details>

<details>
<summary><b>Q3: 后续仓库更新了新插件或提示词，队员如何升级同步？</b></summary>

在仓库目录下拉取最新代码后，**重新双击 `install.bat`** 即可：
```powershell
git pull origin main
```
然后双击 `install.bat`（或运行 `powershell -ExecutionPolicy Bypass -File .\install.ps1`）。
安装完成后记得**完整重启 DSH Desktop**。
</details>

<details>
<summary><b>Q4: 第三方插件源码中包含 Linux 路径（如 `/tmp/`, `/usr/bin/`），Windows 能正常使用吗？</b></summary>

**能正常使用。** 这些路径仅存在于测试代码和 FreeCAD 搜索候选列表中，不影响 Windows 环境下的核心功能。`dsh-cad` 已针对 Windows 进行了路径适配（会搜索 `C:\Program Files\` 下的 FreeCAD 安装），且所有运行时逻辑均使用 `os.tmpdir()` 等跨平台 API。如果你需要在 Windows 上运行这些测试用例，测试框架会自动使用系统临时目录。
</details>

---

## 📝 备注与上游来源

- 本整合包中包含的第三方插件（`dsh-cad-review`, `dsh-cad`）均归原作者所有，各自遵循独立的开源许可证，具体可见各插件目录内的说明文档。
- 队内自研插件由 RoboMaster 战队研发组维护。如有 Bug 反馈或功能需求，请在队内群或提交 Issue 联系。
