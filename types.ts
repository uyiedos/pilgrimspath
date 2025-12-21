
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
  COMMUNITY = 'COMMUNITY',
  MARKETPLACE = 'MARKETPLACE',
  GIVEAWAYS = 'GIVEAWAYS',
  RAFFLES = 'RAFFLES',
  FORGE = 'FORGE',
  PRAYER_ROOM = 'PRAYER_ROOM',
  TREASURY = 'TREASURY',
  BROWSER = 'BROWSER',
  MISSIONS = 'MISSIONS',
  STAKING = 'STAKING'
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'Daily' | 'Weekly' | 'Career';
  reward_xp: number;
  icon: string;
  action_key: string;
  target_count: number;
}

export interface Stake {
  id: string;
  amount: number;
  tier: 'daily' | 'weekly' | 'monthly' | 'yearly';
  apy: number;
  start_time: string;
  lock_end_time: string;
  last_claim_time: string;
  status: 'active' | 'unstaked';
  total_earned: number;
}

export interface Raffle {
  id: string;
  sponsor_name: string;
  title: string;
  description: string;
  image: string;
  entry_fee: number;
  winners_count: number;
  end_time: string;
  status: 'active' | 'drawn' | 'cancelled';
  winner_ids?: string[];
  winner_emails?: string[]; // Collected upon draw
  participants_count: number;
  created_at: string;
  prize_xp?: number;
  action_link?: string; // URL to visit (e.g. X profile)
  action_label?: string; // Text for button (e.g. "Follow on X")
}

export interface Giveaway {
  id: string;
  poster_id: string;
  title: string;
  description: string;
  image: string;
  entry_fee: number;
  winners_count: number;
  end_time: string;
  status: 'active' | 'drawn' | 'cancelled';
  winner_ids?: string[];
  participants_count: number;
  created_at: string;
  users?: {
    username: string;
    avatar: string;
  };
  // Extended Fields
  type?: 'standard' | 'crypto' | 'nft' | 'avatar';
  is_vested?: boolean;
  prize_asset_id?: string;
  social_link?: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export type DifficultyMode = 'easy' | 'normal' | 'hard';

export interface User {
  id: string; 
  email: string;
  username: string;
  avatar: string;
  sanctuaryBackground?: string; // New: Custom sanctuary background
  joinedDate: string;
  lastDailyClaim: number; 
  dailyPointsEarned: number; 
  lastActivityDate: string; 
  badges: string[]; 
  role?: 'user' | 'admin';
  difficulty?: DifficultyMode;
  referralCode?: string; 
  referralsCount?: number; 
  archetype?: string; 
  totalPoints?: number;
  assetPoints?: number; // New: Total value of owned artifacts
  stakedPoints?: number; // New: Total active stakes
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
  senderName?: string; 
  isScripture?: boolean;
}

export interface BibleContext {
  storyTitle: string;
  reference: string;
  character: string;
  narrativeIntro: string; 
  keyVerse: string; 
  prayerFocus: string; 
}

export interface LevelImages {
  landscape: string;
  character: string;
}

export interface LevelConfig {
  id: number;
  name: string;
  sin: string; 
  virtue: string;
  description: string;
  colorTheme: string; 
  accentColor: string;
  gridPattern: number[][]; 
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
  id: string; 
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
  duration: number; 
  progress: number; 
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  lastCompletedDate?: string; 
  days?: { day: number; reading: string; topic: string; content?: string }[];
}

export interface JournalEntry {
  id: string;
  type: 'verse' | 'note';
  content: string; 
  reference?: string; 
  createdAt: string;
}

export type VideoPlatform = 'youtube' | 'twitch_stream' | 'twitch_clip' | 'vimeo' | 'tiktok' | 'other';

export interface VideoContent {
  id: string;
  user_id: string;
  username: string; 
  avatar: string; 
  title: string;
  description?: string; 
  source_reference?: string; 
  category?: string; 
  platform?: VideoPlatform; 
  youtube_id: string; 
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
  treasury_balance: number; // New Field
  total_achievements: number; // New Field
  total_xp?: number;
  level?: number;
  created_at: string;
}

export interface AIResponse {
  text: string;
  isSuccess: boolean;
  scriptureRef?: string | null;
}

export interface GameState {
  user: User | null;
  totalPoints: number;
  activeGameId: GameModeId;
  progress: Record<GameModeId, number>;
  view: AppView;
  chatHistory: Record<string, string[]>;
  collectedVerses: string[];
  journalEntries: JournalEntry[];
  unlockedAchievements: string[];
  language: LanguageCode;
  supportTickets: SupportTicket[];
  plans: BiblePlan[];
  rank: number;
}

export type PostType = 'general' | 'prayer' | 'testimony';

export interface CommunityPost {
  id: string;
  community_id: string;
  user_id: string;
  content: string;
  type: PostType;
  likes_count: number;
  comments_count: number;
  created_at: string;
  users?: {
    username: string;
    avatar: string;
  };
  has_liked?: boolean;
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

export interface MarketplaceListing {
  id: string;
  seller_id: string;
  avatar_id: string;
  price: number;
  attached_xp: number;
  status: 'active' | 'sold' | 'cancelled';
  created_at: string;
  users?: {
    username: string;
    total_points: number;
    avatar: string;
  };
  avatar_history?: {
    avatar_url: string;
    style_prompt: string;
    collection_name: string;
  };
}
