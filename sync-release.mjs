import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = __dirname;
const NODE_MODULES = path.resolve(process.env.HOME || '', '.dsh/profiles/desktop/node_modules');
const THIRD_PARTY = path.resolve(REPO_ROOT, 'third-party');

console.log('🔥 太原工业学院 · 火线战队 DSH 整合包自动同步工具');
console.log('源路径:', NODE_MODULES);
console.log('目标路径:', THIRD_PARTY);

// 11 个 GitHub 社区依赖包名列表
const GITHUB_PLUGINS = [
  'dsh-at-file',
  'dsh-auto-collapse',
  'dsh-live-reload',
  'dsh-memory-evolve',
  'dsh-model-search',
  'dsh-prompt-manager',
  'dsh-shortcuts',
  'dsh-web-default-session',
  'dsh-webui-perf',
  'graph-memory',
  'oss-prompt-optimizer',
];

console.log('\n[1/4] 正在自动打包 11 个插件到 third-party/*.tgz ...');

for (const pkg of GITHUB_PLUGINS) {
  const pkgDir = path.join(NODE_MODULES, pkg);
  if (!fs.existsSync(pkgDir)) {
    console.warn(`⚠️ 插件目录不存在，跳过: ${pkgDir}`);
    continue;
  }

  // graph-memory 特殊处理：依赖 @photostructure/sqlite 修复
  if (pkg === 'graph-memory') {
    const tmpDir = path.join('/tmp', `gm-sync-${Date.now()}`);
    execSync(`mkdir -p "${tmpDir}" && cp -rL "${pkgDir}/." "${tmpDir}/"`);
    const pkgJsonPath = path.join(tmpDir, 'package.json');
    const pJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    pJson.dependencies = pJson.dependencies || {};
    pJson.dependencies['@photostructure/sqlite'] = '1.2.1';
    if (pJson.files) {
      pJson.files = pJson.files.filter((f) => f !== 'vendor');
    }
    if (pJson.scripts) {
      delete pJson.scripts.prepare;
      delete pJson.scripts.prepack;
    }
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pJson, null, 2));
    execSync(`cd "${tmpDir}" && npm pack --ignore-scripts --pack-destination "${THIRD_PARTY}"`);
    execSync(`rm -rf "${tmpDir}"`);
    console.log(`  ✅ ${pkg} (已自动修正 sqlite 原生依赖并打包)`);
    continue;
  }

  // dsh-auto-collapse 移除 prepack
  if (pkg === 'dsh-auto-collapse') {
    const tmpDir = path.join('/tmp', `ac-sync-${Date.now()}`);
    execSync(`mkdir -p "${tmpDir}" && cp -rL "${pkgDir}/." "${tmpDir}/"`);
    const pkgJsonPath = path.join(tmpDir, 'package.json');
    const pJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    if (pJson.scripts) delete pJson.scripts.prepack;
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pJson, null, 2));
    execSync(`cd "${tmpDir}" && npm pack --ignore-scripts --pack-destination "${THIRD_PARTY}"`);
    execSync(`rm -rf "${tmpDir}"`);
    console.log(`  ✅ ${pkg} (已移除 prepack 并打包)`);
    continue;
  }

  // 普通包标准打包
  try {
    execSync(`cd "${pkgDir}" && npm pack --ignore-scripts --pack-destination "${THIRD_PARTY}"`);
    console.log(`  ✅ ${pkg}`);
  } catch (err) {
    console.error(`  ❌ 打包失败: ${pkg}`, err.message);
  }
}

