"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  LAYOUTS,
  MIN_SONGS_WITHOUT_REPEAT,
  SHAPES,
  THEMES,
  renderCloud,
  type CloudFormat,
  type CloudInput,
  type CloudShape,
  type CloudTheme,
} from "@/lib/cloud";
import type { CloudFont } from "@/app/fonts";

const FORMAT_OPTIONS: { value: CloudFormat; label: string }[] = [
  { value: "square", label: "方形貼文 1:1" },
  { value: "story", label: "限時動態 9:16" },
];

const entries = <K extends string, V>(record: Record<K, V>) => Object.entries(record) as [K, V][];

// 觸控裝置（手機、平板）改用系統分享選單，才能「儲存影像」到相簿或直接分享到 IG
const COARSE_POINTER = "(pointer: coarse)";
function useIsTouchDevice() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(COARSE_POINTER);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(COARSE_POINTER).matches,
    () => false,
  );
}

const inputClass =
  "w-full rounded-xl border bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/40";

/** 不含 seed 的設定內容，用來判斷有沒有變更 */
const settingsKey = (input: CloudInput) => JSON.stringify({ ...input, seed: 0 });

export function CloudPreview({
  artistName,
  titles,
  fonts,
}: {
  artistName: string;
  titles: string[];
  fonts: CloudFont[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 每次畫完就先轉好 PNG：iOS Safari 要求 navigator.share 在點擊當下同步呼叫，不能先 await toBlob
  const blobRef = useRef<Blob | null>(null);
  const isTouch = useIsTouchDevice();
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  // 編輯中的設定（草稿）
  const [title, setTitle] = useState(artistName);
  const [subtitle, setSubtitle] = useState("");
  const [subtitleEdited, setSubtitleEdited] = useState(false);
  const [format, setFormat] = useState<CloudFormat>("square");
  const [shape, setShape] = useState<CloudShape>("free");
  const [theme, setTheme] = useState<CloudTheme>("cosmos");
  const [fontId, setFontId] = useState(fonts[0].id);
  const [repeatPref, setRepeatPref] = useState(true);

  const trimmedTitle = title.trim();
  const titleMissing = trimmedTitle === "";
  // 副標題沒被手動改過之前，跟著歌曲數量自動更新
  const effectiveSubtitle = subtitleEdited ? subtitle.trim() : `我的歌單排行 Top ${titles.length}`;
  const repeatForced = titles.length < MIN_SONGS_WITHOUT_REPEAT;
  const repeat = repeatForced || repeatPref;
  const font = fonts.find((f) => f.id === fontId) ?? fonts[0];

  const draftInput = (seed: number): CloudInput => ({
    format,
    shape,
    theme,
    font: { family: font.family, weight: font.weight, lightWeight: font.lightWeight },
    title: trimmedTitle,
    subtitle: effectiveSubtitle,
    titles,
    repeat,
    seed,
  });

  // 畫面上的圖用的設定：改設定不會即時重畫（文字雲很吃效能），按按鈕才套用
  const [applied, setApplied] = useState<CloudInput>(() => draftInput(1));
  const dirty = settingsKey(draftInput(applied.seed)) !== settingsKey(applied);
  const layout = LAYOUTS[applied.format];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctrl = new AbortController();
    // 等這次 commit 完再開始畫，避免在 effect 裡同步 setState
    queueMicrotask(() => {
      if (ctrl.signal.aborted) return;
      setRendering(true);
      blobRef.current = null;
      renderCloud(canvas, applied, ctrl.signal).finally(() => {
        if (ctrl.signal.aborted) return;
        canvas.toBlob((blob) => {
          if (ctrl.signal.aborted) return;
          blobRef.current = blob;
          setRendering(false);
        }, "image/png");
      });
    });
    return () => ctrl.abort();
  }, [applied]);

  const generate = () => {
    if (titleMissing) return;
    setApplied((prev) => draftInput(prev.seed + 1));
  };

  const filename = `${applied.title}-${applied.format}.png`;

  const download = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /** 不支援分享選單時（例如 IG、LINE 內建瀏覽器），顯示圖片讓使用者長按儲存 */
  const showFallback = (blob: Blob) => setFallbackUrl(URL.createObjectURL(blob));

  const closeFallback = () => {
    if (fallbackUrl) URL.revokeObjectURL(fallbackUrl);
    setFallbackUrl(null);
  };

  const save = () => {
    const blob = blobRef.current;
    if (!blob) return;
    if (!isTouch) return download(blob);

    const file = new File([blob], filename, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      navigator.share({ files: [file] }).catch((err: unknown) => {
        // 使用者自己取消分享就不用處理
        if (err instanceof DOMException && err.name === "AbortError") return;
        showFallback(blob);
      });
    } else {
      showFallback(blob);
    }
  };

  return (
    <div className="flex flex-col gap-4">
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

      <Field label="尺寸">
        <Segmented options={FORMAT_OPTIONS} value={format} onChange={setFormat} label="圖片尺寸" columns={2} />
      </Field>

      <details className="group rounded-xl border border-white/10 bg-white/[0.03]">
        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-sm font-bold [&::-webkit-details-marker]:hidden">
          進階設定
          <span className="text-white/40 transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="flex flex-col gap-4 border-t border-white/10 p-3">
          <Field label="形狀">
            <Segmented
              options={entries(SHAPES).map(([value, s]) => ({ value, label: s.label }))}
              value={shape}
              onChange={setShape}
              label="形狀"
              columns={5}
            />
          </Field>

          <Field label="背景">
            <Segmented
              options={entries(THEMES).map(([value, t]) => ({
                value,
                label: (
                  <span className="flex items-center justify-center gap-1.5">
                    <span className="size-3.5 shrink-0 rounded-full ring-1 ring-white/30" style={{ background: t.swatch }} />
                    {t.label}
                  </span>
                ),
              }))}
              value={theme}
              onChange={setTheme}
              label="背景"
              columns={4}
            />
          </Field>

          <Field label="字體">
            <Segmented
              options={fonts.map((f) => ({
                value: f.id,
                label: <span style={{ fontFamily: f.family, fontWeight: f.weight }}>{f.label}</span>,
              }))}
              value={fontId}
              onChange={setFontId}
              label="字體"
              columns={4}
            />
          </Field>

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
        </div>
      </details>

      <div className="flex flex-col gap-2">
        {dirty && !titleMissing && (
          <p className="text-center text-xs text-amber-200/90">設定或排行有變更，按「套用變更」更新圖片</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={generate}
            disabled={titleMissing || rendering}
            title={titleMissing ? "請先填寫標題" : undefined}
            className={`flex-1 rounded-xl px-4 py-2 text-sm disabled:opacity-40 ${
              dirty
                ? "bg-amber-200 font-bold text-[#140f33] hover:brightness-110"
                : "border border-white/15 hover:bg-white/10"
            }`}
          >
            {dirty ? "✨ 套用變更" : "🔀 重新排列"}
          </button>
          <button
            onClick={save}
            disabled={applied.titles.length === 0 || rendering}
            className="flex-1 rounded-xl bg-gradient-to-r from-violet-400 to-pink-400 px-4 py-2 text-sm font-bold text-[#140f33] hover:brightness-110 disabled:opacity-40"
          >
            {isTouch ? "📲 儲存 / 分享圖片" : `⬇ 下載 PNG（${layout.width}×${layout.height}）`}
          </button>
        </div>
      </div>

      {fallbackUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="儲存圖片"
          onClick={closeFallback}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/85 p-4"
        >
          <p className="text-center text-sm text-white/80">
            長按圖片 →「加入照片」或「儲存圖片」
            <br />
            <span className="text-xs text-white/50">IG、LINE 的內建瀏覽器只能這樣存；用 Safari / Chrome 開可以直接分享</span>
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fallbackUrl}
            alt={filename}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[75vh] max-w-full rounded-xl object-contain"
          />
          <button onClick={closeFallback} className="rounded-full border border-white/20 px-5 py-2 text-sm">
            關閉
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-white/60">{label}</span>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  columns,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  columns: 2 | 4 | 5;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`grid gap-1 rounded-xl border border-white/10 bg-white/5 p-1 ${
        columns === 2 ? "grid-cols-2" : columns === 5 ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4"
      }`}
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-2 py-1.5 text-sm ${
            value === o.value ? "bg-violet-300/20 font-bold text-white" : "text-white/60 hover:bg-white/5"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
