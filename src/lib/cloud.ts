// 把歌單排行畫成 IG 用的文字雲圖片（方形 / 限動兩種尺寸，可選形狀、背景主題、字型）

export type CloudFormat = "square" | "story";
export type CloudShape = "free" | "ellipse" | "heart" | "star" | "square";
export type CloudTheme = "cosmos" | "sunset" | "mono" | "cream";

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

// ─── 形狀 ──────────────────────────────────────────────

/**
 * 在 w×h 的框裡畫出形狀；愛心、星星維持原本比例置中。
 * path 為 null 的「預設」不套遮罩：字從中心自然往外長，邊緣是不規則的雲狀
 */
export const SHAPES: Record<CloudShape, { label: string; path: ((w: number, h: number) => Path2D) | null }> = {
  free: { label: "預設", path: null },
  ellipse: {
    label: "圓形",
    path: (w, h) => {
      const p = new Path2D();
      p.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      return p;
    },
  },
  heart: {
    label: "愛心",
    path: (w, h) => {
      // 經典愛心參數式：x ∈ [-16, 16]、y ∈ [-17, 12]
      const scale = Math.min(w / 33, h / 30);
      const cx = w / 2;
      const cy = h / 2 - 2.5 * scale;
      const p = new Path2D();
      for (let i = 0; i <= 240; i++) {
        const t = (i / 240) * Math.PI * 2;
        const x = 16 * Math.sin(t) ** 3;
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        if (i === 0) p.moveTo(cx + x * scale, cy - y * scale);
        else p.lineTo(cx + x * scale, cy - y * scale);
      }
      p.closePath();
      return p;
    },
  },
  star: {
    label: "星星",
    path: (w, h) => {
      // 五角星的外框寬 1.902R、高 1.809R；內徑比一般星星胖一點，字才塞得進角
      const r = Math.min(w / 1.902, h / 1.809);
      const inner = r * 0.55;
      const cx = w / 2;
      const cy = h / 2 + (r * (1 - Math.cos(Math.PI / 5))) / 2;
      const p = new Path2D();
      for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? r : inner;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const x = cx + radius * Math.cos(a);
        const y = cy + radius * Math.sin(a);
        if (i === 0) p.moveTo(x, y);
        else p.lineTo(x, y);
      }
      p.closePath();
      return p;
    },
  },
  square: {
    label: "滿版",
    path: (w, h) => {
      const p = new Path2D();
      p.roundRect(0, 0, w, h, 48);
      return p;
    },
  },
};

// ─── 背景主題 ──────────────────────────────────────────

type Theme = {
  label: string;
  /** 設定面板上的色票 */
  swatch: string;
  drawBackground: (ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number) => void;
  /** 主角依名次用的顏色，也是陪襯隨機挑的顏色 */
  accents: string[];
  /** 紋理字的顏色（已含透明度） */
  fillers: string[];
  title: string;
  titleGlow: string | null;
  subtitle: string;
};

