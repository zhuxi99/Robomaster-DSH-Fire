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

function Get-FileTgzDependencies {
    param([Parameter(Mandatory = $true)][string]$PackageJsonPath)
    $found = @()
    if (-not (Test-Path -LiteralPath $PackageJsonPath -PathType Leaf)) { return $found }
    try {
        $meta = Get-Content -LiteralPath $PackageJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
    } catch {
        Write-Host "    [提示] 无法解析 $PackageJsonPath : $_" -ForegroundColor DarkGray
        return $found
    }
    if (-not $meta.dependencies) { return $found }
    foreach ($prop in $meta.dependencies.PSObject.Properties) {
        $spec = [string]$prop.Value
        if ($spec.StartsWith("file:") -and $spec.EndsWith(".tgz")) {
            $found += [pscustomobject]@{
                Name     = $prop.Name
                Relative = $spec.Substring(5).Replace('/', '\')
            }
        }
    }
    return $found
}

function Resolve-RelativePath {
    param(
        [Parameter(Mandatory = $true)][string]$BasePath,
        [Parameter(Mandatory = $true)][string]$Relative
    )
    return [IO.Path]::GetFullPath([IO.Path]::Combine($BasePath, $Relative))
}

function Test-PackageEntry {
    param([Parameter(Mandatory = $true)][string]$PackageDir)
    if (-not (Test-Path -LiteralPath $PackageDir -PathType Container)) { return $false }
    $pj = Join-Path $PackageDir "package.json"
    if (-not (Test-Path -LiteralPath $pj -PathType Leaf)) { return $false }
    try {
        $meta = Get-Content -LiteralPath $pj -Raw -Encoding UTF8 | ConvertFrom-Json
    } catch {
        return $false
    }
    $entry = "index.js"
    if ($meta.main) { $entry = [string]$meta.main }
    $entryPath = Join-Path $PackageDir ($entry.Replace('/', '\'))
    if (Test-Path -LiteralPath $entryPath -PathType Leaf) { return $true }
    if (Test-Path -LiteralPath "$entryPath.js" -PathType Leaf) { return $true }
    if (Test-Path -LiteralPath (Join-Path $entryPath "index.js") -PathType Leaf) { return $true }
    return $false
}

function Expand-TgzPackage {
    param(
        [Parameter(Mandatory = $true)][string]$TgzPath,
        [Parameter(Mandatory = $true)][string]$DestDir,
        [Parameter(Mandatory = $true)][string]$Extractor
    )
    if (-not (Test-Path -LiteralPath $TgzPath -PathType Leaf)) {
        Write-Host "    [错误] 找不到离线包：$TgzPath" -ForegroundColor Red
        return $false
    }
    if (-not (Test-Path -LiteralPath $Extractor -PathType Leaf)) {
        Write-Host "    [错误] 找不到解包脚本：$Extractor" -ForegroundColor Red
        return $false
    }
    # node 的输出直接写到宿主，避免混进函数返回值（PS 函数会返回所有未捕获输出）
    & node $Extractor $TgzPath $DestDir | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Write-Host "    [错误] 解包失败：$TgzPath" -ForegroundColor Red
        return $false
    }
    return $true
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
Write-Host "[8/9] 检查并校准 settings.yaml 配置文件..." -ForegroundColor Yellow
$settingsDest = Join-Path $DshRoot "settings.yaml"
$tmpl = Join-Path $RepoRoot "settings.yaml.template"

$validator = Join-Path $RepoRoot "validate-settings.mjs"

# 通用 YAML 校验：不再匹配某个具体 provider 名，而是真的解析一遍
function Test-SettingsYaml {
    param([Parameter(Mandatory = $true)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return $false }
    if (-not (Test-Path -LiteralPath $validator)) {
        # 没有校验器时退化为最小文本检查：孤立占位符一定是坏的
        $raw = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
        return -not ($raw -match "(?m)^\s*<FILL-IN>\s*$")
    }
    # $ErrorActionPreference=Stop 下原生命令写 stderr 可能抛异常，这里单独兜住
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $global:LASTEXITCODE = 0
        & node $validator $Path 2>&1 | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
        return ($LASTEXITCODE -eq 0)
    } catch {
        Write-Host "      [校验器无法运行] $_" -ForegroundColor DarkGray
        return $false
    } finally {
        $ErrorActionPreference = $prevEap
    }
}

# 先确认要分发的模板自身是合法的，避免把坏模板推给队友
$tmplOk = $false
if (Test-Path $tmpl) {
    $tmplOk = Test-SettingsYaml -Path $tmpl
    if (-not $tmplOk) {
        Write-Host "    [错误] settings.yaml.template 自身语法不合法，已跳过注入（请在源机重新生成模板）" -ForegroundColor Red
    }
}

if (-not (Test-Path $settingsDest)) {
    if ($tmplOk) {
        Copy-Item -Force $tmpl $settingsDest
        Write-Host "    OK settings.yaml 已注入（请填写各 provider 的 <FILL-IN> 凭据）" -ForegroundColor Green
    }
} elseif (Test-SettingsYaml -Path $settingsDest) {
    Write-Host "    -- settings.yaml 已存在且语法健康，保留本机配置" -ForegroundColor Green
} else {
    # 本机配置损坏。优先「就地修复」：只补回被脱敏吞掉的字段，
    # 你已经填好的 apiKey 一个都不动。修不好才退回覆盖模板。
    Write-Host "    检测到 settings.yaml 语法损坏，正在尝试就地修复（保留已填密钥）..." -ForegroundColor Yellow
    $repairer = Join-Path $RepoRoot "repair-settings.mjs"
    $repaired = $false
    if (Test-Path -LiteralPath $repairer) {
        $prevEap2 = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        try {
            $global:LASTEXITCODE = 0
            & node $repairer $settingsDest 2>&1 | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
            $repaired = ($LASTEXITCODE -eq 0)
        } catch {
            Write-Host "      [修复器无法运行] $_" -ForegroundColor DarkGray
            $repaired = $false
        } finally {
            $ErrorActionPreference = $prevEap2
        }
    }

    if ($repaired -and (Test-SettingsYaml -Path $settingsDest)) {
        Write-Host "    OK settings.yaml 已就地修复，已填写的密钥全部保留" -ForegroundColor Green
    } elseif ($tmplOk) {
        # 修不好：原样备份（里面可能有已填好的真实密钥），再落干净模板
        $broken = "$settingsDest.broken-$(Get-Date -Format yyyyMMdd-HHmmss)"
        Copy-Item -LiteralPath $settingsDest -Destination $broken -Force
        Copy-Item -Force $tmpl $settingsDest
        Write-Host "    [已重置] 无法就地修复，原配置已备份为 $broken" -ForegroundColor Yellow
        Write-Host "    OK settings.yaml 已重置为干净模板，请从备份里取回你已填写的密钥" -ForegroundColor Green
    } else {
        Write-Host "    [错误] settings.yaml 语法损坏且无可用模板，DSH 将无法启动" -ForegroundColor Red
    }
}

# ---------- 9. pnpm install ----------
Write-Host "[9/9] 安装本地离线依赖（pnpm install）..." -ForegroundColor Yellow

# dsh-cad 曾用 link: 分发，会在 node_modules 留下指向源码目录的符号链接／junction。
# 源码目录没有 lib/（被它自己的 .gitignore 排除），旧链接残留会让 DSH 继续报
# ERR_MODULE_NOT_FOUND。现在改用 .tgz，安装前先清掉旧链接，让 pnpm 重新解包。
$nodeModules = Join-Path $ProfDest "node_modules"
$staleCad = Join-Path $nodeModules "dsh-cad"
if (Test-Path -LiteralPath $staleCad) {
    $item = Get-Item -LiteralPath $staleCad -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
        try {
            $item.Delete()
            Write-Host "    已清理旧的 dsh-cad 链接（改用离线 .tgz）" -ForegroundColor DarkGray
        } catch {
            Write-Host "    [提示] 旧 dsh-cad 链接清理失败，稍后会兜底解包：$_" -ForegroundColor DarkGray
        }
    }
}

Push-Location $ProfDest
$installOk = $true
try {
    pnpm install
    if ($LASTEXITCODE -ne 0) { throw "pnpm install 返回非零退出码" }
    Write-Host "    OK pnpm install 完成" -ForegroundColor Green
} catch {
    Write-Host "    [错误] $_" -ForegroundColor Red
    Write-Host "    继续做离线插件自检，能补的先补上" -ForegroundColor Yellow
    $installOk = $false
} finally {
    Pop-Location
}

# pnpm 并不保证会重新处理 file: 依赖（缓存命中、残留旧链接、install 中途失败
# 都可能让 node_modules 里缺掉入口文件），而 DSH 启动时只要有一个插件入口缺失
# 就整棵插件树加载失败。这里逐个校验 package.json 里所有 file:*.tgz 依赖的真实
# 入口文件，缺了就用 extract-tgz.mjs 直接解包补上，不再依赖 pnpm 的心情。
Write-Host "    校验离线 .tgz 插件入口..." -ForegroundColor Yellow
$extractor = Join-Path $RepoRoot "extract-tgz.mjs"
$tgzDeps = @(Get-FileTgzDependencies -PackageJsonPath $pkgDest)
$repairedPkgs = @()
$brokenPkgs = @()
foreach ($dep in $tgzDeps) {
    $pkgDir = Join-Path $nodeModules $dep.Name
    if (Test-PackageEntry -PackageDir $pkgDir) { continue }
    $tgzPath = Resolve-RelativePath -BasePath $ProfDest -Relative $dep.Relative
    Write-Host "    补装缺失的离线插件：$($dep.Name)" -ForegroundColor Yellow
    $expanded = [bool](Expand-TgzPackage -TgzPath $tgzPath -DestDir $pkgDir -Extractor $extractor)
    if ($expanded -and (Test-PackageEntry -PackageDir $pkgDir)) {
        $repairedPkgs += $dep.Name
    } else {
        $brokenPkgs += $dep.Name
    }
}
if ($repairedPkgs.Count -gt 0) {
    Write-Host "    已补装：$($repairedPkgs -join ', ')" -ForegroundColor Green
}
if ($brokenPkgs.Count -gt 0) {
    Write-Host "    [错误] 仍然缺失：$($brokenPkgs -join ', ')" -ForegroundColor Red
    $installOk = $false
} else {
    Write-Host "    OK $($tgzDeps.Count) 个离线 .tgz 插件入口齐全" -ForegroundColor Green
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
Write-Host "" -ForegroundColor White
Write-Host " 万一 DSH 还是打不开：双击 diagnose.bat 做一次现场自检，" -ForegroundColor DarkGray
Write-Host " 把输出发回排查（只读检查，不会改任何文件）。" -ForegroundColor DarkGray
Write-Host "==============================================" -ForegroundColor Cyan

if (-not $installOk) { exit 1 }
exit 0
