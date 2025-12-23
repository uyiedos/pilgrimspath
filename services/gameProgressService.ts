import { supabase } from '../lib/supabase';
import { GameModeId } from '../types';

export type GameProgress = Record<GameModeId, number>; // gameId -> unlocked level

export interface GameData {
  progress: GameProgress;
  collectedVerses: string[];
  totalXP: number;
}

export const saveGameProgress = async (
  userId: string, 
  gameData: GameData
): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('save_game_progress', {
      p_user_id: userId,
      p_game_progress: gameData.progress,
      p_collected_verses: gameData.collectedVerses,
      p_total_xp: gameData.totalXP
    });

    if (error) {
      console.error('Error saving game progress:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving game progress:', error);
    return false;
  }
};

export const loadGameProgress = async (userId: string): Promise<GameData | null> => {
  try {
    const { data, error } = await supabase.rpc('load_game_progress', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error loading game progress:', error);
      return null;
    }

    if (data && data.length > 0) {
      const result = data[0];
      return {
        progress: result.game_progress || { pilgrim: 1, david: 1, paul: 1 },
        collectedVerses: result.collected_verses || [],
        totalXP: result.total_xp || 0
      };
    }

    return null;
  } catch (error) {
    console.error('Error loading game progress:', error);
    return null;
  }
};

// Fallback direct table update if RPC functions don't work
export const saveGameProgressDirect = async (
  userId: string, 
  gameData: GameData
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        game_progress: gameData.progress,
        collected_verses: gameData.collectedVerses,
        total_xp: gameData.totalXP,
        last_activity_date: new Date().toISOString().split('T')[0]
      })
      .eq('id', userId);

    if (error) {
      console.error('Error saving game progress (direct):', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving game progress (direct):', error);
    return false;
  }
};

export const loadGameProgressDirect = async (userId: string): Promise<GameData | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('game_progress, collected_verses, total_xp')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error loading game progress (direct):', error);
      return null;
    }

    return {
      progress: data.game_progress || { pilgrim: 1, david: 1, paul: 1 },
      collectedVerses: data.collected_verses || [],
      totalXP: data.total_xp || 0
    };
  } catch (error) {
    console.error('Error loading game progress (direct):', error);
    return null;
  }
};
