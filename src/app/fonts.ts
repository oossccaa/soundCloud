import { Noto_Sans_TC } from "next/font/google";

// 中文字型沒有 subset，所以關掉 preload，靠 unicode-range 分段載入
export const notoSansTC = Noto_Sans_TC({
  weight: ["400", "500", "700", "900"],
  preload: false,
  variable: "--font-noto-tc",
});
