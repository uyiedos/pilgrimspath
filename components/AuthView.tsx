
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { User } from '../types';
import { AVATARS } from '../constants';
import { LanguageCode, UI_TEXT, LANGUAGES } from '../translations';
import { supabase } from '../lib/supabase';
import { AudioSystem } from '../utils/audio';

interface AuthViewProps {
  onLogin: (user: User, language: LanguageCode) => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Live Stats
  const [stats, setStats] = useState({ users: 0, xp: 0, treasury: 0 });
  const [recentActivity, setRecentActivity] = useState<string[]>([]);

  const t = (key: keyof typeof UI_TEXT['en']) => {
    return UI_TEXT[selectedLanguage]?.[key] || UI_TEXT['en'][key];
  };

  useEffect(() => {
    // 1. Fetch Global Stats & Treasury
    const fetchStats = async () => {
      try {
        const [globalRes, treasuryRes] = await Promise.all([
            supabase.rpc('get_global_stats'),
            supabase.from('treasury').select('balance').single()
        ]);

        if (globalRes.data) {
            setStats(prev => ({ 
                ...prev, 
                users: globalRes.data.users || 0, 
                xp: globalRes.data.xp || 0 
            }));
        }
        if (treasuryRes.data) {
            setStats(prev => ({ 
                ...prev, 
                treasury: treasuryRes.data.balance || 0 
            }));
        }
      } catch (e) {
        console.error("Stats error", e);
      }
    };
    fetchStats();

    // 2. Simulate "Live" Activity Feed for Enticement
    const activities = [
        "⚔️ A Pilgrim just cleared the Valley of Doubt!",
        "⚒️ New Artifact forged: 'Shield of Faith'",
        "💰 500 XP staked in the Celestial Vault",
        "🙏 Prayer Request posted in Fellowship",
        "👶 New Seeker joined the registry",
        "🛒 Rare Artifact sold on Marketplace",
        "🍞 Daily Devotional read by 100+ users"
    ];

    const interval = setInterval(() => {
        const randomAct = activities[Math.floor(Math.random() * activities.length)];
        setRecentActivity(prev => [randomAct, ...prev].slice(0, 1)); // Show 1 at a time on mobile for cleanliness
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    AudioSystem.playVoxelTap();

    try {
      if (mode === 'signup') {
        const { data: authData, error: authError } = await (supabase.auth as any).signUp({ email, password });
        if (authError) throw authError;
        
        const generatedRefCode = (username.substring(0, 3).toUpperCase() + Math.random().toString(36).substring(2, 8).toUpperCase()).replace(/[^A-Z0-9]/g, 'X');

        const newUser: User = {
          id: authData.user!.id,
          email,
          username: username || 'Pilgrim',
          avatar: AVATARS[0],
          joinedDate: new Date().toISOString(),
          lastDailyClaim: 0,
          dailyPointsEarned: 0,
          lastActivityDate: new Date().toISOString().split('T')[0],
          badges: [],
          referralCode: generatedRefCode,
          referralsCount: 0,
          archetype: 'Wanderer',
          totalPoints: 0
        };

        await supabase.from('users').insert([{
            id: newUser.id,
            username: newUser.username,
            avatar: newUser.avatar,
            joined_date: newUser.joinedDate,
            total_points: 0,
            referral_code: generatedRefCode
        }]);

        onLogin(newUser, selectedLanguage);
      } else {
        const { data: authData, error: authError } = await (supabase.auth as any).signInWithPassword({ email, password });
        if (authError) throw authError;

        const { data: profile } = await supabase.from('users').select('*').eq('id', authData.user!.id).single();
        
        const user: User = {
          id: profile.id,
          email: authData.user!.email!,
          username: profile.username,
          avatar: profile.avatar,
          joinedDate: profile.joined_date,
          lastDailyClaim: profile.last_daily_claim || 0,
          dailyPointsEarned: profile.daily_points_earned || 0,
          lastActivityDate: profile.last_activity_date || new Date().toISOString().split('T')[0],
          badges: profile.badges || [],
          referralCode: profile.referral_code,
          referralsCount: profile.referrals_count || 0,
          role: profile.role,
          difficulty: profile.difficulty,
          archetype: profile.archetype,
          totalPoints: profile.total_points || 0,
          assetPoints: 0, 
          stakedPoints: 0 
        };

        onLogin(user, selectedLanguage);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Entry denied. Check your scrolls.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOfflineLogin = () => {
      AudioSystem.playVoxelTap();
      const mockUser: User = {
          id: 'offline-' + Date.now(),
          email: 'guest@offline.mode',
          username: username || 'Seeker',
          avatar: AVATARS[0],
          joinedDate: new Date().toISOString(),
          lastDailyClaim: 0,
          dailyPointsEarned: 0,
          lastActivityDate: new Date().toISOString().split('T')[0],
          badges: [],
          referralsCount: 0,
          archetype: 'Wanderer',
          totalPoints: 0
      };
      onLogin(mockUser, selectedLanguage);
  };

  return (
    <div className="min-h-screen w-full bg-gray-950 font-sans text-gray-100 relative overflow-y-auto custom-scroll">
      
      {/* Background Layers */}
      <div className="fixed inset-0 bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20celestial%20city%20clouds%20golden%20gates%20epic%20landscape?width=1280&height=720&nologo=true')] bg-cover bg-center opacity-30 pointer-events-none"></div>
      <div className="fixed inset-0 bg-gradient-to-b from-black/60 via-gray-900/80 to-gray-900 pointer-events-none"></div>

      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12 flex flex-col items-center">
        
        {/* Language Selector */}
        <div className="absolute top-4 right-4 z-50">
            <select 
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value as LanguageCode)}
                className="bg-black/50 border border-white/20 rounded-lg px-2 py-1 text-xs text-gray-300 outline-none focus:border-yellow-500 backdrop-blur-md"
            >
                {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                    </option>
                ))}
            </select>
        </div>

        {/* HERO SECTION */}
        <div className="text-center mb-8 animate-fade-in max-w-2xl">
           <div className="text-6xl md:text-7xl mb-4 animate-float drop-shadow-[0_0_20px_rgba(255,215,0,0.5)]">🕊️</div>
           <h1 className="text-4xl md:text-7xl font-retro text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-4 drop-shadow-sm tracking-tighter">
             {t('journey_title')}
           </h1>
           <p className="text-lg md:text-2xl text-gray-300 font-serif italic leading-relaxed mb-6">
             "{t('journey_subtitle')}"
           </p>
           
           {/* SOCIAL LINKS */}
           <div className="flex justify-center gap-6 animate-slide-up">
               <a href="https://x.com/thejourneyapptv" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full hover:bg-white/10 hover:border-white/30 transition-all text-gray-300 hover:text-white">
                   <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                   <span className="text-xs font-mono font-bold">Follow Updates</span>
               </a>
               <a href="https://www.youtube.com/@JourneyappTV" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full hover:bg-white/10 hover:border-red-500/50 transition-all text-gray-300 hover:text-red-400">
                   <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                   <span className="text-xs font-mono font-bold">Watch</span>
               </a>
           </div>
        </div>

        {/* LIVE STATS BAR */}
        <div className="w-full max-w-2xl mb-8 grid grid-cols-3 gap-2 md:gap-4 animate-slide-up">
            <div className="bg-black/40 backdrop-blur-md border border-blue-500/30 p-3 rounded-2xl text-center shadow-lg">
                <div className="text-lg md:text-2xl mb-1">👥</div>
                <div className="text-white font-bold font-mono text-sm md:text-lg leading-none">{stats.users.toLocaleString()}</div>
                <div className="text-[8px] md:text-[10px] text-blue-400 uppercase font-retro mt-1">{t('total_users')}</div>
            </div>
            <div className="bg-black/40 backdrop-blur-md border border-yellow-500/30 p-3 rounded-2xl text-center shadow-lg">
                <div className="text-lg md:text-2xl mb-1">✨</div>
                <div className="text-white font-bold font-mono text-sm md:text-lg leading-none">{(stats.xp / 1000).toFixed(1)}k</div>
                <div className="text-[8px] md:text-[10px] text-yellow-400 uppercase font-retro mt-1">{t('global_xp')}</div>
            </div>
            <div className="bg-black/40 backdrop-blur-md border border-green-500/30 p-3 rounded-2xl text-center shadow-lg">
                <div className="text-lg md:text-2xl mb-1">🏛️</div>
                <div className="text-white font-bold font-mono text-sm md:text-lg leading-none">{stats.treasury.toLocaleString()}</div>
                <div className="text-[8px] md:text-[10px] text-green-400 uppercase font-retro mt-1">{t('treasury')}</div>
            </div>
        </div>

        {/* LOGIN CARD */}
        <div className="w-full max-w-md bg-black/60 backdrop-blur-xl border-4 border-yellow-600/50 rounded-[2.5rem] p-8 shadow-2xl animate-slide-up relative overflow-hidden group">
           {/* Decorative Border Glow */}
           <div className="absolute inset-0 border-4 border-yellow-500/20 rounded-[2.5rem] pointer-events-none group-hover:border-yellow-500/40 transition-colors"></div>
           
           <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-1 font-retro uppercase tracking-widest">
                  {mode === 'signin' ? t('enter_sanctuary') : t('begin_pilgrimage')}
              </h2>
              <p className="text-xs text-gray-400 font-mono uppercase">
                  v10.0 • {t('system_online')}
              </p>
           </div>

           <form onSubmit={handleAuth} className="space-y-5">
              {mode === 'signup' && (
                  <div>
                      <input type="text" placeholder={t('pilgrim_name')} className="w-full bg-gray-900/80 border-2 border-gray-700 rounded-xl p-4 text-white focus:border-yellow-500 outline-none transition-all placeholder-gray-600" value={username} onChange={e => setUsername(e.target.value)} required />
                  </div>
              )}
              <div>
                  <input type="email" placeholder={t('email_address')} className="w-full bg-gray-900/80 border-2 border-gray-700 rounded-xl p-4 text-white focus:border-yellow-500 outline-none transition-all placeholder-gray-600" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                  <input type="password" placeholder={t('passphrase')} className="w-full bg-gray-900/80 border-2 border-gray-700 rounded-xl p-4 text-white focus:border-yellow-500 outline-none transition-all placeholder-gray-600" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>

              {errorMsg && (
                  <div className="bg-red-900/40 border border-red-500/50 p-3 rounded-lg text-red-200 text-xs text-center">
                      ⚠️ {errorMsg}
                  </div>
              )}

              <Button type="submit" className="w-full py-4 text-lg font-bold shadow-[0_0_20px_rgba(234,179,8,0.2)] bg-yellow-600 hover:bg-yellow-500 border-yellow-400 text-black rounded-xl">
                  {isLoading ? t('connecting') : (mode === 'signin' ? t('log_in') : t('create_account'))}
              </Button>
           </form>

           <div className="mt-6 flex flex-col gap-4 text-center">
              <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="text-xs text-gray-400 hover:text-yellow-400 transition-colors uppercase tracking-wide">
                  {mode === 'signin' ? t('switch_to_signup') : t('switch_to_login')}
              </button>
              
              <div className="w-full h-px bg-gray-800 my-2"></div>

              <button onClick={handleOfflineLogin} className="text-xs text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wide font-bold">
                  {t('guest_mode')}
              </button>
           </div>
        </div>

        {/* GAME INFO (THE LURE) */}
        <div className="mt-20 max-w-5xl w-full">
            <div className="flex items-center gap-4 mb-8">
                <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1"></div>
                <h2 className="text-xl md:text-2xl font-retro text-gray-300 uppercase tracking-[0.3em] text-center">Game Features</h2>
                <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/10 hover:border-yellow-500/50 transition-all group flex items-start gap-4">
                    <div className="text-4xl bg-gray-900/50 p-3 rounded-xl border border-white/5 group-hover:scale-110 transition-transform">⚔️</div>
                    <div>
                        <h3 className="text-yellow-500 font-retro text-lg mb-2">Biblical RPG</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">Navigate 9 circles of overcoming sin. Face AI-driven trials based on scripture and choose the path of virtue.</p>
                    </div>
                </div>
                <div className="bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/10 hover:border-blue-500/50 transition-all group flex items-start gap-4">
                    <div className="text-4xl bg-gray-900/50 p-3 rounded-xl border border-white/5 group-hover:scale-110 transition-transform">⚒️</div>
                    <div>
                        <h3 className="text-blue-400 font-retro text-lg mb-2">Sacred Forge</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">Use your earned XP to forge unique, AI-generated digital artifacts (Avatars, Scenes) that you truly own.</p>
                    </div>
                </div>
                <div className="bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/10 hover:border-green-500/50 transition-all group flex items-start gap-4">
                    <div className="text-4xl bg-gray-900/50 p-3 rounded-xl border border-white/5 group-hover:scale-110 transition-transform">🏦</div>
                    <div>
                        <h3 className="text-green-400 font-retro text-lg mb-2">Celestial Economy</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">A complete ecosystem. Stake XP in the Vault for yield, trade items on the Marketplace, and enter Raffles.</p>
                    </div>
                </div>
                <div className="bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all group flex items-start gap-4">
                    <div className="text-4xl bg-gray-900/50 p-3 rounded-xl border border-white/5 group-hover:scale-110 transition-transform">🕯️</div>
                    <div>
                        <h3 className="text-purple-400 font-retro text-lg mb-2">Prayer Room</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">Real-time voice interaction with the 'Eternal Guide'. Receive biblical counsel and prayer in a live sanctuary.</p>
                    </div>
                </div>
            </div>
        </div>

        {/* LIVE TICKER BOTTOM */}
        <div className="mt-16 w-full max-w-3xl bg-gray-900/80 backdrop-blur-sm rounded-full border border-white/10 p-3 flex items-center justify-center overflow-hidden shadow-2xl">
            <div className="flex gap-4 md:gap-8 items-center animate-slide-in opacity-90">
                <span className="text-[10px] uppercase font-mono text-green-400 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Live Network
                </span>
                {recentActivity.map((act, i) => (
                    <span key={i} className="text-[10px] text-white font-mono truncate max-w-[200px] md:max-w-none">{act}</span>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};

export default AuthView;
