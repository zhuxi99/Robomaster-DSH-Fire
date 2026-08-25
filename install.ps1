# ============================================================
# RoboMaster DSH Desktop 一键安装脚本（Windows）
# 前置要求：
#   1. 已安装 DSH Desktop
#   2. Node.js >= 22（https://nodejs.org）
#   3. pnpm >= 10（npm i -g pnpm）
# 用法：在仓库根目录右键 → 使用 PowerShell 运行，或：
#   powershell -ExecutionPolicy Bypass -File .\install.ps1
# ============================================================
$ErrorActionPreference = "Stop"

$DshRoot   = Join-Path $env:USERPROFILE ".dsh"
$RepoRoot  = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProfDest  = Join-Path $DshRoot "profiles\desktop"
$PlugDest  = Join-Path $DshRoot "plugins"
$PackDest  = Join-Path $DshRoot "pack\third-party"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " RoboMaster DSH Desktop 安装包" -ForegroundColor Cyan
Write-Host " 目标: $DshRoot" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# ---------- 0. 检查前置 ----------
Write-Host "[0/8] 检查环境..." -ForegroundColor Yellow
node --version | Out-Null
if ($LASTEXITCODE -ne 0) { throw "未找到 Node.js，请先安装 Node >= 22" }
$nodeMajor = [int]((node --version) -replace 'v(\d+).*', '$1')
if ($nodeMajor -lt 22) { throw "Node.js 版本过低（$nodeMajor），需要 >= 22" }
pnpm --version | Out-Null
if ($LASTEXITCODE -ne 0) { throw "未找到 pnpm，请先执行 npm i -g pnpm" }
Write-Host "    ✓ Node $(node --version) / pnpm $(pnpm --version)" -ForegroundColor Green

# ---------- 1. 自研插件 ----------
Write-Host "[1/8] 复制自研插件 -> .dsh\plugins\" -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $PlugDest | Out-Null
foreach ($p in @("robomaster-studio", "dsh-robomaster-core", "model-tuner", "dsh-restart-desktop")) {
    $src = Join-Path $RepoRoot "custom-plugins\$p"
    if (Test-Path $src) {
        Copy-Item -Recurse -Force $src $PlugDest
        Write-Host "    ✓ $p"
    } else {
        Write-Host "    ⚠ 缺少 $p，跳过"
    }
}

# ---------- 2. 第三方插件 ----------
Write-Host "[2/8] 复制第三方 CAD 插件 -> .dsh\pack\third-party\" -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $PackDest | Out-Null
Copy-Item -Recurse -Force (Join-Path $RepoRoot "third-party\*") $PackDest
Write-Host "    ✓ dsh-cad / dsh-cad-review / dsh-3d-model-viewer"

# ---------- 3. desktop profile 配置 ----------
Write-Host "[3/8] 复制 desktop profile 配置" -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $ProfDest | Out-Null
$pkgDest = Join-Path $ProfDest "package.json"
if (Test-Path $pkgDest) {
    Copy-Item $pkgDest "$pkgDest.bak-$(Get-Date -Format yyyyMMdd-HHmmss)" -Force
    Write-Host "    已备份原有 package.json"
}
Copy-Item -Force (Join-Path $RepoRoot "profiles\desktop\package.json") $pkgDest
Copy-Item -Force (Join-Path $RepoRoot "profiles\desktop\cordis.patch.yml") (Join-Path $ProfDest "cordis.patch.yml")

# ---------- 4. 提示词与 Agent 预设 ----------
Write-Host "[4/8] 复制提示词与预设" -ForegroundColor Yellow
$promptDest = Join-Path $DshRoot "prompts"
New-Item -ItemType Directory -Force -Path $promptDest | Out-Null
Copy-Item -Force (Join-Path $RepoRoot "prompts\*") $promptDest
$presetDest = Join-Path $DshRoot ".agent-presets\liangshen"
New-Item -ItemType Directory -Force -Path $presetDest | Out-Null
Copy-Item -Force (Join-Path $RepoRoot "presets\liangshen\*") $presetDest
Write-Host "    ✓ prompts + presets"

# ---------- 5. 记忆（用户档案 + 全局记忆）----------
Write-Host "[5/8] 复制记忆（不覆盖已有）" -ForegroundColor Yellow
$memDest = Join-Path $DshRoot "memories"
New-Item -ItemType Directory -Force -Path $memDest | Out-Null
foreach ($f in @("USER.md", "MEMORY.md", "memory.md")) {
    $t = Join-Path $memDest $f
    if (!(Test-Path $t)) {
        Copy-Item -Force (Join-Path $RepoRoot "memories\$f") $t
        Write-Host "    ✓ $f"
    } else {
        Write-Host "    - $f 已存在，跳过（保留本机现有记忆）"
    }
}

# ---------- 6. settings.yaml（首次安装）----------
Write-Host "[6/8] settings.yaml" -ForegroundColor Yellow
$settingsDest = Join-Path $DshRoot "settings.yaml"
if (!(Test-Path $settingsDest)) {
    $tmpl = Join-Path $RepoRoot "settings.yaml.template"
    if (Test-Path $tmpl) {
        Copy-Item -Force $tmpl $settingsDest
        Write-Host "    ⚠ 已复制模板，请编辑 settings.yaml 填入 API Key"
    }
} else {
    Write-Host "    - settings.yaml 已存在，保留"
}

# ---------- 7. 安装依赖 ----------
Write-Host "[7/8] pnpm install（可能需要几分钟）..." -ForegroundColor Yellow
Push-Location $ProfDest
try {
    pnpm install
    if ($LASTEXITCODE -ne 0) { throw "pnpm install 失败" }
    Write-Host "    ✓ 依赖安装完成" -ForegroundColor Green
} finally {
    Pop-Location
}

# ---------- 8. 完成 ----------
Write-Host "[8/8] 完成！" -ForegroundColor Green
Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " 下一步：" -ForegroundColor Cyan
Write-Host "  1. 完整重启 DSH Desktop（不是刷新页面）" -ForegroundColor White
Write-Host "  2. 若浏览器工具报缺内核：调用 browser_install" -ForegroundColor White
Write-Host "  3. 验证插件：设置 → 插件 应能看到 CAD 插件" -ForegroundColor White
Write-Host "  4. dsh-cad-review 默认 workspaceRoot = DSH 启动目录" -ForegroundColor White
Write-Host "     （可在 cordis.patch.yml 配置固定目录）" -ForegroundColor White
Write-Host "==============================================" -ForegroundColor Cyan