function drawStars(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number, density: number) {
  const count = Math.round((density * w * h) / (1080 * 1080));
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < count; i++) {
    const r = rand() * 1.6 + 0.3;
    ctx.globalAlpha = 0.25 + rand() * 0.6;
    ctx.beginPath();
    ctx.arc(rand() * w, rand() * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export const THEMES: Record<CloudTheme, Theme> = {
  cosmos: {
    label: "宇宙",
    swatch: "radial-gradient(circle at 50% 60%, #2a1f6b, #070918)",
    drawBackground: (ctx, w, h, rand) => {
      const bg = ctx.createRadialGradient(w / 2, h * 0.55, 60, w / 2, h / 2, Math.max(w, h) * 0.75);
      bg.addColorStop(0, "#2a1f6b");
      bg.addColorStop(0.55, "#141238");
      bg.addColorStop(1, "#070918");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      drawStars(ctx, w, h, rand, 160);
    },
    accents: ["#FFD166", "#FF6B9A", "#7AE7FF", "#B69CFF", "#8CFFB5", "#FFFFFF"],
    fillers: ["rgba(182,156,255,0.55)", "rgba(122,231,255,0.5)", "rgba(255,255,255,0.4)", "rgba(255,107,154,0.45)"],
    title: "#ffffff",
    titleGlow: "rgba(182,156,255,0.8)",
    subtitle: "#c9c2ff",
  },
  sunset: {
    label: "夕陽",
    swatch: "linear-gradient(180deg, #1a0a35, #4a1250, #7e2457, #a8445e)",
    // 底部不要太亮：字都是淺色系，背景亮起來就看不清楚
    drawBackground: (ctx, w, h, rand) => {
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#1a0a35");
      bg.addColorStop(0.45, "#4a1250");
      bg.addColorStop(0.8, "#7e2457");
      bg.addColorStop(1, "#a8445e");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      drawStars(ctx, w, h * 0.4, rand, 50);
    },
    accents: ["#FFE29A", "#FFFFFF", "#FFC7A8", "#FFB3C7", "#FFF1C1", "#F9D0F0"],
    fillers: ["rgba(255,236,200,0.5)", "rgba(255,255,255,0.42)", "rgba(255,190,210,0.5)", "rgba(255,226,154,0.45)"],
    title: "#ffffff",
    titleGlow: "rgba(255,150,120,0.8)",
    subtitle: "#ffe4d1",
  },
  mono: {
    label: "極簡黑",
    swatch: "radial-gradient(circle, #0b0b0c 45%, transparent 47%), conic-gradient(#FFD23F, #FF5C8A, #3EC5FF, #7CFFB2, #FFD23F)",
    drawBackground: (ctx, w, h) => {
      const bg = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, Math.max(w, h) * 0.7);
      bg.addColorStop(0, "#1c1c1e");
      bg.addColorStop(1, "#0b0b0c");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
    },
    // 黑底配鮮豔的彩色字，跟宇宙主題比起來少了星空和漸層，顏色更跳
    accents: ["#FFD23F", "#FF5C8A", "#3EC5FF", "#7CFFB2", "#B98CFF", "#FF9F43"],
    fillers: ["rgba(255,92,138,0.45)", "rgba(62,197,255,0.45)", "rgba(255,210,63,0.4)", "rgba(124,255,178,0.4)", "rgba(185,140,255,0.45)"],
    title: "#ffffff",
    titleGlow: null,
    subtitle: "rgba(255,255,255,0.6)",
  },
  cream: {
    label: "奶油白",
    swatch: "radial-gradient(circle, #fffaf1, #efe6d6)",
    drawBackground: (ctx, w, h) => {
      const bg = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, Math.max(w, h) * 0.75);
      bg.addColorStop(0, "#FFFAF1");
      bg.addColorStop(1, "#EFE6D6");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
    },
    accents: ["#1F2937", "#B4472E", "#2F6F62", "#9C2F5A", "#2D4A8A", "#6B5B4B"],
    fillers: ["rgba(31,41,55,0.28)", "rgba(180,71,46,0.3)", "rgba(47,111,98,0.3)", "rgba(45,74,138,0.28)"],
    title: "#1F2937",
    titleGlow: null,
    subtitle: "#6B5B4B",
  },
};

// ─── 字的大小與分層 ────────────────────────────────────

export type CloudFontSpec = { family: string; weight: number; lightWeight: number };

export type CloudInput = {
  format: CloudFormat;
  shape: CloudShape;
  theme: CloudTheme;
  font: CloudFontSpec;
  title: string;
  subtitle: string;
  titles: string[];
  /** 是否用小字重複填滿；少於 MIN_SONGS_WITHOUT_REPEAT 首時會被強制開啟 */
  repeat: boolean;
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
// 陪襯要明顯比紋理（最大 18px、半透明）大、深，你選的每一首才會從紋理裡跳出來
const SUPPORT_MAX = 44;
const SUPPORT_MIN = 24;
const TEXTURE_MIN = 10;
const TEXTURE_MAX = 18;
/** 每多少平方像素放一個紋理字：數量要多到能填滿形狀，放不下的會被略過 */
const TEXTURE_AREA_PER_WORD = 1400;
/** 「預設」形狀沒有邊界，紋理只鋪大約這個比例的面積，邊緣才會保持自然的雲狀 */
const FREE_AREA_RATIO = 0.5;
const HERO_LIMIT = 6;
/** 主角最多 6 首；歌少時取前 30%，至少 1 首 */
const heroCountFor = (n: number) => Math.min(HERO_LIMIT, Math.max(1, Math.ceil(n * 0.3)));

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
  theme: Theme,
  shapeArea: number,
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
    main.push({ text: titles[i], size: Math.round(size), color: theme.accents[i % theme.accents.length] });
  }

  // 陪襯：名次越後面字越小、越淡
  const supportCount = n - heroCount;
  for (let j = 0; j < supportCount; j++) {
    const t = supportCount === 1 ? 0 : j / (supportCount - 1); // 0 → 1
    main.push({
      text: titles[heroCount + j],
      size: Math.round((SUPPORT_MAX - (SUPPORT_MAX - SUPPORT_MIN) * t) * scale),
      color: withAlpha(pick(theme.accents, rand), 1 - 0.25 * t),
    });
  }

  const texture: WordSpec[] = [];
  if (repeat || n < MIN_SONGS_WITHOUT_REPEAT) {
    // 紋理：所有歌名重複成更小更淡的字，填滿形狀；長歌名再縮小，避免變成一條條細長的雜訊
    // 每個填充字尾端加不同數量的零寬空白，讓它和主字、其他填充字的 key 都不同
    const textureCount = shapeArea / (TEXTURE_AREA_PER_WORD * scale ** 2);
    const repeats = Math.min(60, Math.max(1, Math.ceil(textureCount / n)));
    for (let r = 0; r < repeats; r++) {
      titles.forEach((text, i) => {
        const lengthFactor = Math.min(1, Math.sqrt(4 / ems[i]));
        texture.push({
          text: text + "​".repeat(r + 1),
          size: Math.round((TEXTURE_MIN + rand() * (TEXTURE_MAX - TEXTURE_MIN)) * lengthFactor * scale),
          color: pick(theme.fillers, rand),
        });
      });
    }
  }

  const bySize = (a: WordSpec, b: WordSpec) => b.size - a.size;
  return { main: main.sort(bySize), texture: texture.sort(bySize) };
}

