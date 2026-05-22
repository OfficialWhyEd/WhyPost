import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Audio,
  AbsoluteFill,
  staticFile,
} from "remotion";

interface Word {
  word: string;
  start_ms: number;
  end_ms: number;
}

export interface WhyBestOfTemplateProps {
  hook: string;
  body: string[];  // body[0] = #N (ultimo), body[body.length-1] = #1 (primo)
  cta: string;
  titleCard: string;  // es: "TOP 5"
  audioFile: string;
  durationPerSegment?: number;
  words?: Word[];
  totalDurationFrames?: number;
  accentColor?: string;
  bgColor?: string;
}

const DEFAULT_ACCENT = "oklch(73% 0.14 158)";
const DEFAULT_BG = "#070709";
const TEXT = "#eff0f2";
const TEXT_DIM = "oklch(60% 0.02 250)";

// Safe zones per TikTok/IG Reels in 1080x1920
const SAFE_TOP = 120;
const SAFE_BOTTOM = 340;
const SAFE_RIGHT_PAD = 140;

function makeAccentGlow(accent: string): string {
  if (accent.startsWith("oklch(")) {
    return accent.replace(")", " / 0.28)");
  }
  return accent + "44";
}

// Glitch flicker: oscillates opacity between 1 and 0.7 rapidly
function glitchOpacity(frame: number): number {
  // Fast oscillation using sin with high frequency
  const flicker = Math.sin(frame * 1.8) * 0.15 + Math.sin(frame * 3.1) * 0.08;
  return Math.max(0.7, Math.min(1.0, 0.88 + flicker));
}

// Ranking bar width: last item (body[0]) gets smallest bar, body[body.length-1] gets 100%
function rankBarWidth(rank: number, total: number): number {
  // rank 1 = smallest, rank total = 100% (#1 position)
  // rank here: currentIndex+1 going from 1 (body[0]) to total (body[total-1])
  // body[0] is #N (lowest rank) → narrowest bar
  // body[body.length-1] is #1 → widest bar (100%)
  const minWidth = 55;
  const maxWidth = 100;
  return minWidth + ((rank - 1) / (total - 1)) * (maxWidth - minWidth);
}

