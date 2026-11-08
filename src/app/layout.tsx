import type { Metadata } from "next";
import { notoSansTC } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Song Cloud 歌單文字雲",
  description: "挑選喜歡的歌手歌曲、排出自己的歌單排行，生成可以發 IG 的文字雲",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant-TW" className={`${notoSansTC.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