// ─── 繪製 ──────────────────────────────────────────────

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
  return t + "…";
}

function drawTexts(ctx: CanvasRenderingContext2D, layout: Layout, theme: Theme, input: CloudInput) {
  const W = layout.width;
  const { family, weight, lightWeight } = input.font;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = theme.title;
  if (theme.titleGlow) {
    ctx.shadowColor = theme.titleGlow;
    ctx.shadowBlur = 24;
  }
  ctx.font = `${weight} 68px ${family}`;
  ctx.fillText(fitText(ctx, input.title, W - 120), W / 2, layout.titleY);
  ctx.shadowBlur = 0;

  ctx.fillStyle = theme.subtitle;
  ctx.font = `${lightWeight} 30px ${family}`;
  ctx.fillText(fitText(ctx, input.subtitle, W - 160), W / 2, layout.subtitleY);
}

/**
 * 等字型載好再畫，否則 canvas 會用 fallback 字型。
 * 中文字型是依 unicode-range 分段下載的，所以要把實際會畫的字都丟進去，才會載到對應的分段
 */
async function ensureFonts(input: CloudInput) {
  const { family, weight, lightWeight } = input.font;
  const text = [input.title, input.subtitle, ...input.titles].join("");
  await Promise.all(
    [...new Set([weight, lightWeight])].map((w) => document.fonts.load(`${w} 40px ${family}`, text || "宇宙人")),
  );
}

/** 粗略估算形狀面積（每 20px 取樣一次），用來決定紋理字要放多少個 */
function measureArea(ctx: CanvasRenderingContext2D, path: Path2D, w: number, h: number) {
  const step = 20;
  let hits = 0;
  for (let y = step / 2; y < h; y += step) {
    for (let x = step / 2; x < w; x += step) {
      if (ctx.isPointInPath(path, x, y)) hits++;
    }
  }
  return hits * step * step;
}

export async function renderCloud(
  canvas: HTMLCanvasElement,
  input: CloudInput,
  signal: AbortSignal,
): Promise<void> {
  const { default: WordCloud } = await import("wordcloud");
  await ensureFonts(input);
  if (signal.aborted) return;

  const layout = LAYOUTS[input.format];
  const theme = THEMES[input.theme];
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(input.seed);

  theme.drawBackground(ctx, layout.width, layout.height, rand);
  drawTexts(ctx, layout, theme, input);
  if (input.titles.length === 0) return;

  const { family, weight } = input.font;
  ctx.font = `${weight} 100px ${family}`;
  const measureEm = (text: string) => Math.max(ctx.measureText(text).width / 100, 1);
  const cloud = document.createElement("canvas");
  cloud.width = layout.cloud.w;
  cloud.height = layout.cloud.h;
  const cloudCtx = cloud.getContext("2d")!;
  const shapePath = SHAPES[input.shape].path?.(cloud.width, cloud.height) ?? null;
  const shapeArea = shapePath
    ? measureArea(cloudCtx, shapePath, cloud.width, cloud.height)
    : cloud.width * cloud.height * FREE_AREA_RATIO;

  const { main, texture } = buildWords(input.titles, measureEm, rand, input.repeat, layout, theme, shapeArea);

  // 形狀遮罩：先把形狀以外塗滿，wordcloud2（clearCanvas: false）會當成已佔用，字就只會放在形狀裡；
  // 畫完再把遮罩擦掉
  if (shapePath) {
    cloudCtx.fillStyle = "#000";
    cloudCtx.fillRect(0, 0, cloud.width, cloud.height);
    cloudCtx.globalCompositeOperation = "destination-out";
    cloudCtx.fill(shapePath);
    cloudCtx.globalCompositeOperation = "source-over";
  }

  // 分兩次畫：先放主角和陪襯，再讓紋理填進剩下的空位。
  // 第二次一樣不清畫布，wordcloud2 會把已經畫好的字當成佔用，所以兩層不會重疊，
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
        color: (word) => colorOf.get(word) ?? theme.title,
        fontFamily: family,
        fontWeight: weight,
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
  if (shapePath) {
    cloudCtx.globalCompositeOperation = "destination-out";
    const outside = new Path2D();
    outside.rect(0, 0, cloud.width, cloud.height);
    outside.addPath(shapePath);
    cloudCtx.fill(outside, "evenodd");
    cloudCtx.globalCompositeOperation = "source-over";
  }

  ctx.drawImage(cloud, (layout.width - layout.cloud.w) / 2, layout.cloud.top);
}
