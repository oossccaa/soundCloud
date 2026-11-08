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

// 三層字：主角（最愛的前幾首）→ 陪襯（其餘的歌，越後面越小越淡）→ 紋理（重複的更小更淡的字）
// 主角不要太大：圖在手機上看，48px 就很明顯了；字小一點，長歌名直著放也塞得進去，排列才有變化
const HERO_MAX = 96;
const HERO_DECAY = 0.9;
const SUPPORT_MAX = 34;
const SUPPORT_MIN = 18;
const TEXTURE_MIN = 10;
const TEXTURE_MAX = 18;
/** 紋理字的數量：要多到能填滿形狀，放不下的會被略過 */
const TEXTURE_COUNT = 280;
/** 主角最多幾首；歌少時取前 30%，至少 1 首 */
const heroCountFor = (n: number) => Math.min(ACCENTS.length, Math.max(1, Math.ceil(n * 0.3)));

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
): { main: WordSpec[]; texture: WordSpec[] } {
  const n = titles.length;
  const heroCount = heroCountFor(n);
  const ems = titles.map(measureEm);
  const scale = layout.wordScale;

  // 主角：依名次遞減，長歌名有寬度上限，而且不能比前一名大
  const main: WordSpec[] = [];
  for (let i = 0; i < heroCount; i++) {
    const widthCap = (layout.cloud.w * 0.88) / ems[i];
    const size = Math.min(HERO_MAX * HERO_DECAY ** i * scale, widthCap, main[i - 1]?.size ?? Infinity);
    main.push({ text: titles[i], size: Math.round(size), color: ACCENTS[i] });
  }

  // 陪襯：名次越後面字越小、越淡
  const supportCount = n - heroCount;
  for (let j = 0; j < supportCount; j++) {
    const t = supportCount === 1 ? 0 : j / (supportCount - 1); // 0 → 1
    main.push({
      text: titles[heroCount + j],
      size: Math.round((SUPPORT_MAX - (SUPPORT_MAX - SUPPORT_MIN) * t) * scale),
      color: withAlpha(pick(ACCENTS, rand), 0.8 - 0.3 * t),
    });
  }

  const texture: WordSpec[] = [];
  if (repeat || n < MIN_SONGS_WITHOUT_REPEAT) {
    // 紋理：所有歌名重複成更小更淡的字，填滿形狀；長歌名再縮小，避免變成一條條細長的雜訊
    // 每個填充字尾端加不同數量的零寬空白，讓它和主字、其他填充字的 key 都不同
    const repeats = Math.min(20, Math.max(1, Math.ceil(TEXTURE_COUNT / n)));
    for (let r = 0; r < repeats; r++) {
      titles.forEach((text, i) => {
        const lengthFactor = Math.min(1, Math.sqrt(4 / ems[i]));
        texture.push({
          text: text + "\u200b".repeat(r + 1),
          size: Math.round((TEXTURE_MIN + rand() * (TEXTURE_MAX - TEXTURE_MIN)) * lengthFactor * scale),
          color: pick(FILLERS, rand),
        });
      });
    }
  }

  const bySize = (a: WordSpec, b: WordSpec) => b.size - a.size;
  return { main: main.sort(bySize), texture: texture.sort(bySize) };
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
  const { main, texture } = buildWords(input.titles, measureEm, rand, input.repeat, layout);

  const cloud = document.createElement("canvas");
  cloud.width = layout.cloud.w;
  cloud.height = layout.cloud.h;
  const cloudCtx = cloud.getContext("2d")!;

  // 形狀遮罩：先把形狀以外塗滿，wordcloud2（clearCanvas: false）會當成已佔用，字就只會放在形狀裡；
  // 畫完再把遮罩擦掉。沒有遮罩的話，形狀大小由字數決定，放不下的大字會一路跑到畫布邊緣
  const shapePath = new Path2D();
  shapePath.ellipse(cloud.width / 2, cloud.height / 2, cloud.width / 2, cloud.height / 2, 0, 0, Math.PI * 2);
  cloudCtx.fillStyle = "#000";
  cloudCtx.fillRect(0, 0, cloud.width, cloud.height);
  cloudCtx.globalCompositeOperation = "destination-out";
  cloudCtx.fill(shapePath);
  cloudCtx.globalCompositeOperation = "source-over";

  // 分兩次畫：先放主角和陪襯，再讓紋理填進剩下的空位。
  // 第二次 clearCanvas: false，wordcloud2 會把已經畫好的字當成佔用，所以兩層不會重疊，
  // 而且紋理可以用比較高的直排比例，做出橫直交錯的編織感
  const runPass = (words: WordSpec[], options: { rotateRatio: number; gridSize: number; shrinkToFit: boolean }) =>
    new Promise<void>((resolve) => {
      if (words.length === 0 || signal.aborted) return resolve();
      const onAbort = () => {
        WordCloud.stop();
        resolve();
      };
      signal.addEventListener("abort", onAbort, { once: true });
      cloud.addEventListener(
        "wordcloudstop",
        () => {
          signal.removeEventListener("abort", onAbort);
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
        shape: "circle",
        ellipticity: layout.cloud.h / layout.cloud.w,
        rotationSteps: 2,
        minSize: 6,
        drawOutOfBound: false,
        clearCanvas: false,
        shuffle: true,
        ...options,
      });
    });

  await runPass(main, { rotateRatio: 0.3, gridSize: 6, shrinkToFit: true });
  // 紋理字很多，放不下就直接略過，不要一直縮小重試（很慢）
  await runPass(texture, { rotateRatio: 0.5, gridSize: 4, shrinkToFit: false });
  if (signal.aborted) return;

  // 擦掉形狀以外的遮罩
  cloudCtx.globalCompositeOperation = "destination-out";
  const outside = new Path2D();
  outside.rect(0, 0, cloud.width, cloud.height);
  outside.addPath(shapePath);
  cloudCtx.fill(outside, "evenodd");
  cloudCtx.globalCompositeOperation = "source-over";

  if (signal.aborted) return;
  ctx.drawImage(cloud, (layout.width - layout.cloud.w) / 2, layout.cloud.top);
}
