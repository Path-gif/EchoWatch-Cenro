const express = require('express');

const router = express.Router();

function getGeminiApiKey() {
  // prefer explicit GEMINI/GOOGLE env vars only
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
}

function normalizeSuggestionText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSuggestions(payload) {
  const candidates = [];

  if (payload) {
    if (Array.isArray(payload.candidates) && payload.candidates.length) {
      for (const c of payload.candidates) {
        if (typeof c.output === 'string') candidates.push(c.output)
        // some Gemini responses put text under content.parts
        if (c.content) {
          if (Array.isArray(c.content)) {
            const text = c.content.map((p) => (p?.text ? String(p.text) : '')).filter(Boolean).join('')
            if (text) candidates.push(text)
          } else if (Array.isArray(c.content.parts)) {
            const text = c.content.parts.map((p) => (p?.text ? String(p.text) : '')).filter(Boolean).join('\n')
            if (text) candidates.push(text)
          }
        }
        if (c.message && typeof c.message === 'string') candidates.push(c.message)
      }
    }

    // older shapes
    if (Array.isArray(payload.data?.candidates)) {
      for (const c of payload.data.candidates) {
        if (c.output) candidates.push(c.output)
      }
    }

    // direct text fields
    candidates.push(payload?.output, payload?.text, payload?.message, payload?.reply)
  }

  return [...new Set(candidates.map(normalizeSuggestionText).filter(Boolean))].slice(0, 5);
}

function collectTextFromPayload(obj) {
  const texts = [];
  const seen = new Set();
  function walk(v) {
    if (!v || typeof v !== 'object') return;
    if (typeof v.text === 'string') {
      const s = String(v.text).trim();
      if (s && !seen.has(s)) {
        seen.add(s);
        texts.push(s);
      }
    }
    for (const key of Object.keys(v)) {
      const val = v[key];
      if (typeof val === 'string' && key.toLowerCase().includes('text')) {
        const s = val.trim();
        if (s && !seen.has(s)) {
          seen.add(s);
          texts.push(s);
        }
      } else if (Array.isArray(val)) {
        for (const item of val) walk(item);
      } else if (typeof val === 'object') {
        walk(val);
      }
    }
  }
  walk(obj);
  return texts;
}

function splitIntoSuggestions(text) {
  if (!text || typeof text !== 'string') return [];
  const t = text.trim();

  // Try splitting by double newlines (paragraphs)
  let parts = t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) return parts.slice(0, 3);

  // Try splitting by numbered list (1., 2) or lines starting with numbers
  parts = t.split(/\n\s*(?:\d+\.|\d+\))/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) return parts.slice(0, 3);

  // Split into sentences and group into up to 3 items
  const sentences = (t.match(/[^.!?\n]+[.!?]?/g) || [t]).map(s => s.trim()).filter(Boolean);
  if (sentences.length <= 3) return sentences;

  // distribute sentences roughly evenly into 3 groups
  const groups = [[], [], []];
  for (let i = 0; i < sentences.length; i++) {
    groups[i % 3].push(sentences[i]);
  }
  const grouped = groups.map(g => g.join(' ').trim()).filter(Boolean);
  return grouped.slice(0, 3);
}

function extractTextCandidates(payload) {
  const texts = [];
  if (!payload) return texts;

  // candidates array
  if (Array.isArray(payload.candidates)) {
    for (const c of payload.candidates) {
      // content.parts text
      if (c?.content) {
        if (Array.isArray(c.content)) {
          for (const item of c.content) {
            if (item?.parts && Array.isArray(item.parts)) {
              const p = item.parts.map(p => p?.text).filter(Boolean).join('\n\n');
              if (p) texts.push(p);
            } else if (typeof item === 'string') {
              texts.push(item);
            }
          }
        } else if (Array.isArray(c.content?.parts)) {
          const p = c.content.parts.map(p => p?.text).filter(Boolean).join('\n\n');
          if (p) texts.push(p);
        }
      }

      if (typeof c.output === 'string') texts.push(c.output);
      if (typeof c.message === 'string') texts.push(c.message);
    }
  }

  // older shapes
  if (Array.isArray(payload.data?.candidates)) {
    for (const c of payload.data.candidates) {
      if (c.output) texts.push(c.output);
    }
  }

  // direct fields
  for (const key of ['output','text','message','reply']) {
    if (typeof payload[key] === 'string') texts.push(payload[key]);
  }

  // If any items are JSON-encoded strings, try parse and collect
  const extra = [];
  for (const t of texts.slice()) {
    if (typeof t === 'string' && t.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(t);
        extra.push(...collectTextFromPayload(parsed));
      } catch (e) {
        // ignore
      }
    }
  }
  texts.push(...extra);

  return texts.map(s => String(s).trim()).filter(Boolean);
}

