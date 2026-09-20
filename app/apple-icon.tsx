import { ImageResponse } from "next/og";

/**
 * The icon iOS uses when someone adds the site to their home screen.
 *
 * Same mark as app/icon.tsx at the size Apple asks for. No rounded corners
 * here: iOS applies its own mask, and a pre-rounded image ends up with a
 * double-rounded edge and a rim of background colour.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#04588c",
          color: "#fff",
          fontSize: 120,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: -4,
        }}
      >
        S
      </div>
    ),
    size,
  );
}
