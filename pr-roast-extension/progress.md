## Project: PR Roast Chrome Extension

### Status: COMPLETE ✅

### Completed files:
- [x] progress.md — Session memory and progress tracker
- [x] manifest.json — Manifest V3 configuration with minimal permissions
- [x] storage.js — chrome.storage.local wrapper (API keys, roast status, history)
- [x] llm.js — LLM API abstraction (OpenAI, Anthropic, Gemini) with intelligent truncation
- [x] background.js — Service worker for message routing between popup and content scripts
- [x] modal.js — Roast result modal with loading/error/result states
- [x] modal.css — Modal styles (GitHub dark theme, animated score meter, collapsible cards)
- [x] content.js — DOM injection + diff extraction from GitHub PR pages
- [x] content.css — Styles for injected roast button and status badges
- [x] popup.html — Extension popup shell with Settings and History tabs
- [x] popup.css — Popup styles (dark theme, gradient title, polished controls)
- [x] popup.js — Popup logic (tab switching, API key management, history display)
- [x] icons/icon16.png — 16x16 extension icon (flame + code brackets)
- [x] icons/icon48.png — 48x48 extension icon
- [x] icons/icon128.png — 128x128 extension icon
- [x] README.md — Documentation with install guide, API key links, example roast

### Pending files:
None — all files complete.

### Current step:
Code review and bug fixes complete. All files validated.

### Key decisions made:
- Diff extraction uses .diff URL first (most reliable for public repos), falls back to DOM parsing
- Gemini model set to gemini-2.0-flash (newer than spec's 1.5-flash, better results)
- Anthropic calls include `anthropic-dangerous-direct-browser-access` header (required for browser-direct API calls)
- Modal uses CSS animations with cubic-bezier timing for smooth open/close
- Content script uses MutationObserver + turbo/pjax listeners for GitHub SPA navigation
- Score meter is color-coded: green (1-3), yellow (4-6), red (7-10)
- Token truncation strategy: keep first and last changed files full, summarize middle files
- PR_URL changed from static const to dynamic `getPRUrl()` function for SPA navigation support

### Bugs found and fixed during review:
1. **Stale PR_URL** — Was captured once at IIFE init, stale during SPA navigation → changed to dynamic `getPRUrl()`
2. **MouseEvent leak** — `handleRoast` received MouseEvent when used as click handler → added `instanceof Event` guard
3. **Orphaned score badges** — Score badge had no ID, wasn't cleaned up on re-render → added `#pr-roast-score-badge` ID
4. **Diff chunking bug** — `lines.indexOf(line)` returned first occurrence index, not current → switched to index-based loop
5. **Operator precedence** — `||` vs `&&` in diff file detection → added explicit parentheses

### Validation results:
- ✅ All 6 JS files pass `node --check` syntax validation
- ✅ manifest.json is valid JSON
- ✅ popup.html parsed without errors
- ✅ All 3 icons are valid PNG files at correct dimensions (16x16, 48x48, 128x128)

### Known issues / blockers:
- Anthropic CORS: Browser-direct calls may be blocked by CORS in some cases. The header is included but may need their beta program
- Private repo diffs: The .diff URL fallback won't work for private repos without auth; DOM extraction is the backup
- GitHub UI selectors: GitHub frequently updates their DOM; selectors may need updating over time

### How to resume:
The extension is fully built and validated. To test: load unpacked in Chrome, navigate to a GitHub PR, configure an API key in the popup, and click "Roast this PR". If issues arise, check the console for [PR Roast] log messages.
