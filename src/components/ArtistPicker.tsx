"use client";

import { useEffect, useRef, useState } from "react";
import type { Artist } from "@/lib/types";

export function ArtistPicker({
  current,
  onSelect,
}: {
  current: Artist;
  onSelect: (artist: Artist) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ q: string; artists: Artist[] } | null>(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const q = query.trim();

  useEffect(() => {
    if (!q) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/artists?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: { artists?: Artist[] }) => setResults({ q, artists: d.artists ?? [] }))
        .catch(() => {});
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const loading = !!q && results?.q !== q;
  const artists = q && results?.q === q ? results.artists : [];

  return (
    <div ref={boxRef} className="relative w-full sm:w-80">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={`目前：${current.name}，搜尋其他歌手…`}
        className="w-full rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm outline-none placeholder:text-white/40 focus:border-violet-300/60"
      />
      {open && q && (
        <ul className="absolute z-20 mt-2 max-h-80 w-full overflow-auto rounded-2xl border border-white/10 bg-[#15123a] p-1 shadow-xl">
          {loading && <li className="px-3 py-2 text-sm text-white/50">搜尋中…</li>}
          {!loading && artists.length === 0 && (
            <li className="px-3 py-2 text-sm text-white/50">找不到歌手</li>
          )}
          {artists.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => {
                  onSelect(a);
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-white/10"
              >
                <span>{a.name}</span>
                <span className="text-xs text-white/40">{a.genre}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
