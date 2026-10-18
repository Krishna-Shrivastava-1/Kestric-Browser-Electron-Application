// src/components/SecurityBadge.jsx
'use client';

import React from 'react';
import { Lock, AlertTriangle, Search, Globe } from 'lucide-react';

export default function SecurityBadge({ activeTab, urlInput }) {
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (activeTab?.id) {
      window.browserAPI?.toggleSiteDetails?.(activeTab.id);
    }
  };

  const handleMouseDown = (e) => {
    // PREVENT ADDRESS BAR FROM RECEIVING FOCUS
    e.preventDefault();
    e.stopPropagation();
  };

  const currentUrl = (activeTab?.url || urlInput || '').trim().toLowerCase();
  const isSearch = activeTab?.showSearch || urlInput?.startsWith('zenith://search');
  const isHttps = currentUrl.startsWith('https://');
  const isHttp = currentUrl.startsWith('http://');

  if (isSearch) {
    return (
      <div
        className="flex items-center pl-2.5 text-zinc-400 select-none"
        title="Zenith Search"
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      >
        <Search size={14} className="text-blue-400" />
      </div>
    );
  }

  return (
    <div
      className="relative flex items-center select-none"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <button
        type="button"
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        className="flex items-center justify-center p-1.5 rounded-md hover:bg-white/10 transition-colors focus:outline-none cursor-pointer"
        title={isHttps ? 'Connection is secure' : isHttp ? 'Connection not secure' : 'Site Info'}
      >
        {isHttps ? (
          <Lock size={13} className="text-emerald-400" />
        ) : isHttp ? (
          <AlertTriangle size={13} className="text-amber-400" />
        ) : (
          <Globe size={13} className="text-zinc-400" />
        )}
      </button>
    </div>
  );
}