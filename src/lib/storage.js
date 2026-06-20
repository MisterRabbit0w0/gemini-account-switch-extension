// storage.js — chrome.storage.local 薄封装

const DEFAULTS = {
  identities: [],
  settings: { openIn: 'tab' },
};

/**
 * Load all data from storage, merged with defaults.
 * @returns {Promise<{ identities: Array, settings: object }>}
 */
export async function load() {
  const result = await chrome.storage.local.get(['identities', 'settings']);
  return {
    identities: result.identities ?? DEFAULTS.identities,
    settings: result.settings ?? { ...DEFAULTS.settings },
  };
}

/**
 * Save identities list.
 * @param {Array} identities
 */
export async function saveIdentities(identities) {
  await chrome.storage.local.set({ identities });
}

/**
 * Save settings.
 * @param {object} settings
 */
export async function saveSettings(settings) {
  await chrome.storage.local.set({ settings });
}

/**
 * Generate a unique id.
 * @returns {string}
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
