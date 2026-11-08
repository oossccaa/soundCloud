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

const CLOUD_W = 1000;

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

/** 排名越前字越大；同時依歌名長度限制最大字級，避免長歌名塞不進去 */
function buildWords(
  titles: string[],
  measureEm: (text: string) => number,
  rand: () => number,
  repeat: boolean,
  scale: number,
): WordSpec[] {
  const n = titles.length;
  const words: WordSpec[] = titles.map((text, i) => {
    const w = n === 1 ? 1 : 1 - (i / (n - 1)) * 0.85;
    const cap = (CLOUD_W * 0.72) / measureEm(text);
    const size = Math.round(Math.min((22 + 118 * w ** 1.8) * scale, cap));
    const color = i < ACCENTS.length ? ACCENTS[i] : ACCENTS[Math.floor(rand() * ACCENTS.length)];
    return { text, size, color };
  });

  if (!repeat && n >= MIN_SONGS_WITHOUT_REPEAT) return words;

  // 小字重複填滿形狀，做出 WordArt 那種密集感
  // 每個填充字尾端加不同數量的零寬空白，讓它和主字、其他填充字的 key 都不同
  const repeats = Math.min(6, Math.max(1, Math.ceil(80 / n)));
  for (let r = 0; r < repeats; r++) {
    for (const text of titles) {
      words.push({
        text: text + "​".repeat(r + 1),
        size: 12 + Math.floor(rand() * 13),
        color: FILLERS[Math.floor(rand() * FILLERS.length)],
      });
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
  const words = buildWords(input.titles, measureEm, rand, input.repeat, layout.wordScale);

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
