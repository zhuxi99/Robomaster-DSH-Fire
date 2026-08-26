# =====================================================================
# diagnose.ps1 —— RoboMaster DSH 整合包现场自检（只读，不改任何文件）
#
# 用途：DSH Desktop 启动失败时先跑这个，把输出整段发回排查。
# 它只读取状态，不安装、不删除、不覆盖任何东西。
# 输出同时保存到 %USERPROFILE%\.dsh\pack-diagnose.txt
# =====================================================================

$ErrorActionPreference = "Continue"

$DshRoot   = Join-Path $env:USERPROFILE ".dsh"
$RepoRoot  = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProfDest  = Join-Path $DshRoot "profiles\desktop"
$PackDest  = Join-Path $DshRoot "pack\third-party"
$NodeMods  = Join-Path $ProfDest "node_modules"
$ReportOut = Join-Path $DshRoot "pack-diagnose.txt"

$lines = New-Object System.Collections.Generic.List[string]
function Say {
    param([string]$Text = "", [string]$Color = "Gray")
    Write-Host $Text -ForegroundColor $Color
    $lines.Add($Text)
}

Say "==================== DSH 整合包自检 ====================" Cyan
Say ("时间        : " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
Say ("仓库目录    : " + $RepoRoot)
Say ("DSH 数据目录: " + $DshRoot)
Say ""

# ---------- 1. 运行环境 ----------
Say "---- 1. 运行环境 ----" Yellow
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) { Say ("node : " + (& node --version) + "  (" + $nodeCmd.Source + ")") }
else { Say "node : 未找到！pnpm install 与兜底解包都需要 Node >= 22" Red }
$pnpmCmd = Get-Command pnpm -ErrorAction SilentlyContinue
if ($pnpmCmd) { Say ("pnpm : " + (& $pnpmCmd.Source --version)) }
else { Say "pnpm : 未找到！请执行 npm i -g pnpm" Red }
Say ""

# ---------- 2. 仓库版本 ----------
Say "---- 2. 仓库版本（判断是否已 git pull 到最新）----" Yellow
$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if ($gitCmd) {
    Push-Location $RepoRoot
    $head = & git log -1 --format="%h %ad %s" --date=short 2>$null
    $branch = & git rev-parse --abbrev-ref HEAD 2>$null
    $dirty = & git status --porcelain 2>$null
    Pop-Location
    if ($head) {
        Say ("分支     : " + $branch)
        Say ("HEAD     : " + $head)
        if ($dirty) { Say ("本地改动 : " + (@($dirty).Count) + " 个文件未提交") }
        else { Say "本地改动 : 无" }
    } else { Say "这个目录不是 git 仓库（可能是解压的 zip）" }
} else { Say "git : 未找到，跳过版本检查" DarkGray }
Say ""

# ---------- 3. 离线包是否到位 ----------
Say "---- 3. 离线 .tgz 是否已复制到 .dsh\pack\third-party ----" Yellow
$repoTgz = @(Get-ChildItem -LiteralPath (Join-Path $RepoRoot "third-party") -Filter *.tgz -ErrorAction SilentlyContinue)
Say ("仓库里的 .tgz : " + $repoTgz.Count + " 个")
if (Test-Path -LiteralPath $PackDest) {
    $packTgz = @(Get-ChildItem -LiteralPath $PackDest -Filter *.tgz -ErrorAction SilentlyContinue)
    Say ("已复制的 .tgz : " + $packTgz.Count + " 个  -> " + $PackDest)
    foreach ($t in $repoTgz) {
        $dst = Join-Path $PackDest $t.Name
        if (Test-Path -LiteralPath $dst) {
            $same = ((Get-Item -LiteralPath $dst).Length -eq $t.Length)
            $mark = if ($same) { "OK  " } else { "大小不一致 " }
            Say ("  " + $mark + $t.Name)
        } else {
            Say ("  缺失      " + $t.Name) Red
        }
    }
} else {
    Say ("目录不存在：" + $PackDest + "  —— 说明 install.bat 的第 4 步没跑过") Red
}
Say ""

