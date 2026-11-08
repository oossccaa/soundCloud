export type Artist = {
  id: number;
  name: string;
  genre?: string;
};

export type Song = {
  id: number;
  /** 清理過的歌名（去掉括號、feat. 等），用來顯示與做文字雲 */
  title: string;
  /** iTunes 上的原始歌名 */
  rawTitle: string;
  album: string;
  artwork?: string;
  previewUrl?: string;
};

export const DEFAULT_ARTIST: Artist = {
  id: 369125109,
  name: "宇宙人",
  genre: "華語流行樂",
};
