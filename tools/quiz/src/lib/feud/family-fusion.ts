import type { FeudQuestion } from "./questions";
/** Extracted from the supplied 202-slide Family Fusion PowerPoint.
 * Cumulative reveals and the duplicate Player 2 Big Money set are collapsed.
 * Wording, answer order, and illustrative point values are preserved.
 */
export const FAMILY_FUSION: FeudQuestion[] = [
  {
    id: "fusion-q1",
    category: "church-life",
    prompt: "Name something people sometimes forget to bring to church.",
    sourceSlide: 10,
    answers: [
      {
        text: "Bible",
        points: 35,
        reference: "PowerPoint slide 10",
      },
      {
        text: "Offering",
        points: 25,
        reference: "PowerPoint slide 10",
      },
      {
        text: "Hymnbook",
        points: 15,
        reference: "PowerPoint slide 10",
      },
      {
        text: "Handkerchief",
        points: 12,
        reference: "PowerPoint slide 10",
      },
      {
        text: "Glasses",
        points: 8,
        reference: "PowerPoint slide 10",
      },
      {
        text: "Church programme",
        points: 5,
        reference: "PowerPoint slide 10",
      },
    ],
  },
  {
    id: "fusion-q2",
    category: "funny-church-moments",
    prompt: "Name something people do when the pastor says, ‘I’m closing now.’",
    sourceSlide: 16,
    answers: [
      {
        text: "Say Amen!",
        points: 35,
        reference: "PowerPoint slide 16",
      },
      {
        text: "Look at the clock",
        points: 25,
        reference: "PowerPoint slide 16",
      },
      {
        text: "Gather their belongings",
        points: 18,
        reference: "PowerPoint slide 16",
      },
      {
        text: "Smile or laugh",
        points: 12,
        reference: "PowerPoint slide 16",
      },
      {
        text: "Get ready to stand",
        points: 10,
        reference: "PowerPoint slide 16",
      },
    ],
  },
  {
    id: "fusion-q3",
    category: "church-life",
    prompt: "Name a reason someone might arrive late for church.",
    sourceSlide: 22,
    answers: [
      {
        text: "Overslept",
        points: 30,
        reference: "PowerPoint slide 22",
      },
      {
        text: "Getting children ready",
        points: 25,
        reference: "PowerPoint slide 22",
      },
      {
        text: "Transportation problems",
        points: 20,
        reference: "PowerPoint slide 22",
      },
      {
        text: "Taking too long to dress",
        points: 15,
        reference: "PowerPoint slide 22",
      },
      {
        text: "Traffic",
        points: 10,
        reference: "PowerPoint slide 22",
      },
    ],
  },
  {
    id: "fusion-q4",
    category: "church-life",
    prompt: "Name something you might hear during a lively church service.",
    sourceSlide: 29,
    answers: [
      {
        text: "Amen!",
        points: 35,
        reference: "PowerPoint slide 29",
      },
      {
        text: "Hallelujah!",
        points: 25,
        reference: "PowerPoint slide 29",
      },
      {
        text: "Praise the Lord!",
        points: 20,
        reference: "PowerPoint slide 29",
      },
      {
        text: "Glory to God!",
        points: 12,
        reference: "PowerPoint slide 29",
      },
      {
        text: "Preach, Pastor!",
        points: 8,
        reference: "PowerPoint slide 29",
      },
    ],
  },
  {
    id: "fusion-q5",
    category: "church-life",
    prompt: "Name something children look forward to at church.",
    sourceSlide: 35,
    answers: [
      {
        text: "Sunday School",
        points: 30,
        reference: "PowerPoint slide 35",
      },
      {
        text: "Seeing friends",
        points: 25,
        reference: "PowerPoint slide 35",
      },
      {
        text: "Singing",
        points: 20,
        reference: "PowerPoint slide 35",
      },
      {
        text: "Children's Church",
        points: 15,
        reference: "PowerPoint slide 35",
      },
      {
        text: "Refreshments",
        points: 10,
        reference: "PowerPoint slide 35",
      },
    ],
  },
  {
    id: "fusion-q6",
    category: "funny-church-moments",
    prompt:
      "Name something that might happen when someone is asked to pray unexpectedly.",
    sourceSlide: 41,
    answers: [
      {
        text: "Get nervous",
        points: 35,
        reference: "PowerPoint slide 41",
      },
      {
        text: "Close their eyes quickly",
        points: 25,
        reference: "PowerPoint slide 41",
      },
      {
        text: "Start with ‘Father God’",
        points: 20,
        reference: "PowerPoint slide 41",
      },
      {
        text: "Laugh or smile",
        points: 12,
        reference: "PowerPoint slide 41",
      },
      {
        text: "Ask someone else",
        points: 8,
        reference: "PowerPoint slide 41",
      },
    ],
  },
  {
    id: "fusion-q7",
    category: "church-life",
    prompt: "Name something you would find in almost every church sanctuary.",
    sourceSlide: 48,
    answers: [
      {
        text: "Pulpit",
        points: 30,
        reference: "PowerPoint slide 48",
      },
      {
        text: "Chairs or pews",
        points: 25,
        reference: "PowerPoint slide 48",
      },
      {
        text: "Bible",
        points: 20,
        reference: "PowerPoint slide 48",
      },
      {
        text: "Microphone",
        points: 15,
        reference: "PowerPoint slide 48",
      },
      {
        text: "Musical instruments",
        points: 10,
        reference: "PowerPoint slide 48",
      },
    ],
  },
  {
    id: "fusion-q8",
    category: "church-life",
    prompt: "Name a ministry or department commonly found in church.",
    sourceSlide: 54,
    answers: [
      {
        text: "Youth Ministry",
        points: 30,
        reference: "PowerPoint slide 54",
      },
      {
        text: "Ladies' Ministry",
        points: 25,
        reference: "PowerPoint slide 54",
      },
      {
        text: "Men's Ministry",
        points: 20,
        reference: "PowerPoint slide 54",
      },
      {
        text: "Sunday School",
        points: 15,
        reference: "PowerPoint slide 54",
      },
      {
        text: "Family Life Ministry",
        points: 10,
        reference: "PowerPoint slide 54",
      },
    ],
  },
  {
    id: "fusion-q9",
    category: "bible-knowledge",
    prompt: "Name a well-known woman in the Bible.",
    sourceSlide: 60,
    answers: [
      {
        text: "Mary",
        points: 30,
        reference: "PowerPoint slide 60",
      },
      {
        text: "Esther",
        points: 25,
        reference: "PowerPoint slide 60",
      },
      {
        text: "Ruth",
        points: 20,
        reference: "PowerPoint slide 60",
      },
      {
        text: "Sarah",
        points: 15,
        reference: "PowerPoint slide 60",
      },
      {
        text: "Deborah",
        points: 10,
        reference: "PowerPoint slide 60",
      },
    ],
  },
  {
    id: "fusion-q10",
    category: "bible-knowledge",
    prompt: "Name a Bible character known for great faith.",
    sourceSlide: 67,
    answers: [
      {
        text: "Abraham",
        points: 30,
        reference: "PowerPoint slide 67",
      },
      {
        text: "Daniel",
        points: 25,
        reference: "PowerPoint slide 67",
      },
      {
        text: "Noah",
        points: 20,
        reference: "PowerPoint slide 67",
      },
      {
        text: "Job",
        points: 15,
        reference: "PowerPoint slide 67",
      },
      {
        text: "David",
        points: 10,
        reference: "PowerPoint slide 67",
      },
    ],
  },
  {
    id: "fusion-q11",
    category: "bible-knowledge",
    prompt: "Name a miracle performed by Jesus.",
    sourceSlide: 73,
    answers: [
      {
        text: "Feeding the 5,000",
        points: 30,
        reference: "PowerPoint slide 73",
      },
      {
        text: "Turning water into wine",
        points: 25,
        reference: "PowerPoint slide 73",
      },
      {
        text: "Walking on water",
        points: 20,
        reference: "PowerPoint slide 73",
      },
      {
        text: "Raising Lazarus",
        points: 15,
        reference: "PowerPoint slide 73",
      },
      {
        text: "Healing the blind",
        points: 10,
        reference: "PowerPoint slide 73",
      },
    ],
  },
  {
    id: "fusion-q12",
    category: "bible-knowledge",
    prompt: "Name something David is famous for in the Bible.",
    sourceSlide: 79,
    answers: [
      {
        text: "Defeating Goliath",
        points: 40,
        reference: "PowerPoint slide 79",
      },
      {
        text: "Becoming king",
        points: 25,
        reference: "PowerPoint slide 79",
      },
      {
        text: "Playing the harp",
        points: 15,
        reference: "PowerPoint slide 79",
      },
      {
        text: "Writing psalms",
        points: 12,
        reference: "PowerPoint slide 79",
      },
      {
        text: "Being a shepherd",
        points: 8,
        reference: "PowerPoint slide 79",
      },
    ],
  },
  {
    id: "fusion-q13",
    category: "church-fun",
    prompt:
      "Name something people do when the choir sings their favourite song.",
    sourceSlide: 86,
    answers: [
      {
        text: "Sing along",
        points: 40,
        reference: "PowerPoint slide 86",
      },
      {
        text: "Clap their hands",
        points: 25,
        reference: "PowerPoint slide 86",
      },
      {
        text: "Stand up",
        points: 15,
        reference: "PowerPoint slide 86",
      },
      {
        text: "Dance or sway",
        points: 12,
        reference: "PowerPoint slide 86",
      },
      {
        text: "Raise their hands",
        points: 8,
        reference: "PowerPoint slide 86",
      },
    ],
  },
  {
    id: "fusion-q14",
    category: "family-life",
    prompt: "Name something Christian families should do together.",
    sourceSlide: 92,
    answers: [
      {
        text: "Pray",
        points: 35,
        reference: "PowerPoint slide 92",
      },
      {
        text: "Attend church",
        points: 25,
        reference: "PowerPoint slide 92",
      },
      {
        text: "Read the Bible",
        points: 20,
        reference: "PowerPoint slide 92",
      },
      {
        text: "Eat together",
        points: 12,
        reference: "PowerPoint slide 92",
      },
      {
        text: "Spend quality time",
        points: 8,
        reference: "PowerPoint slide 92",
      },
    ],
  },
  {
    id: "fusion-q15",
    category: "family-life",
    prompt:
      "Name something parents often tell their children before leaving for church.",
    sourceSlide: 98,
    answers: [
      {
        text: "Hurry up!",
        points: 35,
        reference: "PowerPoint slide 98",
      },
      {
        text: "Get dressed!",
        points: 25,
        reference: "PowerPoint slide 98",
      },
      {
        text: "Where is your Bible?",
        points: 20,
        reference: "PowerPoint slide 98",
      },
      {
        text: "Behave yourself!",
        points: 12,
        reference: "PowerPoint slide 98",
      },
      {
        text: "Put on your shoes!",
        points: 8,
        reference: "PowerPoint slide 98",
      },
    ],
  },
  {
    id: "fusion-q16",
    category: "family-life",
    prompt: "Name something that helps keep a Christian family strong.",
    sourceSlide: 105,
    answers: [
      {
        text: "Prayer",
        points: 30,
        reference: "PowerPoint slide 105",
      },
      {
        text: "Love",
        points: 25,
        reference: "PowerPoint slide 105",
      },
      {
        text: "Communication",
        points: 20,
        reference: "PowerPoint slide 105",
      },
      {
        text: "Forgiveness",
        points: 15,
        reference: "PowerPoint slide 105",
      },
      {
        text: "Respect",
        points: 10,
        reference: "PowerPoint slide 105",
      },
    ],
  },
  {
    id: "fusion-q17",
    category: "family-life",
    prompt: "Name something families might argue about on Sunday morning.",
    sourceSlide: 111,
    answers: [
      {
        text: "Who is taking too long",
        points: 30,
        reference: "PowerPoint slide 111",
      },
      {
        text: "What to wear",
        points: 25,
        reference: "PowerPoint slide 111",
      },
      {
        text: "Bathroom time",
        points: 20,
        reference: "PowerPoint slide 111",
      },
      {
        text: "Who is driving",
        points: 15,
        reference: "PowerPoint slide 111",
      },
      {
        text: "What time to leave",
        points: 10,
        reference: "PowerPoint slide 111",
      },
    ],
  },
  {
    id: "fusion-q18",
    category: "church-fun",
    prompt: "Name something people do during praise and worship.",
    sourceSlide: 117,
    answers: [
      {
        text: "Sing",
        points: 35,
        reference: "PowerPoint slide 117",
      },
      {
        text: "Clap",
        points: 25,
        reference: "PowerPoint slide 117",
      },
      {
        text: "Raise their hands",
        points: 20,
        reference: "PowerPoint slide 117",
      },
      {
        text: "Dance",
        points: 12,
        reference: "PowerPoint slide 117",
      },
      {
        text: "Shout Hallelujah",
        points: 8,
        reference: "PowerPoint slide 117",
      },
    ],
  },
  {
    id: "fusion-q19",
    category: "church-fun",
    prompt: "Name something church members might do after the benediction.",
    sourceSlide: 124,
    answers: [
      {
        text: "Greet each other",
        points: 35,
        reference: "PowerPoint slide 124",
      },
      {
        text: "Talk with friends",
        points: 25,
        reference: "PowerPoint slide 124",
      },
      {
        text: "Take pictures",
        points: 18,
        reference: "PowerPoint slide 124",
      },
      {
        text: "Go home",
        points: 12,
        reference: "PowerPoint slide 124",
      },
      {
        text: "Make lunch plans",
        points: 10,
        reference: "PowerPoint slide 124",
      },
    ],
  },
  {
    id: "fusion-q20",
    category: "church-fun",
    prompt:
      "Name something that could make the congregation laugh during church.",
    sourceSlide: 130,
    answers: [
      {
        text: "A funny testimony",
        points: 30,
        reference: "PowerPoint slide 130",
      },
      {
        text: "A child's comment",
        points: 25,
        reference: "PowerPoint slide 130",
      },
      {
        text: "A joke from the pastor",
        points: 20,
        reference: "PowerPoint slide 130",
      },
      {
        text: "A microphone mishap",
        points: 15,
        reference: "PowerPoint slide 130",
      },
      {
        text: "Someone's funny expression",
        points: 10,
        reference: "PowerPoint slide 130",
      },
    ],
  },
  {
    id: "fusion-q21",
    category: "family-fellowship",
    prompt:
      "Name something a church member might say when invited to a fellowship dinner.",
    sourceSlide: 136,
    answers: [
      {
        text: "What time does it start?",
        points: 30,
        reference: "PowerPoint slide 136",
      },
      {
        text: "A child's comment",
        points: 25,
        reference: "PowerPoint slide 136",
      },
      {
        text: "I will be there!",
        points: 20,
        reference: "PowerPoint slide 136",
      },
      {
        text: "Who is cooking?",
        points: 15,
        reference: "PowerPoint slide 136",
      },
      {
        text: "Someone's funny expression",
        points: 10,
        reference: "PowerPoint slide 136",
      },
    ],
    hostNote:
      "The source slide’s second and fifth answers appear unrelated to this prompt. Imported unchanged; review these two answers before hosting this board.",
  },
  {
    id: "fusion-big-1",
    category: "big-money",
    prompt: "Name something church members do before a service begins.",
    sourceSlide: 145,
    answers: [
      {
        text: "Pray",
        points: 40,
        reference: "PowerPoint slides 145–149",
      },
      {
        text: "Greet others",
        points: 30,
        reference: "PowerPoint slides 145–149",
      },
      {
        text: "Find a seat",
        points: 15,
        reference: "PowerPoint slides 145–149",
      },
      {
        text: "Rehearse",
        points: 10,
        reference: "PowerPoint slides 145–149",
      },
      {
        text: "Read the Bible",
        points: 5,
        reference: "PowerPoint slides 145–149",
      },
    ],
  },
  {
    id: "fusion-big-2",
    category: "big-money",
    prompt: "Name a Bible story children love to hear.",
    sourceSlide: 150,
    answers: [
      {
        text: "David and Goliath",
        points: 40,
        reference: "PowerPoint slides 150–154",
      },
      {
        text: "Noah’s Ark",
        points: 30,
        reference: "PowerPoint slides 150–154",
      },
      {
        text: "Daniel in the lions’ den",
        points: 15,
        reference: "PowerPoint slides 150–154",
      },
      {
        text: "Jonah and the fish",
        points: 10,
        reference: "PowerPoint slides 150–154",
      },
      {
        text: "Jesus’ birth",
        points: 5,
        reference: "PowerPoint slides 150–154",
      },
    ],
  },
  {
    id: "fusion-big-3",
    category: "big-money",
    prompt: "Name something you might hear during praise and worship.",
    sourceSlide: 155,
    answers: [
      {
        text: "Singing",
        points: 40,
        reference: "PowerPoint slides 155–159",
      },
      {
        text: "Clapping",
        points: 30,
        reference: "PowerPoint slides 155–159",
      },
      {
        text: "Amen",
        points: 15,
        reference: "PowerPoint slides 155–159",
      },
      {
        text: "Musical instruments",
        points: 10,
        reference: "PowerPoint slides 155–159",
      },
      {
        text: "Hallelujah",
        points: 5,
        reference: "PowerPoint slides 155–159",
      },
    ],
  },
  {
    id: "fusion-big-4",
    category: "big-money",
    prompt: "Name something families can do to grow in faith together.",
    sourceSlide: 160,
    answers: [
      {
        text: "Pray",
        points: 40,
        reference: "PowerPoint slides 160–164",
      },
      {
        text: "Read the Bible",
        points: 30,
        reference: "PowerPoint slides 160–164",
      },
      {
        text: "Attend church",
        points: 15,
        reference: "PowerPoint slides 160–164",
      },
      {
        text: "Worship together",
        points: 10,
        reference: "PowerPoint slides 160–164",
      },
      {
        text: "Serve others",
        points: 5,
        reference: "PowerPoint slides 160–164",
      },
    ],
  },
  {
    id: "fusion-big-5",
    category: "big-money",
    prompt: "Name something people enjoy at a church fellowship.",
    sourceSlide: 165,
    answers: [
      {
        text: "Food",
        points: 40,
        reference: "PowerPoint slides 165–169",
      },
      {
        text: "Conversation",
        points: 30,
        reference: "PowerPoint slides 165–169",
      },
      {
        text: "Games",
        points: 15,
        reference: "PowerPoint slides 165–169",
      },
      {
        text: "Music",
        points: 10,
        reference: "PowerPoint slides 165–169",
      },
      {
        text: "Meeting friends",
        points: 5,
        reference: "PowerPoint slides 165–169",
      },
    ],
  },
];
