import type { FeudQuestion } from "./questions";
/** Bounded factual lists from the KJV. Scores are game values, not survey results.
 * Scripture text cross-checked using the public-domain KJV corpus:
 * https://github.com/aruljohn/Bible-kjv
 */
export const FEUD_CATEGORIES = {
  beginnings: "Beginnings & families",
  exodus: "Exodus & wilderness",
  kings: "Kings & prophets",
  gospels: "Jesus & the Gospels",
  church: "The early church",
  faith: "Faith & Scripture",
} as const;
export type FeudCategory = keyof typeof FEUD_CATEGORIES;
export const GENERAL_BIBLE: FeudQuestion[] = [
  {
    id: "general-noah-sons",
    category: "beginnings",
    prompt: "Name Noah’s three sons.",
    answers: [
      {
        text: "Shem",
        points: 40,
        reference: "Genesis 6:10",
      },
      {
        text: "Ham",
        points: 35,
        reference: "Genesis 6:10",
      },
      {
        text: "Japheth",
        points: 25,
        reference: "Genesis 6:10",
      },
    ],
  },
  {
    id: "general-eden-rivers",
    category: "beginnings",
    prompt: "Name the four rivers named in the account of Eden.",
    answers: [
      {
        text: "Pison",
        points: 35,
        reference: "Genesis 2:10–14",
      },
      {
        text: "Gihon",
        points: 25,
        reference: "Genesis 2:10–14",
      },
      {
        text: "Hiddekel (Tigris)",
        points: 25,
        reference: "Genesis 2:10–14",
      },
      {
        text: "Euphrates",
        points: 15,
        reference: "Genesis 2:10–14",
      },
    ],
  },
  {
    id: "general-terah-sons",
    category: "beginnings",
    prompt: "Name the three sons of Terah.",
    answers: [
      {
        text: "Abram",
        points: 40,
        reference: "Genesis 11:26",
      },
      {
        text: "Nahor",
        points: 35,
        reference: "Genesis 11:26",
      },
      {
        text: "Haran",
        points: 25,
        reference: "Genesis 11:26",
      },
    ],
  },
  {
    id: "general-abram-promises",
    category: "beginnings",
    prompt: "Name the four promises God made about Abram in Genesis 12:2.",
    answers: [
      {
        text: "Make him a great nation",
        points: 35,
        reference: "Genesis 12:2",
      },
      {
        text: "Bless him",
        points: 25,
        reference: "Genesis 12:2",
      },
      {
        text: "Make his name great",
        points: 25,
        reference: "Genesis 12:2",
      },
      {
        text: "He would be a blessing",
        points: 15,
        reference: "Genesis 12:2",
      },
    ],
  },
  {
    id: "general-third-day-plants",
    category: "beginnings",
    prompt:
      "Name the three kinds of vegetation God commanded the earth to bring forth.",
    answers: [
      {
        text: "Grass",
        points: 40,
        reference: "Genesis 1:11",
      },
      {
        text: "Herbs yielding seed",
        points: 35,
        reference: "Genesis 1:11",
      },
      {
        text: "Fruit trees yielding fruit",
        points: 25,
        reference: "Genesis 1:11",
      },
    ],
  },
  {
    id: "general-adam-sons",
    category: "beginnings",
    prompt: "Name the three sons of Adam and Eve named in Genesis 4.",
    answers: [
      {
        text: "Cain",
        points: 40,
        reference: "Genesis 4:1–2,25",
      },
      {
        text: "Abel",
        points: 35,
        reference: "Genesis 4:1–2,25",
      },
      {
        text: "Seth",
        points: 25,
        reference: "Genesis 4:1–2,25",
      },
    ],
  },
  {
    id: "general-patriarchs",
    category: "beginnings",
    prompt:
      "Name the three men whose names God used when identifying Himself to Moses in Exodus 3:6.",
    answers: [
      {
        text: "Abraham",
        points: 40,
        reference: "Exodus 3:6",
      },
      {
        text: "Isaac",
        points: 35,
        reference: "Exodus 3:6",
      },
      {
        text: "Jacob",
        points: 25,
        reference: "Exodus 3:6",
      },
    ],
  },
  {
    id: "general-jacob-mothers",
    category: "beginnings",
    prompt: "Name the four women who bore Jacob’s children.",
    answers: [
      {
        text: "Leah",
        points: 35,
        reference: "Genesis 29:31–30:24",
      },
      {
        text: "Rachel",
        points: 25,
        reference: "Genesis 29:31–30:24",
      },
      {
        text: "Bilhah",
        points: 25,
        reference: "Genesis 29:31–30:24",
      },
      {
        text: "Zilpah",
        points: 15,
        reference: "Genesis 29:31–30:24",
      },
    ],
  },
  {
    id: "general-leah-first-sons",
    category: "beginnings",
    prompt: "Name Leah’s first four sons, named in Genesis 29:32–35.",
    answers: [
      {
        text: "Reuben",
        points: 35,
        reference: "Genesis 29:32–35",
      },
      {
        text: "Simeon",
        points: 25,
        reference: "Genesis 29:32–35",
      },
      {
        text: "Levi",
        points: 25,
        reference: "Genesis 29:32–35",
      },
      {
        text: "Judah",
        points: 15,
        reference: "Genesis 29:32–35",
      },
    ],
  },
  {
    id: "general-ark-building",
    category: "beginnings",
    prompt:
      "Name the wood, the interior divisions, and the coating God specified for Noah’s ark.",
    answers: [
      {
        text: "Gopher wood",
        points: 40,
        reference: "Genesis 6:14",
      },
      {
        text: "Rooms",
        points: 35,
        reference: "Genesis 6:14",
      },
      {
        text: "Pitch inside and outside",
        points: 25,
        reference: "Genesis 6:14",
      },
    ],
  },
  {
    id: "general-moses-signs",
    category: "exodus",
    prompt:
      "Name the three signs God gave Moses to show the people in Exodus 4.",
    answers: [
      {
        text: "Rod becoming a serpent",
        points: 40,
        reference: "Exodus 4:2–9",
      },
      {
        text: "Hand becoming leprous and restored",
        points: 35,
        reference: "Exodus 4:2–9",
      },
      {
        text: "River water becoming blood",
        points: 25,
        reference: "Exodus 4:2–9",
      },
    ],
  },
  {
    id: "general-passover-meal",
    category: "exodus",
    prompt:
      "Name the three foods specified for the Passover meal in Exodus 12:5–8.",
    answers: [
      {
        text: "Lamb / kid roasted with fire",
        points: 40,
        reference: "Exodus 12:5–8",
      },
      {
        text: "Unleavened bread",
        points: 35,
        reference: "Exodus 12:5–8",
      },
      {
        text: "Bitter herbs",
        points: 25,
        reference: "Exodus 12:5–8",
      },
    ],
  },
  {
    id: "general-plagues-first",
    category: "exodus",
    prompt: "Name the first five plagues on Egypt.",
    answers: [
      {
        text: "Water turned to blood",
        points: 30,
        reference: "Exodus 7:20–9:6",
      },
      {
        text: "Frogs",
        points: 25,
        reference: "Exodus 7:20–9:6",
      },
      {
        text: "Lice / gnats",
        points: 20,
        reference: "Exodus 7:20–9:6",
      },
      {
        text: "Flies",
        points: 15,
        reference: "Exodus 7:20–9:6",
      },
      {
        text: "Death of livestock / murrain",
        points: 10,
        reference: "Exodus 7:20–9:6",
      },
    ],
  },
  {
    id: "general-plagues-last",
    category: "exodus",
    prompt: "Name the last five plagues on Egypt.",
    answers: [
      {
        text: "Boils",
        points: 30,
        reference: "Exodus 9:10–12:29",
      },
      {
        text: "Hail",
        points: 25,
        reference: "Exodus 9:10–12:29",
      },
      {
        text: "Locusts",
        points: 20,
        reference: "Exodus 9:10–12:29",
      },
      {
        text: "Darkness",
        points: 15,
        reference: "Exodus 9:10–12:29",
      },
      {
        text: "Death of the firstborn",
        points: 10,
        reference: "Exodus 9:10–12:29",
      },
    ],
  },
  {
    id: "general-manna-preparation",
    category: "exodus",
    prompt:
      "What three instructions about preparing and storing food did Moses give before the Sabbath in Exodus 16:23?",
    answers: [
      {
        text: "Bake what they would bake",
        points: 40,
        reference: "Exodus 16:23",
      },
      {
        text: "Boil what they would boil",
        points: 35,
        reference: "Exodus 16:23",
      },
      {
        text: "Keep the remainder until morning",
        points: 25,
        reference: "Exodus 16:23",
      },
    ],
  },
  {
    id: "general-holy-place",
    category: "exodus",
    prompt:
      "Name the three furnishings placed outside the veil in the tabernacle’s holy place.",
    answers: [
      {
        text: "Table",
        points: 40,
        reference: "Exodus 26:35;30:1–6",
      },
      {
        text: "Candlestick / lampstand",
        points: 35,
        reference: "Exodus 26:35;30:1–6",
      },
      {
        text: "Altar of incense",
        points: 25,
        reference: "Exodus 26:35;30:1–6",
      },
    ],
  },
  {
    id: "general-ark-contents",
    category: "exodus",
    prompt:
      "Name the three contents of the ark of the covenant listed in Hebrews 9:4.",
    answers: [
      {
        text: "Golden pot of manna",
        points: 40,
        reference: "Hebrews 9:4",
      },
      {
        text: "Aaron’s rod that budded",
        points: 35,
        reference: "Hebrews 9:4",
      },
      {
        text: "Tables of the covenant / tablets",
        points: 25,
        reference: "Hebrews 9:4",
      },
    ],
  },
  {
    id: "general-commandments-first",
    category: "exodus",
    prompt: "Name the first four of the Ten Commandments.",
    answers: [
      {
        text: "No other gods",
        points: 35,
        reference: "Exodus 20:3–11",
      },
      {
        text: "Do not make or worship graven images",
        points: 25,
        reference: "Exodus 20:3–11",
      },
      {
        text: "Do not take God’s name in vain",
        points: 25,
        reference: "Exodus 20:3–11",
      },
      {
        text: "Remember the Sabbath and keep it holy",
        points: 15,
        reference: "Exodus 20:3–11",
      },
    ],
  },
  {
    id: "general-commandments-last",
    category: "exodus",
    prompt: "Name the last six of the Ten Commandments.",
    answers: [
      {
        text: "Honour father and mother",
        points: 25,
        reference: "Exodus 20:12–17",
      },
      {
        text: "Do not kill / murder",
        points: 20,
        reference: "Exodus 20:12–17",
      },
      {
        text: "Do not commit adultery",
        points: 20,
        reference: "Exodus 20:12–17",
      },
      {
        text: "Do not steal",
        points: 15,
        reference: "Exodus 20:12–17",
      },
      {
        text: "Do not bear false witness",
        points: 10,
        reference: "Exodus 20:12–17",
      },
      {
        text: "Do not covet",
        points: 10,
        reference: "Exodus 20:12–17",
      },
    ],
  },
  {
    id: "general-miriam-celebration",
    category: "exodus",
    prompt:
      "Name the three ways Miriam and the women celebrated after crossing the sea.",
    answers: [
      {
        text: "Playing timbrels / tambourines",
        points: 40,
        reference: "Exodus 15:20–21",
      },
      {
        text: "Dancing",
        points: 35,
        reference: "Exodus 15:20–21",
      },
      {
        text: "Singing to the LORD",
        points: 25,
        reference: "Exodus 15:20–21",
      },
    ],
  },
  {
    id: "general-furnace-friends",
    category: "kings",
    prompt:
      "Name the three men thrown into the fiery furnace, using their Babylonian names.",
    answers: [
      {
        text: "Shadrach",
        points: 40,
        reference: "Daniel 3:20",
      },
      {
        text: "Meshach",
        points: 35,
        reference: "Daniel 3:20",
      },
      {
        text: "Abednego",
        points: 25,
        reference: "Daniel 3:20",
      },
    ],
  },
  {
    id: "general-david-brothers",
    category: "kings",
    prompt:
      "Name the first three sons of Jesse presented to Samuel in 1 Samuel 16.",
    answers: [
      {
        text: "Eliab",
        points: 40,
        reference: "1 Samuel 16:6–9",
      },
      {
        text: "Abinadab",
        points: 35,
        reference: "1 Samuel 16:6–9",
      },
      {
        text: "Shammah",
        points: 25,
        reference: "1 Samuel 16:6–9",
      },
    ],
  },
  {
    id: "general-david-equipment",
    category: "kings",
    prompt:
      "Name the four items David took when going to meet Goliath in 1 Samuel 17:40.",
    answers: [
      {
        text: "Staff",
        points: 35,
        reference: "1 Samuel 17:40",
      },
      {
        text: "Five smooth stones",
        points: 25,
        reference: "1 Samuel 17:40",
      },
      {
        text: "Shepherd’s bag / scrip",
        points: 25,
        reference: "1 Samuel 17:40",
      },
      {
        text: "Sling",
        points: 15,
        reference: "1 Samuel 17:40",
      },
    ],
  },
  {
    id: "general-samuel-sons",
    category: "kings",
    prompt: "Name the two sons Samuel made judges.",
    answers: [
      {
        text: "Joel",
        points: 60,
        reference: "1 Samuel 8:1–2",
      },
      {
        text: "Abiah / Abijah",
        points: 40,
        reference: "1 Samuel 8:1–2",
      },
    ],
  },
  {
    id: "general-elijah-altar",
    category: "kings",
    prompt:
      "Name the four materials Elijah used when preparing the altar and sacrifice on Mount Carmel.",
    answers: [
      {
        text: "Stones",
        points: 35,
        reference: "1 Kings 18:31–35",
      },
      {
        text: "Wood",
        points: 25,
        reference: "1 Kings 18:31–35",
      },
      {
        text: "Bullock / bull",
        points: 25,
        reference: "1 Kings 18:31–35",
      },
      {
        text: "Water",
        points: 15,
        reference: "1 Kings 18:31–35",
      },
    ],
  },
  {
    id: "general-elijah-ravens",
    category: "kings",
    prompt:
      "Name the birds that fed Elijah and the two foods they brought him.",
    answers: [
      {
        text: "Ravens",
        points: 40,
        reference: "1 Kings 17:6",
      },
      {
        text: "Bread",
        points: 35,
        reference: "1 Kings 17:6",
      },
      {
        text: "Flesh / meat",
        points: 25,
        reference: "1 Kings 17:6",
      },
    ],
  },
  {
    id: "general-jonah-places",
    category: "kings",
    prompt:
      "Name the city Jonah was sent to, the port he went down to, and the destination of the ship he boarded.",
    answers: [
      {
        text: "Nineveh",
        points: 40,
        reference: "Jonah 1:2–3",
      },
      {
        text: "Joppa",
        points: 35,
        reference: "Jonah 1:2–3",
      },
      {
        text: "Tarshish",
        points: 25,
        reference: "Jonah 1:2–3",
      },
    ],
  },
  {
    id: "general-job-friends",
    category: "kings",
    prompt: "Name the three friends who came to comfort Job in Job 2:11.",
    answers: [
      {
        text: "Eliphaz",
        points: 40,
        reference: "Job 2:11",
      },
      {
        text: "Bildad",
        points: 35,
        reference: "Job 2:11",
      },
      {
        text: "Zophar",
        points: 25,
        reference: "Job 2:11",
      },
    ],
  },
  {
    id: "general-elijah-horeb",
    category: "kings",
    prompt:
      "Name the four events Elijah experienced at Horeb in 1 Kings 19:11–12.",
    answers: [
      {
        text: "Great strong wind",
        points: 35,
        reference: "1 Kings 19:11–12",
      },
      {
        text: "Earthquake",
        points: 25,
        reference: "1 Kings 19:11–12",
      },
      {
        text: "Fire",
        points: 25,
        reference: "1 Kings 19:11–12",
      },
      {
        text: "Still small voice",
        points: 15,
        reference: "1 Kings 19:11–12",
      },
    ],
  },
  {
    id: "general-daniel-food",
    category: "kings",
    prompt:
      "Name the food and drink Daniel requested instead of the king’s food and wine.",
    answers: [
      {
        text: "Pulse / vegetables",
        points: 60,
        reference: "Daniel 1:12",
      },
      {
        text: "Water",
        points: 40,
        reference: "Daniel 1:12",
      },
    ],
  },
  {
    id: "general-wise-men-gifts",
    category: "gospels",
    prompt: "Name the three gifts the wise men gave Jesus.",
    answers: [
      {
        text: "Gold",
        points: 40,
        reference: "Matthew 2:11",
      },
      {
        text: "Frankincense",
        points: 35,
        reference: "Matthew 2:11",
      },
      {
        text: "Myrrh",
        points: 25,
        reference: "Matthew 2:11",
      },
    ],
  },
  {
    id: "general-temptations",
    category: "gospels",
    prompt: "Name the three things the devil tempted Jesus to do in Matthew 4.",
    answers: [
      {
        text: "Turn stones into bread",
        points: 40,
        reference: "Matthew 4:3–9",
      },
      {
        text: "Throw Himself down from the temple",
        points: 35,
        reference: "Matthew 4:3–9",
      },
      {
        text: "Fall down and worship the devil",
        points: 25,
        reference: "Matthew 4:3–9",
      },
    ],
  },
  {
    id: "general-transfiguration",
    category: "gospels",
    prompt:
      "Name the three disciples Jesus took to the mountain of transfiguration.",
    answers: [
      {
        text: "Peter",
        points: 40,
        reference: "Matthew 17:1",
      },
      {
        text: "James",
        points: 35,
        reference: "Matthew 17:1",
      },
      {
        text: "John",
        points: 25,
        reference: "Matthew 17:1",
      },
    ],
  },
  {
    id: "general-zebedee-sons",
    category: "gospels",
    prompt: "Name the two sons of Zebedee whom Jesus called Boanerges.",
    answers: [
      {
        text: "James",
        points: 60,
        reference: "Mark 3:17",
      },
      {
        text: "John",
        points: 40,
        reference: "Mark 3:17",
      },
    ],
  },
  {
    id: "general-tomb-women",
    category: "gospels",
    prompt:
      "Name the three women who bought spices to anoint Jesus in Mark 16:1.",
    answers: [
      {
        text: "Mary Magdalene",
        points: 40,
        reference: "Mark 16:1",
      },
      {
        text: "Mary the mother of James",
        points: 35,
        reference: "Mark 16:1",
      },
      {
        text: "Salome",
        points: 25,
        reference: "Mark 16:1",
      },
    ],
  },
  {
    id: "general-bethany-siblings",
    category: "gospels",
    prompt: "Name the three siblings in the account of Lazarus being raised.",
    answers: [
      {
        text: "Lazarus",
        points: 40,
        reference: "John 11:1–3",
      },
      {
        text: "Mary",
        points: 35,
        reference: "John 11:1–3",
      },
      {
        text: "Martha",
        points: 25,
        reference: "John 11:1–3",
      },
    ],
  },
  {
    id: "general-sower-grounds",
    category: "gospels",
    prompt: "Name the four places where seed fell in the parable of the sower.",
    answers: [
      {
        text: "Wayside / path",
        points: 35,
        reference: "Matthew 13:4–8",
      },
      {
        text: "Stony places",
        points: 25,
        reference: "Matthew 13:4–8",
      },
      {
        text: "Among thorns",
        points: 25,
        reference: "Matthew 13:4–8",
      },
      {
        text: "Good ground",
        points: 15,
        reference: "Matthew 13:4–8",
      },
    ],
  },
  {
    id: "general-nazareth-reading",
    category: "gospels",
    prompt:
      "Name the five groups Jesus described helping in His reading in Luke 4:18.",
    answers: [
      {
        text: "The poor",
        points: 30,
        reference: "Luke 4:18",
      },
      {
        text: "The brokenhearted",
        points: 25,
        reference: "Luke 4:18",
      },
      {
        text: "The captives",
        points: 20,
        reference: "Luke 4:18",
      },
      {
        text: "The blind",
        points: 15,
        reference: "Luke 4:18",
      },
      {
        text: "The bruised / oppressed",
        points: 10,
        reference: "Luke 4:18",
      },
    ],
  },
  {
    id: "general-feeding-numbers",
    category: "gospels",
    prompt:
      "Give the number of loaves, fish, and baskets of leftovers in the feeding of the five thousand.",
    answers: [
      {
        text: "Five loaves",
        points: 40,
        reference: "Matthew 14:17–20",
      },
      {
        text: "Two fish",
        points: 35,
        reference: "Matthew 14:17–20",
      },
      {
        text: "Twelve baskets",
        points: 25,
        reference: "Matthew 14:17–20",
      },
    ],
  },
  {
    id: "general-great-commandments",
    category: "gospels",
    prompt: "Name the two greatest commandments Jesus stated.",
    answers: [
      {
        text: "Love God with all your heart, soul and mind",
        points: 60,
        reference: "Matthew 22:37–39",
      },
      {
        text: "Love your neighbour as yourself",
        points: 40,
        reference: "Matthew 22:37–39",
      },
    ],
  },
  {
    id: "general-seven-first-four",
    category: "church",
    prompt:
      "Name the first four men listed among the seven chosen in Acts 6:5.",
    answers: [
      {
        text: "Stephen",
        points: 35,
        reference: "Acts 6:5",
      },
      {
        text: "Philip",
        points: 25,
        reference: "Acts 6:5",
      },
      {
        text: "Prochorus",
        points: 25,
        reference: "Acts 6:5",
      },
      {
        text: "Nicanor",
        points: 15,
        reference: "Acts 6:5",
      },
    ],
  },
  {
    id: "general-seven-last-three",
    category: "church",
    prompt:
      "Name the last three men listed among the seven chosen in Acts 6:5.",
    answers: [
      {
        text: "Timon",
        points: 40,
        reference: "Acts 6:5",
      },
      {
        text: "Parmenas",
        points: 35,
        reference: "Acts 6:5",
      },
      {
        text: "Nicolas",
        points: 25,
        reference: "Acts 6:5",
      },
    ],
  },
  {
    id: "general-pentecost-signs",
    category: "church",
    prompt: "Name the three signs described at Pentecost in Acts 2:2–4.",
    answers: [
      {
        text: "Sound like a rushing mighty wind",
        points: 40,
        reference: "Acts 2:2–4",
      },
      {
        text: "Cloven tongues like fire",
        points: 35,
        reference: "Acts 2:2–4",
      },
      {
        text: "Speaking in other tongues / languages",
        points: 25,
        reference: "Acts 2:2–4",
      },
    ],
  },
  {
    id: "general-church-devotion",
    category: "church",
    prompt:
      "Name the four things the believers continued steadfastly in after Pentecost.",
    answers: [
      {
        text: "Apostles’ doctrine / teaching",
        points: 35,
        reference: "Acts 2:42",
      },
      {
        text: "Fellowship",
        points: 25,
        reference: "Acts 2:42",
      },
      {
        text: "Breaking of bread",
        points: 25,
        reference: "Acts 2:42",
      },
      {
        text: "Prayers",
        points: 15,
        reference: "Acts 2:42",
      },
    ],
  },
  {
    id: "general-antioch-leaders",
    category: "church",
    prompt:
      "Name the five prophets and teachers listed at Antioch in Acts 13:1.",
    answers: [
      {
        text: "Barnabas",
        points: 30,
        reference: "Acts 13:1",
      },
      {
        text: "Simeon called Niger",
        points: 25,
        reference: "Acts 13:1",
      },
      {
        text: "Lucius of Cyrene",
        points: 20,
        reference: "Acts 13:1",
      },
      {
        text: "Manaen",
        points: 15,
        reference: "Acts 13:1",
      },
      {
        text: "Saul",
        points: 10,
        reference: "Acts 13:1",
      },
    ],
  },
  {
    id: "general-mission-stops",
    category: "church",
    prompt:
      "Name the five towns in Acts 13:4–14, from Seleucia to Antioch in Pisidia.",
    answers: [
      {
        text: "Seleucia",
        points: 30,
        reference: "Acts 13:4–14",
      },
      {
        text: "Salamis",
        points: 25,
        reference: "Acts 13:4–14",
      },
      {
        text: "Paphos",
        points: 20,
        reference: "Acts 13:4–14",
      },
      {
        text: "Perga",
        points: 15,
        reference: "Acts 13:4–14",
      },
      {
        text: "Antioch in Pisidia",
        points: 10,
        reference: "Acts 13:4–14",
      },
    ],
  },
  {
    id: "general-lydia-facts",
    category: "church",
    prompt:
      "Give the woman’s name, hometown, and trade described in Acts 16:14.",
    answers: [
      {
        text: "Lydia",
        points: 40,
        reference: "Acts 16:14",
      },
      {
        text: "Thyatira",
        points: 35,
        reference: "Acts 16:14",
      },
      {
        text: "Seller of purple",
        points: 25,
        reference: "Acts 16:14",
      },
    ],
  },
  {
    id: "general-midnight-prison",
    category: "church",
    prompt:
      "Name the two things Paul and Silas did at midnight and the event that shook the prison.",
    answers: [
      {
        text: "Prayed",
        points: 40,
        reference: "Acts 16:25–26",
      },
      {
        text: "Sang praises to God",
        points: 35,
        reference: "Acts 16:25–26",
      },
      {
        text: "A great earthquake",
        points: 25,
        reference: "Acts 16:25–26",
      },
    ],
  },
  {
    id: "general-timothy-titus",
    category: "church",
    prompt:
      "Name the three New Testament letters addressed to Timothy or Titus.",
    answers: [
      {
        text: "1 Timothy",
        points: 40,
        reference: "1 Timothy 1:2;2 Timothy 1:2;Titus 1:4",
      },
      {
        text: "2 Timothy",
        points: 35,
        reference: "1 Timothy 1:2;2 Timothy 1:2;Titus 1:4",
      },
      {
        text: "Titus",
        points: 25,
        reference: "1 Timothy 1:2;2 Timothy 1:2;Titus 1:4",
      },
    ],
  },
  {
    id: "general-journey-rome",
    category: "church",
    prompt:
      "Name the island in Acts 28:1, the three ports in verses 12–13, and Paul’s final destination in verse 16.",
    answers: [
      {
        text: "Melita / Malta",
        points: 30,
        reference: "Acts 28:1–16",
      },
      {
        text: "Syracuse",
        points: 25,
        reference: "Acts 28:1–16",
      },
      {
        text: "Rhegium",
        points: 20,
        reference: "Acts 28:1–16",
      },
      {
        text: "Puteoli",
        points: 15,
        reference: "Acts 28:1–16",
      },
      {
        text: "Rome",
        points: 10,
        reference: "Acts 28:1–16",
      },
    ],
  },
  {
    id: "general-fruit-first-six",
    category: "faith",
    prompt: "Name the first six fruits of the Spirit listed in Galatians 5:22.",
    answers: [
      {
        text: "Love",
        points: 25,
        reference: "Galatians 5:22",
      },
      {
        text: "Joy",
        points: 20,
        reference: "Galatians 5:22",
      },
      {
        text: "Peace",
        points: 20,
        reference: "Galatians 5:22",
      },
      {
        text: "Longsuffering / patience",
        points: 15,
        reference: "Galatians 5:22",
      },
      {
        text: "Gentleness / kindness",
        points: 10,
        reference: "Galatians 5:22",
      },
      {
        text: "Goodness",
        points: 10,
        reference: "Galatians 5:22",
      },
    ],
  },
  {
    id: "general-fruit-last-three",
    category: "faith",
    prompt:
      "Name the last three fruits of the Spirit listed in Galatians 5:22–23.",
    answers: [
      {
        text: "Faith / faithfulness",
        points: 40,
        reference: "Galatians 5:22–23",
      },
      {
        text: "Meekness / gentleness",
        points: 35,
        reference: "Galatians 5:22–23",
      },
      {
        text: "Temperance / self-control",
        points: 25,
        reference: "Galatians 5:22–23",
      },
    ],
  },
  {
    id: "general-armour",
    category: "faith",
    prompt:
      "Name the six pieces of the armour of God described in Ephesians 6:14–17.",
    answers: [
      {
        text: "Belt / girdle of truth",
        points: 25,
        reference: "Ephesians 6:14–17",
      },
      {
        text: "Breastplate of righteousness",
        points: 20,
        reference: "Ephesians 6:14–17",
      },
      {
        text: "Feet shod with the gospel of peace",
        points: 20,
        reference: "Ephesians 6:14–17",
      },
      {
        text: "Shield of faith",
        points: 15,
        reference: "Ephesians 6:14–17",
      },
      {
        text: "Helmet of salvation",
        points: 10,
        reference: "Ephesians 6:14–17",
      },
      {
        text: "Sword of the Spirit / word of God",
        points: 10,
        reference: "Ephesians 6:14–17",
      },
    ],
  },
  {
    id: "general-lords-prayer",
    category: "faith",
    prompt:
      "Name the four requests in Matthew 6:11–13 before the closing doxology.",
    answers: [
      {
        text: "Daily bread",
        points: 35,
        reference: "Matthew 6:11–13",
      },
      {
        text: "Forgiveness of debts / sins",
        points: 25,
        reference: "Matthew 6:11–13",
      },
      {
        text: "Do not lead us into temptation",
        points: 25,
        reference: "Matthew 6:11–13",
      },
      {
        text: "Deliver us from evil",
        points: 15,
        reference: "Matthew 6:11–13",
      },
    ],
  },
  {
    id: "general-three-abide",
    category: "faith",
    prompt: "Name the three things that abide in 1 Corinthians 13:13.",
    answers: [
      {
        text: "Faith",
        points: 40,
        reference: "1 Corinthians 13:13",
      },
      {
        text: "Hope",
        points: 35,
        reference: "1 Corinthians 13:13",
      },
      {
        text: "Charity / love",
        points: 25,
        reference: "1 Corinthians 13:13",
      },
    ],
  },
  {
    id: "general-think-on",
    category: "faith",
    prompt:
      "Name the six descriptions of things to think on listed before virtue and praise in Philippians 4:8.",
    answers: [
      {
        text: "True",
        points: 25,
        reference: "Philippians 4:8",
      },
      {
        text: "Honest / honourable",
        points: 20,
        reference: "Philippians 4:8",
      },
      {
        text: "Just",
        points: 20,
        reference: "Philippians 4:8",
      },
      {
        text: "Pure",
        points: 15,
        reference: "Philippians 4:8",
      },
      {
        text: "Lovely",
        points: 10,
        reference: "Philippians 4:8",
      },
      {
        text: "Of good report",
        points: 10,
        reference: "Philippians 4:8",
      },
    ],
  },
  {
    id: "general-scripture-profitable",
    category: "faith",
    prompt:
      "Name the four purposes for which Scripture is profitable in 2 Timothy 3:16.",
    answers: [
      {
        text: "Doctrine / teaching",
        points: 35,
        reference: "2 Timothy 3:16",
      },
      {
        text: "Reproof",
        points: 25,
        reference: "2 Timothy 3:16",
      },
      {
        text: "Correction",
        points: 25,
        reference: "2 Timothy 3:16",
      },
      {
        text: "Instruction in righteousness",
        points: 15,
        reference: "2 Timothy 3:16",
      },
    ],
  },
  {
    id: "general-wisdom-above",
    category: "faith",
    prompt: "Name the first four qualities of wisdom from above in James 3:17.",
    answers: [
      {
        text: "Pure",
        points: 35,
        reference: "James 3:17",
      },
      {
        text: "Peaceable",
        points: 25,
        reference: "James 3:17",
      },
      {
        text: "Gentle",
        points: 25,
        reference: "James 3:17",
      },
      {
        text: "Easy to be entreated / open to reason",
        points: 15,
        reference: "James 3:17",
      },
    ],
  },
  {
    id: "general-churches-revelation-two",
    category: "faith",
    prompt: "Name the four churches addressed in Revelation chapter 2.",
    answers: [
      {
        text: "Ephesus",
        points: 35,
        reference: "Revelation 2:1,8,12,18",
      },
      {
        text: "Smyrna",
        points: 25,
        reference: "Revelation 2:1,8,12,18",
      },
      {
        text: "Pergamos / Pergamum",
        points: 25,
        reference: "Revelation 2:1,8,12,18",
      },
      {
        text: "Thyatira",
        points: 15,
        reference: "Revelation 2:1,8,12,18",
      },
    ],
  },
  {
    id: "general-churches-revelation-three",
    category: "faith",
    prompt: "Name the three churches addressed in Revelation chapter 3.",
    answers: [
      {
        text: "Sardis",
        points: 40,
        reference: "Revelation 3:1,7,14",
      },
      {
        text: "Philadelphia",
        points: 35,
        reference: "Revelation 3:1,7,14",
      },
      {
        text: "Laodicea",
        points: 25,
        reference: "Revelation 3:1,7,14",
      },
    ],
  },
];
export function selectGeneralBoards(
  category: string,
  count: number,
  shuffle = true,
  random: () => number = Math.random,
): FeudQuestion[] {
  const pool = GENERAL_BIBLE.filter(
    (q) => category === "all" || q.category === category,
  );
  if (shuffle)
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
  return pool.slice(0, Math.max(1, Math.min(pool.length, count)));
}
