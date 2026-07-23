import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconSearch } from './Icon.jsx';

export default function CommandPalette({ nav = [] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const allItems = useMemo(() => {
    const items = [];
    for (const entry of nav) {
      if (entry.items) {
        for (const item of entry.items) {
          items.push({ ...item, group: entry.label });
        }
      } else {
        items.push({ ...entry, group: null });
      }
    }
    return items;
  }, [nav]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.group && item.group.toLowerCase().includes(q))
    );
  }, [allItems, query]);

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (open) setOpen(false);
  }, [location.pathname]);

  function go(item) {
    navigate(item.to);
    setOpen(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[activeIndex]) {
      e.preventDefault();
      go(filtered[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  useEffect(() => {
    const el = listRef.current?.children[activeIndex];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] animate-fade-in" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-surface-overlay/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-white overflow-hidden animate-scale-in"
        style={{ borderRadius: 'var(--radius-modal)', boxShadow: 'var(--shadow-modal)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <IconSearch className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages..."
            className="flex-1 text-sm text-slate-800 placeholder:text-slate-400 outline-none bg-transparent"
          />
          <kbd className="text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[320px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="text-center py-10 px-5">
              <p className="text-sm text-slate-400">No results for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            filtered.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.to}
                  onClick={() => go(item)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex items-center gap-3 w-full px-5 py-2.5 text-left text-sm transition-colors
                    ${i === activeIndex
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-70" />
                  <span className="flex-1 font-medium">{item.label}</span>
                  {item.group && (
                    <span className="text-[11px] text-slate-400 font-medium">{item.group}</span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-4 px-5 py-3 border-t border-slate-100 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <kbd className="bg-slate-50 border border-slate-200 rounded px-1 py-0.5 font-medium">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-slate-50 border border-slate-200 rounded px-1 py-0.5 font-medium">↵</kbd>
            open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-slate-50 border border-slate-200 rounded px-1 py-0.5 font-medium">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
