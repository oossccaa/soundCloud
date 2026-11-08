// 把歌單排行畫成 IG 用的 1080x1080 文字雲圖片（宇宙風格，單一版型）

export const IMAGE_SIZE = 1080;
const CLOUD_W = 1000;
const CLOUD_H = 790;
const CLOUD_TOP = 168;

const ACCENTS = ["#FFD166", "#FF6B9A", "#7AE7FF", "#B69CFF", "#8CFFB5", "#FFFFFF"];
const FILLERS = [
  "rgba(182,156,255,0.55)",
  "rgba(122,231,255,0.5)",
  "rgba(255,255,255,0.4)",
  "rgba(255,107,154,0.45)",
];

export type CloudInput = {
  title: string;
  subtitle: string;
  titles: string[];
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
): WordSpec[] {
  const n = titles.length;
  const words: WordSpec[] = titles.map((text, i) => {
    const w = n === 1 ? 1 : 1 - (i / (n - 1)) * 0.85;
    const cap = (CLOUD_W * 0.72) / measureEm(text);
    const size = Math.round(Math.min(22 + 118 * w ** 1.8, cap));
    const color = i < ACCENTS.length ? ACCENTS[i] : ACCENTS[Math.floor(rand() * ACCENTS.length)];
    return { text, size, color };
  });

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

function drawBackground(ctx: CanvasRenderingContext2D, rand: () => number) {
  const S = IMAGE_SIZE;
  const bg = ctx.createRadialGradient(S / 2, S * 0.55, 60, S / 2, S / 2, S * 0.75);
  bg.addColorStop(0, "#2a1f6b");
  bg.addColorStop(0.55, "#141238");
  bg.addColorStop(1, "#070918");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);

  for (let i = 0; i < 160; i++) {
    const r = rand() * 1.6 + 0.3;
    ctx.globalAlpha = 0.25 + rand() * 0.6;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(rand() * S, rand() * S, r, 0, Math.PI * 2);
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

function drawTexts(ctx: CanvasRenderingContext2D, input: CloudInput) {
  const S = IMAGE_SIZE;
  const ff = input.fontFamily;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(182,156,255,0.8)";
  ctx.shadowBlur = 24;
  ctx.font = `900 68px ${ff}`;
  ctx.fillText(fitText(ctx, input.title, S - 120), S / 2, 102);
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#c9c2ff";
  ctx.font = `500 30px ${ff}`;
  ctx.fillText(fitText(ctx, input.subtitle, S - 160), S / 2, 146);

  const top3 = input.titles
    .slice(0, 3)
    .map((t, i) => `${String(i + 1).padStart(2, "0")} ${t}`)
    .join("    ");
  if (top3) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `700 26px ${ff}`;
    ctx.fillText(fitText(ctx, top3, S - 120), S / 2, S - 50);
  }
}

/** 等字型載好再畫，否則 canvas 會用 fallback 字型 */
async function ensureFonts(fontFamily: string) {
  await Promise.all(
    ["500", "700", "900"].map((w) => document.fonts.load(`${w} 40px ${fontFamily}`, "宇宙人Aa")),
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

  canvas.width = IMAGE_SIZE;
  canvas.height = IMAGE_SIZE;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(input.seed);

  drawBackground(ctx, rand);
  drawTexts(ctx, input);
  if (input.titles.length === 0) return;

  ctx.font = `900 100px ${input.fontFamily}`;
  const measureEm = (text: string) => Math.max(ctx.measureText(text).width / 100, 1);
  const words = buildWords(input.titles, measureEm, rand);

  const cloud = document.createElement("canvas");
  cloud.width = CLOUD_W;
  cloud.height = CLOUD_H;

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
      ellipticity: CLOUD_H / CLOUD_W,
      rotateRatio: 0.2,
      rotationSteps: 2,
      minSize: 6,
      shrinkToFit: true,
      drawOutOfBound: false,
      shuffle: true,
    });
  });

  if (signal.aborted) return;
  ctx.drawImage(cloud, (IMAGE_SIZE - CLOUD_W) / 2, CLOUD_TOP);
}
