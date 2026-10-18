
// // src/components/SearchResults.jsx
// 'use client';

// import { useState, useEffect, useRef } from 'react';
// import FaviconImage from './FaviconImage';
// import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

// export default function SearchResults({
//   query = '',
//   results = [],
//   isLoading,
//   currentPage = 1,
//   hasMore = false,
//   onPageChange,
//   onSelectResult,
//   onNewSearch, // Callback to trigger a refined or new query
// }) {
//   const containerRef = useRef(null);
//   const [internalQuery, setInternalQuery] = useState(query);

//   // Sync internal input when query changes
//   useEffect(() => {
//     setInternalQuery(query);
//   }, [query]);

//   // Handle overlay bounds so user can scroll
//   useEffect(() => {
//     window.browserAPI?.setOverlay?.(true);
//     return () => {
//       window.browserAPI?.setOverlay?.(false);
//     };
//   }, []);

//   const handlePageSelect = (newPage) => {
//     if (newPage === currentPage || newPage < 1) return;
//     containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
//     onPageChange(newPage);
//   };

//   const handleSearchSubmit = (e) => {
//     e.preventDefault();
//     if (!internalQuery.trim()) return;
//     onNewSearch(internalQuery.trim());
//   };

//   return (
//     <div
//       ref={containerRef}
//       className="fixed inset-x-0 bottom-0 top-[82px] z-[9999] overflow-y-scroll bg-[#0d0d11] p-6 text-white"
//       style={{
//         pointerEvents: 'auto',
//         WebkitOverflowScrolling: 'touch',
//       }}
//     >
//       <div className="mx-auto max-w-3xl pb-24">
//         {/* 1. Prominent In-Page Search Bar (Google/Brave Style) */}
//         <form onSubmit={handleSearchSubmit} className="mb-6">
//           <div className="relative flex items-center">
//             <Search size={16} className="absolute left-3.5 text-zinc-400" />
//             <input
//               type="text"
//               value={internalQuery}
//               onChange={(e) => setInternalQuery(e.target.value)}
//               placeholder="Search or enter address..."
//               className="w-full h-11 bg-[#1a1a22] border border-zinc-700/70 focus:border-blue-500 rounded-lg pl-10 pr-24 text-sm text-white placeholder-zinc-500 outline-none transition shadow-sm"
//             />
//             <button
//               type="submit"
//               className="absolute right-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-medium rounded-md transition text-white"
//             >
//               Search
//             </button>
//           </div>
//         </form>

//         {/* 2. Header Status */}
//         <div className="mb-4 flex items-center justify-between border-b border-zinc-800/80 pb-3">
//           <span className="text-xs font-medium text-zinc-400">
//             {isLoading
//               ? `Searching for "${query}"...`
//               : `Page ${currentPage} of results for "${query}"`}
//           </span>
//         </div>

//         {/* 3. Loading State */}
//         {isLoading && (
//           <div className="py-20 text-center text-sm text-zinc-500">
//             Fetching DuckDuckGo results...
//           </div>
//         )}

//         {/* 4. Empty State */}
//         {!isLoading && results.length === 0 && (
//           <div className="py-20 text-center text-sm text-zinc-500">
//             No results found for "{query}".
//           </div>
//         )}

//         {/* 5. Results List */}
//         {!isLoading && (
//           <div className="flex flex-col space-y-3">
//             {results.map((item, idx) => (
//               <div
//                 key={`${item.url}-${idx}`}
//                 onClick={() => onSelectResult(item.url)}
//                 className="group flex cursor-pointer flex-col space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-zinc-700 hover:bg-zinc-900"
//               >
//                 <div className="flex items-center space-x-2">
//                   <FaviconImage domain={item.hostname || item.url} size={16} />
//                   <span className="truncate text-xs text-zinc-400">
//                     {item.hostname || item.url}
//                   </span>
//                 </div>

//                 <h3 className="text-base font-medium text-blue-400 group-hover:underline">
//                   {item.title}
//                 </h3>

//                 <p className="text-xs leading-relaxed text-zinc-400">
//                   {item.snippet}
//                 </p>
//               </div>
//             ))}
//           </div>
//         )}

//         {/* 6. Google-style Previous & Next Pagination */}
//         {!isLoading && results.length > 0 && (
//           <div className="mt-12 flex items-center justify-center gap-4 border-t border-zinc-800/60 pt-6">
//             <button
//               disabled={currentPage <= 1 || isLoading}
//               onClick={() => handlePageSelect(currentPage - 1)}
//               className="flex items-center gap-1 rounded-md border border-zinc-700/60 bg-zinc-800/80 px-4 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700 hover:text-white disabled:pointer-events-none disabled:opacity-30"
//             >
//               <ChevronLeft size={14} />
//               Previous
//             </button>

//             <div className="flex items-center gap-1 text-xs text-zinc-400">
//               <span className="flex h-7 w-7 items-center justify-center rounded border border-blue-500/50 bg-blue-500/10 font-semibold text-blue-400">
//                 {currentPage}
//               </span>
//             </div>

