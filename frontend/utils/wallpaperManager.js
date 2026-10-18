// src/utils/wallpaperManager.js
// src/utils/wallpaperManager.js

const PIXABAY_API_KEY =
  process.env.NEXT_PUBLIC_PIXABAY_API_KEY ||
  process.env.PIXABAY_API_KEY;

// v4 force-clears old cached low-res images
const CACHE_KEY = 'zenith_wallpaper_cache_v4';
const USED_KEY = 'zenith_wallpaper_used_ids_v4';
const MIN_CACHE_THRESHOLD = 5;

// High-quality, aesthetic landscape queries
const SEARCH_TOPICS = [
  'dolomites alps landscape mountain lake',
  'scenic japanese garden autumn sakura 4k',
  'misty pine forest foggy mountain morning',
  'tropical turquoise ocean sunset aerial coastline',
  'norwegian fjord aurora borealis reflection',
  'dramatic golden hour desert sand dunes',
  'lush rainforest waterfall paradise landscape',
  'cinematic starry night sky milky way mountains',
  'iceland glacier volcanic black sand beach',
  'swiss alps wildflower valley cottage scenic',
  'breathtaking canyon river overlook sunset'
];

const FALLBACK_WALLPAPERS = [
  {
    id: 'fb-1',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2560&q=80',
    photographer: 'Bailey Zindel',
    title: 'Yosemite Mist Valley',
  },
  {
    id: 'fb-2',
    url: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=2560&q=80',
    photographer: 'Luca Bravo',
    title: 'Bled Alpine Lake',
  },
  {
    id: 'fb-3',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2560&q=80',
    photographer: 'Kalpesh Patel',
    title: 'Majestic Peaks',
  }
];

export async function getNextWallpaper() {
  if (typeof window === 'undefined') return FALLBACK_WALLPAPERS[0];

  try {
    let cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
    let usedIds = JSON.parse(localStorage.getItem(USED_KEY) || '[]');

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
  const page = Math.floor(Math.random() * 4) + 1;

  const url = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(
    topic
  )}&image_type=photo&orientation=horizontal&safesearch=true&min_width=1920&min_height=1080&per_page=30&page=${page}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return;

    const data = await res.json();
    if (data?.hits && Array.isArray(data.hits) && data.hits.length > 0) {
      const formatted = data.hits.map((hit) => ({
        id: `pixabay-${hit.id}`,
        // Use largeImageURL when available for crisp 1080p/4k displays
        url: hit.largeImageURL || hit.webformatURL,
        photographer: hit.user || 'Photographer',
        title: hit.tags || 'Landscape',
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