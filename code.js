// ─── Go to Page — code.js ────────────────────────────────────────────────────
// Uses Figma's Parameters API: no UI panel.
// Persists the last 3 visited pages via clientStorage and surfaces them first.

const STORAGE_KEY = 'recentPageIds';
const MAX_RECENT  = 3;

// ── clientStorage helpers ─────────────────────────────────────────────────────
async function getRecentIds() {
  const stored = await figma.clientStorage.getAsync(STORAGE_KEY);
  return Array.isArray(stored) ? stored : [];
}

async function saveRecentId(pageId) {
  let ids = await getRecentIds();
  ids = ids.filter(id => id !== pageId); // remove if already present
  ids.unshift(pageId);                   // push to front
  ids = ids.slice(0, MAX_RECENT);        // keep only the last N
  await figma.clientStorage.setAsync(STORAGE_KEY, ids);
}

// ── Typeahead: called on every keystroke in the command bar ───────────────────
figma.parameters.on('input', async ({ key, query, result }) => {
  if (key !== 'page') return;

  const q        = query.trim().toLowerCase();
  const allPages = figma.root.children;

  // Fetch recent IDs, drop stale ones, and exclude the current page
  const recentIds = (await getRecentIds()).filter(id =>
    allPages.some(p => p.id === id) && id !== figma.currentPage.id
  );

  if (q === '') {
    // ── No query: recent pages first (with separator), then the rest ──────────
    const recentSet   = new Set(recentIds);
    const recentPages = recentIds
      .map(id => allPages.find(p => p.id === id))
      .filter(Boolean);
    const otherPages  = allPages.filter(p => !recentSet.has(p.id));

    const suggestions = [
      ...recentPages.map(p => ({ name: p.name + '  ·  recent', data: p.id })),
    ];

    if (recentPages.length > 0 && otherPages.length > 0) {
      suggestions.push({ name: '──────────────────────', data: '__divider__' });
    }

    otherPages.forEach(p => {
      suggestions.push({
        name: p.id === figma.currentPage.id ? p.name + '  ·  current' : p.name,
        data: p.id,
      });
    });

    result.setSuggestions(suggestions);

  } else {
    // ── Query: filter all pages, boost recent matches above the separator ─────
    const matches = allPages.filter(p => p.name.toLowerCase().includes(q));

    if (matches.length === 0) {
      result.setSuggestions([{ name: 'No pages match "' + query + '"' }]);
      return;
    }

    const recentMatches = matches.filter(p => recentIds.includes(p.id));
    const otherMatches  = matches.filter(p => !recentIds.includes(p.id));

    const suggestions = [
      ...recentMatches.map(p => ({ name: p.name + '  ·  recent', data: p.id })),
    ];

    if (recentMatches.length > 0 && otherMatches.length > 0) {
      suggestions.push({ name: '──────────────────────', data: '__divider__' });
    }

    otherMatches.forEach(p => {
      suggestions.push({
        name: p.id === figma.currentPage.id ? p.name + '  ·  current' : p.name,
        data: p.id,
      });
    });

    result.setSuggestions(suggestions);
  }
});

// ── Run: called when the user confirms a selection ────────────────────────────
figma.on('run', async ({ parameters }) => {
  const pageId = parameters && parameters.page;

  if (pageId && pageId !== '__divider__') {
    const page = figma.root.children.find(p => p.id === pageId);
    if (page) {
      await saveRecentId(page.id);
      await figma.setCurrentPageAsync(page);
    }
  }

  figma.closePlugin();
});
