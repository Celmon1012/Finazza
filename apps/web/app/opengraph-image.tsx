import { ImageResponse } from "next/og";

export const alt = "FINAZZA — investment social network";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(145deg, #fffaf3 0%, #fff4e0 48%, #f6b429 160%)",
          color: "#1a1004",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 42,
            fontWeight: 700,
            letterSpacing: 2,
            color: "#c56a00",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              background: "linear-gradient(135deg, #f0a020, #f6b429)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1a1004",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            F
          </div>
          FINAZZA
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 900 }}>
          <div style={{ fontSize: 72, lineHeight: 1.05, letterSpacing: -1 }}>Share positions. Show the proof.</div>
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.35,
              color: "#6b5a45",
              fontFamily: "Arial, Helvetica, sans-serif",
              maxWidth: 820,
            }}
          >
            An investment social network for stocks, ETFs, commodities, and collectibles.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: "#a35400",
            fontFamily: "Arial, Helvetica, sans-serif",
            letterSpacing: 1,
          }}
        >
          finazza.app
        </div>
      </div>
    ),
    { ...size },
  );
}
