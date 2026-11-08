import type { NextRequest } from "next/server";
import { searchArtists } from "@/lib/itunes";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return Response.json({ artists: [] });

  try {
    const artists = await searchArtists(q);
    return Response.json({ artists });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "搜尋歌手失敗" }, { status: 502 });
  }
}
