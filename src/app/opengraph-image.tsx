import { ImageResponse } from "next/og";

export const alt = "VLE — Verified Lot Exchange";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: "64px 72px", background: "#14231d", color: "#fffef9", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ fontSize: 64, fontWeight: 700, letterSpacing: -3 }}>VLE</span>
          <span style={{ fontSize: 27, color: "#d4e97a" }}>Verified Lot Exchange</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <span style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.08, maxWidth: 930 }}>Buy the lot that already passed.</span>
          <span style={{ fontSize: 28, lineHeight: 1.4, maxWidth: 950, color: "#d4d8cf" }}>Source against a named compliance profile, backed by lot-specific evidence.</span>
        </div>
        <span style={{ fontSize: 23, color: "#d4e97a" }}>vle.exchange</span>
      </div>
    ),
    size,
  );
}