function generateThreeSuggestionsFromPayload(payload) {
  const candidates = extractTextCandidates(payload || {});
  const seen = new Set();
  const out = [];

  for (const ctext of candidates) {
    const parts = splitIntoSuggestions(ctext);
    for (const p of parts) {
      const clean = normalizeSuggestionText(p);
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        out.push(clean);
        if (out.length >= 3) return out.slice(0,3);
      }
    }
  }

  // as a last resort, try collecting any text fields
  const fallback = collectTextFromPayload(payload || {});
  for (const f of fallback) {
    const parts = splitIntoSuggestions(f);
    for (const p of parts) {
      const clean = normalizeSuggestionText(p);
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        out.push(clean);
        if (out.length >= 3) return out.slice(0,3);
      }
    }
  }

  return out.slice(0,3);
}

router.post('/description-suggestions', async (req, res) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return res.status(503).json({ error: 'Gemini API key not configured on the server' });

  const violationType = String(req.body?.violationType || '').trim();
  const location = String(req.body?.location || '').trim();
  const details = String(req.body?.details || '').trim();

  const prompt = [
    'Generate exactly 3 short environmental incident report descriptions for a DENR citizen reporting portal.',
    'Each description should be one short sentence (no more than 25 words), plain language, factual, and suitable for direct submission.',
    'Do NOT include any dates, times, place names, barangay names, addresses, or vehicle plate numbers. Do NOT include greetings, numbering, or extra commentary.',
    'Use short simple words only. Keep tone formal and neutral.',
    violationType ? `Violation type: ${violationType}` : null,
    location ? `Location: ${location}` : null,
    details ? `Citizen details: ${details}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  // call Google Generative Language (Gemini) REST API (gemini-flash)
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return res.status(response.status).json({ error: payload?.error || 'Gemini API request failed', details: payload });
    }

    // Prefer to produce 3 human-readable suggestions
    let suggestions = generateThreeSuggestionsFromPayload(payload || {});

    // Post-process suggestions: strip dates/locations and shorten
    function postProcessSuggestion(s) {
      if (!s || typeof s !== 'string') return '';
      let out = s;
      // remove common date/time patterns
      out = out.replace(/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\b[^.\n]*/gi, '');
      out = out.replace(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/g, '');
      out = out.replace(/\b\d{1,2}:\d{2}(?:\s?[AP]M)?\b/gi, '');
      // remove 'Barangay' and following words up to comma or end
      out = out.replace(/\bBarangay\b[^,\n\.]*/gi, '');
      // remove phrases like 'located at ...' or 'in [place]'
      out = out.replace(/located at[^.\n]*/gi, '');
      out = out.replace(/\bin [A-Z][a-zA-Z0-9_\- ]{1,60}/gi, '');
      // remove plate numbers patterns (simple heuristic)
      out = out.replace(/\b[A-Z]{1,3}-?\d{1,4}\b/g, '');
      // collapse whitespace
      out = out.replace(/\s+/g, ' ').trim();
      // take first sentence
      const m = out.match(/[^.?!]+[.?!]?/);
      out = m ? m[0].trim() : out;
      // limit to 25 words
      const words = out.split(/\s+/).filter(Boolean);
      if (words.length > 25) out = words.slice(0, 25).join(' ') + '.';
      // ensure ends with period
      if (out && !/[.?!]$/.test(out)) out = out + '.';
      return out;
    }

    suggestions = suggestions.map(postProcessSuggestion).filter(Boolean).slice(0, 3);

    if (!suggestions || suggestions.length === 0) {
      return res.status(502).json({ error: 'Gemini returned no usable suggestions', details: payload });
    }

    return res.json({ ok: true, suggestions, provider: 'gemini' });
  } catch (error) {
    return res.status(502).json({ error: 'Failed to reach Gemini service', details: error && error.message ? error.message : String(error) });
  }
});

module.exports = router;
