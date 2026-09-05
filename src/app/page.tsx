import { A1LearningMvp } from "@/modules/learning/ui/a1-learning-mvp";
import { getA1FullCurriculum } from "@/modules/learning/infrastructure/a1-full-runtime-source";

export default function Home() {
  return <A1LearningMvp curriculum={getA1FullCurriculum()} />;
}