// dsh-cad 必须重新打包成 .tgz 才能分发。
// 它的 .gitignore 含 lib/，构建产物一个字节都进不了 git；用 link: 分发时
// 队友 clone 下来没有 lib/index.js，DSH 会在 host-boot 阶段抛
// ERR_MODULE_NOT_FOUND 并导致整个插件树加载失败。
// npm pack 走 package.json 的 files 白名单，不受 .gitignore 影响。
console.log('\n[2/4] 重新打包 dsh-cad（构建产物不在 git 里，必须走 .tgz）...');
{
  const cadSrc = path.join(THIRD_PARTY, 'dsh-cad');
  const cadEntry = path.join(cadSrc, 'lib', 'index.js');
  if (!fs.existsSync(cadEntry)) {
    console.error(`  ❌ ${cadEntry} 不存在，请先在 ${cadSrc} 执行 npm run build`);
    process.exit(1);
  }
  const version = JSON.parse(fs.readFileSync(path.join(cadSrc, 'package.json'), 'utf8')).version;
  const tgz = path.join(THIRD_PARTY, `dsh-cad-${version}.tgz`);
  try {
    execSync(`cd "${cadSrc}" && npm pack --ignore-scripts --pack-destination "${THIRD_PARTY}"`, {
      stdio: 'pipe',
    });
  } catch (err) {
    console.error('  ❌ dsh-cad 打包失败:', err.message);
    process.exit(1);
  }
  // 断言产物真的含入口，否则分发出去又是一次 host-boot 崩溃
  const listed = execSync(`tar tzf "${tgz}"`, { encoding: 'utf8' });
  if (!listed.split('\n').includes('package/lib/index.js')) {
    console.error(`  ❌ ${path.basename(tgz)} 内缺少 package/lib/index.js，已中止`);
    process.exit(1);
  }
  const dep = `file:../../pack/third-party/dsh-cad-${version}.tgz`;
  const pkgPath = path.join(REPO_ROOT, 'profiles', 'desktop', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (pkg.dependencies?.['dsh-cad'] !== dep) {
    console.error(`  ❌ profiles/desktop/package.json 的 dsh-cad 应为 "${dep}"`);
    console.error(`     当前是 "${pkg.dependencies?.['dsh-cad']}"（link: 会导致队友缺 lib/）`);
    process.exit(1);
  }
  console.log(`  ✅ dsh-cad-${version}.tgz（含 lib/index.js，已核对 package.json 引用）`);
}

// 全量清单闸门：profiles/desktop/package.json 里每一个 file:*.tgz 依赖，
// 都必须在 third-party/ 里有对应 tarball，且 tarball 内真的含它声明的入口文件。
// 只要有一个入口缺失，DSH 在 host-boot 阶段就会整棵插件树加载失败。
console.log('\n[2.5/4] 核对全部离线 .tgz 依赖的入口文件...');
{
  const PREFIX = 'file:../../pack/third-party/';
  const pkgPath = path.join(REPO_ROOT, 'profiles', 'desktop', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const problems = [];

  const extractor = path.join(REPO_ROOT, 'extract-tgz.mjs');
  if (!fs.existsSync(extractor)) {
    problems.push('缺少 extract-tgz.mjs（install.ps1 第 9 步的兜底解包器）');
  }

  const tgzDeps = Object.entries(pkg.dependencies || {}).filter(
    ([, spec]) => typeof spec === 'string' && spec.startsWith('file:') && spec.endsWith('.tgz'),
  );

  for (const [name, spec] of tgzDeps) {
    if (!spec.startsWith(PREFIX)) {
      problems.push(`${name}: 依赖写法应为 ${PREFIX}<file>.tgz，当前是 ${spec}`);
      continue;
    }
    const tgz = path.join(THIRD_PARTY, path.basename(spec));
    if (!fs.existsSync(tgz)) {
      problems.push(`${name}: 找不到 ${path.relative(REPO_ROOT, tgz)}`);
      continue;
    }
    let listed;
    try {
      listed = execSync(`tar tzf "${tgz}"`, { encoding: 'utf8' }).split('\n');
    } catch (err) {
      problems.push(`${name}: tarball 无法读取（${err.message}）`);
      continue;
    }
    let main = 'index.js';
    try {
      const raw = execSync(`tar xzfO "${tgz}" package/package.json`, { encoding: 'utf8' });
      const meta = JSON.parse(raw);
      if (meta.main) main = String(meta.main);
      if (meta.name && meta.name !== name) {
        problems.push(`${name}: tarball 内包名是 ${meta.name}`);
      }
    } catch (err) {
      problems.push(`${name}: tarball 内缺少 package/package.json`);
      continue;
    }
    const entry = `package/${main.replace(/^\.\//, '')}`;
    const hasEntry =
      listed.includes(entry) ||
      listed.includes(`${entry}.js`) ||
      listed.includes(`${entry}/index.js`);
    if (!hasEntry) {
      problems.push(`${name}: tarball 内缺少入口 ${entry}`);
      continue;
    }
    console.log(`  ✅ ${name} -> ${path.basename(tgz)} (${main})`);
  }

  if (problems.length > 0) {
    console.error('\n  ❌ 离线依赖清单有问题，分发出去会让队友卡在 host-boot：');
    for (const p of problems) console.error(`     - ${p}`);
    process.exit(1);
  }
  console.log(`  ✅ ${tgzDeps.length} 个离线 .tgz 依赖入口齐全`);

  // link: 依赖走符号链接，源目录本身必须把入口文件提交进 git。
  // dsh-cad 当初就是踩了这个坑：它的 .gitignore 含 lib/，clone 下来只有源码没有入口。
  const linkDeps = Object.entries(pkg.dependencies || {}).filter(
    ([, spec]) => typeof spec === 'string' && spec.startsWith('link:'),
  );
  const linkProblems = [];
  for (const [name, spec] of linkDeps) {
    const rel = spec
      .slice(5)
      .replace('../../pack/', '')
      .replace('../../plugins/', 'custom-plugins/');
    const srcDir = path.join(REPO_ROOT, rel);
    const srcJson = path.join(srcDir, 'package.json');
    if (!fs.existsSync(srcJson)) {
      linkProblems.push(`${name}: 源目录缺 package.json（${rel}）`);
      continue;
    }
    const main = String(JSON.parse(fs.readFileSync(srcJson, 'utf8')).main || 'index.js').replace(
      /^\.\//,
      '',
    );
    const entry = path.join(srcDir, main);
    if (!fs.existsSync(entry)) {
      linkProblems.push(`${name}: 入口 ${rel}/${main} 在本机就不存在`);
      continue;
    }
    // 关键：入口必须被 git 跟踪，否则队友 clone 下来就是空的
    try {
      execSync(`git -C "${REPO_ROOT}" ls-files --error-unmatch "${rel}/${main}"`, {
        stdio: 'pipe',
      });
    } catch {
      linkProblems.push(
        `${name}: 入口 ${rel}/${main} 未被 git 跟踪（被 .gitignore 排除？请改成 .tgz 分发）`,
      );
      continue;
    }
    console.log(`  ✅ ${name} -> link:${rel} (${main}，已提交进 git)`);
  }
  if (linkProblems.length > 0) {
    console.error('\n  ❌ link: 依赖的入口文件不会跟着 clone 下来：');
    for (const p of linkProblems) console.error(`     - ${p}`);
    process.exit(1);
  }
  console.log(`  ✅ ${linkDeps.length} 个 link: 依赖入口均已提交进 git`);
}

console.log('\n[3/4] 同步自研插件与提示词...');
execSync(`cp -r ~/.dsh/plugins/robomaster-studio "${REPO_ROOT}/custom-plugins/" 2>/dev/null || true`);
execSync(`cp -r ~/.dsh/plugins/dsh-robomaster-core "${REPO_ROOT}/custom-plugins/" 2>/dev/null || true`);
execSync(`cp -r ~/.dsh/plugins/model-tuner "${REPO_ROOT}/custom-plugins/" 2>/dev/null || true`);
execSync(`cp -r ~/.dsh/plugins/dsh-restart-desktop "${REPO_ROOT}/custom-plugins/" 2>/dev/null || true`);
execSync(`cp -r ~/.dsh/prompts/* "${REPO_ROOT}/prompts/" 2>/dev/null || true`);
console.log('  ✅ 自研插件与提示词已同步到仓库目录');

console.log('\n[4/4] 生成 settings.yaml.template 脱敏模板...');
const TEMPLATE = path.join(REPO_ROOT, 'settings.yaml.template');
const VALIDATOR = path.join(REPO_ROOT, 'validate-settings.mjs');

// 生成前先备份现有模板：脱敏脚本自身校验失败时不落盘，备份用于人工比对
const tmplBackup = fs.existsSync(TEMPLATE)
  ? `${TEMPLATE}.bak-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}`
  : null;
if (tmplBackup) fs.copyFileSync(TEMPLATE, tmplBackup);

let templateOk = false;
try {
  execSync(`node "${path.join(REPO_ROOT, 'sanitize-settings.mjs')}"`, { stdio: 'inherit' });
  // 二次独立校验：脱敏脚本内部已自检，这里再挡一道，避免脚本被改坏后静默放行
  execSync(`node "${VALIDATOR}" "${TEMPLATE}"`, { stdio: 'inherit' });
  templateOk = true;
  console.log('  ✅ settings.yaml.template 已更新并通过严格 YAML 校验');
} catch {
  console.error('\n  ❌ settings.yaml.template 生成或校验失败。');
  // 关键：脱敏脚本可能已经写出了坏模板，必须真的回滚，否则仓库里留着坏文件
  if (tmplBackup) {
    fs.copyFileSync(tmplBackup, TEMPLATE);
    fs.rmSync(tmplBackup, { force: true });
    console.error('     已从备份回滚，仓库模板保持上一次的合法版本。');
  } else {
    fs.rmSync(TEMPLATE, { force: true });
    console.error('     首次生成即失败，已删除不合法的产物。');
  }
  console.error('     请修复后重跑本脚本，不要在此状态下 git push（会把坏配置发给队友）。');
}

if (tmplBackup && templateOk) fs.rmSync(tmplBackup, { force: true });

if (!templateOk) {
  console.error('\n🛑 同步中止：请先修复 settings.yaml.template。');
  process.exit(1);
}

console.log('\n🎉 同步完成！你只需执行：');
console.log('  git add . && git commit -m "update: 战队配置升级" && git push');
console.log('队友在 Windows 端只需执行：');
console.log('  git pull && 双击 install.bat');
