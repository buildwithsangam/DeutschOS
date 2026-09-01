export type AlphabetEntry = {
  letter: string;
  germanName: string;
  learnerNote: string;
  example?: string;
};

/**
 * Day 5 requires the complete alphabet, including Ä/Ö/Ü/ß. Names are shown
 * as German letter names—not English respellings—and no audio is implied.
 */
export const germanAlphabetFoundation: AlphabetEntry[] = [
  ["A", "A", "One clear open letter name.", "Abend"], ["B", "Be", "A short consonant name.", "bitte"],
  ["C", "Ce", "Often heard in borrowed words; listen for the word context."], ["D", "De", "Keep the letter name short.", "Danke"],
  ["E", "E", "Important contrast: E is not I; Day 5 treats this as a spelling priority.", "Englisch"], ["F", "Ef", "The name begins with the vowel sound."],
  ["G", "Ge", "A clear letter name for spelling."], ["H", "Ha", "Important contrast: A and H are different letter names."],
  ["I", "I", "Important contrast: I is not E; Day 5 treats this as a spelling priority.", "ich"], ["J", "Jott", "The letter name is Jott; in words J often relates to a y-like sound.", "ja"],
  ["K", "Ka", "A clear letter name for spelling."], ["L", "El", "The name begins with the vowel sound."], ["M", "Em", "The name begins with the vowel sound."],
  ["N", "En", "The name begins with the vowel sound."], ["O", "O", "One clear rounded letter name."], ["P", "Pe", "A clear letter name for spelling."],
  ["Q", "Qu", "Usually appears together with u in German spelling."], ["R", "Er", "In words, r can change near a vowel; use the day’s practical guidance."],
  ["S", "Es", "At the start of a word before a vowel it can sound voiced."], ["T", "Te", "A clear letter name for spelling."],
  ["U", "U", "One clear rounded letter name."], ["V", "Vau", "Important Day 1 contrast: V is not W in German letter names."],
  ["W", "We", "Important Day 1 contrast: W is the /v/-sound in words such as wer.", "wer"], ["X", "X", "Used mainly in some names and borrowed words."],
  ["Y", "Ypsilon", "Important Day 5 contrast: J and Y have different letter names."], ["Z", "Zett", "Day 5 focus: the name starts with a ts-like sound.", "Zug"],
  ["Ä", "Ä", "An Umlaut letter; keep it distinct from A."], ["Ö", "Ö", "An Umlaut letter; round the lips gently."],
  ["Ü", "Ü", "An Umlaut letter; round the lips gently while keeping the tongue forward."], ["ß", "Eszett", "A spelling sign, not a separate spoken sound; it relates to ss."],
].map(([letter, germanName, learnerNote, example]) => ({ letter, germanName, learnerNote, example }));

export const highValueSpellingPatterns = [
  ["ch", "Use the day’s practical guidance: ich has the light ich-sound; do not force an English sh."],
  ["sch", "One sh-like spelling pattern in words such as sprechen."],
  ["sp / st", "At the start of many German words, listen for a sh-like beginning before p or t."],
  ["ei", "Often heard as one glide in words such as mein."],
  ["ie", "Often signals a longer i-sound in words such as Sie."],
  ["eu / äu", "A rounded glide pattern; hear it in Deutsch / heute when it appears."],
  ["au", "A glide pattern in Auf Wiedersehen."],
  ["er", "The r can soften near a vowel; prioritise intelligibility over technical labels."],
  ["qu", "Usually stays together in spelling."],
  ["z", "Starts with a ts-like sound in words such as Zug."],
  ["w / v / j", "W relates to the /v/ word sound; V and J must be learned as their own German letters."],
] as const;