export const WhyBestOfTemplate: React.FC<WhyBestOfTemplateProps> = ({
  hook,
  body,
  cta,
  titleCard,
  audioFile,
  durationPerSegment = 72,
  words: _words = [],
  accentColor = DEFAULT_ACCENT,
  bgColor = DEFAULT_BG,
}) => {
  const ACCENT = accentColor;
  const ACCENT_GLOW = makeAccentGlow(accentColor);
  const BG = bgColor;
  const total = body.length;

  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Temporal structure
  const introDuration = fps * 2;                          // 0-2s: TOP N intro
  const bodyDuration = total * durationPerSegment;        // countdown items
  const ctaStart = introDuration + bodyDuration;

  const phase: "intro" | "body" | "cta" =
    frame < introDuration ? "intro" : frame < ctaStart ? "body" : "cta";

  const bodyFrame = Math.max(0, frame - introDuration);
  const currentIndex = Math.min(
    Math.floor(bodyFrame / durationPerSegment),
    total - 1
  );
  const segmentFrame = bodyFrame % durationPerSegment;

  // Rank: body[0] = rank (total), body[total-1] = rank 1
  const currentRank = total - currentIndex;
  const isNumberOne = currentRank === 1;

  // Global fade
  const globalFade = interpolate(
    frame,
    [0, 8, durationInFrames - 10, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Progress bar
  const progressWidth = interpolate(frame, [0, durationInFrames], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Intro glitch title opacity
  const introBaseOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });
  const flickerOp = phase === "intro" ? glitchOpacity(frame) * introBaseOpacity : 1;

  // Title card fade
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Rank number slide from right
  const rankSlideX = interpolate(segmentFrame, [0, 14], [120, 0], {
    extrapolateRight: "clamp",
  });
  const rankOpacity = interpolate(segmentFrame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Item text fade + scale
  const itemOpacity = interpolate(segmentFrame, [8, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const itemScale = interpolate(segmentFrame, [8, 20], [0.88, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Bar width animation
  const targetBar = total > 1 ? rankBarWidth(total - currentIndex, total) : 100;
  const animatedBar = interpolate(
    segmentFrame,
    [12, durationPerSegment * 0.55],
    [0, targetBar],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // #1 special: glow pulse
  const glowPulse = isNumberOne
    ? 0.6 + Math.sin(frame * 0.25) * 0.4
    : 0;

  // #1 scale is bigger
  const numberOneFontSize = isNumberOne ? 200 : 160;
  const itemFontSize = isNumberOne ? 58 : 52;

  // CTA spring
  const ctaScale = spring({
    frame: Math.max(0, frame - ctaStart),
    fps,
    config: { damping: 14, stiffness: 160, mass: 1 },
  });

  // Blob gradient bottom (accent / 0.06)
  const blobOpacity = 0.06;

  return (
    <AbsoluteFill style={{ background: BG, opacity: globalFade }}>
      <Audio src={staticFile(audioFile)} />

      {/* Blob radial gradient in basso */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 900,
          height: 900,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${ACCENT} 0%, transparent 70%)`,
          opacity: blobOpacity,
          pointerEvents: "none",
        }}
      />

      {/* Top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: ACCENT,
        }}
      />

      {/* Title card */}
      <div
        style={{
          position: "absolute",
          top: SAFE_TOP + 20,
          left: 64,
          right: SAFE_RIGHT_PAD,
          display: "flex",
          alignItems: "center",
          gap: 16,
          opacity: titleOpacity,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: ACCENT,
            boxShadow: `0 0 16px ${ACCENT}`,
          }}
        />
        <span
          style={{
            fontFamily: "Geist Mono, monospace",
            fontSize: 24,
            fontWeight: 700,
            color: TEXT_DIM,
            letterSpacing: "3px",
            textTransform: "uppercase",
          }}
        >
          {titleCard}
        </span>
      </div>

      {/* === INTRO PHASE === */}
      {phase === "intro" && (
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: SAFE_TOP + 120,
            paddingBottom: SAFE_BOTTOM + 40,
            paddingLeft: 72,
            paddingRight: SAFE_RIGHT_PAD,
            gap: 24,
          }}
        >
          {/* TOP N — glitch flicker */}
          <div style={{ opacity: flickerOp }}>
            <p
              style={{
                fontFamily: "'NeuePower', Geist, sans-serif",
                fontSize: 160,
                fontWeight: 900,
                color: ACCENT,
                lineHeight: 0.9,
                textAlign: "center",
                margin: 0,
                textShadow: `0 0 100px ${ACCENT_GLOW}`,
              }}
            >
              {titleCard}
            </p>
          </div>

          {/* Hook subtitle */}
          <div
            style={{
              opacity: interpolate(frame, [12, 24], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              transform: `translateY(${interpolate(frame, [12, 24], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            }}
          >
            <p
              style={{
                fontFamily: "Geist, sans-serif",
                fontSize: 44,
                fontWeight: 600,
                color: TEXT,
                textAlign: "center",
                lineHeight: 1.3,
                margin: 0,
              }}
            >
              {hook}
            </p>
          </div>
        </AbsoluteFill>
      )}

      {/* === BODY PHASE (countdown) === */}
      {phase === "body" && (
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: SAFE_TOP + 160,
            paddingBottom: SAFE_BOTTOM + 60,
            paddingLeft: 72,
            paddingRight: SAFE_RIGHT_PAD,
            gap: 32,
          }}
        >
          {/* Rank number — top right, slides from right */}
          <div
            style={{
              position: "absolute",
              top: SAFE_TOP + 100,
              right: SAFE_RIGHT_PAD + 20,
              opacity: rankOpacity,
              transform: `translateX(${rankSlideX}px)`,
            }}
          >
            <span
              style={{
                fontFamily: "Geist Mono, monospace",
                fontSize: 28,
                fontWeight: 700,
                color: TEXT_DIM,
                letterSpacing: "1px",
              }}
            >
              #{currentRank}
            </span>
          </div>

          {/* Big rank display */}
          <div
            style={{
              opacity: rankOpacity,
              transform: `translateX(${rankSlideX * 0.4}px)`,
            }}
          >
            <span
              style={{
                fontFamily: "'NeuePower', Geist, sans-serif",
                fontSize: numberOneFontSize,
                fontWeight: 900,
                color: isNumberOne ? ACCENT : TEXT,
                lineHeight: 1,
                textShadow: isNumberOne
                  ? `0 0 ${80 + glowPulse * 60}px ${ACCENT_GLOW}, 0 0 ${140 + glowPulse * 80}px ${ACCENT_GLOW}`
                  : "none",
              }}
            >
              #{currentRank}
            </span>
          </div>

          {/* Item text */}
          <div
            style={{
              opacity: itemOpacity,
              transform: `scale(${itemScale})`,
              transformOrigin: "center center",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontFamily: "Geist, sans-serif",
                fontSize: itemFontSize,
                fontWeight: isNumberOne ? 800 : 600,
                color: isNumberOne ? ACCENT : TEXT,
                lineHeight: 1.3,
                margin: 0,
              }}
            >
              {body[currentIndex]}
            </p>
          </div>

          {/* Animated horizontal bar */}
          <div
            style={{
              width: "100%",
              height: isNumberOne ? 6 : 4,
              background: "#ffffff11",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${animatedBar}%`,
                background: isNumberOne
                  ? `linear-gradient(90deg, ${ACCENT}, ${ACCENT_GLOW.replace("0.28", "0.8")})`
                  : ACCENT,
                borderRadius: 3,
                boxShadow: isNumberOne ? `0 0 20px ${ACCENT_GLOW}` : "none",
              }}
            />
          </div>

          {/* Rank label below bar */}
          <div
            style={{
              opacity: interpolate(segmentFrame, [20, 30], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            <span
              style={{
                fontFamily: "Geist Mono, monospace",
                fontSize: 22,
                color: TEXT_DIM,
                letterSpacing: "2px",
              }}
            >
              {Math.round(animatedBar)}%
            </span>
          </div>
        </AbsoluteFill>
      )}

      {/* === CTA PHASE === */}
      {phase === "cta" && (
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: SAFE_TOP + 40,
            paddingBottom: SAFE_BOTTOM + 40,
            paddingLeft: 72,
            paddingRight: SAFE_RIGHT_PAD,
          }}
        >
          <div
            style={{
              transform: `scale(${ctaScale})`,
              transformOrigin: "center center",
              background: `${ACCENT}18`,
              border: `2px solid ${ACCENT}66`,
              borderRadius: 32,
              paddingTop: 60,
              paddingBottom: 60,
              paddingLeft: 60,
              paddingRight: 60,
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontFamily: "Geist, sans-serif",
                fontSize: 52,
                fontWeight: 600,
                color: TEXT,
                lineHeight: 1.3,
                margin: 0,
              }}
            >
              {cta}
            </p>
          </div>
        </AbsoluteFill>
      )}

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 3,
          background: ACCENT,
          width: `${progressWidth}%`,
          opacity: 0.5,
        }}
      />
    </AbsoluteFill>
  );
};