//             <button
//               disabled={!hasMore || isLoading}
//               onClick={() => handlePageSelect(currentPage + 1)}
//               className="flex items-center gap-1 rounded-md border border-zinc-700/60 bg-zinc-800/80 px-4 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700 hover:text-white disabled:pointer-events-none disabled:opacity-30"
//             >
//               Next
//               <ChevronRight size={14} />
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }















// src/components/SearchResults.jsx
'use client';

import { useState, useEffect, useRef } from 'react';
import FaviconImage from './FaviconImage';
import { ChevronLeft, ChevronRight, Search, Loader2 } from 'lucide-react';

export default function SearchResults({
  query = '',
  results = [],
  isLoading,
  currentPage = 1,
  hasMore = false,
  onPageChange,
  onSelectResult,
  onNewSearch,
}) {
  const containerRef = useRef(null);
  const [internalQuery, setInternalQuery] = useState(query);
  const [navigatingUrl, setNavigatingUrl] = useState(null);

  useEffect(() => {
    setInternalQuery(query);
  }, [query]);

  useEffect(() => {
    window.browserAPI?.setOverlay?.(true);
  }, []);

  const handlePageSelect = (newPage) => {
    if (newPage === currentPage || newPage < 1) return;
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    onPageChange(newPage);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!internalQuery.trim()) return;
    onNewSearch(internalQuery.trim());
  };

  const handleItemClick = (url) => {
    setNavigatingUrl(url);
    onSelectResult(url);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-x-0 bottom-0 top-[82px] z-[9999] overflow-y-scroll bg-[#0d0d11] p-6 text-white"
      style={{
        pointerEvents: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div className="mx-auto max-w-3xl pb-24">
        {/* 1. Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mb-6">
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3.5 text-zinc-400" />
            <input
              type="text"
              value={internalQuery}
              onChange={(e) => setInternalQuery(e.target.value)}
              placeholder="Search or enter address..."
              className="w-full h-11 bg-[#1a1a22] border border-zinc-700/70 focus:border-blue-500 rounded-lg pl-10 pr-24 text-sm text-white placeholder-zinc-500 outline-none transition shadow-sm"
            />
            <button
              type="submit"
              className="absolute right-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-medium rounded-md transition text-white"
            >
              Search
            </button>
          </div>
        </form>

        {/* 2. Header Status */}
        <div className="mb-4 flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <span className="text-xs font-medium text-zinc-400">
            {isLoading
              ? `Searching for "${query}"...`
              : `Page ${currentPage} of results for "${query}"`}
          </span>
        </div>

        {/* 3. Loading State */}
        {isLoading && (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-sm text-zinc-500">
            <Loader2 className="animate-spin text-blue-500" size={24} />
            <span>Fetching search results...</span>
          </div>
        )}

        {/* 4. Empty State */}
        {!isLoading && results.length === 0 && (
          <div className="py-20 text-center text-sm text-zinc-500">
            No results found for "{query}".
          </div>
        )}

        {/* 5. Results List */}
        {!isLoading && (
          <div className="flex flex-col space-y-3">
            {results.map((item, idx) => {
              const isTargetLoading = navigatingUrl === item.url;

              return (
                <div
                  key={`${item.url}-${idx}`}
                  onClick={() => handleItemClick(item.url)}
                  className={`group flex cursor-pointer flex-col space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-zinc-700 hover:bg-zinc-900 ${
                    isTargetLoading ? 'opacity-60 pointer-events-none' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FaviconImage domain={item.hostname || item.url} size={16} />
                    <span className="truncate text-xs text-zinc-400">
                      {item.hostname || item.url}
                    </span>
                    {isTargetLoading && (
                      <Loader2 size={12} className="animate-spin text-blue-400 ml-auto" />
                    )}
                  </div>

                  <h3 className="text-base font-medium text-blue-400 group-hover:underline">
                    {item.title}
                  </h3>

                  <p className="text-xs leading-relaxed text-zinc-400">
                    {item.snippet}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* 6. Pagination */}
        {!isLoading && results.length > 0 && (
          <div className="mt-12 flex items-center justify-center gap-4 border-t border-zinc-800/60 pt-6">
            <button
              disabled={currentPage <= 1 || isLoading}
              onClick={() => handlePageSelect(currentPage - 1)}
              className="flex items-center gap-1 rounded-md border border-zinc-700/60 bg-zinc-800/80 px-4 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700 hover:text-white disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft size={14} />
              Previous
            </button>

            <div className="flex items-center gap-1 text-xs text-zinc-400">
              <span className="flex h-7 w-7 items-center justify-center rounded border border-blue-500/50 bg-blue-500/10 font-semibold text-blue-400">
                {currentPage}
              </span>
            </div>

            <button
              disabled={!hasMore || isLoading}
              onClick={() => handlePageSelect(currentPage + 1)}
              className="flex items-center gap-1 rounded-md border border-zinc-700/60 bg-zinc-800/80 px-4 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700 hover:text-white disabled:pointer-events-none disabled:opacity-30"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}