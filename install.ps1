# ============================================================
# RoboMaster DSH Desktop 一键安装脚本（Windows PowerShell）
# 用法：双击 install.bat 即可，或手动执行：
#   powershell -NoProfile -ExecutionPolicy Bypass -File install.ps1
# ============================================================
$ErrorActionPreference = "Stop"

$DshRoot  = Join-Path $env:USERPROFILE ".dsh"
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProfDest = Join-Path $DshRoot "profiles\desktop"
$PlugDest = Join-Path $DshRoot "plugins"
$PackDest = Join-Path $DshRoot "pack\third-party"

function Copy-DirectoryContents {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Source,

        [Parameter(Mandatory = $true)]
        [string]$Destination
    )

    if (-not (Test-Path -LiteralPath $Source -PathType Container)) {
        throw "源目录不存在：$Source"
    }

    New-Item -ItemType Directory -Force -Path $Destination | Out-Null

    $items = Get-ChildItem -LiteralPath $Source -Force
    foreach ($item in $items) {
        Copy-Item -LiteralPath $item.FullName `
            -Destination $Destination `
            -Recurse `
            -Force
    }
}

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " RoboMaster DSH Desktop 安装包" -ForegroundColor Cyan
Write-Host " 目标: $DshRoot" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# ---------- 1. 检查前置 ----------
Write-Host "[1/8] 检查环境..." -ForegroundColor Yellow
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
    Write-Host " [错误] 未找到 Node.js，请先安装 Node >= 22" -ForegroundColor Red
    exit 1
}
$nodeVer = & $nodeCommand.Source --version
if ($LASTEXITCODE -ne 0 -or $nodeVer -notmatch '^v(\d+)') {
    Write-Host " [错误] 无法识别 Node.js 版本：$nodeVer" -ForegroundColor Red
    exit 1
}
$nodeMajor = [int]$Matches[1]
if ($nodeMajor -lt 22) {
    Write-Host " [错误] Node.js 版本过低（$nodeMajor），需要 >= 22" -ForegroundColor Red
    exit 1
}
$pnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpmCommand) {
    Write-Host " [错误] 未找到 pnpm，请先执行 npm i -g pnpm" -ForegroundColor Red
    exit 1
}
$pnpmVer = & $pnpmCommand.Source --version
if ($LASTEXITCODE -ne 0) {
    Write-Host " [错误] pnpm 无法正常运行" -ForegroundColor Red
    exit 1
}
Write-Host "    OK Node $nodeVer / pnpm $pnpmVer" -ForegroundColor Green

# ---------- 2. 自研插件 ----------
Write-Host "[2/8] 复制自研插件 -> .dsh\plugins\" -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $PlugDest | Out-Null
$pluginList = @("robomaster-studio", "dsh-robomaster-core", "model-tuner", "dsh-restart-desktop")
foreach ($p in $pluginList) {
    $src = Join-Path $RepoRoot "custom-plugins\$p"
    if (Test-Path $src) {
        Copy-Item -Recurse -Force $src $PlugDest
        Write-Host "    OK $p"
    } else {
        Write-Host "    -- $p 不存在，跳过"
    }
}

# ---------- 3. 第三方 CAD 插件 ----------
Write-Host "[3/8] 复制第三方 CAD 插件 -> .dsh\pack\third-party\" -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $PackDest | Out-Null
Copy-DirectoryContents -Source (Join-Path $RepoRoot "third-party") -Destination $PackDest
Write-Host "    OK dsh-cad / dsh-cad-review / dsh-3d-model-viewer"

# ---------- 4. desktop profile 配置 ----------
Write-Host "[4/8] 复制 desktop profile 配置" -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $ProfDest | Out-Null
$pkgDest = Join-Path $ProfDest "package.json"
if (Test-Path $pkgDest) {
    $bak = "$pkgDest.bak-$(Get-Date -Format yyyyMMdd-HHmmss)"
    Copy-Item $pkgDest $bak -Force
    Write-Host "    已备份原有 package.json -> $bak"
}
Copy-Item -Force (Join-Path $RepoRoot "profiles\desktop\package.json") $pkgDest
Copy-Item -Force (Join-Path $RepoRoot "profiles\desktop\cordis.patch.yml") (Join-Path $ProfDest "cordis.patch.yml")
Write-Host "    OK"

# ---------- 5. 提示词与预设 ----------
Write-Host "[5/8] 复制提示词与预设" -ForegroundColor Yellow
$promptDest = Join-Path $DshRoot "prompts"
New-Item -ItemType Directory -Force -Path $promptDest | Out-Null
Copy-DirectoryContents -Source (Join-Path $RepoRoot "prompts") -Destination $promptDest
$presetDest = Join-Path $DshRoot ".agent-presets\liangshen"
New-Item -ItemType Directory -Force -Path $presetDest | Out-Null
Copy-DirectoryContents -Source (Join-Path $RepoRoot "presets\liangshen") -Destination $presetDest
Write-Host "    OK prompts + presets"

# ---------- 6. 记忆 ----------
Write-Host "[6/8] 复制记忆（不覆盖已有）" -ForegroundColor Yellow
$memDest = Join-Path $DshRoot "memories"
New-Item -ItemType Directory -Force -Path $memDest | Out-Null
$memFiles = @("USER.md", "MEMORY.md", "memory.md")
foreach ($f in $memFiles) {
    $t = Join-Path $memDest $f
    $s = Join-Path $RepoRoot "memories\$f"
    if (Test-Path $t) {
        Write-Host "    -- $f 已存在，跳过（保留本机现有记忆）"
    } elseif (Test-Path $s) {
        Copy-Item -Force $s $t
        Write-Host "    OK $f"
    } else {
        Write-Host "    -- $f 源文件不存在，跳过"
    }
}

# ---------- 7. settings.yaml ----------
Write-Host "[7/8] settings.yaml" -ForegroundColor Yellow
$settingsDest = Join-Path $DshRoot "settings.yaml"
if (Test-Path $settingsDest) {
    Write-Host "    -- settings.yaml 已存在，保留"
} else {
    $tmpl = Join-Path $RepoRoot "settings.yaml.template"
    if (Test-Path $tmpl) {
        Copy-Item -Force $tmpl $settingsDest
        Write-Host "    [注意] 已复制模板，请编辑 settings.yaml 填入 API Key，否则 AI 无法工作" -ForegroundColor Yellow
    }
}

# ---------- 8. pnpm install ----------
Write-Host "[8/8] 安装依赖（pnpm install）..." -ForegroundColor Yellow
Push-Location $ProfDest
$installOk = $true
try {
    pnpm install
    if ($LASTEXITCODE -ne 0) { throw "pnpm install 失败" }
    Write-Host "    OK 依赖安装完成" -ForegroundColor Green
} catch {
    Write-Host "    [错误] $_" -ForegroundColor Red
    $installOk = $false
} finally {
    Pop-Location
}

# ---------- 完成 ----------
Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
if ($installOk) {
    Write-Host " 安装完成！" -ForegroundColor Green
} else {
    Write-Host " 安装部分完成（有错误，请检查上方信息）" -ForegroundColor Yellow
}
Write-Host " 下一步：" -ForegroundColor Cyan
Write-Host "  1. 完整重启 DSH Desktop（不是刷新页面）" -ForegroundColor White
Write-Host "  2. 若浏览器工具报缺内核：调用 browser_install" -ForegroundColor White
Write-Host "  3. 验证插件：设置 - 插件，应能看到 CAD 插件" -ForegroundColor White
Write-Host "==============================================" -ForegroundColor Cyan

if (-not $installOk) {
    exit 1
}

exit 0