import { PALETTE } from './lib/colors.js';
import { load, saveIdentities, saveSettings, generateId } from './lib/storage.js';
import { detect, requestPermission, hasPermission } from './lib/detector.js';

let identities = [];
let settings = { openIn: 'tab' };
let dragFromIndex = null;

const rowsEl = document.getElementById('rows');
const countEl = document.getElementById('count');
const detectBtn = document.getElementById('detect');
const detectText = document.getElementById('detect-text');
const savedEl = document.getElementById('saved');

function escapeAttr(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function render() {
  rowsEl.innerHTML = '';
  identities.forEach((identity, i) => {
    const colorIdx = identity.colorIndex ?? (i % PALETTE.length);
    const color = PALETTE[colorIdx]?.var || PALETTE[0].var;

    const row = document.createElement('div');
    row.className = 'row';
    row.draggable = true;
    row.dataset.i = String(i);
    row.style.setProperty('--c', color);
    row.innerHTML = `
      <div class="grip" title="拖动排序"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg></div>
      <button class="swatch" data-i="${i}" title="换颜色"></button>
      <div class="field"><label>别名</label><input data-i="${i}" data-field="label" value="${escapeAttr(identity.label)}" placeholder="如：工作"></div>
      <div class="field email-f"><label>邮箱</label><input data-i="${i}" data-field="email" value="${escapeAttr(identity.email)}" placeholder="name@gmail.com"></div>
      <div class="field mono idx-f"><label>authuser</label><input data-i="${i}" data-field="index" value="${identity.index ?? ''}" placeholder="0"></div>
      <button class="del" data-i="${i}" title="删除"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg></button>`;
    rowsEl.appendChild(row);
  });
  countEl.textContent = identities.length + ' 个';
}

rowsEl.addEventListener('click', (e) => {
  const swatch = e.target.closest('.swatch');
  if (swatch) {
    const i = +swatch.dataset.i;
    const current = identities[i].colorIndex ?? (i % PALETTE.length);
    identities[i].colorIndex = (current + 1) % PALETTE.length;
    render();
    return;
  }
  const del = e.target.closest('.del');
  if (del) {
    identities.splice(+del.dataset.i, 1);
    render();
  }
});

rowsEl.addEventListener('input', (e) => {
  const input = e.target.closest('input');
  if (!input) return;
  const i = +input.dataset.i;
  const field = input.dataset.field;
  if (field === 'index') {
    identities[i][field] = input.value === '' ? '' : parseInt(input.value, 10) || 0;
  } else {
    identities[i][field] = input.value;
  }
});

document.getElementById('add-manual').addEventListener('click', () => {
  identities.push({
    id: generateId(),
    label: '',
    email: '',
    index: identities.length,
    colorIndex: identities.length % PALETTE.length,
  });
  render();
  const lastInput = rowsEl.lastElementChild?.querySelector('input');
  if (lastInput) lastInput.focus();
});

detectBtn.addEventListener('click', async () => {
  if (detectBtn.classList.contains('busy')) return;

  const hasPerm = await hasPermission();
  if (!hasPerm) {
    const granted = await requestPermission();
    if (!granted) {
      flashSaved('需要权限才能检测');
      return;
    }
  }

  detectBtn.classList.add('busy');
  detectText.textContent = '正在读取已登录账号…';

  try {
    const accounts = await detect();
    if (accounts.length === 0) {
      flashSaved('未检测到账号，请手动添加');
    } else {
      const existingEmails = new Set(identities.map(id => id.email.toLowerCase()));
      let added = 0;
      accounts.forEach((acc) => {
        if (!existingEmails.has(acc.email.toLowerCase())) {
          identities.push({
            id: generateId(),
            label: acc.name || '',
            email: acc.email,
            index: acc.index,
            colorIndex: identities.length % PALETTE.length,
          });
          added++;
        }
      });
      flashSaved(added > 0 ? `已检测到 ${accounts.length} 个账号，新增 ${added} 个` : `已检测到 ${accounts.length} 个账号，均已存在`);
      render();
    }
  } catch (err) {
    console.error('[Account Switch] Detection error:', err);
    flashSaved('检测失败，请手动添加');
  } finally {
    detectBtn.classList.remove('busy');
    detectText.textContent = '自动检测已登录账号';
  }
});

document.querySelectorAll('.seg button').forEach((btn) => {
  btn.addEventListener('click', () => {
    btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    settings.openIn = btn.dataset.openIn === 'window' ? 'window' : 'tab';
  });
});

rowsEl.addEventListener('dragstart', (e) => {
  if (!e.target.closest('.grip')) {
    e.preventDefault();
    return;
  }
  const row = e.target.closest('.row');
  if (!row) return;
  dragFromIndex = +row.dataset.i;
  row.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', row.dataset.i);
});

rowsEl.addEventListener('dragend', (e) => {
  const row = e.target.closest('.row');
  if (row) row.classList.remove('dragging');
  dragFromIndex = null;
  rowsEl.querySelectorAll('.row').forEach(el => el.classList.remove('drag-over'));
});

rowsEl.addEventListener('dragover', (e) => {
  e.preventDefault();
  const row = e.target.closest('.row');
  if (!row || dragFromIndex === null) return;
  e.dataTransfer.dropEffect = 'move';
  rowsEl.querySelectorAll('.row').forEach(el => el.classList.remove('drag-over'));
  row.classList.add('drag-over');
});

rowsEl.addEventListener('dragleave', (e) => {
  const row = e.target.closest('.row');
  if (row) row.classList.remove('drag-over');
});

rowsEl.addEventListener('drop', (e) => {
  e.preventDefault();
  const row = e.target.closest('.row');
  if (!row || dragFromIndex === null) return;

  const toIndex = +row.dataset.i;
  if (dragFromIndex === toIndex) return;

  const [moved] = identities.splice(dragFromIndex, 1);
  identities.splice(toIndex, 0, moved);
  dragFromIndex = null;
  render();
});

let savedTimer;
function flashSaved(msg = '已保存') {
  savedEl.textContent = msg;
  savedEl.classList.add('show');
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => savedEl.classList.remove('show'), 2500);
}

document.getElementById('save').addEventListener('click', async () => {
  const invalid = identities.some(id => !id.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id.email.trim()));
  if (invalid) {
    flashSaved('⚠ 请填写有效的邮箱地址');
    return;
  }
  identities.forEach((id, i) => {
    if (!id.id) id.id = generateId();
    id.colorIndex = id.colorIndex ?? (i % PALETTE.length);
    id.color = PALETTE[id.colorIndex]?.var || PALETTE[0].var;
  });
  await saveIdentities(identities);
  await saveSettings(settings);
  flashSaved('已保存');
});

async function init() {
  const data = await load();
  identities = data.identities;
  settings = data.settings;
  document.querySelectorAll('.seg button').forEach((btn) => {
    btn.classList.toggle('on', btn.dataset.openIn === settings.openIn);
  });
  render();
}

init();
