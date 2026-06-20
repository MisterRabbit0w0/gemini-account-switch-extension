// detector.js — 尽力检测已登录 Google 账号
//
// ListAccounts 不能从 chrome-extension:// 源直接 fetch（会 HTTP 400），
// 也不能把 ListAccounts URL 当标签页打开。正确做法：
// 1. 后台打开 www.google.com 页面（共享 .google.com Cookie）
// 2. 用 executeScript + world:'MAIN' 在页面上下文里 POST fetch ListAccounts

export const PERMISSION_ORIGINS = [
  'https://www.google.com/*',
  'https://accounts.google.com/*',
  'https://gemini.google.com/*',
  'https://aistudio.google.com/*',
];

/** 按优先级尝试的探测页（需能触发 tabs.status=complete） */
const PROBE_TAB_URLS = [
  'https://gemini.google.com/',
  'https://www.google.com/',
  'https://aistudio.google.com/',
];

/** 已有 Google 标签时直接复用，避免再开新标签 */
const REUSE_TAB_PATTERNS = [
  /^https:\/\/gemini\.google\.com\//,
  /^https:\/\/aistudio\.google\.com\//,
  /^https:\/\/www\.google\.com\//,
  /^https:\/\/accounts\.google\.com\//,
];

const TAB_LOAD_TIMEOUT_MS = 20000;

/** 按稳定性排序；ogb + POST 是目前最可靠的组合 */
const LIST_ACCOUNTS_URLS = [
  'https://accounts.google.com/ListAccounts?gpsia=1&source=ogb&mo=1&mn=1&hl=zh-CN',
  'https://accounts.google.com/ListAccounts?gpsia=1&source=ogb&mo=1&hl=en',
  'https://accounts.google.com/ListAccounts?listPages=0&source=ChromiumBrowser&json=standard',
];

/**
 * 检测失败时抛出的结构化错误，reason 用于区分失败类型，message 面向用户。
 * reason: 'permission' | 'tab' | 'timeout' | 'inject' | 'fetch' | 'parse' | 'shape'
 */
export class DetectError extends Error {
  constructor(reason, message) {
    super(message);
    this.name = 'DetectError';
    this.reason = reason;
  }
}

/**
 * Request host permissions needed for account probing.
 * @returns {Promise<boolean>}
 */
export async function requestPermission() {
  return chrome.permissions.request({ origins: PERMISSION_ORIGINS });
}

/**
 * Check if all probe permissions are granted.
 * @returns {Promise<boolean>}
 */
export async function hasPermission() {
  const checks = await Promise.all(
    PERMISSION_ORIGINS.map((origin) => chrome.permissions.contains({ origins: [origin] }))
  );
  return checks.every(Boolean);
}

/**
 * 在 Google 页面 MAIN world 内执行：依次 POST/GET 尝试多个 ListAccounts URL。
 * 必须自包含，不引用外部作用域。
 * @param {string[]} urls
 */
function fetchListAccountsInPage(urls) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function attempt(url, method) {
    const resp = await fetch(url, {
      method,
      credentials: 'include',
      cache: 'no-store',
      headers: method === 'POST'
        ? { 'Content-Type': 'application/x-www-form-urlencoded' }
        : undefined,
    });
    const text = await resp.text();
    return { url, method, status: resp.status, ok: resp.ok, text };
  }

  return (async () => {
    let last = null;
    for (const url of urls) {
      for (const method of ['POST', 'GET']) {
        try {
          const result = await attempt(url, method);
          last = result;
          if (result.ok && (emailPattern.test(result.text) || result.text.indexOf('[') >= 0)) {
            return result;
          }
        } catch (e) {
          last = { error: String((e && e.message) || e), url, method };
        }
      }
    }
    return last;
  })();
}

/**
 * 解析 ListAccounts 原始响应文本为账号数组。纯函数，便于单测。
 * @param {string} text
 * @returns {Array<{ email: string, name: string, index: number }>}
 */
export function parseListAccounts(text) {
  const start = text.indexOf('[');
  let parsed;
  try {
    parsed = JSON.parse(start >= 0 ? text.slice(start) : text);
  } catch {
    throw new DetectError('parse', '返回内容不是预期 JSON（可能是登录页或接口已变动）');
  }

  const accountList = findAccountArray(parsed);
  if (!accountList) {
    throw new DetectError('shape', '响应结构与预期不符（ListAccounts 接口可能已变动）');
  }

  return accountList
    .map((acc, fallbackIndex) => parseAccountRow(acc, fallbackIndex))
    .filter((a) => a.email);
}

function findAccountArray(parsed) {
  if (!Array.isArray(parsed)) return null;

  if (parsed[1] && Array.isArray(parsed[1])) {
    return parsed[1];
  }

  for (const element of parsed) {
    if (
      Array.isArray(element) &&
      element.length > 0 &&
      element.every((item) => Array.isArray(item))
    ) {
      return element;
    }
  }

  if (parsed.every((item) => Array.isArray(item) && item.length >= 3)) {
    return parsed;
  }

  return null;
}

