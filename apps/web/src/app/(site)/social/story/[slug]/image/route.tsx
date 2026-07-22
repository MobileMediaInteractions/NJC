import { ImageResponse } from "next/og";
import { brandAssets } from "@/lib/assets";
import { getStoryBySlug } from "@/lib/content";
import { getSiteOrigin } from "@/lib/origin";

export const runtime = "nodejs";

const imageSize = { width: 1200, height: 630 };

function absoluteImageUrl(value: string) {
  try {
    return new URL(value, getSiteOrigin()).toString();
  } catch {
    return new URL(brandAssets.gardenStateEngraving, getSiteOrigin()).toString();
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  const headline = story?.headline ?? "The Authoritative Voice of the Garden State";
  const category = story?.categoryLabel ?? "The New Jersey Courier";
  const leadImage = absoluteImageUrl(story?.image ?? brandAssets.gardenStateEngraving);
  const headlineSize = headline.length > 105 ? 43 : headline.length > 72 ? 50 : 58;

  return new ImageResponse(
    <div
      style={{
        background: "#092132",
        color: "#ffffff",
        display: "flex",
        height: "100%",
        overflow: "hidden",
        position: "relative",
        width: "100%",
      }}
    >
      {/* Satori renders absolute source images through img; next/image is not supported inside ImageResponse. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={leadImage}
        alt=""
        width={imageSize.width}
        height={imageSize.height}
        style={{ height: "100%", objectFit: "cover", position: "absolute", width: "100%" }}
      />
      <div
        style={{
          backgroundImage: "linear-gradient(90deg, rgba(5, 23, 34, 0.97) 0%, rgba(5, 23, 34, 0.88) 50%, rgba(5, 23, 34, 0.18) 100%)",
          display: "flex",
          height: "100%",
          position: "absolute",
          width: "100%",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", padding: "50px 58px", position: "relative", width: "78%" }}>
        <div style={{ alignItems: "center", display: "flex", gap: 20 }}>
          <div style={{ alignItems: "center", background: "#174c3d", border: "2px solid rgba(255,255,255,0.18)", color: "#f7f1e5", display: "flex", fontSize: 31, fontWeight: 900, height: 72, justifyContent: "center", width: 72 }}>
            NJC
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em" }}>THE NEW JERSEY COURIER</div>
            <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 17, fontWeight: 700, letterSpacing: "0.22em", marginTop: 5 }}>MIDDLESEX COUNTY</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#e2ad4e", fontSize: 20, fontWeight: 800, letterSpacing: "0.12em", marginBottom: 17, textTransform: "uppercase" }}>{category}</div>
          <div style={{ fontSize: headlineSize, fontWeight: 900, letterSpacing: "-0.045em", lineHeight: 1.02 }}>{headline}</div>
        </div>
      </div>
      <div style={{ background: "#d8a24a", bottom: 0, display: "flex", height: 12, position: "absolute", width: "100%" }} />
    </div>,
    {
      ...imageSize,
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
    },
  );
}
