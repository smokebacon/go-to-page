// ─── Go to Page — code.js ────────────────────────────────────────────────────
// Uses Figma's Parameters API: no UI panel.
// Persists the last 3 visited pages via clientStorage and surfaces them first.

const STORAGE_KEY   = 'recentPageIds';
const MAX_RECENT    = 3;            // how many to show
const MAX_STORED    = MAX_RECENT + 1; // store one extra to cover the current page being filtered out
const DIVIDER     = '__divider__';
const PAGE_DIVIDER_NAME_PATTERN = /^([*\-–— ])\1*$/u;
const PAGE_DIVIDER_LABEL = '═\u00A0═\u00A0═\u00A0═\u00A0═\u00A0═';

// ── Clock icon SVG for last-visited suggestions ───────────────────────────────
const CLOCK_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><style>.icon-stroke{stroke:#1f1f1f}@media (prefers-color-scheme: dark){.icon-stroke{stroke:#ffffff}}</style><circle class="icon-stroke" cx="8" cy="8" r="6.5" stroke-width="1.3"/><path class="icon-stroke" d="M8 4.5V8.2l2.5 1.8" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// ── clientStorage helpers ─────────────────────────────────────────────────────
async function getRecentIds() {
  const stored = await figma.clientStorage.getAsync(STORAGE_KEY);
  return Array.isArray(stored) ? stored.filter(id => typeof id === 'string') : [];
}

async function saveRecentId(pageId) {
  let ids = await getRecentIds();
  ids = ids.filter(id => id !== pageId);
  ids.unshift(pageId);
  ids = ids.slice(0, MAX_STORED);
  await figma.clientStorage.setAsync(STORAGE_KEY, ids);
}

// ── Returns true for pages used as visual separators (no alphanumeric chars) ──
function isSeparatorPage(page) {
  if (typeof page.isPageDivider === 'boolean') {
    return page.isPageDivider;
  }

  return PAGE_DIVIDER_NAME_PATTERN.test(page.name);
}

// ── Fuzzy matching helpers ─────────────────────────────────────────────────────
// Restricted Damerau-Levenshtein distance (insert/delete/substitute/adjacent
// transpose), used to tolerate typos. Transpositions ("cvoer" ~ "cover") are
// the most common typing mistake, so counting them as 1 edit (not 2, as plain
// Levenshtein would) meaningfully improves match quality.
function editDistance(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const d = [];
  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

function tokenize(s) {
  return s.split(/[\s\-_/]+/).filter(Boolean);
}

// Tight edit-distance budget scaled to token length — loose enough to catch a
// real typo, tight enough that unrelated short words don't false-positive.
function typoThreshold(len) {
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  if (len <= 8) return 2;
  return 3;
}

// Score how well a single name-word matches a single query token.
function wordScore(word, token) {
  if (word === token) return 100;
  if (word.startsWith(token)) return 90 - (word.length - token.length);
  if (word.includes(token)) return 70 - word.indexOf(token);
  const dist = editDistance(word, token);
  if (dist <= typoThreshold(token.length)) {
    return 50 - dist * 15 - Math.abs(word.length - token.length);
  }
  return -1;
}

// Ranks how well a page name matches a (lowercased, trimmed) query.
// Higher is better; -1 means no match. Exact/prefix/substring matches always
// outrank fuzzy/typo matches, so accuracy for correct queries is unaffected.
function scorePageMatch(name, query) {
  const n = name.toLowerCase();
  const q = query;
  if (!q) return 0;

  if (n === q) return 1000;
  if (n.startsWith(q)) return 900 - Math.min(n.length - q.length, 80);

  const idx = n.indexOf(q);
  if (idx !== -1) {
    const boundary = idx === 0 || /[\s\-_/]/.test(n[idx - 1]);
    return (boundary ? 800 : 700) - idx;
  }

  const nameWords = tokenize(n);
  const queryTokens = tokenize(q);

  // Multi-word query: every token must fuzzily match some word in the name.
  if (queryTokens.length > 1) {
    let total = 0;
    let allMatched = true;
    for (const token of queryTokens) {
      let best = -1;
      for (const word of nameWords) best = Math.max(best, wordScore(word, token));
      if (best === -1) { allMatched = false; break; }
      total += best;
    }
    if (allMatched) return 200 + total;
  }

  // Single-token query: fuzzy match against each word in the name.
  let best = -1;
  for (const word of nameWords) best = Math.max(best, wordScore(word, q));
  if (best > -1) return 150 + best;

  // Typo across word boundaries, e.g. "hompage" ~ "Home Page".
  const nameCompact = nameWords.join('');
  const distCompact = editDistance(nameCompact, q);
  if (distCompact <= typoThreshold(q.length)) {
    return 100 - distCompact * 20;
  }

  // Fallback: characters of the query appear in order, gaps allowed (fzf-style).
  let qi = 0, gapPenalty = 0, lastIdx = -1;
  for (let i = 0; i < n.length && qi < q.length; i++) {
    if (n[i] === q[qi]) {
      if (lastIdx !== -1) gapPenalty += i - lastIdx - 1;
      lastIdx = i;
      qi++;
    }
  }
  if (qi === q.length) return Math.max(1, 50 - gapPenalty);

  return -1;
}

function formatPageName(name) {
  const pageName = typeof name === 'string' ? name : '';
  return pageName
    .replace(/^ +| +$/g, spaces => '\u00A0'.repeat(spaces.length))
    .replace(/ {2,}/g, spaces => '\u00A0'.repeat(spaces.length));
}

function buildPageSuggestion(page, icon) {
  const separator = isSeparatorPage(page);
  return {
    name: separator ? PAGE_DIVIDER_LABEL : formatPageName(page.name),
    data: separator ? DIVIDER : page.id,
    icon,
  };
}

// ── Track current page when plugin loads ──────────────────────────────────────
// This runs every time you open the plugin, capturing the page you're on
(async () => {
  const currentPageId = figma.currentPage.id;
  if (!isSeparatorPage(figma.currentPage)) {
    const recentIds = await getRecentIds();
    // Only save if this page isn't already the most recent
    if (recentIds[0] !== currentPageId) {
      await saveRecentId(currentPageId);
    }
  }
})();

// ── Typeahead: called on every keystroke in the command bar ───────────────────
figma.parameters.on('input', async ({ key, query, result }) => {
  if (key !== 'page') return;

  try {
    const q        = query.trim().toLowerCase();
    const allPages = figma.root.children;

    // Fetch recent IDs — exclude stale, separator, and current page, then cap at MAX_RECENT
    const recentIds = (await getRecentIds())
      .filter(id => allPages.some(p => p.id === id && !isSeparatorPage(p)) && id !== figma.currentPage.id)
      .slice(0, MAX_RECENT);

    if (q === '') {
      // ── No query: last visited first, then ALL pages in original order ──────────
      const recentPages = recentIds
        .map(id => allPages.find(p => p.id === id))
        .filter(Boolean);

      const suggestions = recentPages.map(p => ({
        name: formatPageName(p.name),
        data: p.id,
        icon: CLOCK_ICON,
      }));

      if (recentPages.length > 0) {
        suggestions.push({ name: PAGE_DIVIDER_LABEL, data: DIVIDER });
      }

      // Full list — all pages in document order, including recent pages in their original place
      allPages.forEach(p => {
        suggestions.push(buildPageSuggestion(p));
      });

      result.setSuggestions(suggestions);
      return;
    }

    // ── Query: last-visited matches first, then ALL matches ranked by relevance ─
    const scored = allPages
      .map((p, index) => ({ page: p, index, score: isSeparatorPage(p) ? -1 : scorePageMatch(p.name, q) }))
      .filter(s => s.score > -1);

    if (scored.length === 0) {
      result.setSuggestions([{ name: 'No pages match "' + query + '"' }]);
      return;
    }

    scored.sort((a, b) => b.score - a.score || a.index - b.index);
    const matches = scored.map(s => s.page);

    const recentMatches = matches.filter(p => recentIds.includes(p.id)).slice(0, 1);

    const suggestions = recentMatches.map(p => ({
      name: formatPageName(p.name),
      data: p.id,
      icon: CLOCK_ICON,
    }));

    // Full filtered list — all matches in document order, excluding the pinned recent match
    const pinnedRecentIds = new Set(recentMatches.map(p => p.id));
    matches.forEach(p => {
      if (pinnedRecentIds.has(p.id)) return;
      suggestions.push(buildPageSuggestion(p));
    });

    result.setSuggestions(suggestions);
  } catch (error) {
    console.error('Failed to build page suggestions', error);
    result.setSuggestions([{ name: 'Unable to load page suggestions' }]);
  }
});

// ── Run: called when the user confirms a selection ────────────────────────────
figma.on('run', async ({ parameters }) => {
  const pageId = parameters && parameters.page;

  if (pageId && pageId !== DIVIDER) {
    const page = figma.root.children.find(p => p.id === pageId);
    if (page) {
      await saveRecentId(page.id);
      await figma.setCurrentPageAsync(page);
    }
  }

  figma.closePlugin();
});
