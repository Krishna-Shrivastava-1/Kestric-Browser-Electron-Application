// src/components/TabBar.jsx
'use client';

import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import {
  Plus,
  X,
  Minus,
  Square,
  Search,
  Volume2,
  VolumeX,
} from 'lucide-react';
import FaviconImage from './FaviconImage';

export default function TabBar({
  tabs = [],
  activeTabId,
  onSelectTab,
  onSwitchTab,
  onCloseTab,
  onNewTab,
  onReorderTabs,
}) {
  const scrollContainerRef = useRef(null);
  const activeTabRef = useRef(null);
  const prevTabsLengthRef = useRef(tabs.length);

  // Overflow state for sticky/inline plus button
  const [isOverflowing, setIsOverflowing] = useState(false);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Drag and drop state
  const [draggedTabId, setDraggedTabId] = useState(null);
  const [dragOverTabId, setDragOverTabId] = useState(null);

  // Hover preview tooltip state
  const [hoveredTab, setHoveredTab] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Safety: If the hovered tab was closed or removed from the tabs array, clear tooltip immediately
  useEffect(() => {
    if (hoveredTab && !tabs.some((t) => t.id === hoveredTab.id)) {
      setHoveredTab(null);
    }
  }, [tabs, hoveredTab]);

  // 1. BUTTERY-SMOOTH MOUSE WHEEL SCROLLING (RAF Momentum)
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    let targetScroll = el.scrollLeft;
    let currentScroll = el.scrollLeft;
    let rafId = null;

    const smoothScrollLoop = () => {
      currentScroll += (targetScroll - currentScroll) * 0.22;
      el.scrollLeft = currentScroll;

      if (Math.abs(targetScroll - currentScroll) > 0.5) {
        rafId = requestAnimationFrame(smoothScrollLoop);
      } else {
        el.scrollLeft = targetScroll;
        rafId = null;
      }
    };

    const handleWheelNative = (e) => {
      e.preventDefault();
      // Dismiss tooltip when user scrolls tabs
      setHoveredTab(null);

      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta === 0) return;

      if (!rafId) {
        currentScroll = el.scrollLeft;
        targetScroll = el.scrollLeft;
      }

      const maxScroll = el.scrollWidth - el.clientWidth;
      targetScroll = Math.max(0, Math.min(maxScroll, targetScroll + delta));

      if (!rafId) {
        rafId = requestAnimationFrame(smoothScrollLoop);
      }
    };

    el.addEventListener('wheel', handleWheelNative, { passive: false });

    return () => {
      el.removeEventListener('wheel', handleWheelNative);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // 2. Auto-scroll when active tab changes or when a new tab is added
  useEffect(() => {
    if (tabs.length > prevTabsLengthRef.current) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          left: scrollContainerRef.current.scrollWidth,
          behavior: 'smooth',
        });
      }
    } else if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'nearest',
        block: 'nearest',
      });
    }

    prevTabsLengthRef.current = tabs.length;
  }, [activeTabId, tabs.length]);

  // Detect whether tabs fill up the tab bar completely
  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const checkOverflow = () => {
      const hasOverflow = el.scrollWidth > el.clientWidth + 1;
      setIsOverflowing(hasOverflow);
    };

    checkOverflow();

    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, [tabs]);

  // Listen for fullscreen toggle from Electron
  useEffect(() => {
    if (window.browserAPI?.onFullscreenChange) {
      const unsubscribe = window.browserAPI.onFullscreenChange((fsActive) => {
        setIsFullscreen(fsActive);
      });
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }
  }, []);

  const handleSelect = (id) => {
    if (typeof onSelectTab === 'function') onSelectTab(id);
    else if (typeof onSwitchTab === 'function') onSwitchTab(id);
  };

  const handleClose = (e, id) => {
    e.stopPropagation();
    // FIX: Dismiss tooltip immediately if closing this tab
    setHoveredTab(null);
    if (typeof onCloseTab === 'function') {
      onCloseTab(id);
    }
  };

  const handleNewTabClick = () => {
    setHoveredTab(null);
    if (typeof onNewTab === 'function') {
      onNewTab();
    }
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          left: scrollContainerRef.current.scrollWidth,
          behavior: 'smooth',
        });
      }
    }, 50);
  };

  const handleToggleMute = (e, id) => {
    e.stopPropagation();
    window.browserAPI?.toggleMute?.(id);
  };

  const handleDoubleClick = (e) => {
    if (e.target.closest('[data-no-drag="true"]')) return;
    window.browserAPI?.maximizeWindow?.();
  };

  const handleDragStart = (e, tabId) => {
    setHoveredTab(null); // FIX: Dismiss tooltip on drag
    setDraggedTabId(tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, tabId) => {
    e.preventDefault();
    if (tabId !== draggedTabId) {
      setDragOverTabId(tabId);
    }
  };

  const handleDrop = (e, targetTabId) => {
    e.preventDefault();
    if (!draggedTabId || draggedTabId === targetTabId) {
      setDraggedTabId(null);
      setDragOverTabId(null);
      return;
    }

    const fromIndex = tabs.findIndex((t) => t.id === draggedTabId);
    const toIndex = tabs.findIndex((t) => t.id === targetTabId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const updated = [...tabs];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      if (typeof onReorderTabs === 'function') {
        onReorderTabs(updated);
      }
    }

    setDraggedTabId(null);
    setDragOverTabId(null);
  };

  const handleMouseEnter = (e, tab) => {
    if (draggedTabId) return; // Don't show tooltip while dragging

    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipWidth = 260;
    const padding = 12;

    let x = rect.left + rect.width / 2 - tooltipWidth / 2;
    if (x < padding) x = padding;
    if (typeof window !== 'undefined' && x + tooltipWidth > window.innerWidth - padding) {
      x = window.innerWidth - tooltipWidth - padding;
    }

    setTooltipPos({ x, y: 38 });
    setHoveredTab(tab);
  };

  const handleMouseLeave = () => {
    setHoveredTab(null);
  };

  return (
    <div
      onDoubleClick={handleDoubleClick}
      onMouseLeave={handleMouseLeave} // FIX: Container-level exit dismiss
      className="relative flex h-[38px] w-full select-none items-center justify-between bg-[#121217] text-white/80"
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* FLOATING FULLSCREEN EXIT BUTTON */}
      {isFullscreen && (
        <button
          type="button"
          data-no-drag="true"
          title="Exit Full Screen (Esc)"
          onClick={() => window.browserAPI?.exitFullscreen?.()}
          style={{ WebkitAppRegion: 'no-drag' }}
          className="fixed top-2.5 left-1/2 -translate-x-1/2 z-[9999999] flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-[#16161c]/95 text-white shadow-2xl backdrop-blur-md transition-transform hover:scale-110 hover:bg-[#282832]"
        >
          <X size={15} strokeWidth={2.5} />
        </button>
      )}

      {/* 1. Scrollable Tab Strip Container */}
      <div className="relative flex h-full flex-1 items-end overflow-hidden">
        <div
          ref={scrollContainerRef}
          onScroll={() => setHoveredTab(null)} // FIX: Dismiss tooltip on scroll
          className="flex h-full flex-1 items-end overflow-x-auto overflow-y-hidden px-2 scrollbar-none"
          style={{ WebkitAppRegion: 'drag' }}
        >
          <div className="flex h-full items-end gap-1">
            {tabs.map((tab) => {
              const isActive = activeTabId === tab.id;
              const isOver = dragOverTabId === tab.id;

              return (
                <div
                  key={tab.id}
                  ref={isActive ? activeTabRef : null}
                  draggable
                  onDragStart={(e) => handleDragStart(e, tab.id)}
                  onDragOver={(e) => handleDragOver(e, tab.id)}
                  onDrop={(e) => handleDrop(e, tab.id)}
                  onMouseEnter={(e) => handleMouseEnter(e, tab)}
                  onMouseLeave={handleMouseLeave}
                  data-no-drag="true"
                  style={{ WebkitAppRegion: 'no-drag' }}
                  onClick={() => handleSelect(tab.id)}
                  className={`group relative flex h-[32px] w-[180px] min-w-[120px] max-w-[220px] shrink-0 cursor-pointer items-center justify-between rounded-t-lg px-2.5 text-xs transition-all ${
                    isActive
                      ? 'bg-[#1e1e24] font-medium text-white shadow-sm'
                      : 'text-white/60 hover:bg-white/[0.05] hover:text-white/90'
                  } ${isOver ? 'border-l-2 border-blue-500 pl-2' : ''}`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {tab.showSearch ? (
                      <Search size={13} className="shrink-0 text-blue-400" />
                    ) : (
                      <FaviconImage
                        domain={tab.url}
                        size={14}
                        className="shrink-0"
                      />
                    )}
                    <span className="truncate">{tab.title || 'New Tab'}</span>
                  </div>

                  {(tab.isAudible || tab.isMuted) && (
                    <button
                      type="button"
                      data-no-drag="true"
                      title={tab.isMuted ? 'Unmute tab' : 'Mute tab'}
                      onClick={(e) => handleToggleMute(e, tab.id)}
                      className="ml-1 shrink-0 rounded p-0.5 text-white/70 hover:bg-white/20 hover:text-white"
                    >
                      {tab.isMuted ? (
                        <VolumeX size={12} className="text-red-400" />
                      ) : (
                        <Volume2 size={12} className="animate-pulse text-blue-400" />
                      )}
                    </button>
                  )}

                  {tabs.length > 1 && (
                    <button
                      type="button"
                      data-no-drag="true"
                      style={{ WebkitAppRegion: 'no-drag' }}
                      onClick={(e) => handleClose(e, tab.id)}
                      className="ml-1 shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              );
            })}

            {/* In-line New Tab Button */}
            {!isOverflowing && (
              <div
                data-no-drag="true"
                style={{ WebkitAppRegion: 'no-drag' }}
                className="flex h-[32px] shrink-0 items-center pl-1"
              >
                <button
                  type="button"
                  onClick={handleNewTabClick}
                  title="New Tab"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Plus size={15} />
                </button>
              </div>
            )}
          </div>

          <div className="h-full flex-1" style={{ WebkitAppRegion: 'drag' }} />
        </div>

        {/* Sticky New Tab Button */}
        {isOverflowing && (
          <div
            data-no-drag="true"
            style={{ WebkitAppRegion: 'no-drag' }}
            className="z-20 flex h-[32px] shrink-0 items-center bg-[#121217] shadow-[-12px_0_12px_#121217] pl-1 pr-1"
          >
            <button
              type="button"
              onClick={handleNewTabClick}
              title="New Tab"
              className="flex h-7 w-7 items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Plus size={15} />
            </button>
          </div>
        )}
      </div>

      {/* 2. Draggable Window Grab Area */}
      <div
        className="h-full w-12 shrink-0 cursor-default"
        style={{ WebkitAppRegion: 'drag' }}
        title="Drag Window"
      />

      {/* 3. Window Control Buttons */}
      <div
        data-no-drag="true"
        className="flex h-full shrink-0 items-center z-10"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <button
          type="button"
          onClick={() => window.browserAPI?.minimizeWindow?.()}
          className="flex h-full w-11 items-center justify-center text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Minus size={13} />
        </button>
        <button
          type="button"
          onClick={() => window.browserAPI?.maximizeWindow?.()}
          className="flex h-full w-11 items-center justify-center text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Square size={11} />
        </button>
        <button
          type="button"
          onClick={() => window.browserAPI?.closeWindow?.()}
          className="flex h-full w-11 items-center justify-center text-white/60 transition-colors hover:bg-red-600 hover:text-white"
        >
          <X size={13} />
        </button>
      </div>

      {/* 4. Tooltip */}
      {hoveredTab && (
        <div
          style={{
            position: 'fixed',
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            width: '260px',
            height: '38px',
            pointerEvents: 'none',
          }}
          className="z-[999999] flex flex-col justify-center rounded-md border border-zinc-700/90 bg-[#1c1c24] px-2.5 py-1 shadow-2xl text-left animate-in fade-in duration-100"
        >
          <p className="truncate text-xs font-medium text-zinc-100">
            {hoveredTab.title || 'New Tab'}
          </p>
          {hoveredTab.url && (
            <p className="truncate text-[10px] text-zinc-400">
              {hoveredTab.url}
            </p>
          )}
        </div>
      )}
    </div>
  );
}