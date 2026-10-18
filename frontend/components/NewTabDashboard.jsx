// src/components/NewTabDashboard.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { Search, Globe, Compass } from 'lucide-react';

const FALLBACK_URL =
  'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80';

export default function NewTabDashboard({ wallpaper, onNavigate, onSearch }) {
  const [time, setTime] = useState('');
  const [query, setQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  // Extract raw URL string safely
  const initialUrl =
    (typeof wallpaper === 'object' && wallpaper !== null ? wallpaper.url : wallpaper) ||
    FALLBACK_URL;

  const [currentUrl, setCurrentUrl] = useState(initialUrl);

  const photographerName =
    typeof wallpaper === 'object' && wallpaper !== null
      ? wallpaper.photographer
      : 'Cosmic Horizons';

  // Keep state updated if tab wallpaper changes
  useEffect(() => {
    if (wallpaper) {
      const nextUrl = typeof wallpaper === 'object' ? wallpaper.url : wallpaper;
      if (nextUrl) {
        setCurrentUrl(nextUrl);
        setIsLoaded(false);
      }
    }
  }, [wallpaper]);

  // Clock timer
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch(query.trim());
  };

  const quickLinks = [
    { title: 'GitHub', url: 'https://github.com' },
    { title: 'YouTube', url: 'https://youtube.com' },
    { title: 'Reddit', url: 'https://reddit.com' },
    { title: 'DuckDuckGo', url: 'https://duckduckgo.com' },
  ];

  return (
    <div className="relative flex-1 flex h-full w-full flex-col justify-between overflow-hidden select-none text-white bg-[#0a0a0f]">
      {/* 1. Deep Space Base Gradient: Guarantees vibrant visuals even before image downloads */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1e1b4b] via-[#0b0f19] to-[#040406]" />

      {/* 2. Wallpaper <img> with no-referrer to bypass CDN 403 Forbidden blocks */}
   <img
  key={currentUrl}
  src={currentUrl}
  alt="Wallpaper"
  referrerPolicy="no-referrer"
  onLoad={() => setIsLoaded(true)}
  onError={(e) => {
    console.error('Failed to load image at:', currentUrl);
    if (currentUrl !== FALLBACK_URL) {
      setCurrentUrl(FALLBACK_URL);
    }
  }}
  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-in-out ${
    isLoaded ? 'opacity-100' : 'opacity-0'
  }`}
/>

      {/* 3. Soft Dark Vignette Overlay for Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40 pointer-events-none" />

      {/* Top bar */}
      <div className="relative z-10 flex w-full justify-end p-6">
        <div className="flex items-center gap-2 text-xs text-white/70 backdrop-blur-md bg-black/30 px-3.5 py-1.5 rounded-full border border-white/10 shadow-lg">
          <Compass size={13} className="text-blue-400" />
          <span>Kestric Private Mode</span>
        </div>
      </div>

      {/* Center Section: Clock & Center Search */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 -mt-10">
        <h1 className="text-7xl font-extralight tracking-tight text-white/95 drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
          {time}
        </h1>

        {/* Center Search Input */}
        <form
          onSubmit={handleSubmit}
          className="relative mt-7 w-full max-w-[560px]"
        >
          <div className="relative flex items-center rounded-2xl border border-white/20 bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all focus-within:border-blue-500/50 focus-within:bg-black/60">
            <Search size={18} className="ml-4 text-white/50 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or enter web address"
              className="w-full bg-transparent px-3 py-3.5 text-sm text-white placeholder-white/40 focus:outline-none"
            />
          </div>
        </form>

        {/* Quick Shortcuts */}
        <div className="mt-8 flex items-center gap-4">
          {quickLinks.map((item) => (
            <button
              key={item.url}
              type="button"
              onClick={() => onNavigate(item.url)}
              className="group flex flex-col items-center gap-2 rounded-xl p-2.5 transition-transform hover:scale-105"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md transition-all group-hover:bg-white/20 group-hover:border-white/25 shadow-lg">
                <Globe size={18} className="text-white/80" />
              </div>
              <span className="text-xs font-medium text-white/80 group-hover:text-white">
                {item.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Bar: Photo Credit */}
      <div className="relative z-10 flex items-center justify-between p-6 text-xs text-white/50">
        <div>
          {photographerName && (
            <p className="backdrop-blur-md bg-black/30 px-3 py-1 rounded-full border border-white/10 shadow">
              Photo by <span className="text-white/80 font-medium">{photographerName}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}