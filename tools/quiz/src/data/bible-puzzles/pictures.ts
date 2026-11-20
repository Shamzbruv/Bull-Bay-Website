import type { PictureTile } from '../../types/biblePuzzles';

type PicturePuzzle = {
  answer: string;
  pictures: readonly PictureTile[];
  hint: string;
  reference: string;
};

export const biblePictures: readonly PicturePuzzle[] = [
  { answer: 'Noah’s Ark', pictures: [['🔨', 'hammer'], ['🚢', 'ship'], ['🦒', 'giraffe'], ['🌧️', 'rain']], hint: 'One family obeyed a very unusual instruction.', reference: 'Genesis 6:13–22' },
  { answer: 'The Garden of Eden', pictures: [['🌳', 'tree'], ['🍎', 'fruit'], ['🐍', 'snake'], ['🌿', 'leaves']], hint: 'The first humans lived here.', reference: 'Genesis 2:8–17; 3:1–7' },
  { answer: 'The Tower of Babel', pictures: [['🧱', 'brick'], ['🏗️', 'building crane'], ['☁️', 'cloud'], ['💬', 'speech bubble']], hint: 'A building project ended when people could no longer understand each other.', reference: 'Genesis 11:1–9' },
  { answer: 'Jacob’s Ladder', pictures: [['😴', 'sleeping face'], ['🪨', 'stone'], ['🪜', 'ladder'], ['😇', 'angel']], hint: 'A dream on the way to Haran.', reference: 'Genesis 28:10–17' },
  { answer: 'Joseph’s Coat of Many Colours', pictures: [['👨‍👦', 'father and son'], ['🧥', 'coat'], ['🎨', 'colour palette']], hint: 'A father’s gift that angered his other sons.', reference: 'Genesis 37:3–4' },
  { answer: 'The Burning Bush', pictures: [['🐑', 'sheep'], ['🌿', 'shrub'], ['🔥', 'fire'], ['👣', 'bare footprints']], hint: 'A shepherd was told to take off his sandals.', reference: 'Exodus 3:1–6' },
  { answer: 'Crossing the Red Sea', pictures: [['🦯', 'staff'], ['🌊', 'wave'], ['🚶', 'person walking'], ['🌊', 'wave']], hint: 'The escape route opened in front of Israel.', reference: 'Exodus 14:21–29' },
  { answer: 'The Ten Commandments', pictures: [['⛰️', 'mountain'], ['🪨', 'stone'], ['✍️', 'writing hand'], ['🔟', 'number ten']], hint: 'Moses received these at Sinai.', reference: 'Exodus 20:1–17; 31:18' },
  { answer: 'The Golden Calf', pictures: [['💍', 'gold ring'], ['🔥', 'fire'], ['🐄', 'cow'], ['🙇', 'person bowing']], hint: 'The people made an idol while Moses was on the mountain.', reference: 'Exodus 32:1–8' },
  { answer: 'The Walls of Jericho', pictures: [['🚶', 'person marching'], ['🎺', 'trumpet'], ['🧱', 'wall'], ['💥', 'crash']], hint: 'The seventh day ended with a shout.', reference: 'Joshua 6:12–20' },
  { answer: 'Gideon’s Fleece', pictures: [['🐑', 'sheep'], ['💧', 'water drop'], ['🌅', 'sunrise']], hint: 'A judge asked for a sign before battle.', reference: 'Judges 6:36–40' },
  { answer: 'Samson and Delilah', pictures: [['💪', 'strong arm'], ['💇', 'hair being cut'], ['🪢', 'knot']], hint: 'A woman was paid to find out how a judge could be overpowered.', reference: 'Judges 16:4–21' },
  { answer: 'David and Goliath', pictures: [['🐑', 'sheep'], ['🪨', 'stone'], ['🛡️', 'shield'], ['💥', 'impact']], hint: 'A shepherd boy faced a Philistine champion.', reference: '1 Samuel 17:40–50' },
  { answer: 'Solomon Asks for Wisdom', pictures: [['👑', 'crown'], ['😴', 'sleeping face'], ['🙏', 'praying hands'], ['💡', 'idea']], hint: 'An Israelite king made this request in a dream.', reference: '1 Kings 3:5–14' },
  { answer: 'Elijah on Mount Carmel', pictures: [['⛰️', 'mountain'], ['🪨', 'stone altar'], ['💧', 'water drop'], ['🔥', 'flames']], hint: 'Two offerings were prepared, but only one God answered.', reference: '1 Kings 18:20–39' },
  { answer: 'Daniel in the Lions’ Den', pictures: [['🙏', 'praying hands'], ['🦁', 'lion'], ['🕳️', 'pit'], ['😇', 'angel']], hint: 'A man kept praying despite a royal decree.', reference: 'Daniel 6:10–23' },
  { answer: 'The Fiery Furnace', pictures: [['👑', 'crown'], ['🔥', 'flames'], ['👥', 'people'], ['4️⃣', 'number four']], hint: 'The king expected to see three men.', reference: 'Daniel 3:19–27' },
  { answer: 'Jonah and the Great Fish', pictures: [['🚢', 'ship'], ['🌊', 'wave'], ['🐟', 'fish'], ['3️⃣', 'number three']], hint: 'The runaway prophet was given another chance.', reference: 'Jonah 1:11–17; 2:10' },
  { answer: 'The Wise Men Visit Jesus', pictures: [['⭐', 'star'], ['👣', 'footprints'], ['🎁', 'gift'], ['👶', 'baby']], hint: 'Visitors from the east followed a sign.', reference: 'Matthew 2:1–11' },
  { answer: 'The Baptism of Jesus', pictures: [['🏞️', 'river'], ['💧', 'water drop'], ['🕊️', 'dove']], hint: 'John was there, and a voice came from heaven.', reference: 'Matthew 3:13–17' },
  { answer: 'Water into Wine', pictures: [['💍', 'wedding ring'], ['🏺', 'jar'], ['💧', 'water drop'], ['🍷', 'glass of wine']], hint: 'Jesus’ first sign in the Gospel of John.', reference: 'John 2:1–11' },
  { answer: 'Jesus Walks on Water', pictures: [['🌙', 'moon'], ['🚣', 'boat'], ['👣', 'footprints'], ['🌊', 'wave']], hint: 'Peter tried to join Jesus during the night.', reference: 'Matthew 14:22–33' },
  { answer: 'Jesus Calms the Storm', pictures: [['⛵', 'sailboat'], ['⛈️', 'storm cloud'], ['😴', 'sleeping face'], ['✋', 'raised hand']], hint: 'The disciples woke Jesus before the wind and waves became still.', reference: 'Mark 4:35–41' },
  { answer: 'Feeding the Five Thousand', pictures: [['5️⃣', 'number five'], ['🍞', 'bread'], ['🐟', 'fish'], ['🧺', 'basket']], hint: 'A crowd ate their fill and twelve baskets were left over.', reference: 'John 6:1–13' },
  { answer: 'The Good Samaritan', pictures: [['🛣️', 'road'], ['🩹', 'bandage'], ['🐴', 'riding animal'], ['🪙', 'coin']], hint: 'Jesus told this story to answer “Who is my neighbour?”', reference: 'Luke 10:25–37' },
  { answer: 'The Prodigal Son', pictures: [['💰', 'money bag'], ['🐖', 'pig'], ['🏠', 'home'], ['💍', 'ring']], hint: 'A father welcomed back a child who had squandered his inheritance.', reference: 'Luke 15:11–32' },
  { answer: 'The Lost Sheep', pictures: [['🐑', 'sheep'], ['❓', 'question mark'], ['🔎', 'magnifying glass'], ['🎉', 'celebration']], hint: 'A shepherd left ninety-nine behind to look for one.', reference: 'Luke 15:3–7' },
  { answer: 'The Parable of the Sower', pictures: [['✋', 'open hand'], ['🌱', 'seedling'], ['🪨', 'rock'], ['🌾', 'grain']], hint: 'Jesus described seed falling on four kinds of ground.', reference: 'Matthew 13:3–9' },
  { answer: 'The Wise Man Built His House on the Rock', pictures: [['🏠', 'house'], ['🪨', 'rock'], ['🌧️', 'rain'], ['🌊', 'floodwater']], hint: 'Jesus compared hearing and doing his words to choosing a foundation.', reference: 'Matthew 7:24–27' },
  { answer: 'Zacchaeus in the Sycamore Tree', pictures: [['🪙', 'coin'], ['👥', 'crowd'], ['🌳', 'tree'], ['👀', 'eyes']], hint: 'A short tax collector found a better place to see.', reference: 'Luke 19:1–10' },
  { answer: 'Jesus Raises Lazarus', pictures: [['🪨', 'stone'], ['🗣️', 'voice calling'], ['🩹', 'wrappings'], ['🚶', 'person walking']], hint: 'Jesus called his friend to come out after four days.', reference: 'John 11:38–44' },
  { answer: 'The Triumphal Entry', pictures: [['🐴', 'riding animal'], ['🌿', 'branches'], ['🧥', 'coat'], ['🙌', 'raised hands']], hint: 'People shouted Hosanna as Jesus entered Jerusalem.', reference: 'Matthew 21:1–11' },
  { answer: 'The Last Supper', pictures: [['🌙', 'night'], ['🍽️', 'meal'], ['🍞', 'bread'], ['🍷', 'cup']], hint: 'Jesus shared this meal with his disciples before his arrest.', reference: 'Luke 22:14–20' },
  { answer: 'Peter Denies Jesus Three Times', pictures: [['🔥', 'courtyard fire'], ['🙅', 'person saying no'], ['3️⃣', 'number three'], ['🐓', 'rooster']], hint: 'A disciple remembered Jesus’ words after hearing a bird.', reference: 'Luke 22:54–62' },
  { answer: 'The Empty Tomb', pictures: [['🌅', 'sunrise'], ['🪨', 'stone'], ['😇', 'angel'], ['🚪', 'open entrance']], hint: 'Women arrived on the first day of the week.', reference: 'Matthew 28:1–7' },
  { answer: 'The Road to Emmaus', pictures: [['🚶', 'person walking'], ['🛣️', 'road'], ['💬', 'conversation'], ['🍞', 'bread']], hint: 'Two disciples recognised Jesus when he broke the bread.', reference: 'Luke 24:13–35' },
  { answer: 'The Day of Pentecost', pictures: [['🏠', 'house'], ['💨', 'wind'], ['🔥', 'flame'], ['🗣️', 'person speaking']], hint: 'The disciples spoke in other languages after receiving the Holy Spirit.', reference: 'Acts 2:1–11' },
  { answer: 'The Road to Damascus', pictures: [['🛣️', 'road'], ['💡', 'bright light'], ['🙈', 'covered eyes'], ['🤝', 'helping hands']], hint: 'Saul’s life changed on the way to this city.', reference: 'Acts 9:1–19' },
  { answer: 'Paul and Silas in Prison', pictures: [['🔒', 'lock'], ['🎶', 'music'], ['🌙', 'night'], ['💥', 'shaking ground']], hint: 'An earthquake struck while two men were singing hymns.', reference: 'Acts 16:22–34' },
  { answer: 'The Salt of the Earth', pictures: [['🧂', 'salt'], ['🌍', 'earth']], hint: 'Jesus used this phrase for his listeners in the Sermon on the Mount.', reference: 'Matthew 5:13' },
  { answer: 'The Light of the World', pictures: [['🕯️', 'lighted candle'], ['🌍', 'world']], hint: 'In John 8, Jesus uses this image to describe himself.', reference: 'John 8:12' },
  { answer: 'The Fruit of the Spirit', pictures: [['🍇', 'fruit'], ['🕊️', 'dove'], ['❤️', 'love'], ['🕊️', 'peace']], hint: 'Paul’s list in Galatians begins with love, joy and peace.', reference: 'Galatians 5:22–23' },
  { answer: 'The Armour of God', pictures: [['🪖', 'helmet'], ['🛡️', 'shield'], ['⚔️', 'swords'], ['🥾', 'boot']], hint: 'Paul uses a soldier’s equipment to describe spiritual readiness.', reference: 'Ephesians 6:10–17' },
  { answer: 'Let Your Light Shine', pictures: [['🕯️', 'candle'], ['✨', 'sparkles'], ['👥', 'people']], hint: 'Jesus connects this instruction with doing good in front of others.', reference: 'Matthew 5:14–16' },
  { answer: 'Fishers of Men', pictures: [['🎣', 'fishing rod'], ['🐟', 'fish'], ['👥', 'people']], hint: 'Jesus promised to make Simon and Andrew this when he called them.', reference: 'Matthew 4:18–20' },
  { answer: 'Thirty Pieces of Silver', pictures: [['3️⃣', 'number three'], ['0️⃣', 'number zero'], ['🪙', 'coin'], ['🤝', 'agreement']], hint: 'This was the price Judas received to betray Jesus.', reference: 'Matthew 26:14–16' },
  { answer: 'A Crown of Thorns', pictures: [['👑', 'crown'], ['🌵', 'thorns'], ['🧥', 'robe']], hint: 'Roman soldiers placed this on Jesus while mocking him.', reference: 'John 19:2–5' },
  { answer: 'Faith Like a Mustard Seed', pictures: [['🙏', 'praying hands'], ['🌱', 'small seedling'], ['⛰️', 'mountain'], ['➡️', 'arrow']], hint: 'Jesus used this comparison when speaking about moving mountains.', reference: 'Matthew 17:20' },
];
