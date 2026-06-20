// validate.mjs — 零依赖的扩展静态校验，供本地与 CI 使用。
// 检查：manifest 必填字段、被引用文件存在、所有 src JS 语法可解析、HTML 无远程脚本。

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readdirSync, statSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

const errors = [];
const warnings = [];

function fail(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

// 1) manifest.json 合法且字段齐全
let manifest;
try {
  manifest = JSON.parse(readFileSync(join(SRC, 'manifest.json'), 'utf8'));
} catch (e) {
  fail(`manifest.json 无法解析: ${e.message}`);
}

if (manifest) {
  if (manifest.manifest_version !== 3) fail('manifest_version 必须为 3');
  for (const key of ['name', 'version', 'description']) {
    if (!manifest[key]) fail(`manifest 缺少字段: ${key}`);
  }
  if (!/^\d+(\.\d+){0,3}$/.test(manifest.version || '')) {
    fail(`manifest.version 格式非法: ${manifest.version}`);
  }
  if (!manifest.action?.default_popup) fail('manifest 缺少 action.default_popup');

  // 2) manifest 引用的文件必须存在
  const referenced = [
    manifest.action?.default_popup,
    manifest.options_page,
    ...Object.values(manifest.icons || {}),
  ].filter(Boolean);

  for (const rel of referenced) {
    if (!existsSync(join(SRC, rel))) fail(`manifest 引用的文件不存在: ${rel}`);
  }
}

// 3) 关键模块文件存在
for (const rel of [
  'popup.html', 'popup.css', 'popup.js',
  'settings.html', 'settings.css', 'settings.js',
  'lib/urlBuilder.js', 'lib/storage.js', 'lib/colors.js', 'lib/detector.js',
]) {
  if (!existsSync(join(SRC, rel))) fail(`缺少文件: src/${rel}`);
}

// 4) 收集并语法校验所有 src 下的 .js
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (entry.endsWith('.js')) out.push(p);
  }
  return out;
}
for (const file of walk(SRC)) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (e) {
    fail(`JS 语法错误: ${file.replace(ROOT, '.')}\n${e.stderr?.toString() || e.message}`);
  }
}

// 5) 安全：HTML 不得引用远程 <script src>
for (const rel of ['popup.html', 'settings.html']) {
  const html = readFileSync(join(SRC, rel), 'utf8');
  if (/<script[^>]+src\s*=\s*["']https?:/i.test(html)) {
    fail(`${rel} 引用了远程脚本（MV3 不允许远程代码）`);
  }
  // 远程字体/样式只警告，不阻断（建议改为本地打包）
  if (/<link[^>]+href\s*=\s*["']https?:\/\/fonts\.googleapis\.com/i.test(html)) {
    warn(`${rel} 使用了远程 Google Fonts，建议改为本地打包字体`);
  }
}

// 输出
for (const w of warnings) console.log(`\x1b[33m⚠ 警告:\x1b[0m ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`\x1b[31m✖ 错误:\x1b[0m ${e}`);
  console.error(`\n校验失败：${errors.length} 个错误，${warnings.length} 个警告`);
  process.exit(1);
}
console.log(`\x1b[32m✓ 校验通过\x1b[0m（${warnings.length} 个警告）`);
