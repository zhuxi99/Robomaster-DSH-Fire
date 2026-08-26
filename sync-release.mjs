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

console.log('\n[1/3] 正在自动打包 11 个插件到 third-party/*.tgz ...');

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

console.log('\n[2/3] 同步自研插件与提示词...');
execSync(`cp -r ~/.dsh/plugins/robomaster-studio "${REPO_ROOT}/custom-plugins/" 2>/dev/null || true`);
execSync(`cp -r ~/.dsh/plugins/dsh-robomaster-core "${REPO_ROOT}/custom-plugins/" 2>/dev/null || true`);
execSync(`cp -r ~/.dsh/plugins/model-tuner "${REPO_ROOT}/custom-plugins/" 2>/dev/null || true`);
execSync(`cp -r ~/.dsh/plugins/dsh-restart-desktop "${REPO_ROOT}/custom-plugins/" 2>/dev/null || true`);
execSync(`cp -r ~/.dsh/prompts/* "${REPO_ROOT}/prompts/" 2>/dev/null || true`);
console.log('  ✅ 自研插件与提示词已同步到仓库目录');

console.log('\n[3/3] 生成 settings.yaml.template 脱敏模板...');
try {
  execSync(`node "${path.join(REPO_ROOT, 'sanitize-settings.mjs')}"`);
  console.log('  ✅ settings.yaml.template 已更新');
} catch (e) {
  console.warn('  ⚠️ 脱敏脚本执行提示:', e.message);
}

console.log('\n🎉 同步完成！你只需执行：');
console.log('  git add . && git commit -m "update: 战队配置升级" && git push');
console.log('队友在 Windows 端只需执行：');
console.log('  git pull && 双击 install.bat');
