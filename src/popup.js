import { resolveColor } from './lib/colors.js';
import { load } from './lib/storage.js';
import { buildUrl } from './lib/urlBuilder.js';

const GEMINI_ICON = `<img class="ico" src="icons/gemini_sparkle.svg" alt="" />`;
const AISTUDIO_ICON = `<img class="ico" src="icons/ai_studio.png" alt="" />`;

const listEl = document.getElementById('list');
const emptyEl = document.getElementById('empty-state');
const toastEl = document.getElementById('toast');
const toastTextEl = document.getElementById('toast-text');

let toastTimer;

function flash(html) {
  toastTextEl.innerHTML = html;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

function escapeHtml(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

function renderCards(identities, settings) {
  listEl.innerHTML = '';

  if (identities.length === 0) {
    listEl.style.display = 'none';
    emptyEl.style.display = 'flex';
    return;
  }

  listEl.style.display = 'block';
  emptyEl.style.display = 'none';

  identities.forEach((identity, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    const color = resolveColor(identity, i);
    card.style.setProperty('--c', color);
    card.style.setProperty('--card-c', color);
    card.innerHTML = `
      <div class="card-top">
        <span class="dot"></span>
        <span class="label">${escapeHtml(identity.label || identity.email)}</span>
        <span class="email">${escapeHtml(identity.email)}</span>
      </div>
      <div class="btns">
        <button class="btn" data-site="gemini" data-id="${identity.id}">${GEMINI_ICON}Gemini</button>
        <button class="btn" data-site="aistudio" data-id="${identity.id}">${AISTUDIO_ICON}AI Studio</button>
      </div>`;
    listEl.appendChild(card);
  });
}

async function openSite(site, identityId) {
  const { identities, settings } = await load();
  const identity = identities.find(id => id.id === identityId);
  if (!identity) return;

  const url = buildUrl(site, identity);

  if (settings.openIn === 'window') {
    chrome.windows.create({ url });
  } else {
    chrome.tabs.create({ url });
  }

  flash(`以 <b>${escapeHtml(identity.label || identity.email)}</b> 打开 <b>${site === 'gemini' ? 'Gemini' : 'AI Studio'}</b>`);
}

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.btn');
  if (btn) {
    await openSite(btn.dataset.site, btn.dataset.id);
    return;
  }

  if (e.target.closest('#gear') || e.target.closest('#settings-btn')) {
    chrome.runtime.openOptionsPage();
    return;
  }

  if (e.target.closest('#add-btn') || e.target.closest('#empty-settings-btn')) {
    chrome.runtime.openOptionsPage();
    return;
  }
});

async function init() {
  const { identities, settings } = await load();
  renderCards(identities, settings);
}

init();
