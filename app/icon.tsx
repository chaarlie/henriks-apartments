import { ImageResponse } from "next/og";

/**
 * The browser-tab icon.
 *
 * Replaces the favicon.ico that create-next-app ships, which was still showing
 * Vercel's triangle on every tab.
 *
 * It repeats the site's own mark rather than inventing a second identity: the
 * header logo is a rounded square in --color-deep (app/components/Header.tsx),
 * so this is that square with the property's initial in it. Deep blue reads as
 * a solid block of colour at 16px, which is the size that actually matters.
 *
 * Generated rather than drawn as an SVG on purpose. An SVG favicon renders its
 * text with whatever font the browser resolves, which differs between them and
 * can fall back to something unintended; ImageResponse rasterises here, so the
 * letterform is identical everywhere and older browsers with no SVG-favicon
 * support still get an icon.
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // --color-deep, the same blue as the header mark.
          background: "#04588c",
          // Matches the header's rounded-[7px] on a 24px square, scaled to 32.
          borderRadius: 9,
          color: "#fff",
          fontSize: 22,
          fontWeight: 700,
          // Pulls the cap-height into the optical centre; text sits low
          // otherwise at this size.
          lineHeight: 1,
          letterSpacing: -1,
        }}
      >
        S
      </div>
    ),
    size,
  );
}
