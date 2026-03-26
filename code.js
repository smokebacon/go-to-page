// ─── Page Jumper — code.js ───────────────────────────────────────────────────
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

// ── Label helpers ─────────────────────────────────────────────────────────────
function label(page, recentIds) {
  if (page.id === figma.currentPage.id) return page.name + '  ·  current';
  if (recentIds.includes(page.id))      return page.name + '  ·  recent';
  return page.name;
}

// ── Typeahead: called on every keystroke in the command bar ───────────────────
figma.parameters.on('input', async ({ key, query, result }) => {
  if (key !== 'page') return;

  const q        = query.trim().toLowerCase();
  const allPages = figma.root.children;

  // Fetch recent IDs and drop any that no longer exist in the document
  const recentIds = (await getRecentIds()).filter(id =>
    allPages.some(p => p.id === id)
  );

  if (q === '') {
    // ── No query: recent pages first, then the rest ───────────────────────────
    const recentSet = new Set(recentIds);

    // Preserve recency order for the top section
    const recentPages = recentIds
      .map(id => allPages.find(p => p.id === id))
      .filter(Boolean);

    const otherPages = allPages.filter(p => !recentSet.has(p.id));

    result.setSuggestions([
      ...recentPages.map(p => ({ name: label(p, recentIds), data: p.id })),
      ...otherPages.map(p  => ({ name: label(p, recentIds), data: p.id })),
    ]);
  } else {
    // ── Query: filter all pages, boost recent matches to the top ─────────────
    const matches = allPages.filter(p =>
      p.name.toLowerCase().includes(q)
    );

    if (matches.length === 0) {
      result.setSuggestions([{ name: `No pages match "${query}"` }]);
      return;
    }

    const recentMatches = matches.filter(p => recentIds.includes(p.id));
    const otherMatches  = matches.filter(p => !recentIds.includes(p.id));

    result.setSuggestions([
      ...recentMatches.map(p => ({ name: label(p, recentIds), data: p.id })),
      ...otherMatches.map(p  => ({ name: label(p, recentIds), data: p.id })),
    ]);
  }
});

// ── Run: called when the user confirms a selection ────────────────────────────
figma.on('run', async ({ parameters }) => {
  const pageId = parameters?.page;

  if (pageId) {
    const page = figma.root.children.find(p => p.id === pageId);
    if (page) {
      await saveRecentId(page.id);          // persist before navigating
      await figma.setCurrentPageAsync(page);
    }
  }

  figma.closePlugin();
});
