
// src/components/NavigationBar.jsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import SecurityBadge from './SecurityBadge';
import AdShieldButton from './AdShieldButton';
import { Search, History, Globe, ArrowUpLeft, X } from 'lucide-react';
import DownloadsPopover from './DownloadsPopover';

const SEARCH_HISTORY_KEY = 'kestric_omnibox_history';
const MAX_TOTAL_SUGGESTIONS = 8;

export default function NavigationBar({
  urlInput = '',
  setUrlInput,
  onNavigate,
  activeTab,
  onBack,
  onForward,
  onReload,
  inputRef,
}) {
  const [isInstalling, setIsInstalling] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Remembers what the user actually typed before arrow navigation
  const originalTypedQueryRef = useRef(urlInput);
  const isNavigatingWithArrowsRef = useRef(false);

  const containerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Close dropdown when active tab changes (e.g. creating/switching tabs)
  useEffect(() => {
    setIsOpen(false);
    setSelectedIndex(-1);
  }, [activeTab?.id]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSelectedIndex(-1);
        isNavigatingWithArrowsRef.current = false;
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch search history + live suggestions when input changes
  useEffect(() => {
    if (isNavigatingWithArrowsRef.current) {
      isNavigatingWithArrowsRef.current = false;
      return;
    }

    originalTypedQueryRef.current = urlInput;
    const query = (urlInput || '').trim();

    // If overlay is not open, do not load or show suggestions
    if (!isOpen) {
      setSuggestions([]);
      return;
    }

    // 1. Load History from localStorage
    let storedHistory = [];
    try {
      storedHistory = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
    } catch (e) {}

    // When query is empty: show up to 8 recent searches (Chrome behavior)
    if (!query) {
      const recent = storedHistory
        .slice(0, MAX_TOTAL_SUGGESTIONS)
        .map((item) => ({ ...item, type: 'history' }));
      setSuggestions(recent);
      return;
    }

    // Filter matching history
    const matchedHistory = storedHistory
      .filter((item) => item.text.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 4)
      .map((item) => ({ ...item, type: 'history' }));

    // 2. Fetch live suggestions from DuckDuckGo
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`
        );
        const data = await res.json();

        const isUrl =
          query.includes('.') && !query.includes(' ') && !query.startsWith('http');
        const urlItem = isUrl ? [{ text: `https://${query}`, type: 'url' }] : [];

        const remainingQuota = MAX_TOTAL_SUGGESTIONS - (urlItem.length + matchedHistory.length);

        const liveHits = (data[1] || [])
          .filter((s) => !matchedHistory.some((h) => h.text.toLowerCase() === s.toLowerCase()))
          .slice(0, Math.max(0, remainingQuota))
          .map((s) => ({ text: s, type: 'suggestion' }));

        const combined = [...urlItem, ...matchedHistory, ...liveHits].slice(0, MAX_TOTAL_SUGGESTIONS);
        setSuggestions(combined);
      } catch (e) {
        setSuggestions(matchedHistory.slice(0, MAX_TOTAL_SUGGESTIONS));
      }
    }, 150);

    return () => clearTimeout(debounceTimerRef.current);
  }, [urlInput, isOpen]);

  const saveToHistory = (text) => {
    if (!text || text.startsWith('kestric://')) return;
    try {
      let history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
      history = history.filter((h) => h.text.toLowerCase() !== text.toLowerCase());
      history.unshift({ text, timestamp: Date.now() });
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
    } catch (e) {}
  };

  const removeHistoryItem = (e, text) => {
    e.stopPropagation();
    try {
      let history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
      history = history.filter((h) => h.text !== text);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
      setSuggestions((prev) => prev.filter((item) => item.text !== text));
    } catch (e) {}
  };

  const handleExecute = (targetText) => {
    const finalQuery = targetText || urlInput;
    if (!finalQuery.trim()) return;

    saveToHistory(finalQuery.trim());
    setIsOpen(false);
    setSelectedIndex(-1);
    onNavigate(finalQuery.trim());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      handleExecute(suggestions[selectedIndex].text);
    } else {
      handleExecute(urlInput);
    }
  };

  // Keyboard navigation (Chrome Style)
  const handleKeyDown = (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length === 0) return;

      const nextIndex = selectedIndex < suggestions.length - 1 ? selectedIndex + 1 : -1;
      setSelectedIndex(nextIndex);

      isNavigatingWithArrowsRef.current = true;
      if (nextIndex === -1) {
        setUrlInput(originalTypedQueryRef.current);
      } else {
        setUrlInput(suggestions[nextIndex].text);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length === 0) return;

      const prevIndex = selectedIndex > -1 ? selectedIndex - 1 : suggestions.length - 1;
      setSelectedIndex(prevIndex);

      isNavigatingWithArrowsRef.current = true;
      if (prevIndex === -1) {
        setUrlInput(originalTypedQueryRef.current);
      } else {
        setUrlInput(suggestions[prevIndex].text);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSelectedIndex(-1);
      setUrlInput(originalTypedQueryRef.current);
    }
  };

  const handlePiPToggle = async () => {
    if (window.browserAPI?.togglePiP) {
      await window.browserAPI.togglePiP();
    }
  };

  const handleInstallPWA = async () => {
    if (!activeTab?.pwaManifest || !window.browserAPI?.installPwa) return;
    try {
      setIsInstalling(true);
      await window.browserAPI.installPwa(activeTab.pwaManifest);
    } catch (err) {
      console.error('Failed to install PWA:', err);
    } finally {
      setIsInstalling(false);
    }
  };

  const canGoBack = Boolean(
    (activeTab?.viewMode === 'web' && activeTab?.canGoBack) ||
      activeTab?.viewMode === 'web' ||
      activeTab?.viewMode === 'search'
  );

  const canGoForward = Boolean(
    activeTab?.viewMode === 'web' && activeTab?.canGoForward
  );

  const pwaAvailable = Boolean(activeTab?.pwaManifest);

  return (
    <div className="relative flex items-center h-[44px] bg-[#121217] border-b border-zinc-800/80 px-3 space-x-2 select-none z-50">
      {/* 1. History & Navigation Controls */}
      <div className="flex items-center space-x-1">
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white disabled:opacity-25 disabled:hover:bg-transparent transition"
          title="Back"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onForward}
          disabled={!canGoForward}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white disabled:opacity-25 disabled:hover:bg-transparent transition"
          title="Forward"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onReload}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition"
          title="Reload"
        >
          {activeTab?.isLoading ? (
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          )}
        </button>
      </div>

      {/* 2. Glassmorphism Omnibox */}
      <div ref={containerRef} className="relative flex-1">
        <form onSubmit={handleSubmit} className="w-full">
          <div
            className={`relative flex items-center w-full h-[32px] bg-[#1a1b23] border border-white/10 rounded-lg transition-all ${
              isOpen
                ? 'rounded-b-none border-blue-500/50 bg-[#161720] shadow-lg'
                : 'hover:border-white/20 focus-within:border-blue-500/60'
            }`}
          >
            <SecurityBadge activeTab={activeTab} urlInput={urlInput} />

            <input
              ref={inputRef}
              type="text"
              value={urlInput}
              /* 
                Notice: We DO NOT use onFocus={() => setIsOpen(true)}.
                This ensures automatic focus on new tabs won't trigger the dropdown.
                Instead, we open on explicit mouse click or when user starts typing:
              */
              onClick={() => setIsOpen(true)}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setIsOpen(true);
                setSelectedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search or enter address..."
              className="w-full h-full bg-transparent px-2 text-xs text-zinc-200 placeholder-zinc-500 outline-none"
            />
          </div>
        </form>

        {/* 3. Glassmorphic Dropdown */}
        {isOpen && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-[32px] z-[999999] overflow-hidden rounded-b-xl border border-t-0 border-white/15 bg-[#14151e]/55 backdrop-blur-2xl shadow-[0_16px_36px_rgba(0,0,0,0.65)]">
            <div className="py-1">
              {suggestions.map((item, idx) => {
                const isSelected = selectedIndex === idx;

                return (
                  <div
                    key={`${item.text}-${idx}`}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => handleExecute(item.text)}
                    className={`group flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-zinc-600/25 text-white'
                        : 'text-zinc-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {item.type === 'history' && (
                        <History size={13} className="text-zinc-400 shrink-0" />
                      )}
                      {item.type === 'suggestion' && (
                        <Search size={13} className="text-zinc-400 shrink-0" />
                      )}
                      {item.type === 'url' && (
                        <Globe size={13} className="text-blue-400 shrink-0" />
                      )}

                      <span
                        className={`truncate ${
                          item.type === 'history'
                            ? 'text-purple-300/90'
                            : item.type === 'url'
                            ? 'text-blue-300'
                            : 'text-zinc-200'
                        }`}
                      >
                        {item.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.type === 'history' && (
                        <button
                          type="button"
                          onClick={(e) => removeHistoryItem(e, item.text)}
                          title="Remove from history"
                          className="p-1 hover:text-red-400 rounded transition"
                        >
                          <X size={12} />
                        </button>
                      )}
                      <ArrowUpLeft size={12} className="text-zinc-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. Action Buttons (Downloads, PiP & PWA) */}
      <div className="flex items-center space-x-1 mr-1">
        <DownloadsPopover />
        <button
          type="button"
          onClick={handlePiPToggle}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
          title="Picture-in-Picture"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <rect x="12" y="10" width="8" height="7" rx="1" fill="currentColor" fillOpacity="0.2" />
          </svg>
        </button>

        {pwaAvailable && (
          <button
            type="button"
            onClick={handleInstallPWA}
            disabled={isInstalling}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[11px] font-medium border border-blue-500/30 transition animate-in fade-in"
            title={`Install ${activeTab.pwaManifest.name || 'App'}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Install</span>
          </button>
        )}
      </div>

      {/* 5. Ad Shield Button */}
      <AdShieldButton isEnabled={true} />
    </div>
  );
}