/**
 * background.js — Service worker for PR Roast extension
 * Handles messaging between popup and content scripts.
 */

/* ───────── Installation ───────── */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('🔥 PR Roast installed! Ready to roast some code.');
    // Set default provider
    chrome.storage.local.set({ selectedProvider: 'openai' });
  }
});

/* ───────── Message Router ───────── */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'TEST_CONNECTION':
      handleTestConnection(message).then(sendResponse);
      return true; // async response

    case 'GET_SETTINGS':
      handleGetSettings().then(sendResponse);
      return true;

    case 'SAVE_SETTINGS':
      handleSaveSettings(message).then(sendResponse);
      return true;

    case 'GET_HISTORY':
      handleGetHistory().then(sendResponse);
      return true;

    case 'CLEAR_HISTORY':
      chrome.storage.local.remove('roastHistory').then(() => sendResponse({ success: true }));
      return true;
  }
});

/* ───────── Handlers ───────── */

async function handleTestConnection({ provider, apiKey }) {
  try {
    let success = false;
    let error = '';

    switch (provider) {
      case 'openai': {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        success = res.ok;
        if (!success) error = `HTTP ${res.status}: ${res.statusText}`;
        break;
      }
      case 'anthropic': {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-latest',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Say ok' }]
          })
        });
        success = res.ok;
        if (!success) error = `HTTP ${res.status}: ${res.statusText}`;
        break;
      }
      case 'gemini': {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        success = res.ok;
        if (!success) error = `HTTP ${res.status}: ${res.statusText}`;
        break;
      }
      default:
        error = `Unknown provider: ${provider}`;
    }

    return { success, error };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function handleGetSettings() {
  const data = await chrome.storage.local.get(['apiKeys', 'selectedProvider']);
  return {
    apiKeys: data.apiKeys || {},
    selectedProvider: data.selectedProvider || 'openai'
  };
}

async function handleSaveSettings({ provider, apiKey, selectedProvider }) {
  try {
    const data = await chrome.storage.local.get('apiKeys');
    const apiKeys = data.apiKeys || {};
    if (apiKey !== undefined) {
      apiKeys[provider] = apiKey;
    }
    await chrome.storage.local.set({
      apiKeys,
      selectedProvider: selectedProvider || provider
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function handleGetHistory() {
  const data = await chrome.storage.local.get(['roastHistory', 'roastedPRs']);
  const history = data.roastHistory || [];
  const prs = data.roastedPRs || {};

  return history.map(h => ({
    ...h,
    status: (prs[h.url] && prs[h.url].status) || h.status
  }));
}