function parseAccountRow(acc, fallbackIndex) {
  const email = findEmailInRow(acc) || (typeof acc[2] === 'string' ? acc[2] : '');
  const name = findNameInRow(acc, email) || (typeof acc[3] === 'string' ? acc[3] : '');

  let index = fallbackIndex;
  if (acc.length > 7 && Number.isInteger(Number(acc[7]))) {
    index = Number(acc[7]);
  }

  return { email: email.trim(), name: name.trim(), index };
}

function findEmailInRow(row) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const field of row) {
    if (typeof field === 'string' && emailPattern.test(field.trim())) {
      return field.trim();
    }
  }
  return '';
}

function findNameInRow(row, email) {
  for (const field of row) {
    if (
      typeof field === 'string' &&
      field.trim() &&
      !field.includes('@') &&
      !field.startsWith('http') &&
      !field.startsWith('//') &&
      field !== 'gaia.l.a' &&
      field !== 'gaia.l.a.r'
    ) {
      return field.trim();
    }
  }
  return email;
}

function waitForTabComplete(tabId) {
  return new Promise((resolve, reject) => {
    let settled = false;

    function finish(err) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      if (err) reject(err);
      else resolve();
    }

    const timer = setTimeout(async () => {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab.status === 'complete') {
          finish();
          return;
        }
      } catch {
        /* tab gone */
      }
      finish(new DetectError(
        'timeout',
        '无法加载 Google 页面（网络超时或被拦截）。请确认浏览器能打开 gemini.google.com，或手动添加账号'
      ));
    }, TAB_LOAD_TIMEOUT_MS);

    function listener(id, info) {
      if (id === tabId && info.status === 'complete') {
        finish();
      }
    }

    chrome.tabs.onUpdated.addListener(listener);

    // 避免竞态：标签在 listener 注册前就已加载完成
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        finish(new DetectError('tab', chrome.runtime.lastError.message));
        return;
      }
      if (tab.status === 'complete') {
        finish();
      }
    });
  });
}

async function findReusableTab() {
  const tabs = await chrome.tabs.query({});
  for (const pattern of REUSE_TAB_PATTERNS) {
    const match = tabs.find((t) => t.url && pattern.test(t.url));
    if (match) return match;
  }
  return null;
}

async function openProbeTab() {
  const existing = await findReusableTab();
  if (existing?.id != null) {
    return { tab: existing, shouldClose: false };
  }

  let lastError;
  for (const url of PROBE_TAB_URLS) {
    let tab;
    try {
      tab = await chrome.tabs.create({ url, active: false });
      await waitForTabComplete(tab.id);
      return { tab, shouldClose: true };
    } catch (err) {
      lastError = err;
      if (tab?.id != null) {
        try {
          await chrome.tabs.remove(tab.id);
        } catch {
          /* ignore */
        }
      }
      if (err instanceof DetectError && err.reason === 'timeout') {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new DetectError(
    'timeout',
    '无法加载 Google 页面（网络超时或被拦截）。请确认浏览器能打开 gemini.google.com，或手动添加账号'
  );
}

async function runListAccountsFetch(tabId) {
  let results;
  try {
    results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: fetchListAccountsInPage,
      args: [LIST_ACCOUNTS_URLS],
    });
  } catch (err) {
    throw new DetectError('inject', `脚本注入失败：${err.message}`);
  }

  const result = results && results[0] && results[0].result;
  if (!result) {
    throw new DetectError('inject', '注入脚本未返回结果');
  }
  if (result.error) {
    throw new DetectError('fetch', `读取账号失败：${result.error}`);
  }
  if (!result.ok) {
    const snippet = (result.text || '').slice(0, 120).replace(/\s+/g, ' ').trim();
    throw new DetectError(
      'fetch',
      `ListAccounts 返回 HTTP ${result.status}${snippet ? `（${snippet}）` : ''}`
    );
  }

  return parseListAccounts(result.text);
}

/**
 * Detect logged-in Google accounts.
 * 后台打开 google.com → MAIN world POST ListAccounts → 解析 → 关闭标签。
 * @returns {Promise<Array<{ email: string, name: string, index: number }>>}
 */
export async function detect() {
  let tab;
  let shouldClose = false;

  try {
    ({ tab, shouldClose } = await openProbeTab());
    return await runListAccountsFetch(tab.id);
  } catch (err) {
    if (err instanceof DetectError) throw err;
    throw new DetectError('tab', `无法打开 Google 页面：${err.message}（请确认已授予 google.com 访问权限）`);
  } finally {
    if (shouldClose && tab?.id != null) {
      try {
        await chrome.tabs.remove(tab.id);
      } catch {
        /* 标签可能已关闭 */
      }
    }
  }
}
