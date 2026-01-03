
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
  WIKI = 'WIKI',
  PROFILE = 'PROFILE',
  SUPPORT = 'SUPPORT',
  ADMIN = 'ADMIN',
  ACTIVITIES = 'ACTIVITIES',
  COMMUNITY = 'COMMUNITY',
  GIVEAWAYS = 'GIVEAWAYS',
  RAFFLES = 'RAFFLES',
  PRAYER_ROOM = 'PRAYER_ROOM',
  BROWSER = 'BROWSER',
  MISSIONS = 'MISSIONS',
  DONATE = 'DONATE',
  TREASURY = 'TREASURY'
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
  winner_emails?: string[]; 
  participants_count: number;
  created_at: string;
  prize_xp?: number;
  action_link?: string; 
  action_label?: string; 
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
  type?: 'standard' | 'crypto';
  is_vested?: boolean;
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
  sanctuaryBackground?: string;
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
  assetPoints?: number;
  stakedPoints?: number;
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
  treasury_balance: number;
  total_achievements: number;
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
  prayer_count?: number;
  created_at: string;
  users?: {
    username: string;
    avatar: string;
  };
  has_liked?: boolean;
  has_prayed?: boolean;
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
  avatar_id?: string;
  price: number;
  status: 'active' | 'sold' | 'cancelled';
  created_at: string;
  attached_xp?: number;
  users?: {
    username: string;
    avatar: string;
    total_points?: number;
  };
  avatar_history?: {
    id: string;
    avatar_url: string;
    style_prompt: string;
    collection_name: string;
  };
}

export interface TreasuryStats {
  balance: number;
  circulation?: number; // Deprecated by net_worth
  liquid_supply?: number;
  asset_supply?: number;
  staked_supply?: number;
  tx_count: number;
  net_worth: number;
  holders: Array<{
    username: string;
    avatar: string;
    net_worth: number;
    liquid?: number;
    assets?: number;
    archetype: string;
  }>;
  weekly_growth: Array<{
    week_label: string;
    new_users: number;
    xp_generated: number;
  }>;
}

export interface Stake {
  id: string;
  user_id: string;
  amount: number;
  tier: 'daily' | 'weekly' | 'monthly' | 'yearly';
  start_time: string;
  lock_end_time: string;
  status: 'active' | 'withdrawn';
  total_earned: number;
  created_at: string;
}
