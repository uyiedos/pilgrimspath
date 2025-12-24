
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { User, Raffle } from '../types';
import { supabase } from '../lib/supabase';
import { AudioSystem } from '../utils/audio';
import TicketPurchaseModal from './TicketPurchaseModal';

interface RafflesViewProps {
  user: User | null;
  onBack: () => void;
  onAddPoints: (amount: number) => void;
  onUnlockAchievement: (id: string) => void;
  onSync?: () => void;
}

const RafflesView: React.FC<RafflesViewProps> = ({ user, onBack, onAddPoints, onUnlockAchievement, onSync }) => {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Purchase Modal State
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);

  // Track entry counts: raffle_id -> count
  const [myEntries, setMyEntries] = useState<Record<string, number>>({});
  
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
    const { data, error } = await supabase
      .from('raffle_participants')
      .select('raffle_id, entry_count')
      .eq('user_id', user.id);
    
    if (data) {
        const entries: Record<string, number> = {};
        data.forEach((row: any) => {
            entries[row.raffle_id] = row.entry_count || 1;
        });
        setMyEntries(entries);
    }
  };

  const getDomainFromUrl = (url: string) => {
      try {
          const hostname = new URL(url).hostname;
          return hostname.replace('www.', '');
      } catch (e) {
          return 'Link';
      }
  };

  const handleVisitLink = (raffle: Raffle) => {
      if (!raffle.action_link) return;
      window.open(raffle.action_link, '_blank');
      AudioSystem.playVoxelTap();
      setVisitedLinks(prev => new Set(prev).add(raffle.id));
  };

  const handleOpenPurchase = (raffle: Raffle) => {
      if (!user) return alert("Please login to the sanctuary to participate.");
      if (user.id.startsWith('offline-')) return alert("Cloud sync required for raffles.");
      AudioSystem.playVoxelTap();
      setSelectedRaffle(raffle);
  };

  const handlePurchaseTickets = async (quantity: number) => {
    if (!user || !selectedRaffle) return;
    
    setIsProcessing(true);
    try {
        const { error } = await supabase.rpc('enter_official_raffle', {
            p_raffle_id: selectedRaffle.id,
            p_user_id: user.id,
            p_quantity: quantity
        });

        if (error) throw error;

        // Update local state immediately
        const newCount = (myEntries[selectedRaffle.id] || 0) + quantity;
        setMyEntries(prev => ({
            ...prev,
            [selectedRaffle.id]: newCount
        }));

        if (onSync) onSync();

        onUnlockAchievement('raffle_enter_1');
        AudioSystem.playAchievement();
        alert(`Success! ${quantity} Ticket(s) added to the urn.`);
        
        // Refresh raffle list to update total participant count
        fetchRaffles();
        setSelectedRaffle(null);
    } catch (err: any) {
        alert(err.message || "Entry failed. Please check your XP balance.");
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4 pt-20 md:p-8 flex flex-col items-center bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20shining%20golden%20hall%20angelic%20statues?width=1200&height=800&nologo=true')] bg-cover bg-center bg-fixed animate-fade-in custom-scroll">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm"></div>

      {/* TICKET PURCHASE MODAL */}
      {selectedRaffle && user && (
          <TicketPurchaseModal 
            title={selectedRaffle.title}
            pricePerTicket={selectedRaffle.entry_fee}
            userBalance={user.totalPoints || 0}
            onConfirm={handlePurchaseTickets}
            onClose={() => setSelectedRaffle(null)}
            isProcessing={isProcessing}
          />
      )}

      <div className="relative z-10 w-full max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 bg-gray-900/90 p-8 rounded-3xl border-b-4 border-blue-500 shadow-2xl">
            <div className="flex items-center gap-6">
                <div className="text-6xl animate-float">🎟️</div>
                <div>
                    <h1 className="text-3xl md:text-5xl font-retro text-blue-400 uppercase tracking-tighter">Partner Raffles</h1>
                    <p className="text-gray-400 font-mono text-xs md:text-sm mt-2 uppercase tracking-[0.2em]">Official Offerings & Spiritual Rewards</p>
                </div>
            </div>
            <Button onClick={onBack} variant="secondary">🏠 Return Home</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
            {loading ? (
                <div className="col-span-full py-32 text-center text-blue-400 font-retro animate-pulse">Scribing Holy Offerings...</div>
            ) : raffles.length === 0 ? (
                <div className="col-span-full py-32 text-center text-gray-600 bg-gray-900/30 rounded-3xl border-4 border-dashed border-gray-800">
                    <p className="font-serif italic text-xl">The registry of official gifts is quiet.</p>
                </div>
            ) : (
                raffles.map(raffle => {
                    const isDrawn = raffle.status === 'drawn';
                    const entryCount = myEntries[raffle.id] || 0;
                    const hasJoined = entryCount > 0;
                    const totalInvested = entryCount * raffle.entry_fee;
                    
                    const hasRequirement = !!raffle.action_link;
                    const requirementMet = hasJoined || !hasRequirement || visitedLinks.has(raffle.id);
                    
                    // Display Label Logic
                    let displayLabel = raffle.action_label || 'Visit Sponsor';
                    if (!raffle.action_label && raffle.action_link) {
                        displayLabel = `Visit ${getDomainFromUrl(raffle.action_link)}`;
                    } else if (displayLabel.toLowerCase().startsWith('http')) {
                         displayLabel = `Visit ${getDomainFromUrl(displayLabel)}`;
                    }

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
                                        <p className="text-[8px] text-gray-500 uppercase mb-1">Total Entries</p>
                                        <p className="text-sm font-retro text-blue-400">{raffle.participants_count}</p>
                                    </div>
                                </div>

                                <div className="mt-auto pt-6 border-t border-gray-800">
                                    {isDrawn ? (
                                        <div className="space-y-3 text-center">
                                            <p className="text-[10px] text-yellow-500 font-bold uppercase">WINNERS CHOSEN</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {/* Status Block - Always show if joined */}
                                            {hasJoined && (
                                                <div className="bg-green-900/20 py-2 px-3 rounded border border-green-800/50 mb-3 flex flex-col items-center animate-fade-in">
                                                    <span className="text-[10px] text-green-400 font-bold uppercase tracking-wide">
                                                        🎟️ You hold {entryCount} Ticket{entryCount > 1 ? 's' : ''}
                                                    </span>
                                                    <span className="text-[9px] text-green-600/80 font-mono mt-1">
                                                        Committed: {totalInvested.toLocaleString()} XP
                                                    </span>
                                                </div>
                                            )}

                                            {/* Action Link Button - Only show if not visited/joined */}
                                            {hasRequirement && !requirementMet && (
                                                <Button 
                                                    onClick={() => handleVisitLink(raffle)}
                                                    className={`w-full py-3 text-[10px] uppercase font-retro shadow-lg border-2 flex items-center justify-center overflow-hidden bg-blue-900 text-white border-blue-500 animate-pulse`}
                                                >
                                                    <span className="truncate px-2">
                                                      🔗 {displayLabel}
                                                    </span>
                                                </Button>
                                            )}
                                            
                                            {/* Visited Indicator */}
                                            {hasRequirement && requirementMet && !hasJoined && (
                                                <div className="text-center text-[10px] text-green-500 font-mono mb-2">
                                                    ✓ Link Visited
                                                </div>
                                            )}

                                            <Button 
                                                onClick={() => handleOpenPurchase(raffle)} 
                                                disabled={isProcessing || !requirementMet}
                                                className={`w-full py-3 shadow-lg flex items-center justify-center ${hasJoined ? 'bg-blue-600 hover:bg-blue-500 border-blue-400 text-white' : !requirementMet ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed' : 'bg-green-700 hover:bg-green-600 border-green-400 animate-glow'}`}
                                            >
                                                <span className="truncate px-2 text-[10px] font-retro uppercase">
                                                  {hasJoined ? 'BUY MORE TICKETS' : !requirementMet ? 'ACTION REQUIRED' : 'ENTER RAFFLE'}
                                                </span>
                                            </Button>
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