# ---------- 4. 插件入口逐个校验 ----------
Say "---- 4. node_modules 里插件入口是否真的存在 ----" Yellow
$pkgJson = Join-Path $ProfDest "package.json"
if (-not (Test-Path -LiteralPath $pkgJson)) {
    Say ("找不到 " + $pkgJson + "  —— install.bat 的第 5 步没跑过") Red
} else {
    $meta = Get-Content -LiteralPath $pkgJson -Raw -Encoding UTF8 | ConvertFrom-Json
    $missing = @()
    foreach ($prop in $meta.dependencies.PSObject.Properties) {
        $name = $prop.Name
        $spec = [string]$prop.Value
        if (-not ($spec.StartsWith("file:") -or $spec.StartsWith("link:"))) { continue }
        $dir = Join-Path $NodeMods $name
        $state = "目录不存在"
        $entryInfo = ""
        if (Test-Path -LiteralPath $dir) {
            $di = Get-Item -LiteralPath $dir -Force
            if ($di.Attributes -band [IO.FileAttributes]::ReparsePoint) { $state = "符号链接/junction" }
            else { $state = "实体目录" }
            $pj = Join-Path $dir "package.json"
            if (Test-Path -LiteralPath $pj) {
                try {
                    $m2 = Get-Content -LiteralPath $pj -Raw -Encoding UTF8 | ConvertFrom-Json
                    $entry = if ($m2.main) { [string]$m2.main } else { "index.js" }
                    $ep = Join-Path $dir ($entry.Replace('/', '\'))
                    if (Test-Path -LiteralPath $ep -PathType Leaf) { $entryInfo = "入口 OK (" + $entry + ")" }
                    else { $entryInfo = "入口缺失 (" + $entry + ")" }
                } catch { $entryInfo = "package.json 解析失败" }
            } else { $entryInfo = "没有 package.json" }
        }
        $ok = ($entryInfo -like "入口 OK*")
        $line = ("  {0,-26} {1,-20} {2}" -f $name, $state, $entryInfo)
        if ($ok) { Say $line } else { Say $line Red; $missing += $name }
    }
    Say ""
    if ($missing.Count -eq 0) {
        Say "所有本地插件入口齐全" Green
    } else {
        Say ("入口缺失的插件：" + ($missing -join ", ")) Red
        Say "修复办法：双击 install.bat 重跑一次（第 9 步会自动补装缺失的离线插件）" Yellow
    }
}
Say ""

# ---------- 5. settings.yaml ----------
Say "---- 5. settings.yaml 语法 ----" Yellow
$settings  = Join-Path $DshRoot "settings.yaml"
$validator = Join-Path $RepoRoot "validate-settings.mjs"
if (-not (Test-Path -LiteralPath $settings)) {
    Say "settings.yaml 不存在（首次安装会从模板复制）" DarkGray
} elseif (-not (Test-Path -LiteralPath $validator)) {
    Say "找不到 validate-settings.mjs，跳过校验" DarkGray
} elseif (-not $nodeCmd) {
    Say "没有 node，跳过校验" DarkGray
} else {
    $out = & node $validator $settings 2>&1
    foreach ($l in @($out)) { Say ("  " + $l) }
    if ($LASTEXITCODE -eq 0) { Say "settings.yaml 语法正常" Green }
    else { Say "settings.yaml 有问题 —— 双击 repair.bat 就地修复（保留已填密钥）" Red }
}
Say ""

# ---------- 6. 最近的启动日志 ----------
Say "---- 6. 最近的启动错误（各类型只取一条）----" Yellow
$logCandidates = @(
    (Join-Path $DshRoot "logs"),
    $DshRoot,
    (Join-Path $env:APPDATA "DSH Desktop\logs"),
    (Join-Path $env:APPDATA "dsh-desktop\logs"),
    (Join-Path $env:LOCALAPPDATA "DSH Desktop\logs")
)
$errLog = $null
foreach ($cand in $logCandidates) {
    if (-not $cand) { continue }
    if (-not (Test-Path -LiteralPath $cand -PathType Container)) { continue }
    $found = Get-ChildItem -LiteralPath $cand -Filter "*.error.log" -Recurse -ErrorAction SilentlyContinue |
             Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($found) { $errLog = $found; break }
}
if ($errLog) {
    Say ("日志文件 : " + $errLog.FullName)
    $seen = @{}
    $hits = 0
    foreach ($l in (Get-Content -LiteralPath $errLog.FullName -Encoding UTF8 -Tail 400)) {
        if ($l -notmatch "^\d{4}-\d{2}-\d{2}.+\[E\]") { continue }
        $key = ($l -replace "^\d{4}-\d{2}-\d{2} [\d:.]+ ", "")
        if ($key.Length -gt 80) { $key = $key.Substring(0, 80) }
        if ($seen.ContainsKey($key)) { continue }
        $seen[$key] = $true
        Say ("  " + $l)
        $hits++
        if ($hits -ge 8) { break }
    }
    if ($hits -eq 0) { Say "  最近 400 行里没有错误记录" Green }
} else {
    Say "没找到 *.error.log" DarkGray
}

Say ""
Say "==================== 自检结束 ====================" Cyan
try {
    $lines | Set-Content -LiteralPath $ReportOut -Encoding UTF8
    Say ("报告已保存：" + $ReportOut) Green
} catch {
    Say ("报告保存失败：" + $_) DarkGray
}
