import type { NextRequest } from "next/server";
import { getArtistSongs } from "@/lib/itunes";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/artists/[id]/songs">,
) {
  const { id } = await ctx.params;
  const artistId = Number(id);
  if (!Number.isInteger(artistId) || artistId <= 0) {
    return Response.json({ error: "無效的歌手 ID" }, { status: 400 });
  }

  try {
    return Response.json(await getArtistSongs(artistId));
  } catch (err) {
    console.error(err);
    return Response.json({ error: "取得歌曲失敗" }, { status: 502 });
  }
}
