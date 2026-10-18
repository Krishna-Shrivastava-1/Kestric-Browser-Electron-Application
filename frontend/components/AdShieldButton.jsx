// src/components/AdShieldButton.jsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function AdShieldButton({ isEnabled = true }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative flex items-center pr-1.5" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Kestric Shields: Ad & Tracker Blocker"
        className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
          isEnabled
            ? 'text-blue-400 hover:bg-blue-500/10'
            : 'text-zinc-500 hover:bg-zinc-800'
        }`}
      >
        {isEnabled ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
      </button>

      {/* Shields Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 top-8 z-50 w-64 rounded-lg border border-zinc-700/80 bg-[#18181f] p-3 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-700/50">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-blue-400" />
              <span className="text-xs font-semibold text-white">Kestric Shields</span>
            </div>
            <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
              ACTIVE
            </span>
          </div>

          <div className="mt-2.5 space-y-2 text-xs text-zinc-300">
            <div className="flex items-center gap-2 text-zinc-400">
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
              <span>EasyList Ads & Banners Blocked</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
              <span>Cross-site Trackers Blocked</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
              <span>Fingerprinting Spoofed</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}