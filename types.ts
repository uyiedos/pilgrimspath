
import { LanguageCode } from './translations';

export enum AppView {
  AUTH = 'AUTH',
  LANDING = 'LANDING',
  GAME_LIBRARY = 'GAME_LIBRARY',
  MAP = 'MAP',
  GAME = 'GAME',
  VICTORY = 'VICTORY',
  JOURNAL = 'JOURNAL',
  DEVOTIONAL = 'DEVOTIONAL',
  PLANS = 'PLANS',
  TV = 'TV',
  BIBLE = 'BIBLE',
  LEADERBOARD = 'LEADERBOARD',
  ARCHIVE = 'ARCHIVE',
  WIKI = 'WIKI',
  TOKEN = 'TOKEN',
  PROFILE = 'PROFILE',
  SUPPORT = 'SUPPORT',
  ADMIN = 'ADMIN',
  ACTIVITIES = 'ACTIVITIES',
  COMMUNITY = 'COMMUNITY'
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export type DifficultyMode = 'easy' | 'normal' | 'hard';

export interface User {
  id: string; // Unique ID tied to account and avatar storage
  email: string;
  username: string;
  avatar: string;
  joinedDate: string;
  lastDailyClaim: number; // Timestamp
  dailyPointsEarned: number; // Points earned today
  lastActivityDate: string; // YYYY-MM-DD
  badges: string[]; // Array of Badge IDs
  role?: 'user' | 'admin';
  difficulty?: DifficultyMode;
  referralCode?: string; // New: Unique code to share
  referralsCount?: number; // New: Number of people referred
  archetype?: string; // The character class/role (e.g., 'Knight', 'Scribe')
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
}

export type GameModeId = 'pilgrim' | 'david' | 'paul';

export interface GameModeConfig {
  id: GameModeId;
  title: string;
  description: string;
  image: string;
  mapBackground: string;
  levels: LevelConfig[];
}

export enum MessageRole {
  GUIDE = 'model',
  USER = 'user',
  SYSTEM = 'system'
}

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  senderName?: string; // For multiplayer chat
  isScripture?: boolean;
}

export interface BibleContext {
  storyTitle: string;
  reference: string;
  character: string;
  narrativeIntro: string; // The specific situation the user steps into
  keyVerse: string; // The verse unlocked upon completion
  prayerFocus: string; // What the user should pray about
}

export interface LevelImages {
  landscape: string;
  character: string;
}

export interface LevelConfig {
  id: number;
  name: string;
  sin: string; // Or "Challenge" for other modes
  virtue: string;
  description: string;
  colorTheme: string; // Tailwind class for base block color
  accentColor: string;
  gridPattern: number[][]; // Simple 8x8 pixel art definition
  bibleContext: BibleContext;
  images: LevelImages;
}

export interface SupportMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  timestamp: number;
}

export interface SupportTicket {
  id: string; // The unique token (e.g., #SUP-8821)
  subject: string;
  category: 'account' | 'bug' | 'spiritual' | 'billing' | 'other';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: number;
  lastUpdated: number;
  messages: SupportMessage[];
}

export interface BiblePlan {
  id: string;
  title: string;
  desc: string;
  category: 'Study' | 'Devotional' | 'Topical' | 'Custom';
  image: string;
  duration: number; // in days
  progress: number; // 0-100
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  lastCompletedDate?: string; // YYYY-MM-DD to track daily completion
  days?: { day: number; reading: string; topic: string; content?: string }[];
}

export interface JournalEntry {
  id: string;
  type: 'verse' | 'note';
  content: string; // The note text or verse text
  reference?: string; // For verses (e.g., "John 3:16")
  createdAt: string;
}

export type VideoPlatform = 'youtube' | 'twitch_stream' | 'twitch_clip' | 'vimeo' | 'tiktok' | 'other';

export interface VideoContent {
  id: string;
  user_id: string;
  username: string; // Cached for display
  avatar: string; // Cached for display
  title: string;
  description?: string; // New: Description of the video
  source_reference?: string; // New: Original Creator/Source attribution
  category?: string; // New: Video Category
  platform?: VideoPlatform; // New: Platform type
  youtube_id: string; // Stores the ID for any platform
  views: number;
  likes: number;
  created_at: string;
}

export type CommunityType = 'Church' | 'Fellowship' | 'Cell Group' | 'Study Group' | 'Mission';

export interface Community {
  id: string;
  name: string;
  description: string;
  type: CommunityType;
  image: string;
  leader_id: string;
  member_count: number;
  created_at: string;
  is_joined?: boolean; // UI helper
}

export type PostType = 'general' | 'prayer' | 'testimony';

export interface CommunityPost {
  id: string;
  community_id: string;
  user_id: string;
  content: string;
  type: PostType;
  created_at: string;
  likes_count: number;
  comments_count: number;
  users?: {
    username: string;
    avatar: string;
  };
  has_liked?: boolean; // UI state
}

export interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  users?: {
    username: string;
    avatar: string;
  };
}

export interface GameState {
  user: User | null;
  totalPoints: number;
  activeGameId: GameModeId;
  progress: Record<GameModeId, number>; // Track unlocked level per game mode
  view: AppView;
  chatHistory: Record<string, Message[]>; // History key: gameId-levelId
  collectedVerses: string[]; // List of verses unlocked (Gameplay)
  journalEntries: JournalEntry[]; // Personal notes and saved verses
  unlockedAchievements: string[]; // List of achievement IDs
  language: LanguageCode;
  supportTickets: SupportTicket[];
  plans: BiblePlan[]; // List of available and active plans
  rank: number; // Global leaderboard rank
}

export interface AIResponse {
  text: string;
  isSuccess: boolean;
  scriptureRef?: string;
}
