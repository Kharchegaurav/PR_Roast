/**
 * popup.js — Popup logic for PR Roast (Settings + History tabs)
 */

document.addEventListener('DOMContentLoaded', () => {
  const PROVIDER_KEY_URLS = {
    openai: 'https://platform.openai.com/api-keys',
    anthropic: 'https://console.anthropic.com/settings/keys',
    gemini: 'https://aistudio.google.com/app/apikey'
  };

  // DOM Elements
  const tabBtns = document.querySelectorAll('.popup-tab');
  const panels = document.querySelectorAll('.popup-panel');
  const providerSelect = document.getElementById('provider-select');
  const apiKeyInput = document.getElementById('api-key-input');
  const toggleKeyBtn = document.getElementById('toggle-key-visibility');
  const saveBtn = document.getElementById('save-settings');
  const testBtn = document.getElementById('test-connection');
  const statusEl = document.getElementById('setting-status');
  const keyHelpLink = document.getElementById('key-help-link');
  const historyList = document.getElementById('history-list');
  const historyEmpty = document.getElementById('history-empty');
  const historyFooter = document.getElementById('history-footer');
  const clearHistoryBtn = document.getElementById('clear-history');

  /* ─── Tab Switching ─── */
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`panel-${tab}`).classList.add('active');
      if (tab === 'history') loadHistory();
    });
  });

  /* ─── Provider Change ─── */
  providerSelect.addEventListener('change', () => {
    const provider = providerSelect.value;
    keyHelpLink.href = PROVIDER_KEY_URLS[provider];
    loadApiKeyForProvider(provider);
  });

  /* ─── Key Visibility Toggle ─── */
  toggleKeyBtn.addEventListener('click', () => {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    toggleKeyBtn.textContent = isPassword ? '🙈' : '👁️';
  });

  /* ─── Save Settings ─── */
  saveBtn.addEventListener('click', async () => {
    const provider = providerSelect.value;
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      showStatus('error', '❌ Please enter an API key');
      return;
    }

    showStatus('loading', '💾 Saving...');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_SETTINGS',
        provider,
        apiKey,
        selectedProvider: provider
      });

      if (response.success) {
        showStatus('success', '✅ Settings saved successfully!');
      } else {
        showStatus('error', `❌ ${response.error || 'Failed to save'}`);
      }
    } catch (err) {
      showStatus('error', `❌ ${err.message}`);
    }
  });

  /* ─── Test Connection ─── */
  testBtn.addEventListener('click', async () => {
    const provider = providerSelect.value;
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      showStatus('error', '❌ Enter an API key first');
      return;
    }

    showStatus('loading', '🔌 Testing connection...');
    testBtn.disabled = true;

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TEST_CONNECTION',
        provider,
        apiKey
      });

      if (response.success) {
        showStatus('success', '✅ Connection successful! API key is valid.');
      } else {
        showStatus('error', `❌ Connection failed: ${response.error}`);
      }
    } catch (err) {
      showStatus('error', `❌ ${err.message}`);
    } finally {
      testBtn.disabled = false;
    }
  });

  /* ─── History ─── */
  async function loadHistory() {
    try {
      const history = await chrome.runtime.sendMessage({ type: 'GET_HISTORY' });

      if (!history || history.length === 0) {
        historyEmpty.style.display = 'block';
        historyFooter.style.display = 'none';
        // Remove any existing items
        historyList.querySelectorAll('.history-item').forEach(el => el.remove());
        return;
      }

      historyEmpty.style.display = 'none';
      historyFooter.style.display = 'block';

      // Clear existing items
      historyList.querySelectorAll('.history-item').forEach(el => el.remove());

      history.forEach(item => {
        const el = document.createElement('a');
        // Security: only allow https URLs to prevent javascript: injection
        const safeUrl = item.url && item.url.startsWith('https://') ? item.url : '#';
        el.href = safeUrl;
        el.target = '_blank';
        el.rel = 'noopener noreferrer';
        el.className = 'history-item';

        const scoreClass = item.score <= 3 ? 'history-score-low' :
          item.score <= 6 ? 'history-score-mid' : 'history-score-high';

        const timeAgo = getTimeAgo(item.timestamp);
        const truncTitle = (item.title || 'Unknown PR').substring(0, 45) +
          ((item.title || '').length > 45 ? '...' : '');

        el.innerHTML = `
          <span class="history-status">${escapeHtml(item.status || '🔥')}</span>
          <div class="history-info">
            <span class="history-title">${escapeHtml(truncTitle)}</span>
            <div class="history-meta">
              <span class="history-score ${scoreClass}">${escapeHtml(String(item.score))}/10</span>
              <span class="history-time">${escapeHtml(timeAgo)}</span>
            </div>
          </div>
          <span class="history-link">🔗</span>
        `;

        historyList.appendChild(el);
      });
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }

  clearHistoryBtn.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY' });
    loadHistory();
  });

  /* ─── Helpers ─── */
  function showStatus(type, message) {
    statusEl.className = `setting-status ${type}`;
    statusEl.textContent = message;
    statusEl.style.display = 'block';
    if (type !== 'loading') {
      setTimeout(() => { statusEl.style.display = 'none'; }, 4000);
    }
  }

  async function loadApiKeyForProvider(provider) {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      const key = (response.apiKeys || {})[provider] || '';
      apiKeyInput.value = key;
    } catch (err) {
      apiKeyInput.value = '';
    }
  }

  function getTimeAgo(timestamp) {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  /* ─── Init ─── */
  async function init() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      providerSelect.value = response.selectedProvider || 'openai';
      const key = (response.apiKeys || {})[response.selectedProvider || 'openai'] || '';
      apiKeyInput.value = key;
      keyHelpLink.href = PROVIDER_KEY_URLS[providerSelect.value];
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }

  init();
});
