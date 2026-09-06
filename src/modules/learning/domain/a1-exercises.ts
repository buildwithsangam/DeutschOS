import type { A1Day } from "@/modules/curriculum/domain/a1-days-1-14";
import { dailyCoreItems } from "@/modules/curriculum/domain/learning-presentation";

export type ExerciseType =
  | "flashcard"
  | "multipleChoice"
  | "wordOrder"
  | "fillBlank"
  | "matchPairs"
  | "typeAnswer"
  | "listenSelect"
  | "shadow"
  | "roleplay"
  | "writeShort"
  | "checklist";

interface BaseExercise {
  id: string;
  prompt: string;
  source: string;
}

export interface FlashcardExercise extends BaseExercise {
  type: "flashcard";
  data: {
    front: string;
    back: string;
    register?: "Formal" | "Informal";
  };
}

export interface MultipleChoiceExercise extends BaseExercise {
  type: "multipleChoice";
  data: {
    question: string;
    options: string[];
    correctIndex: number;
  };
}

export interface WordOrderExercise extends BaseExercise {
  type: "wordOrder";
  data: {
    tokens: string[];
    answer: string;
  };
}

export interface FillBlankExercise extends BaseExercise {
  type: "fillBlank";
  data: {
    sentence: string;
    blanks: Array<{ id: string; answer: string }>;
  };
}

export interface MatchPairsExercise extends BaseExercise {
  type: "matchPairs";
  data: {
    pairs: Array<{ id: string; left: string; right: string }>;
  };
}

export interface TypeAnswerExercise extends BaseExercise {
  type: "typeAnswer";
  data: {
    answer: string;
    accepted?: string[];
  };
}

export interface ListenSelectExercise extends BaseExercise {
  type: "listenSelect";
  data: {
    options: string[];
    correctIndex: number;
    audioAvailable: false;
  };
}

export interface ShadowExercise extends BaseExercise {
  type: "shadow";
  data: {
    text: string;
  };
}

export interface RoleplayExercise extends BaseExercise {
  type: "roleplay";
  data: {
    scenario: string;
    guidance?: string;
  };
}

export interface WriteShortExercise extends BaseExercise {
  type: "writeShort";
  data: {
    minWords?: number;
  };
}

export interface ChecklistExercise extends BaseExercise {
  type: "checklist";
  data: {
    items: string[];
  };
}

export type A1Exercise =
  | FlashcardExercise
  | MultipleChoiceExercise
  | WordOrderExercise
  | FillBlankExercise
  | MatchPairsExercise
  | TypeAnswerExercise
  | ListenSelectExercise
  | ShadowExercise
  | RoleplayExercise
  | WriteShortExercise
  | ChecklistExercise;

/**
 * Derives exercises for a day from canonical DeutschOS content only.
 *
 * Currently only `flashcard` is populated from Daily German Core items.
 * Other exercise types are intentionally not generated because the canonical
 * curriculum does not yet contain structured data for them.
 */
export function deriveExercisesForDay(day: A1Day): A1Exercise[] {
  const exercises: A1Exercise[] = [];
  const coreItems = dailyCoreItems(day);

  coreItems.forEach((item, index) => {
    exercises.push({
      id: `day-${day.dayNumber}-core-flashcard-${index}`,
      type: "flashcard",
      prompt: "Review this Daily German Core item",
      source: `Day ${day.dayNumber} Daily German Core`,
      data: {
        front: item.german,
        back: item.meaningAndType,
        register: item.register,
      },
    });
  });

  return exercises;
}