// src/utils/wallpaperManager.js

const PIXABAY_API_KEY =
  process.env.NEXT_PUBLIC_PIXABAY_API_KEY ||
  process.env.PIXABAY_API_KEY

// Changed version key to "v3" to force-clear broken URLs stored in localStorage
const CACHE_KEY = 'zenith_wallpaper_cache_v3';
const USED_KEY = 'zenith_wallpaper_used_ids_v3';
const MIN_CACHE_THRESHOLD = 5;

const SEARCH_TOPICS = [
  'space nebula galaxy',
  'cyberpunk futuristic city',
  'aurora borealis night sky',
  'deep space cosmos stars',
  'surreal fantasy mountain',
];

const FALLBACK_WALLPAPERS = [
  {
    id: 'fb-1',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80',
    photographer: 'Lucas Pezeta',
    title: 'Cosmic Horizons',
  },
  {
    id: 'fb-2',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80',
    photographer: 'Sandro Katalina',
    title: 'Neon Odyssey',
  },
];

export async function getNextWallpaper() {
  if (typeof window === 'undefined') return FALLBACK_WALLPAPERS[0];

  try {
    let cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
    let usedIds = JSON.parse(localStorage.getItem(USED_KEY) || '[]');

    // If cache is empty on startup, await fetch
    if (cache.length === 0) {
      await refillCache();
      cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
    } else if (cache.length <= MIN_CACHE_THRESHOLD) {
      refillCache().catch(() => {});
    }

    let available = cache.filter((item) => !usedIds.includes(item.id));
    if (available.length === 0 && cache.length > 0) {
      usedIds = [];
      available = cache;
    }

    if (available.length > 0) {
      const selected = available[Math.floor(Math.random() * available.length)];
      usedIds.push(selected.id);
      if (usedIds.length > 100) usedIds.shift();
      localStorage.setItem(USED_KEY, JSON.stringify(usedIds));
      return selected;
    }
  } catch (e) {
    console.error('Failed to load cached wallpaper:', e);
  }

  return FALLBACK_WALLPAPERS[Math.floor(Math.random() * FALLBACK_WALLPAPERS.length)];
}

async function refillCache() {
  if (!PIXABAY_API_KEY) return;

  const topic = SEARCH_TOPICS[Math.floor(Math.random() * SEARCH_TOPICS.length)];
  const page = Math.floor(Math.random() * 3) + 1;

  // webformatURL is standard and allowed by Pixabay's free tier
  const url = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(
    topic
  )}&image_type=photo&orientation=horizontal&safesearch=true&per_page=30&page=${page}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return;

    const data = await res.json();
    if (data?.hits && Array.isArray(data.hits) && data.hits.length > 0) {
      const formatted = data.hits.map((hit) => ({
        id: `pixabay-${hit.id}`,
        // Pixabay's `webformatURL` is the only URL guaranteed not to return 403 Forbidden
        url: hit.webformatURL,
        photographer: hit.user || 'Creator',
        title: hit.tags || 'Wallpaper',
      }));

      const existing = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
      const existingIds = new Set(existing.map((item) => item.id));
      const merged = [...existing, ...formatted.filter((f) => !existingIds.has(f.id))];

      localStorage.setItem(CACHE_KEY, JSON.stringify(merged.slice(-100)));
    }
  } catch (err) {
    console.warn('Pixabay cache refill skipped:', err);
  }
}