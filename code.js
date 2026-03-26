// ─── Go to Page — code.js ────────────────────────────────────────────────────
// Uses Figma's Parameters API: no UI panel.
// Persists the last 3 visited pages via clientStorage and surfaces them first.

const STORAGE_KEY = 'recentPageIds';
const MAX_RECENT  = 3;
const DIVIDER     = '__divider__';

// ── Clock icon SVG for last-visited suggestions ───────────────────────────────
const CLOCK_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 4.5V8.2l2.5 1.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// ── clientStorage helpers ─────────────────────────────────────────────────────
async function getRecentIds() {
  const stored = await figma.clientStorage.getAsync(STORAGE_KEY);
  return Array.isArray(stored) ? stored : [];
}

async function saveRecentId(pageId) {
  let ids = await getRecentIds();
  ids = ids.filter(id => id !== pageId);
  ids.unshift(pageId);
  ids = ids.slice(0, MAX_RECENT);
  await figma.clientStorage.setAsync(STORAGE_KEY, ids);
}

// ── Returns true for pages used as visual separators (no alphanumeric chars) ──
function isSeparatorPage(page) {
  return !/[a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF\u4E00-\u9FFF]/.test(page.name);
}

// ── Typeahead: called on every keystroke in the command bar ───────────────────
figma.parameters.on('input', async ({ key, query, result }) => {
  if (key !== 'page') return;

  const q        = query.trim().toLowerCase();
  const allPages = figma.root.children.filter(p => !isSeparatorPage(p));

  // Fetch recent IDs, drop stale and separator pages, exclude current page
  const recentIds = (await getRecentIds()).filter(id =>
    allPages.some(p => p.id === id) && id !== figma.currentPage.id
  );

  if (q === '') {
    // ── No query: last visited first (with divider), then the rest ─────────────
    const recentSet   = new Set(recentIds);
    const recentPages = recentIds
      .map(id => allPages.find(p => p.id === id))
      .filter(Boolean);
    const otherPages  = allPages.filter(p => !recentSet.has(p.id));

    const suggestions = recentPages.map(p => ({
      name: p.name + '  ·  last visited',
      data: p.id,
      icon: CLOCK_ICON,
    }));

    if (recentPages.length > 0 && otherPages.length > 0) {
      suggestions.push({ name: '━━━━━━━━━━━━━━━━━━━━━━━━', data: DIVIDER });
    }

    otherPages.forEach(p => suggestions.push({ name: p.name, data: p.id }));

    result.setSuggestions(suggestions);

  } else {
    // ── Query: filter, boost last-visited matches above the divider ────────────
    const matches = allPages.filter(p => p.name.toLowerCase().includes(q));

    if (matches.length === 0) {
      result.setSuggestions([{ name: 'No pages match "' + query + '"' }]);
      return;
    }

    const recentMatches = matches.filter(p => recentIds.includes(p.id));
    const otherMatches  = matches.filter(p => !recentIds.includes(p.id));

    const suggestions = recentMatches.map(p => ({
      name: p.name + '  ·  last visited',
      data: p.id,
      icon: CLOCK_ICON,
    }));

    if (recentMatches.length > 0 && otherMatches.length > 0) {
      suggestions.push({ name: '━━━━━━━━━━━━━━━━━━━━━━━━', data: DIVIDER });
    }

    otherMatches.forEach(p => suggestions.push({ name: p.name, data: p.id }));

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
