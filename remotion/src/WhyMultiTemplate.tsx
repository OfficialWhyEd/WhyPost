import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Audio,
  AbsoluteFill,
  staticFile,
} from "remotion";

interface Word {
  word: string;
  start_ms: number;
  end_ms: number;
}

export interface WhyMultiTemplateProps {
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
  energyLevel?: "low" | "mid" | "high";
}

const DEFAULT_ACCENT = "oklch(73% 0.14 158)";
const DEFAULT_BG = "#070709";
const TEXT = "#eff0f2";
const TEXT_DIM = "oklch(60% 0.02 250)";

function makeAccentGlow(accent: string): string {
  // Inject / 0.28 alpha into oklch, else fallback
  if (accent.startsWith("oklch(")) {
    return accent.replace(")", " / 0.28)");
  }
  return accent + "44";
}

// Safe zones per TikTok/IG Reels in 1080x1920:
// - Bottom ~340px: coperto da username, descrizione, hashtag, musica
// - Top ~120px: status bar e icone app
// - Right ~130px: bottoni like/comment/share (TikTok)
// Contenuto visibile sicuro: y [120, 1580], x [0, 950]
const SAFE_TOP = 120;       // px dall'alto
const SAFE_BOTTOM = 340;    // px dal basso (riservato UI TikTok/IG)
const SAFE_RIGHT_PAD = 140; // padding destra per i bottoni TikTok

const CHUNK_SIZE = 5;

