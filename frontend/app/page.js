// src/app/page.js
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import TabBar from '@/components/TabBar';
import NavigationBar from '@/components/NavigationBar';
import SearchResults from '@/components/SearchResults';
import NewTabDashboard from '@/components/NewTabDashboard';
import { getNextWallpaper } from '@/utils/wallpaperManager';

const BROWSER_PROTOCOL = 'zenith';

export default function BrowserChrome() {
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const activeTabIdRef = useRef(activeTabId);
  const tabsRef = useRef([]);
  const initializedRef = useRef(false);
  const addressInputRef = useRef(null);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  useEffect(() => {
    if (!activeTab) return;
    const overlay = activeTab.viewMode !== 'web' || Boolean(activeTab.connecting);
    window.browserAPI?.setOverlay?.(overlay);
  }, [activeTabId, activeTab?.viewMode, activeTab?.connecting]);

  useEffect(() => {
    if (!activeTab?.connecting) return;
    const t = setTimeout(() => {
      setTabs((prev) =>
        prev.map((x) => (x.id === activeTabId ? { ...x, connecting: false } : x))
      );
    }, 15000);
    return () => clearTimeout(t);
  }, [activeTabId, activeTab?.connecting]);

  const formatSearchUrl = (query, page = 1) =>
    `${BROWSER_PROTOCOL}://search?q=${encodeURIComponent(query)}${page > 1 ? `&page=${page}` : ''}`;

  const handleNewTab = useCallback(async (initialUrl = null) => {
    const id = `tab-${Date.now()}`;
    const isSearchTarget = initialUrl?.startsWith(`${BROWSER_PROTOCOL}://search`);
    const tabWallpaper = !initialUrl ? await getNextWallpaper() : null;
    const opensWeb = Boolean(initialUrl && !isSearchTarget);

    const newTab = {
      id,
      title: initialUrl ? 'Loading...' : 'New Tab',
      url: initialUrl || '',
      draftInput: initialUrl || '',
      isLoading: opensWeb,
      showSearch: false,
      searchResults: [],
      searchQuery: '',
      currentPage: 1,
      hasMore: false,
      wallpaper: tabWallpaper,
      viewMode: opensWeb ? 'web' : 'newtab',
      connecting: opensWeb,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(id);
    activeTabIdRef.current = id;
    setUrlInput(initialUrl || '');

    await window.browserAPI?.createTab?.(id);
    await window.browserAPI?.switchTab?.(id);

    if (opensWeb) {
      await window.browserAPI?.navigate?.(id, initialUrl);
    } else {
      setTimeout(() => {
        addressInputRef.current?.focus();
        addressInputRef.current?.select();
      }, 40);
    }
  }, []);

  useEffect(() => {
    if (!window.browserAPI) return;

    const cleanupTab = window.browserAPI.onTabUpdated?.((updatedTab) => {
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== updatedTab.id) return t;

          const { ready, wallpaper: _nativeWp, viewMode: _nativeVm, ...native } = updatedTab;

          const title =
            t.viewMode === 'search'
              ? `${t.searchQuery} - Search`
              : t.viewMode === 'newtab'
              ? 'New Tab'
              : native.title || t.title || 'Loading...';

          return {
            ...t,
            ...native,
            title,
            wallpaper: t.wallpaper || updatedTab.wallpaper,
            viewMode: t.viewMode,
            searchQuery: t.searchQuery,
            searchResults: t.searchResults,
            currentPage: t.currentPage,
            hasMore: t.hasMore,
            isLoading: t.viewMode === 'web' ? (native.isLoading ?? t.isLoading) : false,
            url: t.viewMode === 'web' ? native.url || t.url : t.url,
            connecting: ready ? false : t.connecting,
          };
        })
      );

      if (updatedTab.id === activeTabIdRef.current && updatedTab.url) {
        const current = tabsRef.current.find((t) => t.id === updatedTab.id);
        if (current?.viewMode === 'web') {
          setUrlInput((prev) => (prev === updatedTab.url ? prev : updatedTab.url));
        }
      }
    });

    const cleanupNewTabReq = window.browserAPI.onNewTabRequested?.(({ url }) => {
      if (url) handleNewTab(url);
    });

    if (!initializedRef.current) {
      initializedRef.current = true;
      handleNewTab();
    }

    return () => {
      cleanupTab?.();
      cleanupNewTabReq?.();
    };
  }, [handleNewTab]);

  const handleUrlInputChange = (value) => {
    setUrlInput(value);
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabIdRef.current ? { ...t, draftInput: value } : t))
    );
  };

  const handleSwitchTab = async (id) => {
    setActiveTabId(id);
    activeTabIdRef.current = id;

    const targetTab = tabs.find((t) => t.id === id);
    if (!targetTab) return;

    if (targetTab.draftInput !== undefined && targetTab.draftInput !== null) {
      setUrlInput(targetTab.draftInput);
    } else if (targetTab.viewMode === 'search') {
      setUrlInput(formatSearchUrl(targetTab.searchQuery, targetTab.currentPage));
    } else {
      setUrlInput(targetTab.url || '');
    }

    await window.browserAPI?.switchTab?.(id);
  };

  const handleCloseTab = async (id) => {
    await window.browserAPI?.closeTab?.(id);
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);

    if (remaining.length === 0) {
      setActiveTabId(null);
      handleNewTab();
      return;
    }
    if (activeTabId === id) {
      handleSwitchTab(remaining[remaining.length - 1].id);
    }
  };

  const executeSearchPage = async (tabId, query, page = 1) => {
    setIsSearching(true);
    const offset = (page - 1) * 30;

    if (tabId === activeTabIdRef.current) {
      setUrlInput(formatSearchUrl(query, page));
    }

    const res = await window.browserAPI?.search?.(query, offset);
    setIsSearching(false);

    if (res?.success) {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId
            ? { ...t, searchResults: res.results || [], hasMore: res.hasMore, currentPage: page }
            : t
        )
      );
    }
  };

  const triggerSearch = async (query, page = 1) => {
    setUrlInput(formatSearchUrl(query, page));

    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? {
              ...t,
              title: `${query} - Search`,
              viewMode: 'search',
              isLoading: false,
              searchQuery: query,
              currentPage: page,
              hasMore: false,
              draftInput: null,
            }
          : t
      )
    );

    await executeSearchPage(activeTabId, query, page);
  };

  const handleNavigate = async (input) => {
    const raw = (input || '').trim();
    if (!raw) return;

    const isUrl =
      raw.startsWith('http://') ||
      raw.startsWith('https://') ||
      (raw.includes('.') && !raw.includes(' '));

    if (!isUrl) {
      triggerSearch(raw, 1);
      return;
    }

    const target =
      raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
    const tabId = activeTabId;
    const comingFromWeb = activeTab?.viewMode === 'web';

    setUrlInput(target);

    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabId
          ? { ...t, url: target, viewMode: 'web', isLoading: true, connecting: true, draftInput: null }
          : t
      )
    );

    if (!comingFromWeb) {
      await window.browserAPI?.clearTab?.(tabId);
    }

    await window.browserAPI?.navigate?.(tabId, target);
  };

  const handleBack = async () => {
    if (!activeTab) return;
    const tabId = activeTabId;

    if (activeTab.viewMode === 'web' && activeTab.canGoBack) {
      window.browserAPI?.goBack?.(tabId);
      return;
    }

    if (activeTab.viewMode === 'web') {
      await window.browserAPI?.clearTab?.(tabId);

      if (activeTab.searchQuery) {
        setUrlInput(formatSearchUrl(activeTab.searchQuery, activeTab.currentPage));
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId
              ? { ...t, viewMode: 'search', connecting: false, isLoading: false, canGoBack: false, draftInput: null }
              : t
          )
        );
      } else {
        setUrlInput('');
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId
              ? { ...t, viewMode: 'newtab', connecting: false, url: '', isLoading: false, canGoBack: false, draftInput: '' }
              : t
          )
        );
      }
      return;
    }

    if (activeTab.viewMode === 'search') {
      setUrlInput('');
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId
            ? { ...t, viewMode: 'newtab', url: '', isLoading: false, draftInput: '' }
            : t
        )
      );
    }
  };

  const handleForward = () => {
    if (!activeTab) return;
    if (activeTab.viewMode === 'web' && activeTab.canGoForward) {
      window.browserAPI?.goForward?.(activeTabId);
    }
  };

  const handleReload = () => {
    if (activeTab?.viewMode === 'search') {
      executeSearchPage(activeTabId, activeTab.searchQuery, activeTab.currentPage);
    } else if (activeTab?.viewMode === 'web') {
      window.browserAPI?.reload?.(activeTabId);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#121217] font-sans">
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={handleSwitchTab}
        onSwitchTab={handleSwitchTab}
        onCloseTab={handleCloseTab}
        onNewTab={() => handleNewTab()}
        onReorderTabs={setTabs}
      />

      <NavigationBar
        inputRef={addressInputRef}
        urlInput={urlInput}
        setUrlInput={handleUrlInputChange}
        onNavigate={handleNavigate}
        activeTab={activeTab}
        onBack={handleBack}
        onForward={handleForward}
        onReload={handleReload}
      />

      {/* 1. NEW TAB DASHBOARD */}
      {activeTab?.viewMode === 'newtab' && (
        <div className="flex-1 w-full h-[calc(100vh-82px)] flex overflow-hidden">
          <NewTabDashboard
            wallpaper={activeTab?.wallpaper}
            onNavigate={handleNavigate}
            onSearch={(query) => triggerSearch(query, 1)}
          />
        </div>
      )}

      {/* 2. SEARCH RESULTS */}
      {activeTab?.viewMode === 'search' && (
        <SearchResults
          query={activeTab.searchQuery}
          results={activeTab.searchResults || []}
          isLoading={isSearching}
          currentPage={activeTab.currentPage || 1}
          hasMore={activeTab.hasMore}
          onNewSearch={(newQuery) => triggerSearch(newQuery, 1)}
          onPageChange={(newPage) =>
            executeSearchPage(activeTabId, activeTab.searchQuery, newPage)
          }
          onSelectResult={(url) => handleNavigate(url)}
        />
      )}

      {/* 3. LOADING CURTAIN */}
      {activeTab?.viewMode === 'web' && activeTab?.connecting && (
        <div
          className={`fixed inset-x-0 bottom-0 top-[82px] z-[9999] flex flex-col items-center justify-center bg-[#121217] text-white transition-opacity duration-200 ${
            activeTab?.isLoading
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none'
          }`}
        />
      )}
    </div>
  );
}