// src/components/DownloadsPopover.jsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowDown } from 'lucide-react';

export default function DownloadsPopover() {
  const [downloads, setDownloads] = useState([]);
  const [hasNewCompletion, setHasNewCompletion] = useState(false);
  const btnRef = useRef(null);

  useEffect(() => {
    if (window.browserAPI?.getDownloads) {
      window.browserAPI.getDownloads().then((items) => setDownloads(items || []));
    }
    const unsub = window.browserAPI?.onDownloadsUpdated?.((items) => {
      setDownloads((prev) => {
        const wasActive = prev.some((d) => d.state === 'progressing');
        const isNowDone = items.some(
          (d) => d.state === 'completed' && !prev.find((p) => p.id === d.id && p.state === 'completed')
        );
        if (wasActive && isNowDone) {
          setHasNewCompletion(true);
          setTimeout(() => setHasNewCompletion(false), 2200);
        }
        return items;
      });
    });

    return () => unsub?.();
  }, []);

  const handleClick = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    window.browserAPI?.toggleDownloadsPopup?.({
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    });
  };

  const activeDownloads = downloads.filter((d) => d.state === 'progressing' || d.state === 'paused');
  const isAnyActive = activeDownloads.length > 0;
  const totalProgress = isAnyActive
    ? activeDownloads.reduce((acc, curr) => acc + (curr.progress || 0), 0) / activeDownloads.length
    : 0;

  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - totalProgress * circumference;

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={handleClick}
      className={`relative w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
        isAnyActive
          ? 'text-blue-400 hover:bg-white/10'
          : 'text-zinc-400 hover:text-white hover:bg-white/10'
      } ${hasNewCompletion ? 'animate-bounce text-emerald-400' : ''}`}
      title="Downloads"
    >
      {isAnyActive ? (
        <div className="relative w-5 h-5 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 24 24">
            <circle
              cx="12"
              cy="12"
              r={radius}
              className="stroke-zinc-700/60"
              strokeWidth="2.2"
              fill="none"
            />
            <circle
              cx="12"
              cy="12"
              r={radius}
              className="stroke-blue-400 transition-all duration-200 ease-out"
              strokeWidth="2.2"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <ArrowDown size={10} className="absolute text-blue-400 animate-pulse stroke-[2.5]" />
        </div>
      ) : (
        <div className="relative flex items-center justify-center">
          <ArrowDown size={14} className={hasNewCompletion ? 'text-emerald-400' : 'text-zinc-400'} />
          <span
            className={`absolute -bottom-1 w-3.5 h-[1.5px] rounded-full ${
              hasNewCompletion ? 'bg-emerald-400' : 'bg-zinc-500'
            }`}
          />
        </div>
      )}
    </button>
  );
}