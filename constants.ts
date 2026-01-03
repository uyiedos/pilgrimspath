
import { LevelConfig, GameModeConfig, Achievement, Badge, BiblePlan } from './types';

export const DAILY_POINT_LIMIT = 1000;

// ... (Existing content remains until VOXEL GRID PATTERNS section)

// --- ARCHETYPES (Character Classes) ---
export const ARCHETYPES = [
  { name: 'Knight', role: 'Defender', desc: 'Strong in spiritual warfare. Focuses on armor of God.', icon: '🛡️', stat: 'Courage' },
  { name: 'Scribe', role: 'Scholar', desc: 'Master of scripture. Wisdom stat is highest.', icon: '📜', stat: 'Wisdom' },
  { name: 'Shepherd', role: 'Guide', desc: 'Humble leader. High empathy and prayer stats.', icon: '🐑', stat: 'Leadership' },
  { name: 'Monk', role: 'Devotee', desc: 'Disciplined and focused. High resistance to temptation.', icon: '📿', stat: 'Discipline' },
  { name: 'Paladin', role: 'Champion', desc: 'Zealous for the truth. Radiates holy light.', icon: '⚔️', stat: 'Zeal' },
  { name: 'Bard', role: 'Worshipper', desc: 'Uses music and praise to break strongholds.', icon: '🎵', stat: 'Praise' },
  { name: 'Prophet', role: 'Seer', desc: 'Sees the hidden spiritual reality. High insight.', icon: '👁️', stat: 'Insight' },
  { name: 'Wanderer', role: 'Seeker', desc: 'A soul searching for truth. Balanced stats.', icon: '🚶', stat: 'Curiosity' }
];

// --- EXPANDED PLAYER PROGRESSION ---
export const PLAYER_LEVELS = [
  { level: 1, xp: 0, title: "Wanderer" },
  { level: 2, xp: 200, title: "Seeker" },
  { level: 3, xp: 500, title: "Neophyte" },
  { level: 4, xp: 900, title: "Listener" },
  { level: 5, xp: 1400, title: "Believer" },
  { level: 6, xp: 2000, title: "Disciple" },
  { level: 7, xp: 2700, title: "Follower" },
  { level: 8, xp: 3500, title: "Scribe" },
  { level: 9, xp: 4400, title: "Witness" },
  { level: 10, xp: 5500, title: "Servant" },
  { level: 15, xp: 13500, title: "Shepherd" },
  { level: 20, xp: 31000, title: "Oracle" },
  { level: 25, xp: 66000, title: "Patriarch" },
  { level: 30, xp: 100000, title: "Angel" },
  { level: 60, xp: 1000000, title: "Seraph" },
];

// --- TIERED BADGE SYSTEM ---
// Removed Economy Badges: Blacksmith, Investor, Collector, Creator
export const BADGES: Badge[] = [
  { id: 'early_riser', name: 'Early Riser', icon: '🌅', description: 'Logged in 7 days in a row' },
  { id: 'faithful_pilgrim', name: 'Faithful Pilgrim', icon: '🔥', description: 'Logged in 30 days in a row' },
  { id: 'eternal_flame', name: 'Eternal Flame', icon: '♾️', description: 'Logged in 100 days in a row' },
  { id: 'student', name: 'Student', icon: '📖', description: 'Read 5 Bible chapters' },
  { id: 'scholar', name: 'Scholar', icon: '📜', description: 'Read 50 Bible chapters' },
  { id: 'theologian', name: 'Theologian', icon: '🎓', description: 'Read 200 Bible chapters' },
  { id: 'slayer', name: 'Giant Slayer', icon: '⚔️', description: 'Completed David Campaign' },
  { id: 'missionary', name: 'Missionary', icon: '⛵', description: 'Completed Paul Campaign' },
  { id: 'pilgrim_master', name: 'Pilgrim Master', icon: '⛰️', description: 'Completed Pilgrim Campaign' },
  { id: 'prayer', name: 'Prayer Warrior', icon: '🙏', description: 'Collected 20 Verses' },
  { id: 'voice', name: 'The Voice', icon: '📣', description: 'Sent 100 Messages in Journey TV' },
  { id: 'beta', name: 'Founder', icon: '🚀', description: 'Joined during Dev Net' },
  { id: 'disciplined', name: 'Disciple of Practice', icon: '🧘', description: 'Learned all 4 Spiritual Disciplines' },
  { id: 'architect', name: 'Architect', icon: '📐', description: 'Forged a Custom Reading Plan' }
];

