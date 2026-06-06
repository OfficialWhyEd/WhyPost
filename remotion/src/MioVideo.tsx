import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export const MioVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      className="flex items-center justify-center bg-black text-white"
      style={{ width, height, opacity }}
    >
      <h1 className="text-6xl font-bold">
        Frame {frame} / {durationInFrames}
      </h1>
    </div>
  );
};
