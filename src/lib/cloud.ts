// 把歌單排行畫成 IG 用的文字雲圖片（宇宙風格，單一版型，方形 / 限動兩種尺寸）

export type CloudFormat = "square" | "story";

type Layout = {
  width: number;
  height: number;
  titleY: number;
  subtitleY: number;
  cloud: { w: number; h: number; top: number };
  /** 限動畫布比較高，字整體放大一點才不會太空 */
  wordScale: number;
};

// 限動上下約 250px 會被 IG 的頭像列和回覆框蓋住，標題和文字雲都避開
export const LAYOUTS: Record<CloudFormat, Layout> = {
  square: {
    width: 1080,
    height: 1080,
    titleY: 102,
    subtitleY: 146,
    cloud: { w: 1000, h: 870, top: 172 },
    wordScale: 1,
  },
  story: {
    width: 1080,
    height: 1920,
    titleY: 330,
    subtitleY: 378,
    cloud: { w: 1000, h: 1230, top: 420 },
    wordScale: 1.15,
  },
};

/** 歌曲少於這個數量時一定要重複填滿，不然形狀會太空 */
export const MIN_SONGS_WITHOUT_REPEAT = 20;

const ACCENTS = ["#FFD166", "#FF6B9A", "#7AE7FF", "#B69CFF", "#8CFFB5", "#FFFFFF"];
const FILLERS = [
  "rgba(182,156,255,0.55)",
  "rgba(122,231,255,0.5)",
  "rgba(255,255,255,0.4)",
  "rgba(255,107,154,0.45)",
];

export type CloudInput = {
  format: CloudFormat;
  title: string;
  subtitle: string;
  titles: string[];
  /** 是否用小字重複填滿；少於 MIN_SONGS_WITHOUT_REPEAT 首時會被強制開啟 */
  repeat: boolean;
  fontFamily: string;
  seed: number;
};

type WordSpec = { text: string; size: number; color: string };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 三層字：主角（最愛的前幾首，大字亮色）→ 陪襯（其餘的歌，小字、越後面越淡）→ 紋理（重複的更小更淡的字）
const HERO_MAX = 140;
const HERO_DECAY = 0.88;
const SUPPORT_MAX = 30;
const SUPPORT_MIN = 16;
/** 主角最多幾首；歌少時取前 30%，至少 1 首 */
const heroCountFor = (n: number) => Math.min(ACCENTS.length, Math.max(1, Math.ceil(n * 0.3)));

/** 主角放大到大約佔形狀這個比例（大字之間有空隙，實際看起來會少一些） */
const HERO_FILL_TARGET = 0.55;
const MAX_HERO_SCALE = 1.8;