// --- EXPANDED ACHIEVEMENTS ---
// Removed Economy Achievements: divine_architect, vault_*, burn_novice, market_trader
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_step', title: 'First Step', description: 'Complete your first level.', icon: '🦶', xpReward: 100 },
  { id: 'identity_found', title: 'Born Again', description: 'Create your account.', icon: '👶', xpReward: 150 },
  { id: 'prayer_warrior', title: 'Prayer Warrior', description: 'Collect 5 scripture verses.', icon: '🙏', xpReward: 300 },
  { id: 'scripture_hunter', title: 'Scripture Hunter', description: 'Collect 25 scripture verses.', icon: '🔍', xpReward: 1000 },
  { id: 'david_complete', title: 'Heart of a King', description: 'Complete the David Campaign.', icon: '👑', xpReward: 1500 },
  { id: 'devoted', title: 'Devoted', description: 'Read a daily devotional.', icon: '📖', xpReward: 50 },
  { id: 'plan_starter', title: 'Planner', description: 'Start a Bible Reading Plan.', icon: '📅', xpReward: 100 },
  { id: 'plan_finisher', title: 'Finisher', description: 'Complete a Bible Reading Plan.', icon: '🏁', xpReward: 500 },
  { id: 'plan_architect', title: 'Visionary', description: 'Forge a custom reading plan.', icon: '⚒️', xpReward: 200 },
  { id: 'activity_lectio', title: 'Listener', description: 'Learn the practice of Lectio Divina.', icon: '🕯️', xpReward: 100 },
  { id: 'activity_mapping', title: 'Architect', description: 'Learn the practice of Verse Mapping.', icon: '🗺️', xpReward: 100 },
  { id: 'activity_walk', title: 'Intercessor', description: 'Learn the practice of Prayer Walking.', icon: '🚶', xpReward: 100 },
  { id: 'activity_hunt', title: 'Seeker', description: 'Learn the Scripture Scavenger Hunt.', icon: '🧩', xpReward: 100 },
  { id: 'socialite', title: 'Fellowship', description: 'Participate in Global Chat.', icon: '💬', xpReward: 50 },
  { id: 'encourager', title: 'Encourager', description: 'Like or Pray for items.', icon: '❤️', xpReward: 200 },
  { id: 'evangelist', title: 'Evangelist', description: 'Share a verse or content.', icon: '📢', xpReward: 300 },
  { id: 'raffle_enter_1', title: 'Tithing Hope', description: 'Enter your first official raffle.', icon: '🎟️', xpReward: 50 },
  { id: 'raffle_enter_10', title: 'Frequent Entrant', description: 'Enter 10 official raffles.', icon: '🎟️', xpReward: 250 },
  { id: 'lucky_pilgrim', title: 'Chosen Soul', icon: '✨', description: 'Win an official raffle or giveaway.', xpReward: 500 },
  { id: 'high_score', title: 'Legend', description: 'Reach 1000 total score.', icon: '🏆', xpReward: 500 },
  { id: 'master_legend', title: 'Ascended', description: 'Reach 10,000 total score.', icon: '🌟', xpReward: 2500 },
  { id: 'scholar', title: 'Scholar', description: 'Open the Bible Reader.', icon: '📜', xpReward: 50 },
  { id: 'prayer_intercessor', title: 'Intercessor', description: 'Enter the Prayer Room.', icon: '🕊️', xpReward: 50 },
  { id: 'generous_soul', title: 'Almsgiver', description: 'Submit a donation claim.', icon: '❤️', xpReward: 100 },
  { id: 'fellowship_found', title: 'Member', description: 'Join a Community or Ministry.', icon: '🤝', xpReward: 100 },
  { id: 'digital_scribe', title: 'Digital Scribe', description: 'Use the browser to research resources.', icon: '🌐', xpReward: 50 },
  { id: 'watcher', title: 'Watcher', description: 'Watch content on Journey TV.', icon: '👁️', xpReward: 50 }
];

