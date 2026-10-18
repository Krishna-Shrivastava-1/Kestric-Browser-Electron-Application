// src/main/searchService.js
const { WebContentsView } = require('electron');

async function executeSearch(query, offset = 0) {
  const q = String(query ?? '').trim();
  const currentOffset = Number(offset) || 0;

  if (!q) {
    return { success: true, results: [], hasMore: false, nextOffset: 0 };
  }

  const workerView = new WebContentsView({
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      javascript: true,
    },
  });

  try {
    // DDG Lite expects 's' parameter for pagination (0, 30, 60, etc.)
    const searchUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}&s=${currentOffset}`;

    await workerView.webContents.loadURL(searchUrl, {
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    });

    const extraction = await workerView.webContents.executeJavaScript(`
      (() => {
        const items = [];
        const resultLinks = document.querySelectorAll('a.result-link');

        resultLinks.forEach((a) => {
          const mainRow = a.closest('tr');
          if (!mainRow) return;

          let snippetText = '';
          const snippetRow = mainRow.nextElementSibling;
          if (snippetRow) {
            const snippetTd = snippetRow.querySelector('.result-snippet');
            if (snippetTd) snippetText = snippetTd.innerText.trim();
          }

          items.push({
            title: a.innerText.trim(),
            rawUrl: a.getAttribute('href') || '',
            snippet: snippetText
          });
        });

        // Search for the Next Page token in forms
        let parsedNextOffset = null;
        let hasNextBtn = false;
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
          const sInput = form.querySelector('input[name="s"]');
          const submitBtn = form.querySelector('input[type="submit"]');
          if (submitBtn && /next/i.test(submitBtn.value || '')) {
            hasNextBtn = true;
          }
          if (sInput && sInput.value) {
            const val = parseInt(sInput.value, 10);
            if (!isNaN(val) && val > 0) {
              parsedNextOffset = val;
              hasNextBtn = true;
            }
          }
        });

        return {
          items,
          hasNext: hasNextBtn,
          nextOffset: parsedNextOffset
        };
      })()
    `);

    const results = [];
    for (const item of extraction.items) {
      if (!item || !item.title || !item.rawUrl) continue;

      try {
        const parsed = new URL(item.rawUrl, 'https://lite.duckduckgo.com');
        let destination = parsed.href;

        if (parsed.searchParams && parsed.searchParams.has('uddg')) {
          destination = parsed.searchParams.get('uddg');
        }

        if (!destination) continue;

        const target = new URL(destination);
        if (!['http:', 'https:'].includes(target.protocol)) continue;
        if (target.hostname && target.hostname.includes('duckduckgo.com')) continue;

        const faviconUrl = `https://www.google.com/s2/favicons?domain=${target.hostname}&sz=32`;

        results.push({
          title: item.title,
          url: target.href,
          hostname: target.hostname,
          favicon: faviconUrl,
          snippet: item.snippet || 'No description available.',
        });
      } catch {
        continue;
      }
    }

    // Always increment offset so the next click will load page 2, 3, etc.
    const step = results.length > 0 ? results.length : 30;
    const nextOffset = extraction.nextOffset && extraction.nextOffset > currentOffset
      ? extraction.nextOffset
      : currentOffset + step;

    // Force hasMore to true as long as we got any results
    const hasMore = results.length > 0;

    return {
      success: true,
      results,
      hasMore,
      nextOffset,
    };
  } catch (error) {
    console.error('Search failed:', error);
    return { success: false, results: [], hasMore: false, nextOffset: 0, error: 'Search failed.' };
  } finally {
    if (!workerView.webContents.isDestroyed()) {
      workerView.webContents.close();
    }
  }
}

module.exports = { executeSearch };