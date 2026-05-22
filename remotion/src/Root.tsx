import "./index.css";
import { Composition } from "remotion";
import { WhyMultiTemplate } from "./WhyMultiTemplate";
import type { WhyMultiTemplateProps } from "./WhyMultiTemplate";
import { WhyTutorialTemplate } from "./templates/WhyTutorialTemplate";
import type { WhyTutorialTemplateProps } from "./templates/WhyTutorialTemplate";
import { WhyBestOfTemplate } from "./templates/WhyBestOfTemplate";
import type { WhyBestOfTemplateProps } from "./templates/WhyBestOfTemplate";

const DEFAULT_PROPS: WhyMultiTemplateProps = {
  hook: "Un'AI ha appena demolito una congettura matematica che resisteva da decenni.",
  body: [
    "Un modello di OpenAI ha confutato una congettura centrale nella geometria discreta.",
    "La congettura riguardava come i punti si distribuiscono nello spazio in dimensioni alte.",
    "Il modello non ha trovato la prova per caso: ha esplorato costruzioni che i matematici ignoravano.",
    "I ricercatori hanno poi verificato e confermato il controesempio generato dall'AI.",
    "È la prima volta che un sistema AI falsifica un risultato aperto in matematica pura.",
  ],
  cta: "Segui per altre news su AI e scienza.",
  titleCard: "TECH NEWS",
  audioFile: "audio.mp3",
  durationPerSegment: 66,
  words: [],
  totalDurationFrames: 510,
};

const DEFAULT_TUTORIAL_PROPS: WhyTutorialTemplateProps = {
  hook: "COME IMPARARE UNA CANZONE IN CHITARRA",
  body: [
    "Ascolta la canzone 10 volte di fila senza strumento — il tuo orecchio deve memorizzarla.",
    "Trova gli accordi con un'app come Chordify o cerca tab su Ultimate Guitar.",
    "Impara ogni accordo separatamente, poi allena le transizioni lente con metromo a 60 BPM.",
    "Registra te stesso ogni giorno: il confronto tra sessioni è il miglior feedback.",
    "Suona davanti a qualcuno: la pressione esterna accelera la memorizzazione del 40%.",
  ],
  cta: "Seguimi per altri tutorial musicali.",
  titleCard: "TUTORIAL",
  audioFile: "audio.mp3",
  durationPerSegment: 90,
  words: [],
  totalDurationFrames: 660,
  accentColor: "oklch(75% 0.14 260)",
  bgColor: "#070709",
};

const DEFAULT_BESTOF_PROPS: WhyBestOfTemplateProps = {
  hook: "Le 5 canzoni italiane più ascoltate di sempre",
  body: [
    "Azzurro — Adriano Celentano (1968): l'inno nostalgico dell'estate italiana.",
    "Nel blu dipinto di blu — Domenico Modugno: prima canzone italiana a vincere un Grammy.",
    "L'italiano — Toto Cutugno: tradotta in 40 lingue, simbolo del made in Italy nel mondo.",
    "Volare — Dean Martin la portò in cima alle chart USA, 50 milioni di copie vendute.",
    "Con te partirò — Andrea Bocelli: la più venduta di sempre con 12 milioni di copie.",
  ],
  cta: "Seguimi per altre classifiche musicali italiane.",
  titleCard: "TOP 5",
  audioFile: "audio.mp3",
  durationPerSegment: 72,
  words: [],
  totalDurationFrames: 570,
  accentColor: "oklch(78% 0.16 55)",
  bgColor: "#090800",
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="WhyMultiTemplate"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={WhyMultiTemplate as any}
        calculateMetadata={({ props }) => {
          const p = props as unknown as WhyMultiTemplateProps;
          const frames = p.totalDurationFrames ?? 510;
          return { durationInFrames: Math.max(frames, 90) };
        }}
        durationInFrames={510}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={DEFAULT_PROPS as unknown as Record<string, unknown>}
      />
      <Composition
        id="WhyTutorialTemplate"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={WhyTutorialTemplate as any}
        calculateMetadata={({ props }) => {
          const p = props as unknown as WhyTutorialTemplateProps;
          const frames = p.totalDurationFrames ?? 660;
          return { durationInFrames: Math.max(frames, 90) };
        }}
        durationInFrames={660}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={DEFAULT_TUTORIAL_PROPS as unknown as Record<string, unknown>}
      />
      <Composition
        id="WhyBestOfTemplate"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={WhyBestOfTemplate as any}
        calculateMetadata={({ props }) => {
          const p = props as unknown as WhyBestOfTemplateProps;
          const frames = p.totalDurationFrames ?? 570;
          return { durationInFrames: Math.max(frames, 90) };
        }}
        durationInFrames={570}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={DEFAULT_BESTOF_PROPS as unknown as Record<string, unknown>}
      />
    </>
  );
};
