import { cacheLife } from "next/cache";
import type { Artist, Song } from "./types";

// iTunes Search API：免金鑰、country=tw 會回傳繁中歌名，歌曲依熱門度排序
// https://performance-partners.apple.com/search-api
const BASE = "https://itunes.apple.com";
const COUNTRY = "tw";

type ITunesArtist = {
  wrapperType: "artist";
  artistId: number;
  artistName: string;
  primaryGenreName?: string;
};

type ITunesTrack = {
  wrapperType: "track";
  kind: string;
  trackId: number;
  trackName: string;
  collectionName: string;
  artworkUrl100?: string;
  previewUrl?: string;
};

/** 去掉 (feat. xxx)、(電視劇《…》主題曲)、[Live] 之類的附註 */
export function cleanTitle(raw: string): string {
  const cleaned = raw
    .replace(/\s*[(（[【][^)）\]】]*[)）\]】]/g, "")
    .replace(/\s+-\s+(single|ep|live).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || raw.trim();
}

export async function searchArtists(term: string): Promise<Artist[]> {
  "use cache";
  cacheLife("days");

  const url = `${BASE}/search?${new URLSearchParams({
    term,
    entity: "musicArtist",
    country: COUNTRY,
    limit: "10",
  })}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes search failed: ${res.status}`);
  const data: { results: ITunesArtist[] } = await res.json();

  return data.results.map((a) => ({
    id: a.artistId,
    name: a.artistName,
    genre: a.primaryGenreName,
  }));
}

export async function getArtistSongs(
  artistId: number,
): Promise<{ artist: Artist | null; songs: Song[] }> {
  "use cache";
  cacheLife("days");

  const url = `${BASE}/lookup?${new URLSearchParams({
    id: String(artistId),
    entity: "song",
    country: COUNTRY,
    limit: "200",
  })}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes lookup failed: ${res.status}`);
  const data: { results: (ITunesArtist | ITunesTrack)[] } = await res.json();

  const artistRow = data.results.find(
    (r): r is ITunesArtist => r.wrapperType === "artist",
  );

  // 同一首歌常出現在單曲 + 專輯，以清理後的歌名去重，保留排序較前（較熱門）的那筆
  const seen = new Set<string>();
  const songs: Song[] = [];
  for (const r of data.results) {
    if (r.wrapperType !== "track" || r.kind !== "song") continue;
    const title = cleanTitle(r.trackName);
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    songs.push({
      id: r.trackId,
      title,
      rawTitle: r.trackName,
      album: r.collectionName.replace(/\s+-\s+(Single|EP)$/i, ""),
      artwork: r.artworkUrl100,
      previewUrl: r.previewUrl,
    });
  }

  return {
    artist: artistRow
      ? {
          id: artistRow.artistId,
          name: artistRow.artistName,
          genre: artistRow.primaryGenreName,
        }
      : null,
    songs,
  };
}
