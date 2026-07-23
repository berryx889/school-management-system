import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'sms_theme';

function getSystemPreference() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === 'system') {
    root.removeAttribute('data-theme');
    root.classList.toggle('dark', getSystemPreference() === 'dark');
  } else {
    root.setAttribute('data-theme', mode);
    root.classList.toggle('dark', mode === 'dark');
  }
}

export function useTheme() {
  const [mode, setMode] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored || 'system';
  });

  useEffect(() => {
    applyTheme(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [mode]);

  const cycle = useCallback(() => {
    setMode((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  }, []);

  const resolved = mode === 'system' ? getSystemPreference() : mode;

  return { mode, resolved, cycle };
}

// Apply stored theme immediately on load to prevent flash
(function () {
  const stored = localStorage.getItem(STORAGE_KEY) || 'system';
  applyTheme(stored);
})();
