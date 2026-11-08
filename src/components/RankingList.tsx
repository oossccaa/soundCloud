"use client";

import { useState, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type RankedSong = { id: number | string; title: string; album?: string };

const RANK_COLORS = ["text-[#FFD166]", "text-[#FF6B9A]", "text-[#7AE7FF]"];
const iconButton =
  "grid size-8 place-items-center rounded-md hover:bg-white/10 disabled:opacity-20 sm:size-7";
// 手機上已經能用把手拖曳，↑↓ 只在桌面顯示，把空間留給歌名
const stepButton = `${iconButton} hidden sm:grid`;

export function RankingList({
  items,
  onChange,
}: {
  items: RankedSong[];
  onChange: (items: RankedSong[]) => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [rankDraft, setRankDraft] = useState("");

  // 只有拖曳把手會啟動拖曳，手指在其他地方滑動仍然是捲動頁面
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const move = (from: number, to: number) => {
    to = Math.min(Math.max(to, 0), items.length - 1);
    if (from === to) return;
    onChange(arrayMove(items, from, to));
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    move(
      items.findIndex((s) => s.id === active.id),
      items.findIndex((s) => s.id === over.id),
    );
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
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <ol className="flex flex-col gap-1.5">
          {items.map((song, i) => (
            <SortableRow key={song.id} id={song.id}>
              {editingIndex === i ? (
                <input
                  autoFocus
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={items.length}
                  value={rankDraft}
                  onChange={(e) => setRankDraft(e.target.value)}
                  onBlur={commitRank}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRank();
                    if (e.key === "Escape") setEditingIndex(null);
                  }}
                  className="w-10 shrink-0 rounded-md border border-violet-300/60 bg-black/30 px-1 text-center text-base font-black outline-none [appearance:textfield] sm:text-sm [&::-webkit-inner-spin-button]:appearance-none"
                />
              ) : (
                <button
                  onClick={() => startEditRank(i)}
                  title="點一下輸入名次"
                  className={`h-8 w-10 shrink-0 rounded-md text-center text-sm font-black hover:bg-white/10 ${
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
              <div className="flex shrink-0 text-white/60">
                <button onClick={() => move(i, 0)} disabled={i === 0} title="置頂" className={iconButton} aria-label="置頂">
                  ⤒
                </button>
                <button onClick={() => move(i, i - 1)} disabled={i === 0} className={stepButton} aria-label="上移">
                  ↑
                </button>
                <button onClick={() => move(i, i + 1)} disabled={i === items.length - 1} className={stepButton} aria-label="下移">
                  ↓
                </button>
                <button
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                  className={`${iconButton} hover:bg-red-400/20 hover:text-red-300`}
                  aria-label="移除"
                >
                  ✕
                </button>
              </div>
            </SortableRow>
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ id, children }: { id: RankedSong["id"]; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <li
      ref={setNodeRef}
      style={{
        // 只允許上下移動
        transform: CSS.Translate.toString(transform && { ...transform, x: 0 }),
        transition,
      }}
      className={`relative flex items-center gap-1 rounded-xl border py-1 pl-1 pr-1.5 ${
        isDragging
          ? "z-10 border-violet-300/70 bg-[#2a2160] shadow-lg shadow-black/40"
          : "border-white/10 bg-white/5"
      }`}
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label="拖曳排序"
        className="grid h-9 w-7 shrink-0 cursor-grab touch-none place-items-center rounded-md text-white/40 hover:bg-white/10 active:cursor-grabbing"
      >
        ⠿
      </button>
      {children}
    </li>
  );
}
