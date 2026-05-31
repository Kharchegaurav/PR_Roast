/**
 * storage.js — chrome.storage.local wrapper for PR Roast
 * Handles API keys, roast history, and PR status persistence.
 */

const PRStorage = {
  /* ───────── API Key Management ───────── */

  async saveApiKey(provider, key) {
    const data = await chrome.storage.local.get('apiKeys');
    const apiKeys = data.apiKeys || {};
    apiKeys[provider] = key;
    await chrome.storage.local.set({ apiKeys });
  },

  async getApiKey(provider) {
    const data = await chrome.storage.local.get('apiKeys');
    return (data.apiKeys || {})[provider] || null;
  },

  async getSelectedProvider() {
    const data = await chrome.storage.local.get('selectedProvider');
    return data.selectedProvider || 'openai';
  },

  async setSelectedProvider(provider) {
    await chrome.storage.local.set({ selectedProvider: provider });
  },

  /* ───────── PR Roast Status ───────── */

  _prKey(url) {
    // Normalize PR URL — strip query params and hash
    try {
      const u = new URL(url);
      return u.origin + u.pathname.replace(/\/$/, '');
    } catch {
      return url;
    }
  },

  async getRoastStatus(prUrl) {
    const key = this._prKey(prUrl);
    const data = await chrome.storage.local.get('roastedPRs');
    const prs = data.roastedPRs || {};
    return prs[key] || null; // { status: '🔥'|'🧯', score, title, timestamp, roastData }
  },

  async setRoastStatus(prUrl, info) {
    const key = this._prKey(prUrl);
    const data = await chrome.storage.local.get('roastedPRs');
    const prs = data.roastedPRs || {};
    prs[key] = {
      ...prs[key],
      ...info,
      url: key,
      lastUpdated: Date.now()
    };
    await chrome.storage.local.set({ roastedPRs: prs });
  },

  async markFixed(prUrl) {
    await this.setRoastStatus(prUrl, { status: '🧯' });
  },

  async markRoasted(prUrl, roastData, title) {
    await this.setRoastStatus(prUrl, {
      status: '🔥',
      score: roastData.score,
      title: title,
      timestamp: Date.now(),
      roastData: roastData
    });
    await this._addToHistory(prUrl, roastData, title);
  },

  /* ───────── Roast History ───────── */

  async _addToHistory(prUrl, roastData, title) {
    const key = this._prKey(prUrl);
    const data = await chrome.storage.local.get('roastHistory');
    let history = data.roastHistory || [];

    // Remove existing entry for this PR if present
    history = history.filter(h => h.url !== key);

    // Add to front
    history.unshift({
      url: key,
      title: title,
      score: roastData.score,
      status: '🔥',
      timestamp: Date.now()
    });

    // Keep only last 10
    history = history.slice(0, 10);

    await chrome.storage.local.set({ roastHistory: history });
  },

  async getHistory() {
    const data = await chrome.storage.local.get(['roastHistory', 'roastedPRs']);
    const history = data.roastHistory || [];
    const prs = data.roastedPRs || {};

    // Sync status from roastedPRs (in case status changed to 🧯)
    return history.map(h => ({
      ...h,
      status: (prs[h.url] && prs[h.url].status) || h.status
    }));
  },

  async clearHistory() {
    await chrome.storage.local.remove('roastHistory');
  },

  /* ───────── Utility ───────── */

  async clearAll() {
    await chrome.storage.local.clear();
  }
};

// Make available globally (content scripts share scope)
if (typeof window !== 'undefined') {
  window.PRStorage = PRStorage;
}
