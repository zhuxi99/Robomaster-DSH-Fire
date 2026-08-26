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

# DSH Desktop 官方安装包（GitHub 直链，固定 v2.0.0，安全优先不追新）
$DesktopVersion = "2.0.0"
$DesktopUrl = "https://github.com/anywhere-labs/dsh-desktop/releases/download/v$DesktopVersion/DSH-Desktop-$DesktopVersion-x64-Setup.exe"
$DesktopInstaller = Join-Path $RepoRoot "DSH-Desktop-$DesktopVersion-x64-Setup.exe"

function Get-InstalledDesktopVersion {
    # 从注册表卸载项查询已安装的 DSH Desktop 版本
    $paths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )
    foreach ($p in $paths) {
        $items = Get-ItemProperty $p -ErrorAction SilentlyContinue
        foreach ($i in $items) {
            if ($i.DisplayName -like "*DSH Desktop*" -and $i.DisplayVersion) {
                return $i.DisplayVersion
            }
        }
    }
    return $null
}

function Install-DesktopIfMissing {
    Write-Host "[1/9] 检查 DSH Desktop 本体..." -ForegroundColor Yellow
    $cur = Get-InstalledDesktopVersion
    if ($cur) {
        Write-Host "    OK 已安装 DSH Desktop v$cur（不更新，保持现状）" -ForegroundColor Green
        return
    }

    Write-Host "    未检测到 DSH Desktop，准备安装 v$DesktopVersion ..." -ForegroundColor Yellow
    if (-not (Test-Path -LiteralPath $DesktopInstaller)) {
        Write-Host "    正在从 GitHub 下载安装包（约 141MB，请耐心等待）..." -ForegroundColor Yellow
        try {
            $ProgressPreference = "SilentlyContinue"
            Invoke-WebRequest -Uri $DesktopUrl -OutFile $DesktopInstaller -UseBasicParsing
        } catch {
            Write-Host "    [错误] 下载失败：$_" -ForegroundColor Red
            Write-Host "    请手动下载后重试：$DesktopUrl" -ForegroundColor Yellow
            throw "DSH Desktop 安装包下载失败"
        }
        Write-Host "    下载完成：$DesktopInstaller" -ForegroundColor Green
    } else {
        Write-Host "    使用已下载的安装包：$DesktopInstaller" -ForegroundColor Green
    }

    Write-Host "    正在静默安装（NSIS /S），请稍候..." -ForegroundColor Yellow
    try {
        $proc = Start-Process -FilePath $DesktopInstaller -ArgumentList "/S" -Wait -PassThru
        if ($proc.ExitCode -ne 0) {
            throw "安装程序退出码 $($proc.ExitCode)"
        }
    } catch {
        Write-Host "    [错误] 安装失败：$_" -ForegroundColor Red
        throw "DSH Desktop 安装失败"
    }

    $cur2 = Get-InstalledDesktopVersion
    if ($cur2) {
        Write-Host "    OK DSH Desktop v$cur2 安装完成" -ForegroundColor Green
    } else {
        Write-Host "    [警告] 未能在注册表确认版本，可能安装到其他位置，请手动启动确认" -ForegroundColor Yellow
    }
}

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

# ---------- 0. DSH Desktop 本体 ----------
try {
    Install-DesktopIfMissing
} catch {
    Write-Host " [错误] DSH Desktop 安装步骤失败，终止安装" -ForegroundColor Red
    exit 1
}

# ---------- 1. 检查前置 ----------
Write-Host "[2/9] 检查环境..." -ForegroundColor Yellow
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
Write-Host "[3/9] 复制自研插件 -> .dsh\plugins\" -ForegroundColor Yellow
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

# ---------- 3. 第三方插件（CAD + 离线打包 tgz） ----------
Write-Host "[4/9] 复制第三方插件（CAD 2 个 + 离线打包 11 个）-> .dsh\pack\third-party\" -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $PackDest | Out-Null
Copy-DirectoryContents -Source (Join-Path $RepoRoot "third-party") -Destination $PackDest
Write-Host "    OK dsh-cad / dsh-cad-review + 11 个离线 tgz 插件"

# ---------- 4. desktop profile 配置 ----------
Write-Host "[5/9] 复制 desktop profile 配置" -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $ProfDest | Out-Null
$pkgDest = Join-Path $ProfDest "package.json"
if (Test-Path $pkgDest) {
    $bak = "$pkgDest.bak-$(Get-Date -Format yyyyMMdd-HHmmss)"
    Copy-Item $pkgDest $bak -Force
    Write-Host "    已备份原有 package.json -> $bak"
}
Copy-Item -Force (Join-Path $RepoRoot "profiles\desktop\package.json") $pkgDest
Copy-Item -Force (Join-Path $RepoRoot "profiles\desktop\cordis.patch.yml") (Join-Path $ProfDest "cordis.patch.yml")
Copy-Item -Force (Join-Path $RepoRoot "profiles\desktop\pnpm-workspace.yaml") (Join-Path $ProfDest "pnpm-workspace.yaml")
Write-Host "    OK"

# ---------- 5. 提示词与预设 ----------
Write-Host "[6/9] 复制提示词与预设" -ForegroundColor Yellow
$promptDest = Join-Path $DshRoot "prompts"
New-Item -ItemType Directory -Force -Path $promptDest | Out-Null
Copy-DirectoryContents -Source (Join-Path $RepoRoot "prompts") -Destination $promptDest
$presetDest = Join-Path $DshRoot ".agent-presets\liangshen"
New-Item -ItemType Directory -Force -Path $presetDest | Out-Null
Copy-DirectoryContents -Source (Join-Path $RepoRoot "presets\liangshen") -Destination $presetDest
Write-Host "    OK prompts + presets"

# ---------- 6. 记忆 ----------
Write-Host "[7/9] 复制记忆（不覆盖已有）" -ForegroundColor Yellow
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
Write-Host "[8/9] settings.yaml" -ForegroundColor Yellow
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
Write-Host "[9/9] 安装依赖（pnpm install）..." -ForegroundColor Yellow
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
Write-Host "  3. 验证插件：设置 - 插件，应能看到 CAD 与全部离线插件" -ForegroundColor White
Write-Host "==============================================" -ForegroundColor Cyan

if (-not $installOk) {
    exit 1
}

exit 0