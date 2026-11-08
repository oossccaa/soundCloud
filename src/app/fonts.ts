import { Huninn, LXGW_WenKai_TC, Noto_Sans_TC, Noto_Serif_TC } from "next/font/google";

// 中文字型沒有 subset，所以關掉 preload，靠 unicode-range 分段載入（用到哪些字才下載哪幾段）
export const notoSansTC = Noto_Sans_TC({
  weight: ["400", "500", "700", "900"],
  preload: false,
  variable: "--font-noto-tc",
});

const notoSerifTC = Noto_Serif_TC({
  weight: ["500", "900"],
  preload: false,
  variable: "--font-noto-serif-tc",
});

const wenKai = LXGW_WenKai_TC({
  weight: ["400", "700"],
  preload: false,
  variable: "--font-wenkai-tc",
});

const huninn = Huninn({
  weight: "400",
  preload: false,
  variable: "--font-huninn",
});

/** 讓 layout 把所有字型的 @font-face 都掛上，canvas 才找得到 */
export const fontVariables = [notoSansTC, notoSerifTC, wenKai, huninn].map((f) => f.variable).join(" ");

/** 文字雲可選的字型；weight 是文字雲和標題用的粗細，lightWeight 給副標題 */
export type CloudFont = {
  id: string;
  label: string;
  family: string;
  weight: number;
  lightWeight: number;
};

export const CLOUD_FONTS: CloudFont[] = [
  { id: "sans", label: "黑體", family: notoSansTC.style.fontFamily, weight: 900, lightWeight: 500 },
  { id: "serif", label: "明體", family: notoSerifTC.style.fontFamily, weight: 900, lightWeight: 500 },
  { id: "wenkai", label: "文楷", family: wenKai.style.fontFamily, weight: 700, lightWeight: 400 },
  { id: "huninn", label: "粉圓", family: huninn.style.fontFamily, weight: 400, lightWeight: 400 },
];
