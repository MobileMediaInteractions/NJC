import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#173e32",
        color: "#f6f1e7",
        display: "flex",
        fontSize: 34,
        fontWeight: 900,
        height: "100%",
        justifyContent: "center",
        letterSpacing: "-0.08em",
        position: "relative",
        width: "100%",
      }}
    >
      NJC
      <div
        style={{
          background: "#c49545",
          bottom: 7,
          display: "flex",
          height: 5,
          left: 10,
          position: "absolute",
          transform: "rotate(-5deg)",
          width: 44,
        }}
      />
    </div>,
    size,
  );
}
