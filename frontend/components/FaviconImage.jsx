// src/components/browser/FaviconImage.jsx
'use client';

import { useState } from 'react';

export default function FaviconImage({ domain, size = 16, className = '' }) {
  const [error, setError] = useState(false);

  // Fallback domain extraction if full URL is passed
  let cleanDomain = domain || '';
  try {
    if (cleanDomain.startsWith('http')) {
      cleanDomain = new URL(cleanDomain).hostname;
    }
  } catch {}

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=64`;

  if (error || !cleanDomain) {
    return (
      <svg
        className={`text-zinc-500 shrink-0 ${className}`}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    );
  }

  return (
    <img
      src={faviconUrl}
      alt=""
      width={size}
      height={size}
      className={`rounded-sm shrink-0 object-contain ${className}`}
      onError={() => setError(true)}
    />
  );
}