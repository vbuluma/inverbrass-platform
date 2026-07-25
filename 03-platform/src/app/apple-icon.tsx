/**
 * Purpose:
 * Serve /apple-icon so browsers stop requesting a missing apple-touch-icon.
 */

import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

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
          background: "#0f3d2e",
          color: "#f4f7f5",
          fontSize: 72,
          fontWeight: 700,
        }}
      >
        IB
      </div>
    ),
    { ...size }
  );
}