function withAlpha(hex: string, alpha: number) {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha.toFixed(2)})`;
}

const pick = <T,>(list: T[], rand: () => number) => list[Math.floor(rand() * list.length)];

function buildWords(
  titles: string[],
  measureEm: (text: string) => number,
  rand: () => number,
  repeat: boolean,
  layout: Layout,
): WordSpec[] {
  const n = titles.length;
  const heroCount = heroCountFor(n);
  const ems = titles.map(measureEm);

  // 主角：依名次遞減，長歌名有寬度上限，而且不能比前一名大（可能被壓成一樣大，可接受）
  const heroSizes = (k: number) => {
    const sizes: number[] = [];
    for (let i = 0; i < heroCount; i++) {
      const widthCap = (layout.cloud.w * 0.88) / ems[i];
      sizes.push(Math.min(HERO_MAX * HERO_DECAY ** i * k, widthCap, sizes[i - 1] ?? Infinity));
    }
    return sizes;
  };

  // 主角太小時整體放大，讓主角撐起畫面中央
  const shapeArea = (Math.PI / 4) * layout.cloud.w * layout.cloud.h;
  const heroCoverage = (k: number) =>
    heroSizes(k).reduce((sum, size, i) => sum + size ** 2 * ems[i], 0) / shapeArea;
  let k = layout.wordScale;
  if (heroCoverage(k) < HERO_FILL_TARGET) {
    let lo = k;
    let hi = MAX_HERO_SCALE;
    for (let step = 0; step < 20; step++) {
      const mid = (lo + hi) / 2;
      if (heroCoverage(mid) < HERO_FILL_TARGET) lo = mid;
      else hi = mid;
    }
    k = lo;
  }

  const words: WordSpec[] = heroSizes(k).map((size, i) => ({
    text: titles[i],
    size: Math.round(size),
    color: ACCENTS[i],
  }));

  // 陪襯：名次越後面字越小、越淡
  const supportCount = n - heroCount;
  for (let j = 0; j < supportCount; j++) {
    const t = supportCount === 1 ? 0 : j / (supportCount - 1); // 0 → 1
    words.push({
      text: titles[heroCount + j],
      size: Math.round((SUPPORT_MAX - (SUPPORT_MAX - SUPPORT_MIN) * t) * layout.wordScale),
      color: withAlpha(pick(ACCENTS, rand), 0.8 - 0.3 * t),
    });
  }

  if (repeat || n < MIN_SONGS_WITHOUT_REPEAT) {
    // 紋理：所有歌名重複成更小更淡的字，填滿形狀
    // 每個填充字尾端加不同數量的零寬空白，讓它和主字、其他填充字的 key 都不同
    const repeats = Math.min(6, Math.max(1, Math.ceil(80 / n)));
    for (let r = 0; r < repeats; r++) {
      for (const text of titles) {
        words.push({
          text: text + "\u200b".repeat(r + 1),
          size: Math.round((11 + rand() * 9) * layout.wordScale),
          color: pick(FILLERS, rand),
        });
      }
    }
  }

  return words.sort((a, b) => b.size - a.size);
}

function drawBackground(ctx: CanvasRenderingContext2D, layout: Layout, rand: () => number) {
  const { width: W, height: H } = layout;
  const bg = ctx.createRadialGradient(W / 2, H * 0.55, 60, W / 2, H / 2, Math.max(W, H) * 0.75);
  bg.addColorStop(0, "#2a1f6b");
  bg.addColorStop(0.55, "#141238");
  bg.addColorStop(1, "#070918");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const stars = Math.round((160 * W * H) / (1080 * 1080));
  for (let i = 0; i < stars; i++) {
    const r = rand() * 1.6 + 0.3;
    ctx.globalAlpha = 0.25 + rand() * 0.6;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(rand() * W, rand() * H, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
  return t + "…";
}

function drawTexts(ctx: CanvasRenderingContext2D, layout: Layout, input: CloudInput) {
  const W = layout.width;
  const ff = input.fontFamily;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(182,156,255,0.8)";
  ctx.shadowBlur = 24;
  ctx.font = `900 68px ${ff}`;
  ctx.fillText(fitText(ctx, input.title, W - 120), W / 2, layout.titleY);
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#c9c2ff";
  ctx.font = `500 30px ${ff}`;
  ctx.fillText(fitText(ctx, input.subtitle, W - 160), W / 2, layout.subtitleY);
}

/** 等字型載好再畫，否則 canvas 會用 fallback 字型 */
async function ensureFonts(fontFamily: string) {
  await Promise.all(
    ["500", "900"].map((w) => document.fonts.load(`${w} 40px ${fontFamily}`, "宇宙人Aa")),
  );
}

export async function renderCloud(
  canvas: HTMLCanvasElement,
  input: CloudInput,
  signal: AbortSignal,
): Promise<void> {
  const { default: WordCloud } = await import("wordcloud");
  await ensureFonts(input.fontFamily);
  if (signal.aborted) return;

  const layout = LAYOUTS[input.format];
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(input.seed);

  drawBackground(ctx, layout, rand);
  drawTexts(ctx, layout, input);
  if (input.titles.length === 0) return;

  ctx.font = `900 100px ${input.fontFamily}`;
  const measureEm = (text: string) => Math.max(ctx.measureText(text).width / 100, 1);
  const words = buildWords(input.titles, measureEm, rand, input.repeat, layout);

  const cloud = document.createElement("canvas");
  cloud.width = layout.cloud.w;
  cloud.height = layout.cloud.h;

  await new Promise<void>((resolve) => {
    const done = () => resolve();
    cloud.addEventListener("wordcloudstop", done, { once: true });
    signal.addEventListener(
      "abort",
      () => {
        WordCloud.stop();
        resolve();
      },
      { once: true },
    );

    // weight 直接是字級（shrinkToFit 會把 weight 縮成 3/4 重試，所以不能拿來當 index）
    // 顏色用文字查表；填充字尾端加了零寬空白，跟主字分得開
    const colorOf = new Map(words.map((w) => [w.text, w.color]));
    WordCloud(cloud, {
      list: words.map((w) => [w.text, w.size]),
      color: (word) => colorOf.get(word) ?? "#ffffff",
      fontFamily: input.fontFamily,
      fontWeight: 900,
      backgroundColor: "rgba(0,0,0,0)",
      gridSize: 6,
      shape: "circle",
      ellipticity: layout.cloud.h / layout.cloud.w,
      rotateRatio: 0.2,
      rotationSteps: 2,
      minSize: 6,
      shrinkToFit: true,
      drawOutOfBound: false,
      shuffle: true,
    });
  });

  if (signal.aborted) return;
  ctx.drawImage(cloud, (layout.width - layout.cloud.w) / 2, layout.cloud.top);
}