export const BIBLE_BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", 
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", 
  "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", 
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", 
  "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", 
  "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", 
  "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"
];

const fillDays = (start: number, end: number, planTitle: string) => {
    return Array.from({ length: end - start + 1 }, (_, i) => {
        const dayNum = start + i;
        return {
            day: dayNum,
            reading: `Day ${dayNum} Reading`,
            topic: `${planTitle} - Day ${dayNum}`,
            content: `Continue your journey in the ${planTitle}. Read the next chapter in your Bible and reflect on God's goodness.`
        };
    });
};

const GOSPEL_DAYS = [
    { day: 1, reading: "John 1:1-18", topic: "The Word Made Flesh", content: "In the beginning was the Word. Before the miracles, before the parables, there was the eternal existence of Christ. Today, meditate on the divinity of Jesus. He is not just a teacher; He is God breaking into our reality." },
    { day: 2, reading: "Luke 1:5-25", topic: "Gabriel's Announcement", content: "Silence is broken. After 400 years of prophetic silence, an angel appears. God often moves in the quiet places of our lives before the public miracles begin." },
    { day: 3, reading: "Matthew 1:18-25", topic: "The Birth of Jesus", content: "Emmanuel, God with us. The scandal of the virgin birth reminds us that God's plans often defy human reputation and logic. Trust Him when things don't make sense." },
    ...fillDays(4, 30, "Gospels Journey")
];

export const DEFAULT_PLANS: BiblePlan[] = [
  { id: 'gospel_30', title: "The Messiah's Footsteps", desc: "A 30-day chronological journey through the Gospels, focusing on the miracles and parables of Jesus.", category: 'Study', image: "https://image.pollinations.ai/prompt/pixel%20art%20jesus%20walking%20on%20water%20sea%20of%20galilee%20storm?width=400&height=250&nologo=true", duration: 30, progress: 0, isActive: false, days: GOSPEL_DAYS },
  { id: 'psalms_peace', title: "Songs of the Valley", desc: "Finding deep peace and emotional regulation through the Psalms during difficult seasons.", category: 'Devotional', image: "https://image.pollinations.ai/prompt/pixel%20art%20shepherd%20playing%20harp%20green%20pastures%20peaceful%20stream?width=400&height=250&nologo=true", duration: 7, progress: 0, isActive: false, days: [{ day: 1, reading: "Psalm 23", topic: "The Lord is my Shepherd", content: "You shall not want. In a world of constant craving, the Shepherd offers contentment." }, ...fillDays(2, 7, "Psalms of Peace")] },
];

export const AVATARS = [
  "https://image.pollinations.ai/prompt/pixel%20art%20avatar%20knight%20helmet?width=100&height=100&nologo=true",
  "https://image.pollinations.ai/prompt/pixel%20art%20avatar%20monk%20hood?width=100&height=100&nologo=true",
  "https://image.pollinations.ai/prompt/pixel%20art%20avatar%20female%20warrior%20bible?width=100&height=100&nologo=true",
  "https://image.pollinations.ai/prompt/pixel%20art%20avatar%20shepherd?width=100&height=100&nologo=true",
  "https://image.pollinations.ai/prompt/pixel%20art%20avatar%20angel%20halo?width=100&height=100&nologo=true",
  "https://image.pollinations.ai/prompt/pixel%20art%20avatar%20king%20crown?width=100&height=100&nologo=true"
];

// --- VOXEL GRID PATTERNS ---
// Codes: 0=Empty, 1=Path, 2=Objective (Jesus/Goal), 3=Wall, 4=Water

const GRID_BASIC_PATH = [
  [0,0,0,0,0,0,2,0],
  [0,0,0,0,0,1,1,0],
  [0,0,0,0,1,1,0,0],
  [0,0,0,1,1,0,0,0],
  [0,0,1,1,0,0,0,0],
  [0,1,1,0,0,0,0,0],
  [1,1,0,0,0,0,0,0],
  [1,0,0,0,0,0,0,0]
];

