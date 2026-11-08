"use client";

import { useEffect, useRef, useState } from "react";
import { renderCloud } from "@/lib/cloud";

const inputClass =
  "w-full rounded-xl border bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/40";

export function CloudPreview({
  artistName,
  titles,
  fontFamily,
}: {
  artistName: string;
  titles: string[];
  fontFamily: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [seed, setSeed] = useState(1);
  const [title, setTitle] = useState(artistName);
  const [subtitle, setSubtitle] = useState(`我的歌單排行 Top ${titles.length}`);
  const [subtitleEdited, setSubtitleEdited] = useState(false);
  const [rendering, setRendering] = useState(false);

  const trimmedTitle = title.trim();
  const titleMissing = trimmedTitle === "";
  // 副標題沒被手動改過之前，跟著歌曲數量自動更新
  const effectiveSubtitle = subtitleEdited ? subtitle.trim() : `我的歌單排行 Top ${titles.length}`;
  const titlesKey = titles.join("\n");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctrl = new AbortController();
    // 排行或文字連續調整時不要每次都重畫
    const timer = setTimeout(() => {
      setRendering(true);
      renderCloud(
        canvas,
        {
          title: trimmedTitle,
          subtitle: effectiveSubtitle,
          titles: titlesKey ? titlesKey.split("\n") : [],
          fontFamily,
          seed,
        },
        ctrl.signal,
      ).finally(() => {
        if (!ctrl.signal.aborted) setRendering(false);
      });
    }, 350);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [trimmedTitle, effectiveSubtitle, titlesKey, fontFamily, seed]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas || titleMissing) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${trimmedTitle}-song-cloud.png`;
    a.click();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-2xl border border-white/10">
        <canvas ref={canvasRef} width={1080} height={1080} className="block aspect-square w-full" />
        {rendering && (
          <div className="absolute right-3 top-3 rounded-full bg-black/50 px-3 py-1 text-xs text-white/80">
            生成中…
          </div>
        )}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-white/60">
          標題 <span className="text-pink-300">*</span>
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={30}
          aria-invalid={titleMissing}
          placeholder="例如：宇宙人"
          className={`${inputClass} ${
            titleMissing ? "border-pink-400/70" : "border-white/15 focus:border-violet-300/60"
          }`}
        />
        {titleMissing && <span className="text-xs text-pink-300">標題必填</span>}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-white/60">副標題（可留空）</span>
        <input
          value={subtitleEdited ? subtitle : effectiveSubtitle}
          onChange={(e) => {
            setSubtitle(e.target.value);
            setSubtitleEdited(true);
          }}
          maxLength={40}
          placeholder="例如：2026 年度最愛"
          className={`${inputClass} border-white/15 focus:border-violet-300/60`}
        />
      </label>

      <div className="flex gap-2">
        <button
          onClick={() => setSeed((s) => s + 1)}
          disabled={titles.length === 0}
          className="flex-1 rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-40"
        >
          🔀 重新排列
        </button>
        <button
          onClick={download}
          disabled={titles.length === 0 || rendering || titleMissing}
          title={titleMissing ? "請先填寫標題" : undefined}
          className="flex-1 rounded-xl bg-gradient-to-r from-violet-400 to-pink-400 px-4 py-2 text-sm font-bold text-[#140f33] hover:brightness-110 disabled:opacity-40"
        >
          ⬇ 下載 PNG（IG 1080×1080）
        </button>
      </div>
    </div>
  );
}
