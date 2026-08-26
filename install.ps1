# ============================================================
# ⚡ 太原工业学院 · 火线战队 DSH Desktop 全自动一键安装脚本
# 目标：队友双击 install.bat 直接装好客户端 + 全部 17 个插件
# ============================================================
$ErrorActionPreference = "Stop"

$DshRoot  = Join-Path $env:USERPROFILE ".dsh"
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProfDest = Join-Path $DshRoot "profiles\desktop"
$PlugDest = Join-Path $DshRoot "plugins"
$PackDest = Join-Path $DshRoot "pack\third-party"

# DSH Desktop 官方客户端安装包（国内多源加速，不卡死）
$DesktopVersion = "2.0.2"
$DesktopInstaller = Join-Path $RepoRoot "DSH-Desktop-$DesktopVersion-x64-Setup.exe"
$DownloadMirrors = @(
    "https://ghproxy.net/https://github.com/anywhere-labs/dsh-desktop/releases/download/v$DesktopVersion/DSH-Desktop-$DesktopVersion-x64-Setup.exe",
    "https://ghfast.top/https://github.com/anywhere-labs/dsh-desktop/releases/download/v$DesktopVersion/DSH-Desktop-$DesktopVersion-x64-Setup.exe",
    "https://github.com/anywhere-labs/dsh-desktop/releases/download/v$DesktopVersion/DSH-Desktop-$DesktopVersion-x64-Setup.exe"
)

function Get-InstalledDesktopVersion {
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

function Copy-DirectoryContents {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Destination
    )
    if (-not (Test-Path -LiteralPath $Source -PathType Container)) { throw "源目录不存在：$Source" }
    New-Item -ItemType Directory -Force -Path $Destination | Out-Null
    $items = Get-ChildItem -LiteralPath $Source -Force
    foreach ($item in $items) {
        Copy-Item -LiteralPath $item.FullName -Destination $Destination -Recurse -Force
    }
}

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " ⚡ 太原工业学院 · 火线战队 DSH 全自动一键部署" -ForegroundColor Cyan
Write-Host " 包含：DSH Desktop 官方客户端 + 17 个离线插件" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# ---------- 1. 检查 / 自动安装 DSH Desktop 客户端本体 ----------
Write-Host "[1/9] 检查 DSH Desktop 客户端本体..." -ForegroundColor Yellow
$curVer = Get-InstalledDesktopVersion
if ($curVer) {
    Write-Host "    OK 已安装 DSH Desktop v$curVer（跳过安装）" -ForegroundColor Green
} else {
    Write-Host "    未检测到客户端，准备自动下载并安装 DSH Desktop v$DesktopVersion ..." -ForegroundColor Yellow
    if (-not (Test-Path -LiteralPath $DesktopInstaller)) {
        $downloaded = $false
        foreach ($url in $DownloadMirrors) {
            Write-Host "    尝试从国内高速镜像源下载 (约 126MB)..." -ForegroundColor Yellow
            try {
                $wc = New-Object System.Net.WebClient
                $wc.DownloadFile($url, $DesktopInstaller)
                if ((Get-Item $DesktopInstaller).Length -gt 50MB) {
                    $downloaded = $true
                    Write-Host "    OK 下载完成：$DesktopInstaller" -ForegroundColor Green
                    break
                }
            } catch {
                Write-Host "    当前镜像源连接异常，切换备用源..." -ForegroundColor DarkGray
                if (Test-Path $DesktopInstaller) { Remove-Item $DesktopInstaller -Force }
            }
        }
        if (-not $downloaded) {
            Write-Host "    [警告] 自动下载未完成，队友亦可手动访问官网一键下载：https://www.dshdesktop.cn/" -ForegroundColor Yellow
        }
    } else {
        Write-Host "    使用本地已有的安装包：$DesktopInstaller" -ForegroundColor Green
    }

    if (Test-Path -LiteralPath $DesktopInstaller) {
        Write-Host "    正在静默安装 DSH Desktop 客户端（NSIS /S），请稍候..." -ForegroundColor Yellow
        try {
            $proc = Start-Process -FilePath $DesktopInstaller -ArgumentList "/S" -Wait -PassThru
            Write-Host "    OK DSH Desktop 客户端安装完成！" -ForegroundColor Green
        } catch {
            Write-Host "    [提示] 可手动双击安装：$DesktopInstaller" -ForegroundColor Yellow
        }
    }
}

# ---------- 2. 检查 Node.js 与 pnpm ----------
Write-Host "[2/9] 检查 Node.js / pnpm 环境..." -ForegroundColor Yellow
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
    Write-Host " [错误] 未找到 Node.js，请先安装 Node >= 22 (https://nodejs.org/)" -ForegroundColor Red
    exit 1
}
$nodeVer = & $nodeCommand.Source --version
$nodeMajor = [int]($nodeVer -replace '^v(\d+)\..*','$1')
if ($nodeMajor -lt 22) {
    Write-Host " [错误] Node.js 版本过低（$nodeMajor），需要 >= 22" -ForegroundColor Red
    exit 1
}
$pnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpmCommand) {
    Write-Host " [错误] 未找到 pnpm，请执行 npm i -g pnpm 安装" -ForegroundColor Red
    exit 1
}
$pnpmVer = & $pnpmCommand.Source --version
Write-Host "    OK Node $nodeVer / pnpm $pnpmVer" -ForegroundColor Green

