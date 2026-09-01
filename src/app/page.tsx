import { getA1DaysOneToFourteen } from "@/modules/curriculum/infrastructure/a1-days-1-14-source";
import { A1LearningMvp } from "@/modules/learning/ui/a1-learning-mvp";

export default function Home() {
  return <A1LearningMvp curriculum={getA1DaysOneToFourteen()} />;
}