function chunkWords(words: Word[]): Word[][] {
  const chunks: Word[][] = [];
  for (let i = 0; i < words.length; i += CHUNK_SIZE) {
    chunks.push(words.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
}

const KaraokeWord: React.FC<{
  word: Word;
  frame: number;
  fps: number;
  isActive: boolean;
  isPast: boolean;
  accent: string;
  accentGlow: string;
}> = ({ word, frame, fps, isActive, isPast, accent, accentGlow }) => {
  const startFrame = (word.start_ms * fps) / 1000;
  const appeared = frame >= startFrame - 1;

  const opacity = appeared
    ? interpolate(frame - startFrame, [0, 3], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  const scale = isActive
    ? interpolate(frame - startFrame, [0, 5], [0.85, 1.06], {
        extrapolateRight: "clamp",
      })
    : 1;

  const color = isActive ? accent : isPast ? TEXT : TEXT_DIM;
  const weight = isActive ? 900 : 700;

  return (
    <span
      style={{
        display: "inline-block",
        opacity,
        transform: `scale(${scale})`,
        color,
        fontWeight: weight,
        textShadow: isActive ? `0 0 48px ${accentGlow}` : "none",
        marginRight: "0.22em",
        transformOrigin: "center bottom",
        transition: "color 80ms linear",
      }}
    >
      {word.word}
    </span>
  );
};

export const WhyMultiTemplate: React.FC<WhyMultiTemplateProps> = ({
  hook,
  body,
  cta,
  titleCard,
  audioFile,
  durationPerSegment = 60,
  words = [],
  accentColor = DEFAULT_ACCENT,
  bgColor = DEFAULT_BG,
  energyLevel = "mid",
}) => {
  const ACCENT = accentColor;
  const ACCENT_GLOW = makeAccentGlow(accentColor);
  const BG = bgColor;
  const karaokeFontSize = energyLevel === "high" ? 84 : energyLevel === "low" ? 64 : 76;
  const contextFontSize = energyLevel === "high" ? 52 : energyLevel === "low" ? 40 : 46;
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const hasKaraoke = words.length > 0;

  // Temporal structure (fallback without karaoke)
  const hookDuration = fps * 3;
  const bodyDuration = body.length * durationPerSegment;
  const ctaStart = hookDuration + bodyDuration;

  const phase: "hook" | "body" | "cta" =
    frame < hookDuration ? "hook" : frame < ctaStart ? "body" : "cta";

  const bodyFrame = Math.max(0, frame - hookDuration);
  const currentBodyIndex = Math.min(
    Math.floor(bodyFrame / durationPerSegment),
    body.length - 1
  );

  // Karaoke state
  const chunks = hasKaraoke ? chunkWords(words) : [];

  let currentWordIdx = -1;
  let currentChunkIdx = 0;

  if (hasKaraoke) {
    // Find active word
    currentWordIdx = words.findIndex((w) => {
      const s = (w.start_ms * fps) / 1000;
      const e = (w.end_ms * fps) / 1000;
      return frame >= s && frame < e;
    });

    // Between words: use last spoken
    if (currentWordIdx === -1) {
      for (let i = words.length - 1; i >= 0; i--) {
        if (frame >= (words[i].start_ms * fps) / 1000) {
          currentWordIdx = i;
          break;
        }
      }
    }

    currentChunkIdx = Math.max(
      0,
      Math.floor(Math.max(0, currentWordIdx) / CHUNK_SIZE)
    );
  }

  const globalFade = interpolate(
    frame,
    [0, 8, durationInFrames - 10, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const progressWidth = interpolate(frame, [0, durationInFrames], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const accentLineScale = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: BG, opacity: globalFade }}>
      <Audio src={staticFile(audioFile)} />

      {/* Subtle grid */}
      <AbsoluteFill
        style={{
          backgroundImage: [
            `linear-gradient(${ACCENT_GLOW.replace("0.28", "0.016")} 1px, transparent 1px)`,
            `linear-gradient(90deg, ${ACCENT_GLOW.replace("0.28", "0.016")} 1px, transparent 1px)`,
          ].join(","),
          backgroundSize: "80px 80px",
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
          transform: `scaleX(${accentLineScale})`,
          transformOrigin: "left",
        }}
      />

      {/* Title card — dentro safe zone top */}
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

      {/* === KARAOKE MODE === */}
      {hasKaraoke ? (
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            // Rispetta safe zones: top SAFE_TOP+180px per il title card, bottom SAFE_BOTTOM+40px per UI TikTok/IG
            paddingTop: SAFE_TOP + 180,
            paddingBottom: SAFE_BOTTOM + 40,
            paddingLeft: 72,
            paddingRight: SAFE_RIGHT_PAD,
            gap: 28,
          }}
        >
          {/* Previous chunk — context */}
          {currentChunkIdx > 0 && (
            <div
              style={{
                opacity: 0.25,
                fontSize: contextFontSize,
                fontFamily: "Geist, sans-serif",
                fontWeight: 700,
                color: TEXT,
                textAlign: "center",
                lineHeight: 1.3,
              }}
            >
              {chunks[currentChunkIdx - 1].map((w) => w.word).join(" ")}
            </div>
          )}

          {/* Current chunk — active */}
          {currentChunkIdx < chunks.length && (
            <div
              style={{
                fontSize: karaokeFontSize,
                fontFamily: "'NeuePower', Geist, sans-serif",
                lineHeight: 1.25,
                textAlign: "center",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                alignItems: "baseline",
              }}
            >
              {chunks[currentChunkIdx].map((w, i) => {
                const globalIdx = currentChunkIdx * CHUNK_SIZE + i;
                return (
                  <KaraokeWord
                    key={globalIdx}
                    word={w}
                    frame={frame}
                    fps={fps}
                    isActive={globalIdx === currentWordIdx}
                    isPast={globalIdx < currentWordIdx}
                    accent={ACCENT}
                    accentGlow={ACCENT_GLOW}
                  />
                );
              })}
            </div>
          )}

          {/* Next chunk — preview */}
          {currentChunkIdx < chunks.length - 1 && (
            <div
              style={{
                opacity: 0.15,
                fontSize: contextFontSize,
                fontFamily: "Geist, sans-serif",
                fontWeight: 700,
                color: TEXT,
                textAlign: "center",
                lineHeight: 1.3,
              }}
            >
              {chunks[currentChunkIdx + 1].map((w) => w.word).join(" ")}
            </div>
          )}
        </AbsoluteFill>
      ) : (
        /* === FALLBACK: segment mode === */
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "160px 60px",
          }}
        >
          {phase === "hook" && (
            <div
              style={{
                opacity: interpolate(frame, [0, 12], [0, 1], {
                  extrapolateRight: "clamp",
                }),
                transform: `translateY(${interpolate(frame, [0, 12], [20, 0], { extrapolateRight: "clamp" })}px)`,
              }}
            >
              <p
                style={{
                  fontFamily: "'NeuePower', Geist, sans-serif",
                  fontSize: 72,
                  fontWeight: 900,
                  color: TEXT,
                  lineHeight: 1.15,
                  textAlign: "center",
                }}
              >
                {hook}
              </p>
            </div>
          )}

          {phase === "body" && (
            <div
              style={{
                opacity: interpolate(
                  bodyFrame % durationPerSegment,
                  [0, 8, durationPerSegment - 8, durationPerSegment],
                  [0, 1, 1, 0],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                ),
                transform: `translateY(${interpolate(
                  bodyFrame % durationPerSegment,
                  [0, 8],
                  [16, 0],
                  { extrapolateRight: "clamp" }
                )}px)`,
              }}
            >
              <p
                style={{
                  fontFamily: "Geist Mono, monospace",
                  fontSize: 22,
                  color: ACCENT,
                  marginBottom: 28,
                  textAlign: "center",
                  letterSpacing: "2px",
                }}
              >
                {String(currentBodyIndex + 1).padStart(2, "0")} /{" "}
                {String(body.length).padStart(2, "0")}
              </p>
              <p
                style={{
                  fontFamily: "Geist, sans-serif",
                  fontSize: 56,
                  fontWeight: 600,
                  color: TEXT,
                  lineHeight: 1.25,
                  textAlign: "center",
                }}
              >
                {body[currentBodyIndex]}
              </p>
            </div>
          )}

          {phase === "cta" && (
            <div
              style={{
                opacity: interpolate(frame - ctaStart, [0, 10], [0, 1], {
                  extrapolateRight: "clamp",
                }),
              }}
            >
              <p
                style={{
                  fontFamily: "Geist, sans-serif",
                  fontSize: 48,
                  fontWeight: 500,
                  color: TEXT_DIM,
                  lineHeight: 1.3,
                  textAlign: "center",
                }}
              >
                {cta}
              </p>
            </div>
          )}
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