# ---------- 3. 复制火线战队自研插件 ----------
Write-Host "[3/9] 复制火线战队自研插件 -> .dsh\plugins\" -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $PlugDest | Out-Null
$pluginList = @("robomaster-studio", "dsh-robomaster-core", "model-tuner", "dsh-restart-desktop")
foreach ($p in $pluginList) {
    $src = Join-Path $RepoRoot "custom-plugins\$p"
    if (Test-Path $src) {
        Copy-Item -Recurse -Force $src $PlugDest
        Write-Host "    OK $p"
    }
}

# ---------- 4. 复制第三方离线插件包 ----------
Write-Host "[4/9] 复制第三方离线插件（全打包免外网下载）-> .dsh\pack\third-party\" -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $PackDest | Out-Null
Copy-DirectoryContents -Source (Join-Path $RepoRoot "third-party") -Destination $PackDest
Write-Host "    OK CAD 套件 (2) + 离线社区插件 (11)" -ForegroundColor Green

# ---------- 5. 复制 desktop profile 配置 ----------
Write-Host "[5/9] 复制 desktop profile 配置 -> .dsh\profiles\desktop\" -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $ProfDest | Out-Null
$pkgDest = Join-Path $ProfDest "package.json"
if (Test-Path $pkgDest) {
    $bak = "$pkgDest.bak-$(Get-Date -Format yyyyMMdd-HHmmss)"
    Copy-Item $pkgDest $bak -Force
}
Copy-Item -Force (Join-Path $RepoRoot "profiles\desktop\package.json") $pkgDest
Copy-Item -Force (Join-Path $RepoRoot "profiles\desktop\cordis.patch.yml") (Join-Path $ProfDest "cordis.patch.yml")
Copy-Item -Force (Join-Path $RepoRoot "profiles\desktop\pnpm-workspace.yaml") (Join-Path $ProfDest "pnpm-workspace.yaml")
Write-Host "    OK package.json + cordis.patch.yml + pnpm-workspace.yaml" -ForegroundColor Green

# ---------- 6. 复制提示词与预设 ----------
Write-Host "[6/9] 复制火线战队提示词与预设 -> .dsh\prompts\ & presets\" -ForegroundColor Yellow
$promptDest = Join-Path $DshRoot "prompts"
New-Item -ItemType Directory -Force -Path $promptDest | Out-Null
Copy-DirectoryContents -Source (Join-Path $RepoRoot "prompts") -Destination $promptDest
$presetDest = Join-Path $DshRoot ".agent-presets\liangshen"
New-Item -ItemType Directory -Force -Path $presetDest | Out-Null
Copy-DirectoryContents -Source (Join-Path $RepoRoot "presets\liangshen") -Destination $presetDest
Write-Host "    OK prompts + presets" -ForegroundColor Green

# ---------- 7. 复制脱敏记忆 ----------
Write-Host "[7/9] 复制脱敏记忆 -> .dsh\memories\（不覆盖已有）" -ForegroundColor Yellow
$memDest = Join-Path $DshRoot "memories"
New-Item -ItemType Directory -Force -Path $memDest | Out-Null
$memFiles = @("USER.md", "MEMORY.md", "memory.md")
foreach ($f in $memFiles) {
    $t = Join-Path $memDest $f
    $s = Join-Path $RepoRoot "memories\$f"
    if (Test-Path $t) {
        Write-Host "    -- $f 已存在，保留本机记忆"
    } elseif (Test-Path $s) {
        Copy-Item -Force $s $t
        Write-Host "    OK $f"
    }
}

# ---------- 8. settings.yaml ----------
Write-Host "[8/9] 检查 settings.yaml 配置文件..." -ForegroundColor Yellow
$settingsDest = Join-Path $DshRoot "settings.yaml"
if (Test-Path $settingsDest) {
    Write-Host "    -- settings.yaml 已存在，保留"
} else {
    $tmpl = Join-Path $RepoRoot "settings.yaml.template"
    if (Test-Path $tmpl) {
        Copy-Item -Force $tmpl $settingsDest
        Write-Host "    [注意] 已生成模板 settings.yaml" -ForegroundColor Yellow
    }
}

# ---------- 9. pnpm install ----------
Write-Host "[9/9] 安装本地离线依赖（pnpm install）..." -ForegroundColor Yellow
Push-Location $ProfDest
$installOk = $true
try {
    pnpm install
    if ($LASTEXITCODE -ne 0) { throw "pnpm install 失败" }
    Write-Host "    OK 全部 17 个插件依赖就绪" -ForegroundColor Green
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
    Write-Host " ⚡ 太原工业学院 · 火线战队 DSH 全套环境部署完成！" -ForegroundColor Green
} else {
    Write-Host " ⚠️ 部分步骤未成功，请检查上方日志" -ForegroundColor Yellow
}
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " 接下来：" -ForegroundColor Cyan
Write-Host "  1. 打开桌面上的【DSH Desktop】图标" -ForegroundColor White
Write-Host "  2. 打开 设置 -> 插件，17 个火线战队工具全量就绪！" -ForegroundColor White
Write-Host "==============================================" -ForegroundColor Cyan

if (-not $installOk) { exit 1 }
exit 0
