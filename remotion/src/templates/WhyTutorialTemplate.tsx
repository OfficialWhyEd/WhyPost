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

export interface WhyTutorialTemplateProps {
  hook: string;
  body: string[];
  cta: string;
  titleCard: string;
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

// Distribute N words uniformly across a segment of `segmentFrames` duration
// Returns the frame at which word[i] should appear within the segment
function wordFrameInSegment(wordIndex: number, totalWords: number, segmentFrames: number): number {
  if (totalWords <= 1) return 0;
  return Math.round((wordIndex / (totalWords - 1)) * (segmentFrames * 0.8));
}

const StepText: React.FC<{
  text: string;
  segmentFrame: number;
  segmentDuration: number;
  accent: string;
  accentGlow: string;
}> = ({ text, segmentFrame, segmentDuration, accent, accentGlow }) => {
  const words = text.split(" ");

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "baseline",
        gap: "0.15em",
      }}
    >
      {words.map((word, i) => {
        const appearFrame = wordFrameInSegment(i, words.length, segmentDuration);
        const appeared = segmentFrame >= appearFrame;

        const wordOpacity = appeared
          ? interpolate(segmentFrame - appearFrame, [0, 6], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          : 0;

        const wordY = appeared
          ? interpolate(segmentFrame - appearFrame, [0, 6], [12, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          : 12;

        // Last word gets accent highlight
        const isLastWord = i === words.length - 1;

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: wordOpacity,
              transform: `translateY(${wordY}px)`,
              color: isLastWord ? accent : TEXT,
              fontWeight: isLastWord ? 800 : 600,
              textShadow: isLastWord ? `0 0 40px ${accentGlow}` : "none",
              fontFamily: "Geist, sans-serif",
              fontSize: 52,
              lineHeight: 1.3,
              marginRight: "0.18em",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

export const WhyTutorialTemplate: React.FC<WhyTutorialTemplateProps> = ({
  hook,
  body,
  cta,
  titleCard,
  audioFile,
  durationPerSegment = 90,
  words: _words = [],
  accentColor = DEFAULT_ACCENT,
  bgColor = DEFAULT_BG,
}) => {
  const ACCENT = accentColor;
  const ACCENT_GLOW = makeAccentGlow(accentColor);
  const BG = bgColor;

  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Temporal structure
  const introDuration = fps * 2;                          // 0-2s: intro
  const bodyDuration = body.length * durationPerSegment;  // steps
  const ctaStart = introDuration + bodyDuration;

  const phase: "intro" | "body" | "cta" =
    frame < introDuration ? "intro" : frame < ctaStart ? "body" : "cta";

  const bodyFrame = Math.max(0, frame - introDuration);
  const currentStepIndex = Math.min(
    Math.floor(bodyFrame / durationPerSegment),
    body.length - 1
  );
  const segmentFrame = bodyFrame % durationPerSegment;

  // Global fade in/out
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

  // Intro animations
  const introSlideX = interpolate(frame, [0, 18], [-80, 0], {
    extrapolateRight: "clamp",
  });
  const introOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Step number spring animation
  const stepNumberScale = spring({
    frame: segmentFrame,
    fps,
    config: { damping: 12, stiffness: 180, mass: 0.8 },
  });

  // Divider line animation
  const dividerWidth = interpolate(
    segmentFrame,
    [durationPerSegment * 0.5, durationPerSegment * 0.7],
    [0, 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // CTA spring
  const ctaScale = spring({
    frame: Math.max(0, frame - ctaStart),
    fps,
    config: { damping: 14, stiffness: 160, mass: 1 },
  });

  // Title card fade
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: BG, opacity: globalFade }}>
      <Audio src={staticFile(audioFile)} />

      {/* Subtle grid — 40px, more educational feel */}
      <AbsoluteFill
        style={{
          backgroundImage: [
            `linear-gradient(${ACCENT_GLOW.replace("0.28", "0.04")} 1px, transparent 1px)`,
            `linear-gradient(90deg, ${ACCENT_GLOW.replace("0.28", "0.04")} 1px, transparent 1px)`,
          ].join(","),
          backgroundSize: "40px 40px",
          opacity: 0.04,
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
            gap: 32,
          }}
        >
          {/* COME [X] */}
          <div
            style={{
              opacity: introOpacity,
              transform: `translateX(${introSlideX}px)`,
            }}
          >
            <p
              style={{
                fontFamily: "'NeuePower', Geist, sans-serif",
                fontSize: 80,
                fontWeight: 900,
                color: TEXT,
                lineHeight: 1.1,
                textAlign: "center",
                margin: 0,
              }}
            >
              {hook}
            </p>
          </div>

          {/* Step count badge */}
          <div
            style={{
              opacity: interpolate(frame, [8, 20], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              transform: `translateY(${interpolate(frame, [8, 20], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: `${ACCENT}22`,
              border: `2px solid ${ACCENT}`,
              borderRadius: 999,
              paddingTop: 12,
              paddingBottom: 12,
              paddingLeft: 32,
              paddingRight: 32,
            }}
          >
            <span
              style={{
                fontFamily: "Geist Mono, monospace",
                fontSize: 32,
                fontWeight: 700,
                color: ACCENT,
                letterSpacing: "2px",
              }}
            >
              {body.length} STEP
            </span>
          </div>
        </AbsoluteFill>
      )}

      {/* === BODY PHASE (steps) === */}
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
            gap: 40,
          }}
        >
          {/* Large step number */}
          <div
            style={{
              transform: `scale(${stepNumberScale})`,
              transformOrigin: "center center",
            }}
          >
            <span
              style={{
                fontFamily: "'NeuePower', Geist, sans-serif",
                fontSize: 160,
                fontWeight: 900,
                color: ACCENT,
                lineHeight: 1,
                textShadow: `0 0 80px ${ACCENT_GLOW}`,
              }}
            >
              {currentStepIndex + 1}
            </span>
          </div>

          {/* Step text — word by word */}
          <StepText
            text={body[currentStepIndex]}
            segmentFrame={segmentFrame}
            segmentDuration={durationPerSegment}
            accent={ACCENT}
            accentGlow={ACCENT_GLOW}
          />

          {/* Divider line */}
          <div
            style={{
              width: "100%",
              height: 2,
              background: `linear-gradient(90deg, ${ACCENT}, transparent)`,
              transform: `scaleX(${dividerWidth / 100})`,
              transformOrigin: "left center",
              borderRadius: 1,
            }}
          />

          {/* Step counter dots */}
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 8,
            }}
          >
            {body.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === currentStepIndex ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === currentStepIndex ? ACCENT : `${ACCENT}44`,
                  transition: "width 200ms ease",
                }}
              />
            ))}
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
