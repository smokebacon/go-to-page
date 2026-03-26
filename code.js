// ─── Go to Page — code.js ────────────────────────────────────────────────────
// Uses Figma's Parameters API: no UI panel.
// Persists the last 3 visited pages via clientStorage and surfaces them first.

const STORAGE_KEY   = 'recentPageIds';
const MAX_RECENT    = 3;            // how many to show
const MAX_STORED    = MAX_RECENT + 1; // store one extra to cover the current page being filtered out
const DIVIDER     = '__divider__';
// Used for an "invisible" divider row: must be non-empty so the UI keeps a row height.
const BLANK_DIVIDER_LABEL = '\u00A0'; // NBSP (renders as blank in most fonts)

// ── Clock icon SVG for last-visited suggestions ───────────────────────────────
const CLOCK_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 4.5V8.2l2.5 1.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SEPARATOR_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4.5 8H11.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';

// ── clientStorage helpers ─────────────────────────────────────────────────────
async function getRecentIds() {
  const stored = await figma.clientStorage.getAsync(STORAGE_KEY);
  return Array.isArray(stored) ? stored : [];
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
  return !/[a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF\u4E00-\u9FFF]/.test(page.name);
}

function buildPageSuggestion(page, icon) {
  const separator = isSeparatorPage(page);
  return {
    name: separator ? BLANK_DIVIDER_LABEL : page.name,
    data: separator ? DIVIDER : page.id,
    icon: icon || (separator ? SEPARATOR_ICON : undefined),
  };
}

// ── Typeahead: called on every keystroke in the command bar ───────────────────
figma.parameters.on('input', async ({ key, query, result }) => {
  if (key !== 'page') return;

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
      name: p.name,
      data: p.id,
      icon: CLOCK_ICON,
    }));

    if (recentPages.length > 0) {
      suggestions.push({ name: BLANK_DIVIDER_LABEL, data: DIVIDER });
    }

    // Full list — all pages in document order, excluding recent pages to avoid duplicates
    const recentSet = new Set(recentIds);
    allPages.forEach(p => {
      if (recentSet.has(p.id)) return;
      suggestions.push(buildPageSuggestion(p));
    });

    result.setSuggestions(suggestions);

  } else {
    // ── Query: last-visited matches first, then ALL matches in original order ───
    const matches = allPages.filter(p => p.name.toLowerCase().includes(q));

    if (matches.length === 0) {
      result.setSuggestions([{ name: 'No pages match "' + query + '"' }]);
      return;
    }

    const recentMatches = matches.filter(p => recentIds.includes(p.id));

    const suggestions = recentMatches.map(p => ({
      name: p.name,
      data: p.id,
      icon: CLOCK_ICON,
    }));

    if (recentMatches.length > 0) {
      suggestions.push({ name: BLANK_DIVIDER_LABEL, data: DIVIDER });
    }

    // Full filtered list — all matches, excluding recentMatches to avoid duplicates
    const recentSet = new Set(recentIds);
    matches.forEach(p => {
      if (recentSet.has(p.id)) return;
      suggestions.push(buildPageSuggestion(p));
    });

    result.setSuggestions(suggestions);
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