// New pattern for Walking on Water
const GRID_SEA = [
  [4,4,4,4,4,4,2,4], // 2 is Jesus standing on water
  [4,4,4,4,4,4,4,4],
  [4,4,4,4,4,4,4,4],
  [4,4,4,1,1,1,4,4], // Faint path or floating debris
  [4,4,4,1,4,4,4,4],
  [4,4,1,1,4,4,4,4],
  [1,1,1,0,0,0,0,0], // Boat edge
  [1,1,0,0,0,0,0,0]
];

const GRID_CROSS = [
  [0,0,0,1,1,0,0,0],
  [0,0,0,1,1,0,0,0],
  [1,1,1,2,2,1,1,1],
  [0,0,0,1,1,0,0,0],
  [0,0,0,1,1,0,0,0],
  [0,0,0,1,1,0,0,0],
  [0,0,0,1,1,0,0,0],
  [0,0,0,1,1,0,0,0]
];

const GRID_MAZE = [
  [1,1,1,3,1,1,2,1],
  [1,0,1,3,1,0,0,1],
  [1,0,1,1,1,0,0,1],
  [1,0,0,0,3,1,1,1],
  [1,1,1,0,0,0,0,0],
  [0,0,1,3,1,1,1,1],
  [0,0,1,0,1,0,0,1],
  [1,1,1,1,1,0,0,1]
];

const GRID_ARENA = [
  [3,3,3,3,3,3,3,3],
  [3,1,1,1,1,1,1,3],
  [3,1,0,0,0,0,1,3],
  [3,1,0,2,2,0,1,3],
  [3,1,0,2,2,0,1,3],
  [3,1,0,0,0,0,1,3],
  [3,1,1,1,1,1,1,3],
  [3,3,3,3,3,3,3,3]
];

// --- CAMPAIGN LEVELS ---

