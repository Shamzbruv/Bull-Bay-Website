/** Factual answer boards checked against 1 Kings 3 (KJV).
 * Points are game values, never survey percentages or popularity rankings.
 * Source: https://www.biblesociety.org.uk/explore-the-bible/read/eng/kjv/1Kgs/3/
 */
export interface FeudAnswer {
  text: string;
  points: number;
  reference: string;
  accept?: string;
}
export interface FeudQuestion {
  id: string;
  prompt: string;
  answers: FeudAnswer[];
  category?: string;
}
const a = (
  text: string,
  points: number,
  verse: string,
  accept?: string,
): FeudAnswer => ({ text, points, reference: `1 Kings 3:${verse}`, accept });
export const KINGS_THREE: FeudQuestion[] = [
  {
    id: "buildings",
    prompt: "Name the three building projects mentioned in 1 Kings 3:1.",
    answers: [
      a("His own house", 40, "1", "Solomon’s palace"),
      a("The house of the LORD", 35, "1", "The temple"),
      a("The wall around Jerusalem", 25, "1"),
    ],
  },
  {
    id: "david",
    prompt: "In what three ways did Solomon say David had walked before God?",
    answers: [
      a("Truth", 40, "6", "Truthfulness"),
      a("Righteousness", 35, "6"),
      a("Uprightness of heart", 25, "6"),
    ],
  },
  {
    id: "not-asked",
    prompt: "Name the three things God said Solomon had NOT asked for himself.",
    answers: [
      a("Long life", 40, "11"),
      a("Riches", 35, "11", "Wealth"),
      a("The life of his enemies", 25, "11", "The death of his enemies"),
    ],
  },
  {
    id: "gifts",
    prompt: "Name the gifts God said He had given Solomon in verses 12–13.",
    answers: [
      a(
        "A wise and understanding heart",
        50,
        "12",
        "Wisdom / understanding; count as ONE answer",
      ),
      a("Riches", 30, "13", "Wealth"),
      a("Honour", 20, "13", "Honor"),
    ],
  },
  {
    id: "conditions",
    prompt:
      "Name the three actions God required when He promised to lengthen Solomon’s days.",
    answers: [
      a("Walk in God’s ways", 40, "14"),
      a("Keep God’s statutes", 35, "14"),
      a("Keep God’s commandments", 25, "14"),
    ],
  },
  {
    id: "jerusalem",
    prompt:
      "After waking and returning to Jerusalem, what four things did Solomon do?",
    answers: [
      a("Stood before the ark of the covenant", 35, "15"),
      a("Offered burnt offerings", 25, "15"),
      a("Offered peace offerings", 25, "15"),
      a("Made a feast for his servants", 15, "15"),
    ],
  },
  {
    id: "gibeon",
    prompt:
      "Give these facts about Solomon’s visit: WHERE did he sacrifice, HOW MANY burnt offerings, HOW did God appear, and WHEN?",
    answers: [
      a("Gibeon", 35, "4–5"),
      a("One thousand burnt offerings", 25, "4", "1,000"),
      a("In a dream", 25, "5"),
      a("At night", 15, "5"),
    ],
  },
  {
    id: "request",
    prompt:
      "Complete Solomon’s request with three facts: WHAT kind of heart, to DO what, and to DISCERN between what?",
    answers: [
      a("An understanding heart", 40, "9"),
      a("Judge God’s people", 35, "9"),
      a("Good and bad", 25, "9", "Good and evil"),
    ],
  },
  {
    id: "household",
    prompt:
      "Give four facts from the women’s account: HOW MANY women, WHERE they lived, WHEN the second child was born, and WHO ELSE was in the house?",
    answers: [
      a("Two women", 35, "16–18"),
      a("In the same house", 25, "17"),
      a("The third day after the first birth", 25, "18", "Three days later"),
      a("No one else / no stranger", 15, "18"),
    ],
  },
  {
    id: "switch",
    prompt:
      "According to the first woman, WHEN was the baby taken, WHERE was her living child placed, and WHERE was the dead child placed?",
    answers: [
      a("At midnight", 40, "20"),
      a(
        "In the other woman’s bosom",
        35,
        "20",
        "Against the other woman’s chest / in her arms",
      ),
      a(
        "In the speaking woman’s bosom",
        25,
        "20",
        "Against the first woman’s chest / in her arms",
      ),
    ],
  },
  {
    id: "judgment",
    prompt:
      "Give three facts about Solomon’s test: WHAT did he ask to be brought, WHAT did he order for the child, and HOW was it to be shared?",
    answers: [
      a("A sword", 40, "24"),
      a("Divide the living child in two", 35, "25"),
      a("Give half to each woman", 25, "25"),
    ],
  },
  {
    id: "mother",
    prompt:
      "Give three facts about the true mother: WHAT did she ask for the baby, WHAT did she ask them not to do, and WHAT did Solomon finally order?",
    answers: [
      a("Give the living child to the other woman", 40, "26"),
      a("Do not kill the child", 35, "26"),
      a("Give the living child to its true mother", 25, "27"),
    ],
  },
];
