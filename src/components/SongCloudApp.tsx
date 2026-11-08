"use client";

import { useEffect, useMemo, useState } from "react";
import { ArtistPicker } from "./ArtistPicker";
import { CloudPreview } from "./CloudPreview";
import { RankingList, type RankedSong } from "./RankingList";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { DEFAULT_ARTIST, type Artist, type Song } from "@/lib/types";

type Catalog = { artistId: number; songs: Song[]; error?: string };

export function SongCloudApp({ fontFamily }: { fontFamily: string }) {
  const [artist, setArtist] = useLocalStorage<Artist>("song-cloud:artist", DEFAULT_ARTIST);
  const [ranking, setRanking] = useLocalStorage<RankedSong[]>(`song-cloud:ranking:${artist.id}`, []);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [filter, setFilter] = useState("");
  const [custom, setCustom] = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/artists/${artist.id}/songs`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { songs?: Song[]; error?: string }) =>
        setCatalog({ artistId: artist.id, songs: d.songs ?? [], error: d.error }),
      )
      .catch((err) => {
        if (!ctrl.signal.aborted) setCatalog({ artistId: artist.id, songs: [], error: String(err) });
      });
    return () => ctrl.abort();
  }, [artist.id]);

  const loading = catalog?.artistId !== artist.id;
  const songs = useMemo(() => (loading ? [] : catalog!.songs), [loading, catalog]);
  const rankedIds = useMemo(() => new Set(ranking.map((s) => s.id)), [ranking]);
  const rankedTitles = useMemo(() => new Set(ranking.map((s) => s.title)), [ranking]);

  const visibleSongs = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? songs.filter((s) => `${s.title} ${s.album}`.toLowerCase().includes(f)) : songs;
  }, [songs, filter]);

  const addSong = (song: Song) =>
    setRanking((prev) =>
      prev.some((s) => s.id === song.id) ? prev : [...prev, { id: song.id, title: song.title, album: song.album }],
    );

  const addCustom = () => {
    const title = custom.trim();
    if (!title || rankedTitles.has(title)) return;
    setRanking((prev) => [...prev, { id: `custom:${title}`, title }]);
    setCustom("");
  };

  const addTop = (n: number) =>
    setRanking((prev) => {
      const have = new Set(prev.map((s) => s.id));
      const extra = songs
        .filter((s) => !have.has(s.id))
        .slice(0, Math.max(0, n - prev.length))
        .map((s) => ({ id: s.id, title: s.title, album: s.album }));
      return [...prev, ...extra];
    });

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Song Cloud <span className="text-violet-300">歌單文字雲</span>
          </h1>
          <p className="mt-1 text-sm text-white/50">
            目前歌手：
            <span className="font-bold text-white">{artist.name}</span>
          </p>
        </div>
        <ArtistPicker current={artist} onSelect={(a) => setArtist(a)} />
      </header>

      <main className="grid gap-6 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.3fr]">
        {/* 歌曲庫 */}
        <section className="flex min-w-0 flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">
              歌曲庫 <span className="text-sm font-normal text-white/40">{songs.length} 首 · 依熱門排序</span>
            </h2>
            <button
              onClick={() => addTop(10)}
              disabled={loading || songs.length === 0}
              className="rounded-full border border-white/15 px-3 py-1 text-xs hover:bg-white/10 disabled:opacity-40"
            >
              補滿熱門 Top 10
            </button>
          </div>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="篩選歌名 / 專輯"
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:border-violet-300/60"
          />
          <ul className="flex max-h-[28rem] flex-col gap-1 overflow-auto pr-1 xl:max-h-[36rem]">
            {loading && <li className="p-4 text-center text-sm text-white/50">載入 {artist.name} 的歌曲中…</li>}
            {!loading && catalog?.error && <li className="p-4 text-center text-sm text-red-300">{catalog.error}</li>}
            {visibleSongs.map((song) => {
              const added = rankedIds.has(song.id);
              return (
                <li key={song.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/5">
                  {song.artwork && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={song.artwork} alt="" width={36} height={36} className="size-9 shrink-0 rounded-md" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{song.title}</div>
                    <div className="truncate text-xs text-white/40">{song.album}</div>
                  </div>
                  <button
                    onClick={() => addSong(song)}
                    disabled={added}
                    className="size-8 shrink-0 rounded-full border border-white/15 text-lg leading-none hover:bg-violet-300/20 disabled:border-transparent disabled:text-emerald-300"
                    aria-label={added ? "已加入" : "加入排行"}
                  >
                    {added ? "✓" : "+"}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex gap-2 border-t border-white/10 pt-3">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
              placeholder="找不到？手動輸入歌名"
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:border-violet-300/60"
            />
            <button onClick={addCustom} className="rounded-xl border border-white/15 px-3 text-sm hover:bg-white/10">
              加入
            </button>
          </div>
        </section>

        {/* 我的排行 */}
        <section className="flex min-w-0 flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">
              我的排行 <span className="text-sm font-normal text-white/40">{ranking.length} 首 · 可拖曳排序</span>
            </h2>
            {ranking.length > 0 && (
              <button
                onClick={() => confirm("確定清空排行？") && setRanking([])}
                className="rounded-full px-3 py-1 text-xs text-white/50 hover:bg-red-400/20 hover:text-red-300"
              >
                清空
              </button>
            )}
          </div>
          <div className="max-h-[36rem] overflow-auto pr-1">
            <RankingList items={ranking} onChange={setRanking} />
          </div>
        </section>

        {/* 文字雲 */}
        <section className="mx-auto flex w-full min-w-0 max-w-xl flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:col-span-2 xl:col-span-1 xl:max-w-none">
          <h2 className="font-bold">文字雲預覽</h2>
          {/* key：切換歌手時重設標題 / 副標題 */}
          <CloudPreview key={artist.id} artistName={artist.name} titles={ranking.map((s) => s.title)} fontFamily={fontFamily} />
        </section>
      </main>

      <footer className="text-center text-xs text-white/30">歌曲資料來源：iTunes Search API（台灣區）</footer>
    </div>
  );
}