export const PILGRIM_LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: "Sea of Galilee",
    sin: "Doubt",
    virtue: "Faith",
    description: "A violent storm tosses the boat. A figure walks upon the water. The wind howls.",
    colorTheme: "bg-blue-900",
    accentColor: "bg-cyan-400",
    gridPattern: GRID_SEA,
    bibleContext: {
        storyTitle: "Walking on Water",
        reference: "Matthew 14:29-31",
        character: "Peter",
        narrativeIntro: "The boat heaves violently. You see Jesus walking on the waves. He calls to you: 'Come.'",
        keyVerse: "You of little faith, why did you doubt?",
        prayerFocus: "Trust in the storm"
    },
    images: {
        landscape: "https://image.pollinations.ai/prompt/isometric%20voxel%20art%20minecraft%20style%20stormy%20sea%20waves%20boat%20night%20pixelated?width=800&height=600&nologo=true",
        character: "https://image.pollinations.ai/prompt/pixel%20art%20minecraft%20skin%20peter%20fisherman%20robe?width=200&height=200&nologo=true"
    }
  },
  {
    id: 2,
    name: "Cave of Fear",
    sin: "Fear",
    virtue: "Courage",
    description: "Dark echoes surround you. Only the light of truth can reveal the exit.",
    colorTheme: "bg-stone-900",
    accentColor: "bg-red-500",
    gridPattern: GRID_MAZE,
    bibleContext: {
        storyTitle: "Elijah at Horeb",
        reference: "1 Kings 19:11-13",
        character: "Elijah",
        narrativeIntro: "You are hiding in a cave, fleeing from threats. A great wind tears the mountains, but God is not in the wind. Listen for the whisper.",
        keyVerse: "Do not be afraid, for I am with you.",
        prayerFocus: "Listening to the still small voice"
    },
    images: {
        landscape: "https://image.pollinations.ai/prompt/isometric%20voxel%20art%20minecraft%20style%20dark%20cave%20entrance%20mountain%20night?width=800&height=600&nologo=true",
        character: "https://image.pollinations.ai/prompt/pixel%20art%20minecraft%20skin%20elijah%20prophet%20robe?width=200&height=200&nologo=true"
    }
  },
  {
    id: 3,
    name: "Tower of Pride",
    sin: "Pride",
    virtue: "Humility",
    description: "A glittering tower that reaches for the heavens, built on shifting sand.",
    colorTheme: "bg-purple-900",
    accentColor: "bg-yellow-500",
    gridPattern: GRID_CROSS,
    bibleContext: {
        storyTitle: "Nebuchadnezzar's Dream",
        reference: "Daniel 4:30-37",
        character: "Daniel",
        narrativeIntro: "You look out over the great Babylon you have built. The voice from heaven interrupts your boasting. Will you look up or look down?",
        keyVerse: "God opposes the proud but gives grace to the humble.",
        prayerFocus: "Surrendering glory to God"
    },
    images: {
        landscape: "https://image.pollinations.ai/prompt/isometric%20voxel%20art%20minecraft%20style%20tower%20of%20babel%20ancient%20babylon%20gold?width=800&height=600&nologo=true",
        character: "https://image.pollinations.ai/prompt/pixel%20art%20minecraft%20skin%20king%20nebuchadnezzar%20royal?width=200&height=200&nologo=true"
    }
  },
  {
    id: 4,
    name: "Garden of Sloth",
    sin: "Sloth",
    virtue: "Diligence",
    description: "A lush, sleepy garden where time stands still and purpose decays.",
    colorTheme: "bg-green-900",
    accentColor: "bg-emerald-400",
    gridPattern: GRID_MAZE,
    bibleContext: {
        storyTitle: "The Ant and the Sluggard",
        reference: "Proverbs 6:6-11",
        character: "Solomon",
        narrativeIntro: "The sun is high, but heavy eyelids keep you from the harvest. The fields are overgrown with thorns. Rise, sleeper.",
        keyVerse: "Go to the ant, you sluggard; consider its ways and be wise.",
        prayerFocus: "Active obedience"
    },
    images: {
        landscape: "https://image.pollinations.ai/prompt/isometric%20voxel%20art%20minecraft%20style%20overgrown%20garden%20vines%20ruins?width=800&height=600&nologo=true",
        character: "https://image.pollinations.ai/prompt/pixel%20art%20minecraft%20skin%20king%20solomon%20wise?width=200&height=200&nologo=true"
    }
  },
  {
    id: 5,
    name: "Market of Greed",
    sin: "Greed",
    virtue: "Charity",
    description: "A chaotic bazaar where everything has a price, but nothing has value.",
    colorTheme: "bg-yellow-900",
    accentColor: "bg-gold-500",
    gridPattern: GRID_ARENA,
    bibleContext: {
        storyTitle: "The Rich Young Ruler",
        reference: "Mark 10:17-27",
        character: "Jesus",
        narrativeIntro: "You have kept all the commandments, yet you lack one thing. The Master asks for your treasure. Can you let go?",
        keyVerse: "It is easier for a camel to go through the eye of a needle than for someone who is rich to enter the kingdom of God.",
        prayerFocus: "Generosity and detachment"
    },
    images: {
        landscape: "https://image.pollinations.ai/prompt/isometric%20voxel%20art%20minecraft%20style%20ancient%20market%20bazaar%20stalls%20gold?width=800&height=600&nologo=true",
        character: "https://image.pollinations.ai/prompt/pixel%20art%20minecraft%20skin%20rich%20merchant%20robes?width=200&height=200&nologo=true"
    }
  }
];

