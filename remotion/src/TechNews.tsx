import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Audio,
  AbsoluteFill,
  staticFile,
} from "remotion";

export interface TechNewsProps {
  hook: string;
  body: string[];
  cta: string;
  titleCard: string;
  audioFile: string; // nome file in /public/, es. "audio.mp3"
  durationPerSegment?: number; // frames per segmento body, default 60 (2s a 30fps)
}

const ACCENT = "oklch(73% 0.14 158)"; // emerald
const BG = "#070709";
const TEXT = "#eff0f2";
const TEXT_2 = "#9ca3af";



export const TechNews: React.FC<TechNewsProps> = ({
  hook,
  body,
  cta,
  titleCard,
  audioFile,
  durationPerSegment = 60,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Struttura temporale
  const hookDuration = fps * 3; // 3 secondi hook
  const bodyDuration = body.length * durationPerSegment;
  const ctaStart = hookDuration + bodyDuration;

  // Quale segmento body siamo
  const bodyFrame = Math.max(0, frame - hookDuration);
  const currentBodyIndex = Math.min(
    Math.floor(bodyFrame / durationPerSegment),
    body.length - 1
  );

  // Fase corrente
  const phase: "hook" | "body" | "cta" =
    frame < hookDuration ? "hook" : frame < ctaStart ? "body" : "cta";

  // Fade globale entrata/uscita
  const globalFade = interpolate(
    frame,
    [0, 8, durationInFrames - 10, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Barra di progresso
  const progressWidth = interpolate(frame, [0, durationInFrames], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: BG, opacity: globalFade }}>

      {/* Audio TTS */}
      <Audio src={staticFile(audioFile)} />

      {/* Griglia di sfondo sottile */}
      <AbsoluteFill
        style={{
          backgroundImage: `
            linear-gradient(oklch(73% 0.14 158 / 0.025) 1px, transparent 1px),
            linear-gradient(90deg, oklch(73% 0.14 158 / 0.025) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Accent line top */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 3, background: ACCENT,
        transform: `scaleX(${interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" })})`,
        transformOrigin: "left",
      }} />

      {/* Title card */}
      <div style={{
        position: "absolute", top: 72, left: 60, right: 60,
        display: "flex", alignItems: "center", gap: 14,
        opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: ACCENT,
          boxShadow: `0 0 12px ${ACCENT}`,
        }} />
        <span style={{
          fontFamily: "Geist, sans-serif",
          fontSize: 28, fontWeight: 700,
          color: TEXT_2, letterSpacing: "2px",
          textTransform: "uppercase",
        }}>
          {titleCard}
        </span>
      </div>

      {/* Corpo principale */}
      <AbsoluteFill style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "140px 60px",
      }}>

        {/* HOOK */}
        {phase === "hook" && (
          <div style={{
            opacity: interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" }),
            transform: `translateY(${interpolate(frame, [0, 12], [20, 0], { extrapolateRight: "clamp" })}px)`,
          }}>
            <p style={{
              fontFamily: "'NeuePower', Geist, sans-serif",
              fontSize: 72, fontWeight: 900,
              color: TEXT, lineHeight: 1.15,
              textAlign: "center",
              letterSpacing: "-0.5px",
            }}>
              {hook}
            </p>
          </div>
        )}

        {/* BODY — un segmento alla volta */}
        {phase === "body" && (
          <div style={{
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
          }}>
            {/* Numero segmento */}
            <p style={{
              fontFamily: "Geist Mono, monospace",
              fontSize: 22, color: ACCENT,
              marginBottom: 28, textAlign: "center",
              letterSpacing: "2px",
            }}>
              {String(currentBodyIndex + 1).padStart(2, "0")} / {String(body.length).padStart(2, "0")}
            </p>
            <p style={{
              fontFamily: "Geist, sans-serif",
              fontSize: 56, fontWeight: 600,
              color: TEXT, lineHeight: 1.25,
              textAlign: "center",
            }}>
              {body[currentBodyIndex]}
            </p>
          </div>
        )}

        {/* CTA */}
        {phase === "cta" && (
          <div style={{
            opacity: interpolate(frame - ctaStart, [0, 10], [0, 1], { extrapolateRight: "clamp" }),
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: 32,
          }}>
            <div style={{
              width: 64, height: 2, background: ACCENT,
              transform: `scaleX(${interpolate(frame - ctaStart, [0, 15], [0, 1], { extrapolateRight: "clamp" })})`,
              transformOrigin: "left",
            }} />
            <p style={{
              fontFamily: "Geist, sans-serif",
              fontSize: 48, fontWeight: 500,
              color: TEXT_2, lineHeight: 1.3,
              textAlign: "center",
            }}>
              {cta}
            </p>
          </div>
        )}
      </AbsoluteFill>

      {/* Barra progresso bottom */}
      <div style={{
        position: "absolute", bottom: 0, left: 0,
        height: 3, background: ACCENT,
        width: `${progressWidth}%`,
        opacity: 0.5,
      }} />

    </AbsoluteFill>
  );
};
