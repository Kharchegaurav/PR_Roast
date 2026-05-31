/**
 * llm.js — LLM API abstraction for PR Roast
 * Supports OpenAI (gpt-4o-mini), Anthropic (claude-3-5-haiku), Google (gemini-1.5-flash)
 */

const SYSTEM_PROMPT = `You are a deeply cynical, hyper-critical senior software engineer reviewing a pull request. Your goal is to brutally roast the provided code diff. You must be humorous, witty, and sassy, but your underlying feedback must be genuinely actionable.

Focus your critique on identifying:
- Unclear, 'clever' one-liners that read like riddles
- Terrible variable naming conventions (e.g., temp2, fooFinal)
- Fragile hacks, over-abstraction, and copy-pasted code
- Actual security vulnerabilities and performance bottlenecks

Explain the issues in plain English with a heavy dose of sarcasm. Deliver a brutal code review that will make the developer chuckle while forcing them to write better code.

Respond ONLY in this JSON format with no extra text:
{
  "score": <number 1-10, where 1=clean code, 10=dumpster fire>,
  "burns": [<3-5 specific burns referencing actual lines from the diff>],
  "honorableMentions": [<2-3 smaller nitpicks>],
  "redemptionArc": "<one reluctant compliment>",
  "verdict": "<one brutal closing sentence>"
}`;

const LLMProviders = {
  /* ───────── Token estimation & truncation ───────── */

  _estimateTokens(text) {
    // Rough estimate: ~4 chars per token for English/code
    return Math.ceil(text.length / 4);
  },

  _truncateDiff(diff, maxTokens = 8000) {
    const estimated = this._estimateTokens(diff);
    if (estimated <= maxTokens) return diff;

    const lines = diff.split('\n');
    const fileChunks = [];
    let currentChunk = [];
    let currentFile = '';

    // Split diff into per-file chunks
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('diff --git') || (line.startsWith('---') && lines[i + 1]?.startsWith('+++'))) {
        if (currentChunk.length > 0) {
          fileChunks.push({ file: currentFile, lines: [...currentChunk] });
        }
        currentChunk = [line];
        currentFile = line;
      } else {
        currentChunk.push(line);
      }
    }
    if (currentChunk.length > 0) {
      fileChunks.push({ file: currentFile, lines: [...currentChunk] });
    }

    if (fileChunks.length <= 2) {
      // Only 1-2 files — just hard truncate
      const maxChars = maxTokens * 4;
      return diff.substring(0, maxChars) + '\n\n... [TRUNCATED — diff too large, showing first portion]';
    }

    // Keep first and last files, summarize middle
    const first = fileChunks[0].lines.join('\n');
    const last = fileChunks[fileChunks.length - 1].lines.join('\n');
    const middleSummary = fileChunks.slice(1, -1).map(c => {
      const adds = c.lines.filter(l => l.startsWith('+')).length;
      const dels = c.lines.filter(l => l.startsWith('-')).length;
      return `  - ${c.file}: +${adds}/-${dels} lines`;
    }).join('\n');

    const truncated = [
      '=== FIRST CHANGED FILE (full) ===',
      first,
      '',
      '=== MIDDLE FILES (summarized — too many changes) ===',
      middleSummary,
      '',
      '=== LAST CHANGED FILE (full) ===',
      last
    ].join('\n');

    // If still too long, hard truncate
    const maxChars = maxTokens * 4;
    if (truncated.length > maxChars) {
      return truncated.substring(0, maxChars) + '\n\n... [TRUNCATED]';
    }

    return truncated;
  },

  /* ───────── Provider implementations ───────── */

  async _callOpenAI(diff, apiKey) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Here is the pull request diff to roast:\n\n${diff}` }
        ],
        temperature: 0.8,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    try {
      return JSON.parse(data.choices[0].message.content);
    } catch (e) {
      throw new Error('INVALID_RESPONSE');
    }
  },

  async _callAnthropic(diff, apiKey) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: `Here is the pull request diff to roast:\n\n${diff}` }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content[0].text;

    // Claude may wrap JSON in markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch (e) {
      throw new Error('INVALID_RESPONSE');
    }
  },

  async _callGemini(diff, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${SYSTEM_PROMPT}\n\nHere is the pull request diff to roast:\n\n${diff}`
          }]
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 1500,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch (e) {
      throw new Error('INVALID_RESPONSE');
    }
  },

  /* ───────── Test connection ───────── */

  async testConnection(provider, apiKey) {
    const testDiff = `diff --git a/test.js b/test.js
+const x = 1;
+const y = x + 1;
+console.log(y);`;

    try {
      switch (provider) {
        case 'openai':
          await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
          }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); });
          break;
        case 'anthropic':
          // Anthropic doesn't have a simple models endpoint, send a minimal request
          await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
              model: 'claude-3-5-haiku-latest',
              max_tokens: 10,
              messages: [{ role: 'user', content: 'Say "ok"' }]
            })
          }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); });
          break;
        case 'gemini':
          await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); });
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /* ───────── Main entry point ───────── */

  async roastDiff(diff, provider, apiKey) {
    if (!diff || diff.trim().length === 0) {
      throw new Error('EMPTY_DIFF');
    }
    if (!apiKey) {
      throw new Error('MISSING_API_KEY');
    }

    const truncatedDiff = this._truncateDiff(diff);

    let result;
    switch (provider) {
      case 'openai':
        result = await this._callOpenAI(truncatedDiff, apiKey);
        break;
      case 'anthropic':
        result = await this._callAnthropic(truncatedDiff, apiKey);
        break;
      case 'gemini':
        result = await this._callGemini(truncatedDiff, apiKey);
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    // Validate response structure
    if (!result || typeof result.score !== 'number') {
      throw new Error('INVALID_RESPONSE');
    }

    return {
      score: Math.min(10, Math.max(1, result.score)),
      burns: Array.isArray(result.burns) ? result.burns : [],
      honorableMentions: Array.isArray(result.honorableMentions) ? result.honorableMentions : [],
      redemptionArc: result.redemptionArc || 'No compliments deserved.',
      verdict: result.verdict || 'No comment.'
    };
  }
};

if (typeof window !== 'undefined') {
  window.LLMProviders = LLMProviders;
}
