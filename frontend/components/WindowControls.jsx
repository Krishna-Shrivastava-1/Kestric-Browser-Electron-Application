// src/components/browser/WindowControls.jsx
'use client';

export default function WindowControls({ isMaximized }) {
  const minimize = () => window.browserAPI?.minimizeWindow();
  const maximize = () => window.browserAPI?.maximizeWindow();
  const close = () => window.browserAPI?.closeWindow();

  return (
    <div className="flex items-center space-x-1 no-drag ml-auto pr-2">
      <button
        onClick={minimize}
        className="w-8 h-8 inline-flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition"
      >
        <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
          <rect width="10" height="1" />
        </svg>
      </button>

      <button
        onClick={maximize}
        className="w-8 h-8 inline-flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition"
      >
        {isMaximized ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="2" y="0" width="8" height="8" />
            <polygon points="0,2 0,10 8,10 8,8 2,8 2,2" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0.5" y="0.5" width="9" height="9" />
          </svg>
        )}
      </button>

      <button
        onClick={close}
        className="w-8 h-8 inline-flex items-center justify-center text-zinc-400 hover:text-white hover:bg-red-600 rounded transition"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2">
          <line x1="0" y1="0" x2="10" y2="10" />
          <line x1="10" y1="0" x2="0" y2="10" />
        </svg>
      </button>
    </div>
  );
}