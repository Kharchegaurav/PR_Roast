/**
 * modal.js — Roast result modal for PR Roast
 * Injects a full-screen overlay modal into the GitHub page.
 */

const RoastModal = {
  _modal: null,
  _currentPrUrl: null,

  /* ───────── Create Modal Structure ───────── */

  _createModal() {
    if (this._modal) return this._modal;

    const overlay = document.createElement('div');
    overlay.id = 'pr-roast-modal-overlay';
    overlay.innerHTML = `
      <div class="pr-roast-modal" role="dialog" aria-label="PR Roast Result">
        <div class="pr-roast-modal-header">
          <div class="pr-roast-modal-title-row">
            <span class="pr-roast-modal-icon">🔥</span>
            <h2 class="pr-roast-modal-title">PR Roast Results</h2>
          </div>
          <button class="pr-roast-modal-close" aria-label="Close modal">&times;</button>
        </div>

        <div class="pr-roast-modal-body">
          <!-- Loading State -->
          <div class="pr-roast-loading" id="pr-roast-loading">
            <div class="pr-roast-spinner"></div>
            <p class="pr-roast-loading-text">Roasting your code...</p>
            <p class="pr-roast-loading-sub">The LLM is judging your life choices</p>
          </div>

          <!-- Error State -->
          <div class="pr-roast-error" id="pr-roast-error" style="display:none;">
            <span class="pr-roast-error-icon">⚠️</span>
            <p class="pr-roast-error-text" id="pr-roast-error-text"></p>
            <div class="pr-roast-error-actions">
              <button class="pr-roast-btn pr-roast-btn-retry" id="pr-roast-retry">Retry 🔄</button>
              <button class="pr-roast-btn pr-roast-btn-paste" id="pr-roast-paste-btn">Paste Diff Manually 📋</button>
            </div>
            <textarea id="pr-roast-manual-diff" class="pr-roast-manual-diff" placeholder="Paste your diff here..." style="display:none;"></textarea>
            <button id="pr-roast-submit-manual" class="pr-roast-btn pr-roast-btn-primary" style="display:none;">Submit Manual Diff</button>
          </div>

          <!-- Result State -->
          <div class="pr-roast-result" id="pr-roast-result" style="display:none;">
            <!-- PR Meta -->
            <div class="pr-roast-meta" id="pr-roast-meta"></div>

            <!-- Score Meter -->
            <div class="pr-roast-score-section">
              <div class="pr-roast-score-label">Dumpster Fire Score</div>
              <div class="pr-roast-score-meter">
                <div class="pr-roast-score-fill" id="pr-roast-score-fill"></div>
                <span class="pr-roast-score-value" id="pr-roast-score-value"></span>
              </div>
              <div class="pr-roast-score-scale">
                <span>1 (Clean)</span>
                <span>10 (Inferno)</span>
              </div>
            </div>

            <!-- Burns -->
            <div class="pr-roast-card" id="pr-roast-burns-card">
              <button class="pr-roast-card-header" aria-expanded="true">
                <span>🔥 Burns</span>
                <span class="pr-roast-card-toggle">▼</span>
              </button>
              <div class="pr-roast-card-content" id="pr-roast-burns-content"></div>
            </div>

            <!-- Honorable Mentions -->
            <div class="pr-roast-card" id="pr-roast-mentions-card">
              <button class="pr-roast-card-header" aria-expanded="true">
                <span>📝 Honorable Mentions</span>
                <span class="pr-roast-card-toggle">▼</span>
              </button>
              <div class="pr-roast-card-content" id="pr-roast-mentions-content"></div>
            </div>

            <!-- Redemption Arc -->
            <div class="pr-roast-card" id="pr-roast-redemption-card">
              <button class="pr-roast-card-header" aria-expanded="true">
                <span>🕊️ Redemption Arc</span>
                <span class="pr-roast-card-toggle">▼</span>
              </button>
              <div class="pr-roast-card-content" id="pr-roast-redemption-content"></div>
            </div>

            <!-- Verdict -->
            <div class="pr-roast-verdict" id="pr-roast-verdict"></div>

            <!-- Actions -->
            <div class="pr-roast-actions">
              <button class="pr-roast-btn pr-roast-btn-fixed" id="pr-roast-mark-fixed">Mark as Fixed 🧯</button>
              <button class="pr-roast-btn pr-roast-btn-primary" id="pr-roast-again">Roast Again 🔥</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this._modal = overlay;

    // Event listeners
    overlay.querySelector('.pr-roast-modal-close').addEventListener('click', () => this.close());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    // Collapsible cards
    overlay.querySelectorAll('.pr-roast-card-header').forEach(header => {
      header.addEventListener('click', () => {
        const card = header.closest('.pr-roast-card');
        const content = card.querySelector('.pr-roast-card-content');
        const toggle = header.querySelector('.pr-roast-card-toggle');
        const expanded = header.getAttribute('aria-expanded') === 'true';
        header.setAttribute('aria-expanded', !expanded);
        content.style.display = expanded ? 'none' : 'block';
        toggle.textContent = expanded ? '▶' : '▼';
      });
    });

    // Paste diff toggle
    const pasteBtn = overlay.querySelector('#pr-roast-paste-btn');
    const manualDiff = overlay.querySelector('#pr-roast-manual-diff');
    const submitManual = overlay.querySelector('#pr-roast-submit-manual');
    pasteBtn.addEventListener('click', () => {
      manualDiff.style.display = manualDiff.style.display === 'none' ? 'block' : 'none';
      submitManual.style.display = submitManual.style.display === 'none' ? 'block' : 'none';
    });

    // ESC to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._modal && this._modal.classList.contains('pr-roast-modal-open')) {
        this.close();
      }
    });

    return overlay;
  },

  /* ───────── Open / Close ───────── */

  open() {
    const modal = this._createModal();
    // Reset to loading state
    modal.querySelector('#pr-roast-loading').style.display = 'flex';
    modal.querySelector('#pr-roast-error').style.display = 'none';
    modal.querySelector('#pr-roast-result').style.display = 'none';

    // Trigger animation
    requestAnimationFrame(() => {
      modal.classList.add('pr-roast-modal-open');
    });

    document.body.style.overflow = 'hidden';
  },

  close() {
    if (!this._modal) return;
    this._modal.classList.remove('pr-roast-modal-open');
    document.body.style.overflow = '';

    // Wait for animation to complete before hiding content
    setTimeout(() => {
      if (this._modal) {
        this._modal.querySelector('#pr-roast-loading').style.display = 'flex';
        this._modal.querySelector('#pr-roast-error').style.display = 'none';
        this._modal.querySelector('#pr-roast-result').style.display = 'none';
      }
    }, 300);
  },

  /* ───────── Show States ───────── */

  showLoading(message) {
    const modal = this._createModal();
    modal.querySelector('#pr-roast-loading').style.display = 'flex';
    modal.querySelector('#pr-roast-error').style.display = 'none';
    modal.querySelector('#pr-roast-result').style.display = 'none';
    if (message) {
      modal.querySelector('.pr-roast-loading-text').textContent = message;
    }
  },

  showError(errorType, retryFn) {
    const modal = this._createModal();
    modal.querySelector('#pr-roast-loading').style.display = 'none';
    modal.querySelector('#pr-roast-error').style.display = 'flex';
    modal.querySelector('#pr-roast-result').style.display = 'none';

    const errorText = modal.querySelector('#pr-roast-error-text');
    const retryBtn = modal.querySelector('#pr-roast-retry');
    const pasteBtn = modal.querySelector('#pr-roast-paste-btn');

    switch (errorType) {
      case 'MISSING_API_KEY':
        errorText.innerHTML = '🔑 No API key configured. Open the PR Roast popup and add your API key in Settings.';
        pasteBtn.style.display = 'none';
        break;
      case 'EMPTY_DIFF':
        errorText.innerHTML = '📄 Could not extract diff from this page. You can paste it manually below.';
        pasteBtn.style.display = 'inline-flex';
        break;
      case 'INVALID_RESPONSE':
        errorText.innerHTML = '🤖 The LLM returned an unexpected response format. Try again or switch providers.';
        pasteBtn.style.display = 'none';
        break;
      default:
        errorText.innerHTML = `❌ ${this._escapeHtml(errorType)}`;
        pasteBtn.style.display = 'none';
    }

    // Wire up retry
    const newRetry = retryBtn.cloneNode(true);
    retryBtn.parentNode.replaceChild(newRetry, retryBtn);
    newRetry.addEventListener('click', () => {
      this.showLoading('Retrying...');
      if (retryFn) retryFn();
    });
  },

  showResult(roastData, prMeta, onMarkFixed, onRoastAgain) {
    const modal = this._createModal();
    modal.querySelector('#pr-roast-loading').style.display = 'none';
    modal.querySelector('#pr-roast-error').style.display = 'none';
    modal.querySelector('#pr-roast-result').style.display = 'block';

    // PR Meta
    const metaEl = modal.querySelector('#pr-roast-meta');
    metaEl.innerHTML = `
      <div class="pr-roast-meta-row">
        <span class="pr-roast-meta-label">📌 PR:</span>
        <span class="pr-roast-meta-value">${this._escapeHtml(prMeta.title || 'Unknown PR')}</span>
      </div>
      <div class="pr-roast-meta-row">
        <span class="pr-roast-meta-label">👤 Author:</span>
        <span class="pr-roast-meta-value">${this._escapeHtml(prMeta.author || 'Unknown')}</span>
      </div>
      <div class="pr-roast-meta-row">
        <span class="pr-roast-meta-label">📁 Files:</span>
        <span class="pr-roast-meta-value">${this._escapeHtml(String(prMeta.filesChanged || '?'))} files changed</span>
      </div>
      <div class="pr-roast-meta-row">
        <span class="pr-roast-meta-label">📊 Changes:</span>
        <span class="pr-roast-meta-value">
          <span class="pr-roast-additions">+${this._escapeHtml(String(prMeta.additions || '?'))}</span>
          <span class="pr-roast-deletions">-${this._escapeHtml(String(prMeta.deletions || '?'))}</span>
        </span>
      </div>
    `;

    // Score
    const score = roastData.score;
    const scorePercent = (score / 10) * 100;
    const fill = modal.querySelector('#pr-roast-score-fill');
    const value = modal.querySelector('#pr-roast-score-value');

    fill.style.width = '0%';
    value.textContent = `${score}/10`;

    // Color based on score
    let color;
    if (score <= 3) color = '#2ea043';
    else if (score <= 6) color = '#d29922';
    else color = '#f85149';

    fill.style.background = `linear-gradient(90deg, ${color}88, ${color})`;

    // Animate score fill
    requestAnimationFrame(() => {
      setTimeout(() => {
        fill.style.width = `${scorePercent}%`;
      }, 100);
    });

    // Burns
    const burnsContent = modal.querySelector('#pr-roast-burns-content');
    burnsContent.innerHTML = (roastData.burns || []).map(burn =>
      `<div class="pr-roast-burn-item">
        <span class="pr-roast-burn-bullet">🔥</span>
        <p>${this._escapeHtml(burn)}</p>
      </div>`
    ).join('');

    // Honorable Mentions
    const mentionsContent = modal.querySelector('#pr-roast-mentions-content');
    mentionsContent.innerHTML = (roastData.honorableMentions || []).map(mention =>
      `<div class="pr-roast-burn-item">
        <span class="pr-roast-burn-bullet">📝</span>
        <p>${this._escapeHtml(mention)}</p>
      </div>`
    ).join('');

    // Redemption Arc
    const redemptionContent = modal.querySelector('#pr-roast-redemption-content');
    redemptionContent.innerHTML = `
      <div class="pr-roast-burn-item pr-roast-redemption">
        <span class="pr-roast-burn-bullet">🕊️</span>
        <p>${this._escapeHtml(roastData.redemptionArc || '')}</p>
      </div>
    `;

    // Verdict
    const verdictEl = modal.querySelector('#pr-roast-verdict');
    verdictEl.innerHTML = `
      <div class="pr-roast-verdict-inner">
        <span class="pr-roast-verdict-label">⚖️ VERDICT</span>
        <p>${this._escapeHtml(roastData.verdict || '')}</p>
      </div>
    `;

    // Action buttons
    const fixedBtn = modal.querySelector('#pr-roast-mark-fixed');
    const againBtn = modal.querySelector('#pr-roast-again');

    const newFixed = fixedBtn.cloneNode(true);
    fixedBtn.parentNode.replaceChild(newFixed, fixedBtn);
    newFixed.addEventListener('click', () => {
      if (onMarkFixed) onMarkFixed();
      this.close();
    });

    const newAgain = againBtn.cloneNode(true);
    againBtn.parentNode.replaceChild(newAgain, againBtn);
    newAgain.addEventListener('click', () => {
      if (onRoastAgain) onRoastAgain();
    });

    // Wire up manual diff submit
    const submitManual = modal.querySelector('#pr-roast-submit-manual');
    const newSubmit = submitManual.cloneNode(true);
    submitManual.parentNode.replaceChild(newSubmit, submitManual);
    newSubmit.addEventListener('click', () => {
      const manualDiff = modal.querySelector('#pr-roast-manual-diff').value;
      if (manualDiff.trim()) {
        if (onRoastAgain) onRoastAgain(manualDiff);
      }
    });
  },

  /* ───────── Utility ───────── */

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

if (typeof window !== 'undefined') {
  window.RoastModal = RoastModal;
}
