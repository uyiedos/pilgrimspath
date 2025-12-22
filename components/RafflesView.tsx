
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { User, Raffle } from '../types';
import { supabase } from '../lib/supabase';
import { AudioSystem } from '../utils/audio';
import { GoogleGenAI } from "@google/genai";

interface RafflesViewProps {
  user: User | null;
  onBack: () => void;
  onAddPoints: (amount: number) => void;
  onUnlockAchievement: (id: string) => void;
}

const RafflesView: React.FC<RafflesViewProps> = ({ user, onBack, onAddPoints, onUnlockAchievement }) => {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  
  // Track if user has clicked/visited the requirement link for specific raffles locally
  const [visitedLinks, setVisitedLinks] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRaffles();
    if (user) fetchParticipation();
  }, [user]);

  const fetchRaffles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('raffles')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setRaffles(data);
    setLoading(false);
  };

  const fetchParticipation = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('raffle_participants')
      .select('raffle_id')
      .eq('user_id', user.id);
    if (data) setJoinedIds(new Set(data.map(d => d.raffle_id)));
  };

  const handleVisitLink = (raffle: Raffle) => {
      if (!raffle.action_link) return;
      window.open(raffle.action_link, '_blank');
      AudioSystem.playVoxelTap();
      setVisitedLinks(prev => new Set(prev).add(raffle.id));
  };

  const handleJoin = async (raffle: Raffle) => {
    if (!user) return alert("Login to participate in the sanctuary's gifts.");
    if (joinedIds.has(raffle.id)) return alert("You have already entered this raffle.");

    if (!confirm(`Enter this official raffle from ${raffle.sponsor_name} for ${raffle.entry_fee} XP? Winners will be contacted via email.`)) return;

    setIsProcessing(true);
    try {
        const { error } = await supabase.rpc('enter_official_raffle', {
            p_raffle_id: raffle.id,
            p_user_id: user.id
        });

        if (error) throw error;

        setJoinedIds(prev => new Set(prev).add(raffle.id));
        onAddPoints(0); 
        onUnlockAchievement('raffle_enter_1');
        AudioSystem.playVoxelTap();
        alert("Entry confirmed! Your digital trail is noted.");
        fetchRaffles();
    } catch (err: any) {
        alert(err.message || "Entry failed.");
    } finally {
        setIsProcessing(false);
    }
  };

  const drawRaffle = async (raffle: Raffle) => {
      if (raffle.status !== 'active') return;
      if (!user || user.role !== 'admin') return alert("Only the Sanctuary Priests (Admins) can draw official raffles.");
      
      setIsProcessing(true);
      try {
          const { data: participants } = await supabase
              .from('raffle_participants')
              .select('user_id, weight, user_email, users(username)')
              .eq('raffle_id', raffle.id);

          if (!participants || participants.length === 0) return alert("No pilgrims to select from.");

          // Weighted Draw
          let totalWeight = participants.reduce((acc, p) => acc + (p.weight || 1), 0);
          let winners: string[] = [];
          let winnerEmails: string[] = [];
          let winnerNames: string[] = [];
          let participantsCopy = [...participants];

          for(let i=0; i < raffle.winners_count && participantsCopy.length > 0; i++) {
              let random = Math.random() * totalWeight;
              let current = 0;
              for(let j=0; j < participantsCopy.length; j++) {
                  current += (participantsCopy[j].weight || 1);
                  if (random <= current) {
                      winners.push(participantsCopy[j].user_id);
                      winnerEmails.push(participantsCopy[j].user_email || 'hidden@mail.com');
                      winnerNames.push((participantsCopy[j].users as any).username);
                      totalWeight -= (participantsCopy[j].weight || 1);
                      participantsCopy.splice(j, 1);
                      break;
                  }
              }
          }

          // AI Narrative for Draw
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const aiResponse = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `An official raffle for "${raffle.title}" by ${raffle.sponsor_name} has just been drawn! Winners: ${winnerNames.join(", ")}. Provide a reverent, joyful proclamation to broadcast in the sanctuary chat. Mention that we will reach out via email.`
          });

          // Update Raffle
          await supabase.from('raffles').update({
              status: 'drawn',
              winner_ids: winners,
              winner_emails: winnerEmails
          }).eq('id', raffle.id);

          // Broadcast to chat
          await supabase.from('chat_messages').insert({
              user_id: user.id,
              username: 'SANCTUARY_HERALD',
              message: `🌟 OFFICIAL RAFFLE DRAWN: ${aiResponse.text}`,
              type: 'milestone'
          });

          AudioSystem.playLevelComplete();
          alert("Draw complete. The herald has spoken in the sanctuary chat.");
          fetchRaffles();
      } catch (e) {
          console.error(e);
          alert("Draw process failed.");
      } finally {
          setIsProcessing(false);
      }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4 pt-20 md:p-8 flex flex-col items-center bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20shining%20golden%20hall%20angelic%20statues?width=1200&height=800&nologo=true')] bg-cover bg-center bg-fixed animate-fade-in">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm"></div>

      <div className="relative z-10 w-full max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 bg-gray-900/90 p-8 rounded-3xl border-b-4 border-blue-500 shadow-2xl">
            <div className="flex items-center gap-6">
                <div className="text-6xl animate-float">🎟️</div>
                <div>
                    <h1 className="text-3xl md:text-5xl font-retro text-blue-400 uppercase tracking-tighter">Partner Raffles</h1>
                    <p className="text-gray-400 font-mono text-xs md:text-sm mt-2 uppercase tracking-[0.2em]">Official Offerings & Spiritual Rewards</p>
                    <p className="text-gray-500 text-[10px] mt-2 max-w-lg font-serif italic hidden md:block">
                        Exclusive opportunities from our ministry partners. Complete required actions to unlock entry. Prizes are distributed automatically.
                    </p>
                </div>
            </div>
            <Button onClick={onBack} variant="secondary">🏠 Return Home</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
            {loading ? (
                <div className="col-span-full py-32 text-center text-blue-400 font-retro animate-pulse">Scribing Holy Offerings...</div>
            ) : raffles.length === 0 ? (
                <div className="col-span-full py-32 text-center text-gray-600 bg-gray-900/30 rounded-3xl border-4 border-dashed border-gray-800">
                    <div className="text-7xl mb-4 opacity-20">📜</div>
                    <p className="font-serif italic text-xl">The registry of official gifts is quiet.</p>
                    <p className="text-xs mt-2 uppercase font-mono">Watch for updates from our faithful partners.</p>
                </div>
            ) : (
                raffles.map(raffle => {
                    const isDrawn = raffle.status === 'drawn';
                    const hasJoined = joinedIds.has(raffle.id);
                    const canDraw = user?.role === 'admin' && !isDrawn;
                    
                    // Requirement Check
                    const hasRequirement = !!raffle.action_link;
                    const requirementMet = hasJoined || !hasRequirement || visitedLinks.has(raffle.id);

                    // Determine label: If it's a URL or too long, default to "Go to Link" to save layout
                    const labelText = (raffle.action_label && !raffle.action_label.startsWith('http') && raffle.action_label.length < 25) 
                        ? raffle.action_label 
                        : 'Go to Link';

                    return (
                        <div key={raffle.id} className={`bg-gray-900/60 rounded-3xl overflow-hidden border-2 transition-all flex flex-col h-full backdrop-blur-md relative ${isDrawn ? 'border-gray-800 opacity-60' : 'border-blue-900 hover:border-blue-400 hover:translate-y-[-5px]'}`}>
                            <div className="h-44 bg-black relative">
                                <img src={raffle.image} className="w-full h-full object-cover opacity-60" />
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
                                <div className="absolute top-4 left-4 bg-blue-600/90 text-white text-[8px] px-2 py-0.5 rounded border border-blue-400 font-bold uppercase">
                                    {raffle.sponsor_name}
                                </div>
                            </div>
                            
                            <div className="p-6 flex-1 flex flex-col">
                                <h3 className="text-white font-retro text-lg mb-2 truncate uppercase">{raffle.title}</h3>
                                <p className="text-gray-500 text-sm italic font-serif leading-relaxed line-clamp-3 mb-6">"{raffle.description}"</p>
                                
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="bg-black/40 p-2 rounded-xl border border-gray-800 text-center">
                                        <p className="text-[8px] text-gray-500 uppercase mb-1">Fee</p>
                                        <p className="text-sm font-retro text-yellow-500">{raffle.entry_fee} XP</p>
                                    </div>
                                    <div className="bg-black/40 p-2 rounded-xl border border-gray-800 text-center">
                                        <p className="text-[8px] text-gray-500 uppercase mb-1">Winners</p>
                                        <p className="text-sm font-retro text-blue-400">{raffle.winners_count}</p>
                                    </div>
                                </div>

                                <div className="mt-auto pt-6 border-t border-gray-800">
                                    {isDrawn ? (
                                        <div className="space-y-3">
                                            <p className="text-[10px] text-yellow-500 font-bold uppercase text-center">ChOSEN SOULS</p>
                                            <div className="flex flex-wrap gap-2 justify-center">
                                                {raffle.winner_ids?.map((_, idx) => (
                                                    <span key={idx} className="text-[8px] bg-yellow-900/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-700">Winner #{idx + 1}</span>
                                                ))}
                                            </div>
                                            <p className="text-[8px] text-gray-600 text-center mt-2 font-mono">Emails secured for fulfillment.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {/* Action Link Button (if required and not joined/met) */}
                                            {hasRequirement && !hasJoined && (
                                                <Button 
                                                    onClick={() => handleVisitLink(raffle)}
                                                    className={`w-full py-3 text-[10px] uppercase font-retro shadow-lg border-2 flex items-center justify-center overflow-hidden ${requirementMet ? 'bg-gray-800 text-green-400 border-green-600' : 'bg-blue-900 text-white border-blue-500 animate-pulse'}`}
                                                >
                                                    <span className="truncate px-2">
                                                      {requirementMet ? `✓ Link Visited` : `🔗 ${labelText}`}
                                                    </span>
                                                </Button>
                                            )}

                                            <Button 
                                                onClick={() => handleJoin(raffle)} 
                                                disabled={isProcessing || hasJoined || !requirementMet}
                                                className={`w-full py-3 shadow-lg flex items-center justify-center ${hasJoined ? 'bg-gray-800 border-gray-600 text-gray-500' : !requirementMet ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed' : 'bg-green-700 hover:bg-green-600 border-green-400 animate-glow'}`}
                                            >
                                                <span className="truncate px-2 text-[10px] font-retro uppercase">
                                                  {hasJoined ? 'ENTRY RECORDED' : !requirementMet ? 'ACTION REQUIRED' : 'ENTER RAFFLE'}
                                                </span>
                                            </Button>
                                            
                                            {canDraw && (
                                                <button 
                                                    onClick={() => drawRaffle(raffle)}
                                                    disabled={isProcessing}
                                                    className="w-full text-red-500 text-[10px] uppercase font-retro hover:text-red-400 transition-colors border border-red-900/30 rounded py-1"
                                                >
                                                    [ADMIN] Draw Winners
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
      </div>
    </div>
  );
};

export default RafflesView;
