import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: 64,
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700, opacity: 0.8 }}>Taskito</div>
        <div style={{ marginTop: 16, fontSize: 72, fontWeight: 800, lineHeight: 1.05 }}>
          Plan your day. Build better habits.
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
