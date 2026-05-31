/**
 * content.js — DOM injection + diff extraction for PR Roast
 * Runs on GitHub pull request pages.
 */

(function () {
  'use strict';

  // Guard against double injection
  if (window.__prRoastInjected) return;
  window.__prRoastInjected = true;

  function getPRUrl() {
    return window.location.href.split('?')[0].split('#')[0];
  }

  /* ═══════════════════════════════════════════════════════
     1. PR Metadata Extraction
     ═══════════════════════════════════════════════════════ */

  function getPRMeta() {
    // Title
    const titleEl = document.querySelector('.js-issue-title, .gh-header-title .markdown-title');
    const title = titleEl ? titleEl.textContent.trim() : document.title.split('·')[0].trim();

    // Author
    const authorEl = document.querySelector('.pull-header-entity .author, .gh-header-meta .author');
    const author = authorEl ? authorEl.textContent.trim() : 'Unknown';

    // Files changed count
    const filesTab = document.querySelector('#files_tab_counter, [id="diffstat"] .text-emphasized');
    const filesChanged = filesTab ? filesTab.textContent.trim() : '?';

    // Additions / Deletions
    const diffstat = document.querySelector('#diffstat, .diffstat');
    let additions = '?';
    let deletions = '?';

    if (diffstat) {
      const addEl = diffstat.querySelector('.color-fg-success, .text-green');
      const delEl = diffstat.querySelector('.color-fg-danger, .text-red');
      if (addEl) additions = addEl.textContent.replace(/[^0-9]/g, '') || '?';
      if (delEl) deletions = delEl.textContent.replace(/[^0-9]/g, '') || '?';
    }

    // Fallback: parse from toc-diff-stats
    if (additions === '?' || deletions === '?') {
      const statEl = document.querySelector('.toc-diff-stats, .diffstat-summary');
      if (statEl) {
        const text = statEl.textContent;
        const addMatch = text.match(/([\d,]+)\s+addition/);
        const delMatch = text.match(/([\d,]+)\s+deletion/);
        if (addMatch) additions = addMatch[1].replace(/,/g, '');
        if (delMatch) deletions = delMatch[1].replace(/,/g, '');
      }
    }

    return { title, author, filesChanged, additions, deletions };
  }

  /* ═══════════════════════════════════════════════════════
     2. Diff Extraction from DOM
     ═══════════════════════════════════════════════════════ */

  function extractDiffFromDOM() {
    let diff = '';

    // Method 1: Try fetching .diff URL (works without auth for public repos)
    // We'll do this async, but first try DOM extraction

    // Method 2: Parse diff from the Files Changed tab DOM
    const diffContainers = document.querySelectorAll('.file[data-path], .js-file, div[id^="diff-"]');

    if (diffContainers.length > 0) {
      diffContainers.forEach(container => {
        const filePath = container.getAttribute('data-path') ||
          container.querySelector('.file-header [title], .file-info a')?.textContent?.trim() ||
          'unknown-file';

        diff += `\ndiff --git a/${filePath} b/${filePath}\n`;

        // Get diff lines from table rows
        const rows = container.querySelectorAll('tr.blob-code-addition, tr.blob-code-deletion, tr.blob-code-context, .d-inline-flex.flex-1');
        rows.forEach(row => {
          const codeEl = row.querySelector('.blob-code-inner, .blob-code');
          if (!codeEl) return;

          const text = codeEl.textContent;
          if (row.classList.contains('blob-code-addition')) {
            diff += `+${text}\n`;
          } else if (row.classList.contains('blob-code-deletion')) {
            diff += `-${text}\n`;
          } else {
            diff += ` ${text}\n`;
          }
        });

        // Also try unified diff view
        if (rows.length === 0) {
          const unifiedRows = container.querySelectorAll('td.blob-code');
          unifiedRows.forEach(cell => {
            const marker = cell.querySelector('.blob-code-marker');
            const inner = cell.querySelector('.blob-code-inner');
            if (!inner) return;

            const markerText = marker ? marker.textContent.trim() : ' ';
            if (markerText === '+') {
              diff += `+${inner.textContent}\n`;
            } else if (markerText === '-') {
              diff += `-${inner.textContent}\n`;
            } else {
              diff += ` ${inner.textContent}\n`;
            }
          });
        }
      });
    }

    return diff.trim();
  }

  async function fetchDiffFromURL() {
    // GitHub serves a .diff version of any PR
    const prUrl = window.location.href.split('?')[0].split('#')[0];
    const diffUrl = prUrl + '.diff';

    try {
      const response = await fetch(diffUrl);
      if (response.ok) {
        return await response.text();
      }
    } catch (e) {
      console.log('[PR Roast] Could not fetch .diff URL:', e);
    }
    return null;
  }

  async function getDiff() {
    // First try the .diff URL (most reliable)
    const urlDiff = await fetchDiffFromURL();
    if (urlDiff && urlDiff.trim().length > 0) return urlDiff;

    // Fallback to DOM extraction
    const domDiff = extractDiffFromDOM();
    if (domDiff.length > 0) return domDiff;

    return null;
  }

  /* ═══════════════════════════════════════════════════════
     3. Roast Button Injection
     ═══════════════════════════════════════════════════════ */

  function injectRoastButton() {
    // Don't inject twice
    if (document.querySelector('#pr-roast-trigger')) return;

    // Find GitHub's PR action bar
    const actionBar = document.querySelector(
      '.gh-header-actions, ' +
      '.flex-md-row-reverse .flex-md-order-2, ' +
      '.discussion-sidebar-heading, ' +
      '.pr-review-tools'
    );

    // Alternative: inject near the merge button area or PR header
    const targetContainer = actionBar ||
      document.querySelector('.gh-header-show .flex-auto') ||
      document.querySelector('#partial-discussion-header .flex-auto');

    if (!targetContainer) {
      // Last resort — inject after the PR title
      const titleContainer = document.querySelector('.js-issue-title, .gh-header-title');
      if (titleContainer) {
        const btn = createRoastButton();
        titleContainer.parentElement.appendChild(btn);
        return;
      }
      console.log('[PR Roast] Could not find injection target');
      return;
    }

    const btn = createRoastButton();

    if (actionBar) {
      // Insert as first child of the action bar
      actionBar.prepend(btn);
    } else {
      targetContainer.appendChild(btn);
    }
  }

  function createRoastButton() {
    const btn = document.createElement('button');
    btn.id = 'pr-roast-trigger';
    btn.className = 'pr-roast-trigger-btn pr-roast-tooltip';
    btn.setAttribute('data-tooltip', 'AI-powered roast of this PR');
    btn.innerHTML = '<span class="pr-roast-btn-flame">🔥</span> Roast this PR';
    btn.addEventListener('click', handleRoast);
    return btn;
  }

  /* ═══════════════════════════════════════════════════════
     4. Status Badge (🔥 / 🧯 next to PR title)
     ═══════════════════════════════════════════════════════ */

  async function updateStatusBadge() {
    const existing = document.querySelector('#pr-roast-status');
    if (existing) existing.remove();
    const existingScore = document.querySelector('#pr-roast-score-badge');
    if (existingScore) existingScore.remove();

    const status = await PRStorage.getRoastStatus(getPRUrl());
    if (!status) return;

    const titleEl = document.querySelector('.js-issue-title, .gh-header-title .markdown-title');
    if (!titleEl) return;

    const badge = document.createElement('span');
    badge.id = 'pr-roast-status';
    badge.className = `pr-roast-status-badge ${status.status === '🔥' ? 'pr-roast-fire' : 'pr-roast-fixed'}`;
    badge.textContent = status.status;
    badge.title = status.status === '🔥' ? `Roasted! Score: ${status.score}/10` : 'Fixed! 🧯';

    // Add score badge
    if (status.score) {
      const scoreBadge = document.createElement('span');
      scoreBadge.id = 'pr-roast-score-badge';
      const scoreClass = status.score <= 3 ? 'pr-roast-score-low' :
        status.score <= 6 ? 'pr-roast-score-mid' : 'pr-roast-score-high';
      scoreBadge.className = `pr-roast-score-inline ${scoreClass}`;
      scoreBadge.textContent = `${status.score}/10`;
      titleEl.parentElement.appendChild(badge);
      titleEl.parentElement.appendChild(scoreBadge);
    } else {
      titleEl.parentElement.appendChild(badge);
    }
  }

  /* ═══════════════════════════════════════════════════════
     5. Roast Handler
     ═══════════════════════════════════════════════════════ */

  async function handleRoast(manualDiff) {
    // Guard against MouseEvent being passed when used as click handler
    if (manualDiff instanceof Event) manualDiff = undefined;

    const btn = document.querySelector('#pr-roast-trigger');
    if (btn) {
      btn.classList.add('pr-roast-loading');
      btn.innerHTML = '<span class="pr-roast-btn-flame">🔥</span> Roasting...';
    }

    // Open modal with loading state
    RoastModal.open();

    try {
      // Get settings
      const provider = await PRStorage.getSelectedProvider();
      const apiKey = await PRStorage.getApiKey(provider);

      if (!apiKey) {
        RoastModal.showError('MISSING_API_KEY', () => handleRoast());
        resetButton();
        return;
      }

      // Get diff
      const diff = typeof manualDiff === 'string' ? manualDiff : await getDiff();
      if (!diff || diff.trim().length === 0) {
        RoastModal.showError('EMPTY_DIFF', () => handleRoast());
        resetButton();
        return;
      }

      // Call LLM
      const roastData = await LLMProviders.roastDiff(diff, provider, apiKey);
      const prMeta = getPRMeta();

      // Save to storage
      await PRStorage.markRoasted(getPRUrl(), roastData, prMeta.title);

      // Show result
      RoastModal.showResult(
        roastData,
        prMeta,
        async () => {
          // Mark as fixed
          await PRStorage.markFixed(getPRUrl());
          updateStatusBadge();
        },
        (newDiff) => {
          // Roast again
          handleRoast(newDiff || undefined);
        }
      );

      // Update badge
      updateStatusBadge();

    } catch (error) {
      console.error('[PR Roast] Error:', error);
      RoastModal.showError(error.message, () => handleRoast());
    } finally {
      resetButton();
    }
  }

  function resetButton() {
    const btn = document.querySelector('#pr-roast-trigger');
    if (btn) {
      btn.classList.remove('pr-roast-loading');
      btn.innerHTML = '<span class="pr-roast-btn-flame">🔥</span> Roast this PR';
    }
  }

  /* ═══════════════════════════════════════════════════════
     6. Initialization
     ═══════════════════════════════════════════════════════ */

  function isPRPage() {
    return /github\.com\/[^/]+\/[^/]+\/pull\/\d+/.test(window.location.href);
  }

  async function init() {
    if (!isPRPage()) return;

    console.log('[PR Roast] 🔥 Initializing on PR page');

    // Inject roast button
    injectRoastButton();

    // Update status badge from storage
    updateStatusBadge();
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-run on GitHub's SPA navigation (turbo/pjax)
  const observer = new MutationObserver(() => {
    if (isPRPage() && !document.querySelector('#pr-roast-trigger')) {
      init();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Also listen for GitHub's turbo navigation
  document.addEventListener('turbo:load', init);
  document.addEventListener('pjax:end', init);

})();
