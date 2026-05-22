import "./index.css";
import { Composition } from "remotion";
import { TechNews } from "./TechNews";
import type { TechNewsProps } from "./TechNews";

const DEFAULT_PROPS: TechNewsProps = {
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
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="TechNews"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      component={TechNews as any}
      durationInFrames={510}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={DEFAULT_PROPS as unknown as Record<string, unknown>}
    />
  );
};
