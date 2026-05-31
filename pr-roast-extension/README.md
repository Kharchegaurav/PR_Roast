# 🔥 PR Roast — AI-Powered Code Review Roasting

> *"Your code never leaves your browser. API calls go directly from your browser to your chosen LLM provider."*

**PR Roast** is a Chrome extension that injects a "🔥 Roast this PR" button directly into GitHub pull request pages. It extracts the diff, sends it to your own LLM, and delivers a brutally funny (but genuinely useful) code review.

![PR Roast Screenshot](icons/icon128.png)

---

## ✨ Features

- **🔥 One-Click Roasting** — Click "Roast this PR" on any GitHub PR page
- **🔐 BYOK (Bring Your Own Key)** — Use your own API key for OpenAI, Anthropic, or Google
- **📊 Score Meter** — Visual 1-10 "dumpster fire" score with color coding
- **🧯 Fix Tracking** — Mark roasted PRs as "fixed" with persistent status
- **📜 History** — View your last 10 roasted PRs in the popup
- **🎭 Privacy First** — No code stored externally; diff goes directly to your LLM provider
- **🎨 Native UI** — Styled to blend seamlessly with GitHub's interface

---

## 📦 Installation

1. **Download or clone** this repository
2. Open **Chrome** → navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **"Load unpacked"**
5. Select the `pr-roast-extension` folder
6. You should see the 🔥 icon in your toolbar!

---

## 🔑 Getting API Keys

You need an API key from at least one provider:

| Provider | Model | Get Key |
|----------|-------|---------|
| **OpenAI** | GPT-4o-mini | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| **Anthropic** | Claude 3.5 Haiku | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| **Google** | Gemini 2.0 Flash | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |

### Setup:
1. Click the 🔥 PR Roast icon in your toolbar
2. Select your LLM provider from the dropdown
3. Paste your API key
4. Click **"💾 Save"**
5. Click **"🔌 Test"** to verify it works

---

## 🎯 How to Use

1. Navigate to any GitHub pull request
2. Click the **"🔥 Roast this PR"** button (appears in the PR header)
3. Wait for the LLM to analyze the diff
4. Laugh, cry, and fix your code
5. Click **"Mark as Fixed 🧯"** when done

---

## 🤣 Example Roast Output

```json
{
  "score": 7,
  "burns": [
    "Line 42: You named a variable `temp2`. Was `temp1` already taken, or did you just give up on life?",
    "Line 87: This try-catch block catches everything and does nothing. Congratulations, you've invented the coding equivalent of thoughts and prayers.",
    "Line 115-120: You copy-pasted the same validation logic 4 times. Ever heard of functions? They've been around since the 1950s.",
    "Line 203: `if (flag == true)` — I see we're not fans of truthy values. Next you'll be checking if (1 + 1 == 2) just to be safe."
  ],
  "honorableMentions": [
    "The README is longer than the actual code. Bold strategy.",
    "Using var in 2025. Retro chic or just inertia?"
  ],
  "redemptionArc": "I'll grudgingly admit the error messages are actually human-readable. Your users don't deserve you.",
  "verdict": "This PR has the structural integrity of a Jenga tower after 47 rounds — it works, but nobody should breathe near it."
}
```

---

## 🏗️ Project Structure

```
pr-roast-extension/
├── manifest.json      # Manifest V3 config
├── background.js      # Service worker
├── content.js         # DOM injection + diff extraction
├── content.css        # Injected UI styles
├── popup.html         # Extension popup
├── popup.js           # Popup logic
├── popup.css          # Popup styles
├── modal.js           # Roast result modal
├── modal.css          # Modal styles
├── llm.js             # LLM API abstraction
├── storage.js         # chrome.storage.local wrapper
├── icons/             # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── progress.md        # Development session tracker
└── README.md          # This file
```

---

## 🔒 Privacy Statement

**Your code never leaves your browser.** 

- The extension extracts diffs directly from the GitHub page DOM or the public `.diff` URL
- API calls go **directly from your browser** to your chosen LLM provider (OpenAI, Anthropic, or Google)
- API keys are stored in `chrome.storage.local` — never transmitted to any third-party server
- No analytics, no telemetry, no data collection
- The extension only requests permissions for `github.com` and the LLM API domains

---

## 🛠️ Development

This is a pure HTML/CSS/JS Chrome extension with no build step required.

To develop:
1. Load the extension unpacked in Chrome
2. Make changes to the source files
3. Click the refresh icon on `chrome://extensions/` to reload
4. Test on any GitHub pull request page

---

## 📄 License

MIT — roast responsibly. 🔥
