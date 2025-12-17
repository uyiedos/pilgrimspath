
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { User } from '../types';
import { AVATARS } from '../constants';
import { LanguageCode, LANGUAGES, UI_TEXT } from '../translations';
import { supabase } from '../lib/supabase';

interface AuthViewProps {
  onLogin: (user: User, language: LanguageCode) => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [referralInput, setReferralInput] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showOfflineOption, setShowOfflineOption] = useState(false);
  
  // Global Stats
  const [globalStats, setGlobalStats] = useState<{users: number, xp: number}>({ users: 0, xp: 0 });

  const t = (key: keyof typeof UI_TEXT['en']) => {
    return UI_TEXT[selectedLanguage][key] || UI_TEXT['en'][key];
  };

  // Check URL for referral code & Load Stats
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralInput(ref);
      setMode('signup'); // Auto-switch to signup if referred
    }

    const fetchStats = async () => {
        const { data, error } = await supabase.rpc('get_global_stats');
        if (data && !error) {
            setGlobalStats({ users: data.users, xp: data.xp });
        } else {
            // Fallback if RPC not yet created
            const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
            setGlobalStats(prev => ({ ...prev, users: count || 1240 }));
        }
    };
    fetchStats();
  }, []);

  const handleOfflineLogin = () => {
      const mockUser: User = {
          id: 'offline-guest-' + Date.now(),
          email: 'guest@offline.mode',
          username: username || 'Pilgrim',
          avatar: selectedAvatar,
          joinedDate: new Date().toISOString(),
          lastDailyClaim: 0,
          dailyPointsEarned: 0,
          lastActivityDate: new Date().toISOString().split('T')[0],
          badges: [],
          referralCode: 'OFFLINE',
          referralsCount: 0,
          role: 'user',
          difficulty: 'normal',
          archetype: 'Wanderer'
      };
      onLogin(mockUser, selectedLanguage);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setShowOfflineOption(false);

    try {
      if (mode === 'signup') {
        if (!username) throw new Error("Username is required for new pilgrims.");

        // 1. Sign Up
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("No user created");

        let finalAvatarUrl = selectedAvatar;

        // 2. Archive the Genesis Avatar to Vault (Non-blocking try/catch)
        try {
             const response = await fetch(selectedAvatar);
             if (response.ok) {
                 const blob = await response.blob();
                 const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID 
                    ? crypto.randomUUID() 
                    : Date.now().toString(36) + Math.random().toString(36).substr(2);
                 
                 const fileName = `avatars/${authData.user.id}/${uniqueId}.png`;
                 
                 const { error: uploadError } = await supabase.storage
                    .from('journey_assets')
                    .upload(fileName, blob, { contentType: 'image/png', upsert: true });
                 
                 if (!uploadError) {
                     const { data } = supabase.storage.from('journey_assets').getPublicUrl(fileName);
                     finalAvatarUrl = data.publicUrl;
                 }
             }
        } catch (e) {
            console.warn("Failed to archive genesis avatar (Network/CORS)", e);
        }

        const generatedRefCode = (username.substring(0, 3).toUpperCase() + Math.random().toString(36).substring(2, 8).toUpperCase()).replace(/[^A-Z0-9]/g, 'X');

        const newUser: User = {
          id: authData.user.id,
          email: email,
          username: username,
          avatar: finalAvatarUrl,
          joinedDate: new Date().toISOString(),
          lastDailyClaim: 0,
          dailyPointsEarned: 0,
          lastActivityDate: new Date().toISOString().split('T')[0],
          badges: ['beta'],
          referralCode: generatedRefCode,
          referralsCount: 0,
          archetype: 'Wanderer' // Default for new users until they choose
        };

        const { error: profileError } = await supabase
          .from('users')
          .insert([{
            id: newUser.id,
            username: newUser.username,
            avatar: newUser.avatar,
            joined_date: newUser.joinedDate,
            badges: newUser.badges,
            total_points: 0,
            last_daily_claim: 0,
            daily_points_earned: 0,
            last_activity_date: newUser.lastActivityDate,
            referral_code: generatedRefCode,
            referrals_count: 0,
            archetype: newUser.archetype
          }]);

        if (profileError) console.error("Profile creation error:", profileError);

        if (finalAvatarUrl) {
            await supabase.from('avatar_history').insert({
                user_id: newUser.id,
                avatar_url: finalAvatarUrl,
                style_prompt: 'Genesis Avatar',
                collection_name: 'Genesis' // Explicitly mark as Genesis
            });
        }

        if (referralInput.trim()) {
            await supabase.rpc('claim_referral', {
                code: referralInput.trim(),
                new_user_id: newUser.id
            });
        }

        // Log Join Activity
        await supabase.from('activity_feed').insert({
            user_id: newUser.id,
            username: newUser.username,
            avatar: newUser.avatar,
            activity_type: 'join',
            details: { method: 'email' }
        });

        if (authData.session) {
             onLogin(newUser, selectedLanguage);
        } else {
             setSuccessMsg("Account created! Please check your email to confirm your account before logging in.");
             setMode('signin');
        }

      } else {
        // 1. Sign In
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Login failed");

        // 2. Fetch Profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profileError) {
           if (profileError.code === 'PGRST116') {
              throw new Error("Profile not found. Please Sign Up to create your character.");
           }
           throw profileError;
        }

        const user: User = {
          id: profile.id,
          email: authData.user.email!,
          username: profile.username,
          avatar: profile.avatar,
          joinedDate: profile.joined_date,
          lastDailyClaim: profile.last_daily_claim,
          dailyPointsEarned: profile.daily_points_earned || 0,
          lastActivityDate: profile.last_activity_date || new Date().toISOString().split('T')[0],
          badges: profile.badges || [],
          referralCode: profile.referral_code,
          referralsCount: profile.referrals_count || 0,
          archetype: profile.archetype
        };

        onLogin(user, selectedLanguage);
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let message = "Authentication failed";
      let isCredError = false;
      
      if (err && typeof err === 'object') {
         if (err.message) message = err.message;
         else if (err.error_description) message = err.error_description;
         else message = JSON.stringify(err);
      } else if (typeof err === 'string') {
         message = err;
      }

      if (message.includes("Email not confirmed")) {
        message = "📧 Email not confirmed. Please check your inbox.";
      } else if (message.includes("Invalid login credentials")) {
        message = "🔒 Invalid credentials. Check password or create an account.";
        isCredError = true;
      } else if (message.includes("Failed to fetch") || message.includes("Network request failed")) {
          message = "⚠️ Connection Error: Unable to reach server.";
      }
      
      // Always show offline option on error to allow entry
      setShowOfflineOption(true);
      setErrorMsg(message);

      // UX Improvement: If they get cred error on signin, it might mean they need to signup
      if (isCredError && mode === 'signin') {
          setTimeout(() => {
              if (confirm("If you don't have an account yet, would you like to create one?")) {
                  setMode('signup');
                  setErrorMsg('');
              }
          }, 1000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 overflow-y-auto custom-scroll relative">
      {/* Background */}
      <div className="fixed inset-0 bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20starry%20night%20city%20silhouette?width=1200&height=800&nologo=true')] bg-cover bg-center pointer-events-none"></div>
      <div className="fixed inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black pointer-events-none"></div>

      {/* --- HERO SECTION --- */}
      <div className="relative z-10 w-full min-h-[90vh] flex flex-col md:flex-row items-center justify-center p-6 gap-12 max-w-7xl mx-auto">
        
        {/* Left: Intro Copy */}
        <div className="flex-1 text-center md:text-left pt-12 md:pt-0">
           <h1 className="text-5xl md:text-7xl font-retro text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 drop-shadow-[4px_4px_0_rgba(0,0,0,1)] leading-tight mb-4 animate-slide-in">
             THE JOURNEY
           </h1>
           <p className="text-xl md:text-2xl text-gray-300 font-serif mb-6 max-w-lg mx-auto md:mx-0 animate-fade-in">
             A Spiritual RPG. Walk the ancient paths, overcome sin through prayer, and build your eternal legacy.
           </p>
           
           <div className="flex flex-wrap gap-3 justify-center md:justify-start animate-slide-up mb-6 font-mono text-xs text-gray-400">
              <div className="flex items-center gap-1 text-blue-300 hover:text-blue-200 transition-colors">
                 <span>🎮</span> Gamified Faith
              </div>
              <span className="hidden md:inline text-gray-700">|</span>
              <div className="flex items-center gap-1 text-green-300 hover:text-green-200 transition-colors">
                 <span>🛒</span> Marketplace Live
              </div>
              <span className="hidden md:inline text-gray-700">|</span>
              <div className="flex items-center gap-1 text-purple-300 hover:text-purple-200 transition-colors">
                 <span>📺</span> Live Ministry
              </div>
           </div>

           {/* Stats & Store Badge Row */}
           <div className="flex flex-row items-center gap-3 overflow-x-auto max-w-full pb-2 mb-8 no-scrollbar animate-fade-in justify-center md:justify-start">
               {/* Stats Group */}
               <div className="flex items-center gap-4 bg-gray-900/80 p-3 rounded-xl border border-gray-700 shrink-0 shadow-lg">
                   <div>
                       <p className="text-gray-500 text-[9px] uppercase font-bold leading-none tracking-wider">Pilgrims</p>
                       <p className="text-lg font-retro text-white leading-none mt-1">{globalStats.users.toLocaleString()}</p>
                   </div>
                   <div className="w-px h-6 bg-gray-700"></div>
                   <div>
                       <p className="text-gray-500 text-[9px] uppercase font-bold leading-none tracking-wider">Spirit XP</p>
                       <p className="text-lg font-retro text-yellow-500 leading-none mt-1">{(globalStats.xp).toLocaleString()}</p>
                   </div>
               </div>

               {/* Google Play Badge */}
               <div className="flex items-center gap-2 bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-600 px-3 py-2 rounded-xl shrink-0 shadow-lg hover:border-gray-500 transition-colors cursor-default">
                  <div className="text-xl">🤖</div>
                  <div className="flex flex-col">
                      <span className="text-[8px] text-gray-400 uppercase leading-none tracking-wider">Soon On</span>
                      <span className="text-xs text-white font-bold leading-none mt-0.5">Google Play</span>
                  </div>
               </div>
           </div>

        </div>

        {/* Right: Auth Form */}
        <div className="flex-1 w-full max-w-md">
          <div className="bg-gray-800/90 backdrop-blur-md p-8 rounded-xl border-4 border-yellow-600 pixel-shadow w-full animate-fade-in shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-retro text-yellow-500 mb-2">{t('welcome')}</h2>
              <p className="text-gray-400 font-serif text-sm">
                {mode === 'signin' ? 'Resume your pilgrimage.' : 'Create your soul record.'}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              
              {/* Language Selector */}
              <div className="flex justify-center gap-2 mb-4">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setSelectedLanguage(lang.code)}
                    className={`
                      text-lg w-8 h-8 rounded border transition-transform hover:scale-110
                      ${selectedLanguage === lang.code ? 'bg-yellow-900 border-yellow-500' : 'bg-gray-900 border-gray-600 opacity-60'}
                    `}
                    title={lang.name}
                  >
                    {lang.flag}
                  </button>
                ))}
              </div>

              {mode === 'signup' && (
                <div className="space-y-4">
                  <div className="relative">
                     <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded font-bold uppercase animate-pulse shadow-md z-10 whitespace-nowrap">
                        Select Your Genesis Avatar
                     </div>
                     <div className="grid grid-cols-6 gap-2 pt-2">
                        {AVATARS.map((avatar, idx) => (
                          <div 
                            key={idx}
                            onClick={() => setSelectedAvatar(avatar)}
                            className={`cursor-pointer rounded border transition-all relative group ${selectedAvatar === avatar ? 'border-yellow-500 ring-2 ring-yellow-500/50 transform scale-110 z-10' : 'border-gray-700 opacity-60 hover:opacity-100 hover:scale-105'}`}
                          >
                            <img src={avatar} className="w-full h-full object-cover rounded-sm" />
                          </div>
                        ))}
                     </div>
                  </div>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={15}
                    placeholder="Pilgrim Name..."
                    className="w-full bg-black text-white p-3 border-2 border-gray-600 focus:border-yellow-500 outline-none font-mono text-sm"
                    required
                  />
                  <input 
                    type="text" 
                    value={referralInput}
                    onChange={(e) => setReferralInput(e.target.value)}
                    placeholder="Referral Code (Optional)"
                    className="w-full bg-black text-green-300 p-2 border-2 border-green-900 focus:border-green-500 outline-none font-mono text-xs uppercase"
                  />
                </div>
              )}

              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full bg-black text-white p-3 border-2 border-gray-600 focus:border-yellow-500 outline-none font-mono text-sm"
                required
              />

              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-black text-white p-3 border-2 border-gray-600 focus:border-yellow-500 outline-none font-mono text-sm"
                required
                minLength={6}
              />

              {errorMsg && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 p-2 text-xs text-center rounded">
                  {errorMsg}
                  {showOfflineOption && (
                      <button type="button" onClick={handleOfflineLogin} className="block w-full mt-2 underline font-bold">
                          PLAY OFFLINE
                      </button>
                  )}
                </div>
              )}
              
              {successMsg && <div className="bg-green-900/50 border border-green-500 text-green-200 p-2 text-xs text-center rounded">{successMsg}</div>}

              <Button type="submit" className="w-full py-3" disabled={isLoading}>
                {isLoading ? 'Connecting...' : (mode === 'signin' ? 'Enter World' : 'Begin Journey')}
              </Button>

              <div className="text-center">
                <button 
                  type="button"
                  onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setErrorMsg(''); }}
                  className="text-yellow-500 text-xs hover:underline font-mono"
                >
                  {mode === 'signin' ? "Need a soul record? Create one." : "Have an identity? Login."}
                </button>
              </div>
              
              <div className="text-center pt-2">
                 <button type="button" onClick={handleOfflineLogin} className="text-gray-600 text-[10px] hover:text-gray-400 uppercase tracking-widest">
                    Guest Mode
                 </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* --- FEATURES SECTION --- */}
      <div className="relative z-10 bg-gray-900 border-t border-gray-800">
         <div className="max-w-6xl mx-auto p-8 md:p-16">
            <div className="text-center mb-12">
               <h2 className="text-3xl font-retro text-white mb-4">Discover The Path</h2>
               <div className="w-24 h-1 bg-yellow-500 mx-auto"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {/* Feature 1 */}
               <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-blue-500 transition-colors group">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📜</div>
                  <h3 className="text-xl font-bold text-white mb-2">Living Scriptures</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                     Engage with the Bible like never before. 3D scenes, interactive devotionals, and AI-guided reflection bring the Word to life.
                  </p>
               </div>
               
               {/* Feature 2 - Daily Bread */}
               <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-yellow-500 transition-colors group">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🍞</div>
                  <h3 className="text-xl font-bold text-white mb-2">Daily Bread</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                     Start each day with a curated devotional and prayer focus. Build a streak of faithfulness and earn XP.
                  </p>
               </div>

               {/* Feature 3 - Bible Plans */}
               <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-green-500 transition-colors group">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🌱</div>
                  <h3 className="text-xl font-bold text-white mb-2">Bible Plans</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                     Follow structured reading plans or generate custom AI schedules tailored to your spiritual needs.
                  </p>
               </div>

               {/* Feature 4 */}
               <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-red-500 transition-colors group">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📺</div>
                  <h3 className="text-xl font-bold text-white mb-2">Journey TV</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                     A curated feed of Christian content, live worship streams, and community broadcasts. Watch, share, and grow together.
                  </p>
               </div>
               
               {/* Feature 5 */}
               <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-orange-500 transition-colors group">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🔥</div>
                  <h3 className="text-xl font-bold text-white mb-2">Faith Community</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                     Join guilds, prayer groups, and missions. Connect with believers worldwide in a safe, moderated environment.
                  </p>
               </div>

               {/* Feature 6 - NFT Gallery */}
               <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-purple-500 transition-colors group">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🛒</div>
                  <h3 className="text-xl font-bold text-white mb-2">Avatar Marketplace</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                     Buy and trade unique spiritual identities. <strong>XP Infusion</strong> allows sellers to invest power into avatars, transferring rank to buyers.
                  </p>
               </div>
            </div>
         </div>
      </div>

      {/* --- ECONOMY & FUTURE SECTION --- */}
      <div className="relative z-10 bg-black py-16">
         <div className="max-w-5xl mx-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
               
               {/* Text Side */}
               <div>
                  <h2 className="text-3xl md:text-4xl font-retro text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 mb-6">
                     The Spirit Economy
                  </h2>
                  
                  <div className="space-y-6">
                     <div className="flex gap-4">
                        <div className="bg-gray-900 w-12 h-12 rounded flex items-center justify-center text-2xl border border-gray-700">⚡</div>
                        <div>
                           <h4 className="text-white font-bold">Earn XP (Spirit Points)</h4>
                           <p className="text-gray-400 text-sm mt-1">
                              Every prayer, verse collected, and level cleared awards Spirit XP. Build your rank from <span className="text-yellow-500">Wanderer</span> to <span className="text-yellow-500">Saint</span>.
                           </p>
                        </div>
                     </div>

                     <div className="flex gap-4">
                        <div className="bg-gray-900 w-12 h-12 rounded flex items-center justify-center text-2xl border border-gray-700">🎨</div>
                        <div>
                           <h4 className="text-white font-bold">Avatar Studio</h4>
                           <p className="text-gray-400 text-sm mt-1">
                              Use your XP to forge unique, AI-generated profile identities as NFT Collections. Unlock distinct styles based on your Archetype Class.
                           </p>
                        </div>
                     </div>

                     <div className="flex gap-4">
                        <div className="bg-gray-900 w-12 h-12 rounded flex items-center justify-center text-2xl border border-gray-700">🪙</div>
                        <div>
                           <h4 className="text-white font-bold">Future Integration: $JOURNEY</h4>
                           <p className="text-gray-400 text-sm mt-1">
                              An upcoming utility token on Solana to reward the faithful. Participate in governance and exclusive charity events.
                           </p>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Visual Side */}
               <div className="relative">
                  <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full"></div>
                  <div className="bg-gray-900 border-4 border-green-900 rounded-xl p-6 relative pixel-shadow rotate-3 transform hover:rotate-0 transition-transform duration-500">
                     <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
                        <span className="font-retro text-green-400 text-xs">ASSET PREVIEW</span>
                        <span className="text-[10px] text-gray-500 font-mono">ID: #8821A</span>
                     </div>
                     <div className="grid grid-cols-2 gap-4 mb-4">
                        <img src="https://image.pollinations.ai/prompt/pixel%20art%20gold%20coin%20gem?width=150&height=150&nologo=true" className="rounded border border-gray-700" />
                        <img src="https://image.pollinations.ai/prompt/pixel%20art%20angel%20avatar%20glowing?width=150&height=150&nologo=true" className="rounded border border-gray-700" />
                     </div>
                     <div className="bg-black p-3 rounded font-mono text-xs text-green-300">
                        {'>'} Status: Gathering Data...<br/>
                        {'>'} Community: Growing<br/>
                        {'>'} Launch: Imminent
                     </div>
                  </div>
               </div>

            </div>
         </div>
      </div>

      {/* Footer / Update Log */}
      <footer className="relative z-10 bg-gray-900 border-t border-gray-800 py-8 text-center">
         <div className="max-w-4xl mx-auto px-6 mb-8">
             <h4 className="text-gray-500 text-xs font-bold uppercase mb-4 tracking-widest border-b border-gray-700 pb-2">Patch Notes v1.2.0</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                 <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
                     <span className="text-green-400 font-bold text-xs block mb-1">New Features</span>
                     <ul className="list-disc pl-4 text-xs text-gray-400">
                         <li>Avatar Studio: Forge unique NFT Identities</li>
                         <li>Marketplace: Trade avatars & inherit XP power</li>
                         <li>Spiritual Disciplines (Activities) Renamed</li>
                     </ul>
                 </div>
                 <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
                     <span className="text-blue-400 font-bold text-xs block mb-1">Improvements</span>
                     <ul className="list-disc pl-4 text-xs text-gray-400">
                         <li>Global Stats Tracker on Login</li>
                         <li>Enhanced Journal with Collection Tags</li>
                         <li>Updated 3D Scene Rendering</li>
                     </ul>
                 </div>
             </div>
         </div>

         <p className="text-gray-500 text-xs font-mono mb-2">© 2025 THE JOURNEY PROJECT. BUILT ON FAITH.</p>
         <div className="flex justify-center gap-4 text-xs text-gray-600">
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Support</a>
         </div>
      </footer>

    </div>
  );
};

export default AuthView;
