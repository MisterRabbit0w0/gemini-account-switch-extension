// detector.js — 尽力检测已登录 Google 账号
// 依赖 accounts.google.com，需要 optional_host_permissions

/**
 * Request host permission for accounts.google.com if not already granted.
 * @returns {Promise<boolean>}
 */
export async function requestPermission() {
  return chrome.permissions.request({
    origins: ['https://accounts.google.com/*'],
  });
}

/**
 * Check if we already have the required permission.
 * @returns {Promise<boolean>}
 */
export async function hasPermission() {
  return chrome.permissions.contains({
    origins: ['https://accounts.google.com/*'],
  });
}

/**
 * Detect logged-in Google accounts via ListAccounts endpoint.
 * Returns array of { email, name, index }.
 * This is a best-effort approach using an undocumented Google endpoint.
 * @returns {Promise<Array<{ email: string, name: string, index: number }>>}
 */
export async function detect() {
  try {
    const resp = await fetch(
      'https://accounts.google.com/ListAccounts?gpsia=1&source=ogb&mo=1&mn=1',
      { credentials: 'include' }
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const text = await resp.text();
    // Response is a JS array literal, remove XSSI prefix if present
    const cleaned = text.replace(/^\)\]\}\'\n?/, '');
    const parsed = JSON.parse(cleaned);

    // The account list is typically in parsed[1]
    const accountList = parsed[1];
    if (!Array.isArray(accountList)) return [];

    return accountList
      .map((acc, index) => ({
        email: acc[2] || '',
        name: acc[3] || '',
        index,
      }))
      .filter((a) => a.email);
  } catch (err) {
    console.warn('[Account Switch] Detection failed:', err);
    return [];
  }
}
