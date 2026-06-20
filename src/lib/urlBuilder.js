// urlBuilder.js — URL 构造模块
// 纯函数，封装 authuser 拼接规则

const SITES = {
  gemini: 'https://gemini.google.com/',
  aistudio: 'https://aistudio.google.com/',
};

/**
 * Build a URL using the /u/<index>/ path form.
 * @param {'gemini'|'aistudio'} site
 * @param {{ index?: number }} identity
 * @returns {string}
 */
export function buildUrlByIndex(site, identity) {
  const base = SITES[site];
  if (!base) throw new Error(`Unknown site: ${site}`);

  const index = Number.isInteger(identity.index) ? identity.index : 0;
  const url = new URL(base);
  url.pathname = `/u/${index}/`;
  return url.toString();
}

/**
 * Build a URL for the given site with authuser parameter.
 * Prefers email (more stable than index which changes with login order).
 * @param {'gemini'|'aistudio'} site
 * @param {{ email?: string, index?: number }} identity
 * @returns {string}
 */
export function buildUrl(site, identity) {
  const base = SITES[site];
  if (!base) throw new Error(`Unknown site: ${site}`);

  const authuser = (identity.email || '').trim();
  if (authuser) {
    const url = new URL(base);
    url.searchParams.set('authuser', authuser);
    return url.toString();
  }

  return buildUrlByIndex(site, identity);
}

/**
 * Get the base URL for a site (fallback when authuser doesn't work).
 * @param {'gemini'|'aistudio'} site
 * @returns {string}
 */
export function getBaseUrl(site) {
  return SITES[site] || SITES.gemini;
}
