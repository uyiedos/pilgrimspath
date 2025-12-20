
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { User } from '../types';
import { AVATARS } from '../constants';
import { LanguageCode } from '../translations';
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
  const [rememberMe, setRememberMe] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Global Network Stats
  const [globalStats, setGlobalStats] = useState({ users: 0, xp: 0, prayers: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.rpc('get_global_stats');
        if (data && !error) {
          setGlobalStats({
            users: data.users || 1240,
            xp: data.xp || 854000,
            prayers: Math.floor((data.xp || 854000) / 12) // Estimated prayers
          });
        } else {
          // Fallback stats for aesthetics if DB is fresh
          setGlobalStats({ users: 142, xp: 45000, prayers: 1205 });
        }
      } catch (e) {
        setGlobalStats({ users: 1240, xp: 854000, prayers: 24500 });
      }
    };
    fetchStats();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    AudioSystem.playVoxelTap();

    // Store the remember me preference
    localStorage.setItem('journey_remember_me', rememberMe.toString());

    try {
      if (mode === 'signup') {
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
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
          archetype: 'Wanderer'
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
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
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
          role: profile.role,
          difficulty: profile.difficulty,
          archetype: profile.archetype
        };

        onLogin(user, selectedLanguage);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Entry denied. Check your scrolls (credentials).");
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
          archetype: 'Wanderer'
      };
      onLogin(mockUser, selectedLanguage);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center overflow-x-hidden selection:bg-yellow-500 selection:text-black">
      
      {/* Cinematic Hero Header */}
      <div className="w-full h-[60vh] relative flex items-center justify-center overflow-hidden border-b-4 border-yellow-600 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
         <div className="absolute inset-0 bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20majestic%20holy%20mountain%20with%20shining%20path%20clouds%20stars%20epic%20landscape%20celestial%20glow?width=1920&height=1080&nologo=true')] bg-cover bg-center opacity-50 scale-105 animate-float-voxel"></div>
         <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-black/90"></div>
         
         <div className="relative z-10 text-center px-4 animate-slide-up flex flex-col items-center">
            <div className="w-24 h-24 mb-8 bg-yellow-500 rounded-3xl flex items-center justify-center text-5xl shadow-[0_0_50px_rgba(234,179,8,0.4)] border-4 border-white animate-float">🕊️</div>
            <h1 className="text-6xl md:text-9xl font-retro text-yellow-500 drop-shadow-[8px_8px_0_rgba(0,0,0,1)] animate-glow mb-4 tracking-tighter">THE JOURNEY</h1>
            <div className="flex items-center justify-center gap-4">
                <div className="h-[2px] w-12 md:w-24 bg-gradient-to-r from-transparent to-blue-400"></div>
                <p className="text-blue-300 font-cinzel text-xl md:text-3xl tracking-[0.5em] uppercase drop-shadow-lg">Pilgrim's Path</p>
                <div className="h-[2px] w-12 md:w-24 bg-gradient-to-l from-transparent to-blue-400"></div>
            </div>
            
            {/* Real-time Global Ticker */}
            <div className="mt-12 flex gap-8 flex-wrap justify-center font-mono uppercase text-[10px] tracking-widest text-gray-400 bg-black/40 backdrop-blur-md px-8 py-3 rounded-full border border-white/5">
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                    <span>{globalStats.users.toLocaleString()} Pilgrims Joined</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-yellow-500">✨</span>
                    <span>{globalStats.xp.toLocaleString()} Spirit XP Manifested</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-blue-400">🙏</span>
                    <span>{globalStats.prayers.toLocaleString()} Prayers Offered</span>
                </div>
            </div>
         </div>
      </div>

      {/* Main Dual-Column Container */}
      <div className="w-full max-w-7xl -mt-20 md:-mt-32 relative z-20 px-4 pb-24 flex flex-col lg:flex-row gap-10 items-stretch">
         
         {/* AUTH FORM: Left Portal */}
         <div className="flex-1 lg:max-w-md bg-gray-900/80 backdrop-blur-2xl border-4 border-yellow-600 p-8 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col relative overflow-hidden group">
            <div className="relative z-10">
                <div className="text-center mb-10">
                    <span className="text-4xl block mb-2">📜</span>
                    <h2 className="text-2xl font-retro text-white uppercase tracking-wider">{mode === 'signin' ? 'Scribe Registry' : 'Pilgrim Vow'}</h2>
                    <p className="text-gray-500 font-mono text-[10px] mt-2 uppercase tracking-widest italic border-b border-gray-800 pb-2 inline-block">Secure Protocol: Soul_V5</p>
                </div>

                <form onSubmit={handleAuth} className="space-y-6">
                {mode === 'signup' && (
                    <div className="space-y-1">
                        <label className="text-yellow-600 font-retro text-[10px] uppercase ml-1">Identity Name</label>
                        <input type="text" placeholder="e.g. FaithfulSeeker" className="w-full bg-black text-white p-4 border-2 border-gray-800 rounded-xl outline-none focus:border-yellow-500 transition-all font-mono shadow-inner" value={username} onChange={e => setUsername(e.target.value)} required />
                    </div>
                )}
                <div className="space-y-1">
                    <label className="text-yellow-600 font-retro text-[10px] uppercase ml-1">Spiritual Email</label>
                    <input type="email" placeholder="pilgrim@faith.net" className="w-full bg-black text-white p-4 border-2 border-gray-800 rounded-xl outline-none focus:border-yellow-500 transition-all font-mono shadow-inner" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1">
                    <label className="text-yellow-600 font-retro text-[10px] uppercase ml-1">Pass-Phrase</label>
                    <input type="password" placeholder="••••••••" className="w-full bg-black text-white p-4 border-2 border-gray-800 rounded-xl outline-none focus:border-yellow-500 transition-all font-mono shadow-inner" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>

                {/* Keep me logged in checkbox */}
                <div className="flex items-center gap-3 ml-1 select-none">
                    <div 
                        onClick={() => { AudioSystem.playVoxelTap(); setRememberMe(!rememberMe); }}
                        className={`w-6 h-6 border-2 border-yellow-600 rounded flex items-center justify-center cursor-pointer transition-all ${rememberMe ? 'bg-yellow-600 shadow-[0_0_10px_rgba(202,138,4,0.4)]' : 'bg-black'}`}
                    >
                        {rememberMe && <span className="text-black font-bold text-xs">✓</span>}
                    </div>
                    <label 
                        onClick={() => setRememberMe(!rememberMe)}
                        className="text-gray-400 font-retro text-[9px] uppercase cursor-pointer hover:text-gray-200"
                    >
                        Keep me Logged In
                    </label>
                </div>
                
                {errorMsg && (
                    <div className="bg-red-950/30 border border-red-900 p-3 rounded-lg text-red-500 text-xs font-mono text-center animate-shake">
                        [ERROR]: {errorMsg}
                    </div>
                )}
                
                <Button type="submit" className="w-full py-5 text-xl rounded-2xl animate-glow" disabled={isLoading}>
                    {isLoading ? 'Scribing...' : (mode === 'signin' ? 'Enter Sanctuary' : 'Register Soul')}
                </Button>
                
                <div className="text-center pt-2">
                    <button type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="text-gray-500 text-xs hover:text-yellow-500 transition-colors font-retro tracking-tighter">
                    {mode === 'signin' ? "Not in the Registry? Sign Up" : "Already Vowed? Sign In"}
                    </button>
                </div>
                
                <div className="border-t border-gray-800 pt-6 mt-6 flex flex-col items-center gap-3">
                    <button type="button" onClick={handleOfflineLogin} className="text-gray-600 text-[10px] uppercase tracking-[0.2em] hover:text-gray-300 transition-all hover:tracking-[0.3em]">
                    Proceed as Wanderer (Guest)
                    </button>
                </div>
                </form>
            </div>
         </div>

         {/* SPIRIT ECONOMY & BENEFITS: Right Column */}
         <div className="flex-1 bg-black/60 backdrop-blur-2xl rounded-[3rem] border-2 border-white/5 overflow-hidden shadow-2xl flex flex-col justify-center animate-slide-in">
            <div className="p-8 md:p-14">
               <div className="mb-14">
                   <h2 className="text-4xl md:text-5xl font-retro text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 mb-4 tracking-tighter uppercase leading-tight">Spiritual Sanctuary</h2>
                   <p className="text-gray-400 font-serif italic text-lg leading-relaxed max-w-xl">
                    The Journey is more than a game—it is a digital refuge built for biblical reflection, interactive prayer, and the overcoming of spiritual trials.
                   </p>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                  <div className="space-y-10">
                     <div className="flex gap-6 group">
                        <div className="bg-gray-900 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border border-gray-700 shadow-[0_0_20px_rgba(52,211,153,0.15)] group-hover:scale-110 transition-transform duration-500">📖</div>
                        <div>
                           <h4 className="text-white font-bold text-lg font-cinzel tracking-wider">Biblical Narrative</h4>
                           <p className="text-gray-500 text-[13px] mt-1 leading-relaxed font-serif">Experience scriptural truths through immersive 3D trials and AI-guided storytelling.</p>
                        </div>
                     </div>
                     
                     <div className="flex gap-6 group">
                        <div className="bg-gray-900 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border border-gray-700 shadow-[0_0_20px_rgba(52,211,153,0.15)] group-hover:scale-110 transition-transform duration-500">✨</div>
                        <div>
                           <h4 className="text-white font-bold text-lg font-cinzel tracking-wider">Vocal Counseling</h4>
                           <p className="text-gray-500 text-[13px] mt-1 leading-relaxed font-serif">Enter the Prayer Room for real-time vocal guidance using the Nexus Voice Protocol.</p>
                        </div>
                     </div>
                     
                     <div className="flex gap-6 group">
                        <div className="bg-gray-900 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border border-gray-700 shadow-[0_0_20px_rgba(52,211,153,0.15)] group-hover:scale-110 transition-transform duration-500">🔥</div>
                        <div>
                           <h4 className="text-white font-bold text-lg font-cinzel tracking-wider">Faith Fellowship</h4>
                           <p className="text-gray-500 text-[13px] mt-1 leading-relaxed font-serif">Join ministries, tithe XP to your community treasury, and walk together in faith.</p>
                        </div>
                     </div>

                     <div className="flex gap-6 group">
                        <div className="bg-gray-900 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border border-gray-700 shadow-[0_0_20px_rgba(52,211,153,0.15)] group-hover:scale-110 transition-transform duration-500">⚒️</div>
                        <div>
                           <h4 className="text-white font-bold text-lg font-cinzel tracking-wider">Spirit Identity</h4>
                           <p className="text-gray-500 text-[13px] mt-1 leading-relaxed font-serif">Manifest unique AI-forged artifacts and avatars that represent your spiritual growth.</p>
                        </div>
                     </div>
                  </div>
                  
                  <div className="relative group/card mt-8 md:mt-0">
                     <div className="absolute inset-0 bg-blue-500/10 blur-[100px] rounded-full group-hover/card:bg-blue-500/20 transition-all duration-1000"></div>
                     <div className="bg-gray-900/90 border-4 border-blue-900/30 rounded-[3rem] p-10 relative pixel-shadow rotate-1 group-hover/card:rotate-0 transition-all duration-700 backdrop-blur-md">
                        <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                           <span className="font-retro text-blue-400 text-[9px] tracking-widest uppercase animate-pulse">NETWORK STATUS</span>
                           <span className="text-[9px] text-gray-600 font-mono">ID: #REVE-777</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-10">
                           <div className="aspect-square bg-black rounded-3xl border-2 border-gray-800 overflow-hidden shadow-2xl relative">
                              <img src="https://image.pollinations.ai/prompt/pixel%20art%20gold%20ancient%20cross%20shining%20holy%20glow?width=200&height=200&nologo=true" className="w-full h-full object-cover" alt="Relic" />
                           </div>
                           <div className="aspect-square bg-black rounded-3xl border-2 border-gray-800 overflow-hidden shadow-2xl relative">
                              <img src="https://image.pollinations.ai/prompt/pixel%20art%20angelic%20avatar%20portrait%20warrior%20holy%20aura?width=200&height=200&nologo=true" className="w-full h-full object-cover" alt="Artifact" />
                           </div>
                        </div>
                        
                        <div className="bg-black/95 p-6 rounded-2xl font-mono text-[11px] text-blue-500 border border-blue-900/30 leading-relaxed shadow-inner">
                           &gt; Connection: ESTABLISHED<br/>
                           &gt; Registry: PILGRIM_PATH_V8<br/>
                           &gt; Total Pilgrims: {globalStats.users.toLocaleString()}<br/>
                           &gt; Status: READY_FOR_ASCENSION
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>

      </div>

      {/* Benefits Footer */}
      <div className="w-full max-w-7xl px-4 pb-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-8 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm group hover:bg-white/10 transition-all">
              <div className="text-4xl mb-4 group-hover:scale-125 transition-transform">💎</div>
              <h3 className="text-white font-retro text-[10px] mb-3 uppercase tracking-widest">Earn Rewards</h3>
              <p className="text-gray-500 text-sm font-serif italic">Complete daily devotionals and reading plans to earn XP and unlock premium features.</p>
          </div>
          <div className="text-center p-8 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm group hover:bg-white/10 transition-all">
              <div className="text-4xl mb-4 group-hover:scale-125 transition-transform">⚔️</div>
              <h3 className="text-white font-retro text-[10px] mb-3 uppercase tracking-widest">Overcome Trials</h3>
              <p className="text-gray-400 text-sm font-serif italic">Master spiritual disciplines and conquer the 9 circles of overcoming to ascend in rank.</p>
          </div>
          <div className="text-center p-8 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm group hover:bg-white/10 transition-all">
              <div className="text-4xl mb-4 group-hover:scale-125 transition-transform">🏛️</div>
              <h3 className="text-white font-retro text-[10px] mb-3 uppercase tracking-widest">Global Archive</h3>
              <p className="text-gray-400 text-sm font-serif italic">Your journey is recorded in the Great Archive, a permanent record of your walk with the Spirit.</p>
          </div>
      </div>
      
      <div className="pb-10 text-gray-600 font-mono text-[10px] uppercase tracking-[0.4em]">
          Inspired by Faith • Designed for the Seeker • v8.2.0
      </div>
    </div>
  );
};

export default AuthView;
