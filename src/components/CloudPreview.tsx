"use client";

import { useEffect, useRef, useState } from "react";
import { LAYOUTS, MIN_SONGS_WITHOUT_REPEAT, renderCloud, type CloudFormat } from "@/lib/cloud";

const FORMAT_OPTIONS: { value: CloudFormat; label: string }[] = [
  { value: "square", label: "方形貼文 1:1" },
  { value: "story", label: "限時動態 9:16" },
];

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
  const [repeatPref, setRepeatPref] = useState(false);
  const [format, setFormat] = useState<CloudFormat>("square");
  const layout = LAYOUTS[format];

  const trimmedTitle = title.trim();
  const titleMissing = trimmedTitle === "";
  // 副標題沒被手動改過之前，跟著歌曲數量自動更新
  const effectiveSubtitle = subtitleEdited ? subtitle.trim() : `我的歌單排行 Top ${titles.length}`;
  const titlesKey = titles.join("\n");
  const repeatForced = titles.length < MIN_SONGS_WITHOUT_REPEAT;
  const repeat = repeatForced || repeatPref;

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
          format,
          title: trimmedTitle,
          subtitle: effectiveSubtitle,
          titles: titlesKey ? titlesKey.split("\n") : [],
          repeat,
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
  }, [format, trimmedTitle, effectiveSubtitle, titlesKey, repeat, fontFamily, seed]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas || titleMissing) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${trimmedTitle}-${format}.png`;
    a.click();
  };

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="圖片尺寸" className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
        {FORMAT_OPTIONS.map((o) => (
          <button
            key={o.value}
            role="radio"
            aria-checked={format === o.value}
            onClick={() => setFormat(o.value)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              format === o.value ? "bg-violet-300/20 font-bold text-white" : "text-white/60 hover:bg-white/5"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* 限動太長，預覽限制在約 75% 螢幕高度內 */}
      <div
        className="relative mx-auto w-full overflow-hidden rounded-2xl border border-white/10"
        style={{ maxWidth: `min(100%, calc(75vh * ${layout.width / layout.height}))` }}
      >
        <canvas
          ref={canvasRef}
          width={layout.width}
          height={layout.height}
          className="block h-auto w-full"
          style={{ aspectRatio: `${layout.width} / ${layout.height}` }}
        />
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

      <label className={`flex items-center gap-2 text-sm ${repeatForced ? "text-white/50" : ""}`}>
        <input
          type="checkbox"
          checked={repeat}
          disabled={repeatForced}
          onChange={(e) => setRepeatPref(e.target.checked)}
          className="size-4 accent-violet-400"
        />
        小字重複填滿
        {repeatForced && (
          <span className="text-xs text-white/40">（少於 {MIN_SONGS_WITHOUT_REPEAT} 首會自動開啟）</span>
        )}
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
          ⬇ 下載 PNG（{layout.width}×{layout.height}）
        </button>
      </div>
    </div>
  );
}
