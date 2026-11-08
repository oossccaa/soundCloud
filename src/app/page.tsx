import { SongCloudApp } from "@/components/SongCloudApp";
import { notoSansTC } from "./fonts";

export default function Home() {
  return <SongCloudApp fontFamily={notoSansTC.style.fontFamily} />;
}
