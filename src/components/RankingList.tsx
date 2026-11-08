"use client";

import { useState } from "react";

export type RankedSong = { id: number | string; title: string; album?: string };

const RANK_COLORS = ["text-[#FFD166]", "text-[#FF6B9A]", "text-[#7AE7FF]"];

export function RankingList({
  items,
  onChange,
}: {
  items: RankedSong[];
  onChange: (items: RankedSong[]) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [rankDraft, setRankDraft] = useState("");

  const move = (from: number, to: number) => {
    to = Math.min(Math.max(to, 0), items.length - 1);
    if (from === to) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const startEditRank = (i: number) => {
    setEditingIndex(i);
    setRankDraft(String(i + 1));
  };

  const commitRank = () => {
    if (editingIndex == null) return;
    const target = Number.parseInt(rankDraft, 10);
    if (Number.isFinite(target)) move(editingIndex, target - 1);
    setEditingIndex(null);
  };

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-white/50">
        從左邊歌曲庫按 ＋ 加入歌曲，
        <br />
        排越前面字越大
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-1.5">
      {items.map((song, i) => (
        <li
          key={song.id}
          draggable={editingIndex !== i}
          onDragStart={() => setDragIndex(i)}
          onDragOver={(e) => {
            e.preventDefault();
            setOverIndex(i);
          }}
          onDrop={() => {
            if (dragIndex != null) move(dragIndex, i);
            setDragIndex(null);
            setOverIndex(null);
          }}
          onDragEnd={() => {
            setDragIndex(null);
            setOverIndex(null);
          }}
          className={`group flex cursor-grab items-center gap-2 rounded-xl border px-2 py-1.5 active:cursor-grabbing ${
            overIndex === i && dragIndex !== i
              ? "border-violet-300/70 bg-violet-300/10"
              : "border-white/10 bg-white/5"
          } ${dragIndex === i ? "opacity-40" : ""}`}
        >
          {editingIndex === i ? (
            <input
              autoFocus
              type="number"
              min={1}
              max={items.length}
              value={rankDraft}
              onChange={(e) => setRankDraft(e.target.value)}
              onBlur={commitRank}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRank();
                if (e.key === "Escape") setEditingIndex(null);
              }}
              className="w-10 shrink-0 rounded-md border border-violet-300/60 bg-black/30 px-1 text-center text-sm font-black outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
          ) : (
            <button
              onClick={() => startEditRank(i)}
              title="點一下輸入名次"
              className={`w-10 shrink-0 rounded-md text-center text-sm font-black hover:bg-white/10 ${
                RANK_COLORS[i] ?? "text-white/50"
              }`}
            >
              {i + 1}
            </button>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm">{song.title}</div>
            {song.album && <div className="truncate text-xs text-white/40">{song.album}</div>}
          </div>
          <div className="flex shrink-0 gap-0.5 text-white/60">
            <button onClick={() => move(i, 0)} disabled={i === 0} title="置頂" className="rounded px-1.5 hover:bg-white/10 disabled:opacity-20" aria-label="置頂">
              ⤒
            </button>
            <button onClick={() => move(i, i - 1)} disabled={i === 0} className="rounded px-1.5 hover:bg-white/10 disabled:opacity-20" aria-label="上移">
              ↑
            </button>
            <button onClick={() => move(i, i + 1)} disabled={i === items.length - 1} className="rounded px-1.5 hover:bg-white/10 disabled:opacity-20" aria-label="下移">
              ↓
            </button>
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="rounded px-1.5 hover:bg-red-400/20 hover:text-red-300" aria-label="移除">
              ✕
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}