export const DAVID_LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: "The Sheepfold",
    sin: "Insignificance",
    virtue: "Faithfulness",
    description: "The quiet hills of Bethlehem. While brothers go to war, you guard the flock.",
    colorTheme: "bg-green-800",
    accentColor: "bg-green-400",
    gridPattern: GRID_BASIC_PATH,
    bibleContext: {
        storyTitle: "Anointing of David",
        reference: "1 Samuel 16:11-13",
        character: "David",
        narrativeIntro: "The prophet Samuel waits. You are the youngest, forgotten in the fields. But the Lord does not look at the outward appearance.",
        keyVerse: "The Lord looks at the heart.",
        prayerFocus: "Faithfulness in small things"
    },
    images: {
        landscape: "https://image.pollinations.ai/prompt/isometric%20voxel%20art%20minecraft%20style%20green%20hills%20sheep%20pasture?width=800&height=600&nologo=true",
        character: "https://image.pollinations.ai/prompt/pixel%20art%20minecraft%20skin%20shepherd%20david?width=200&height=200&nologo=true"
    }
  },
  {
    id: 2,
    name: "Valley of Elah",
    sin: "Intimidation",
    virtue: "Confidence",
    description: "The giant shouts defiance. The armies of Israel tremble.",
    colorTheme: "bg-stone-800",
    accentColor: "bg-red-600",
    gridPattern: GRID_ARENA,
    bibleContext: {
        storyTitle: "David and Goliath",
        reference: "1 Samuel 17:45-47",
        character: "David",
        narrativeIntro: "Goliath towers over you with spear and javelin. You have only a sling and five smooth stones. But you come in the name of the Lord.",
        keyVerse: "The battle is the Lord's.",
        prayerFocus: "Courage against giants"
    },
    images: {
        landscape: "https://image.pollinations.ai/prompt/isometric%20voxel%20art%20minecraft%20style%20battlefield%20valley%20armies?width=800&height=600&nologo=true",
        character: "https://image.pollinations.ai/prompt/pixel%20art%20minecraft%20skin%20david%20sling?width=200&height=200&nologo=true"
    }
  }
];

export const PAUL_LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: "Road to Damascus",
    sin: "Zealotry",
    virtue: "Submission",
    description: "A blinding light strikes you down on the dusty road.",
    colorTheme: "bg-yellow-900",
    accentColor: "bg-white",
    gridPattern: GRID_CROSS,
    bibleContext: {
        storyTitle: "The Conversion",
        reference: "Acts 9:3-6",
        character: "Saul",
        narrativeIntro: "You breathe threats against the disciples. Suddenly, a light from heaven flashes. You fall to the ground and hear a voice.",
        keyVerse: "Saul, Saul, why do you persecute me?",
        prayerFocus: "Surrender to Truth"
    },
    images: {
        landscape: "https://image.pollinations.ai/prompt/isometric%20voxel%20art%20minecraft%20style%20desert%20road%20blinding%20light%20beam?width=800&height=600&nologo=true",
        character: "https://image.pollinations.ai/prompt/pixel%20art%20minecraft%20skin%20saul%20blinded?width=200&height=200&nologo=true"
    }
  }
];

// --- GAME CONFIGURATIONS ---
export const GAMES: GameModeConfig[] = [
  { 
    id: 'pilgrim', 
    title: "Pilgrim's Progress", 
    description: "Journey through the 9 circles of overcoming sin through biblical reflection and AI guidance.", 
    image: "https://image.pollinations.ai/prompt/isometric%20voxel%20art%20minecraft%20style%20pilgrim%20path%20mountains?width=400&height=250&nologo=true", 
    mapBackground: "https://image.pollinations.ai/prompt/isometric%20voxel%20art%20minecraft%20style%20world%20map%20fantasy?width=1200&height=800&nologo=true", 
    levels: PILGRIM_LEVELS 
  },
  { 
    id: 'david', 
    title: "The Shepherd King", 
    description: "Follow David from the sheepfold to the throne room, facing giants and inner demons.", 
    image: "https://image.pollinations.ai/prompt/isometric%20voxel%20art%20minecraft%20style%20shepherd%20king%20throne?width=400&height=250&nologo=true", 
    mapBackground: "https://image.pollinations.ai/prompt/isometric%20voxel%20art%20minecraft%20style%20israel%20map?width=1200&height=800&nologo=true", 
    levels: DAVID_LEVELS 
  },
  { 
    id: 'paul', 
    title: "Road to Redemption", 
    description: "Experience the trials of the Apostle Paul, from blinding light to stormy seas.", 
    image: "https://image.pollinations.ai/prompt/isometric%20voxel%20art%20minecraft%20style%20apostle%20paul%20ship?width=400&height=250&nologo=true", 
    mapBackground: "https://image.pollinations.ai/prompt/isometric%20voxel%20art%20minecraft%20style%20mediterranean%20map?width=1200&height=800&nologo=true", 
    levels: PAUL_LEVELS 
  }
];

export const LEVELS = [...PILGRIM_LEVELS, ...DAVID_LEVELS, ...PAUL_LEVELS];
