
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { supabase } from '../lib/supabase';
import { User, Raffle } from '../types';
import { AudioSystem } from '../utils/audio';
import { GoogleGenAI } from "@google/genai";

interface AdminViewProps {
  currentUser: User;
  onBack: () => void;
}

const AdminView: React.FC<AdminViewProps> = ({ currentUser, onBack }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'raffles' | 'broadcast'>('overview');
  const [loading, setLoading] = useState(false);

  // Data States
  const [users, setUsers] = useState<any[]>([]);
  const [raffles, setRaffles] = useState<any[]>([]); // Using any for extended raffle fields
  const [stats, setStats] = useState<any>(null);
  
  // Action States
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal States
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [grantAmount, setGrantAmount] = useState(100);
  const [grantReason, setGrantReason] = useState('Community Reward');
  const [roleAction, setRoleAction] = useState<'grant_xp' | 'change_role'>('grant_xp');
  
  // Raffle Form
  const [newRaffle, setNewRaffle] = useState({
      title: '',
      description: '',
      entryFee: 50,
      prizeXp: 1000,
      winners: 1,
      durationHours: 24,
      image: 'https://image.pollinations.ai/prompt/pixel%20art%20treasure%20chest%20holy?width=400&height=300&nologo=true',
      actionLink: '',
      actionLabel: 'Follow on X'
  });

  useEffect(() => {
    if (activeTab === 'overview') fetchStats();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'raffles') fetchRaffles();
  }, [activeTab]);

  const fetchStats = async () => {
      const { data } = await supabase.rpc('get_treasury_dashboard_stats');
      setStats(data);
  };

  const fetchUsers = async () => {
    setLoading(true);
    let query = supabase.from('users').select('*').order('joined_date', { ascending: false }).limit(50);
    if (searchQuery) {
        query = supabase.from('users').select('*').ilike('username', `%${searchQuery}%`).limit(20);
    }
    const { data } = await query;
    if (data) setUsers(data);
    setLoading(false);
  };

  const fetchRaffles = async () => {
      const { data } = await supabase.from('raffles').select('*').order('created_at', { ascending: false });
      if (data) setRaffles(data);
  };

  // --- ACTIONS ---

  const handleGrantXP = async () => {
      if (!selectedUser || !grantAmount) return;
      
      try {
          const { error } = await supabase.rpc('admin_grant_xp', {
              p_target_user_id: selectedUser.id,
              p_amount: grantAmount,
              p_reason: grantReason
          });

          if (error) throw error;

          alert(`Successfully granted ${grantAmount} XP to ${selectedUser.username}`);
          setSelectedUser(null);
          fetchUsers(); // Refresh list
          AudioSystem.playAchievement();
      } catch (e: any) {
          alert("Grant Failed: " + e.message);
      }
  };

  const handlePromoteUser = async (newRole: string) => {
      if (!selectedUser) return;
      if (!confirm(`Are you sure you want to set ${selectedUser.username} as ${newRole.toUpperCase()}?`)) return;

      try {
          const { error } = await supabase.rpc('promote_user', {
              p_target_id: selectedUser.id,
              p_new_role: newRole
          });

          if (error) throw error;

          alert(`User role updated to ${newRole}`);
          setSelectedUser(null);
          fetchUsers();
          AudioSystem.playVoxelTap();
      } catch (e: any) {
          alert("Promotion Failed: " + e.message);
      }
  };

  const handleCreateRaffle = async () => {
      if (!newRaffle.title || !newRaffle.description) {
          return alert("Please fill in Title and Description.");
      }
      
      setLoading(true);
      try {
          const endTime = new Date(Date.now() + newRaffle.durationHours * 60 * 60 * 1000).toISOString();
          
          // Base payload with columns guaranteed to exist
          const basePayload: any = {
              sponsor_name: 'The Sanctuary',
              title: newRaffle.title,
              description: newRaffle.description,
              image: newRaffle.image,
              entry_fee: newRaffle.entryFee,
              winners_count: newRaffle.winners,
              end_time: endTime,
              status: 'active'
          };

          // Optimistic Payload - try to insert everything including new optional fields
          const fullPayload = { ...basePayload };
          if (newRaffle.prizeXp > 0) fullPayload.prize_xp = newRaffle.prizeXp;
          if (newRaffle.actionLink) {
              fullPayload.action_link = newRaffle.actionLink;
              fullPayload.action_label = newRaffle.actionLabel || 'Visit Sponsor';
          }
          
          // 1. Attempt Full Insert
          let { data, error } = await supabase.from('raffles').insert(fullPayload).select();

          // 2. Fallback Logic: Handle schema mismatches if DB migration hasn't run
          if (error) {
              console.warn("Primary insert failed (Checking Schema Fallbacks...)", error);
              
              // Fallback A: Try removing Action Link columns
              if (fullPayload.action_link) {
                  const noLinkPayload = { ...fullPayload };
                  delete noLinkPayload.action_link;
                  delete noLinkPayload.action_label;
                  
                  const retry1 = await supabase.from('raffles').insert(noLinkPayload).select();
                  if (!retry1.error) {
                      error = null; // Recovered
                  } else {
                      error = retry1.error; // Keep new error
                  }
              }

              // Fallback B: If error still exists, try removing prize_xp
              if (error && fullPayload.prize_xp) {
                  const minimalPayload = { ...basePayload }; // Revert to safe base
                  const retry2 = await supabase.from('raffles').insert(minimalPayload).select();
                  if (!retry2.error) {
                      error = null; // Recovered
                  } else {
                      error = retry2.error;
                  }
              }
          }

          if (error) throw error;

          // Broadcast Logic
          const broadcastText = `🎟️ NEW RAFFLE: "${newRaffle.title}"! ${newRaffle.prizeXp > 0 ? `Prize Pool: ${newRaffle.prizeXp} XP.` : ''} Enter now in the Raffles tab.`;
          
          try {
            await supabase.from('chat_messages').insert({
                user_id: currentUser.id, 
                username: 'SANCTUARY_HERALD',
                avatar: 'https://image.pollinations.ai/prompt/pixel%20art%20angel%20trumpet%20gold?width=50&height=50&nologo=true',
                message: broadcastText,
                type: 'milestone'
            });
          } catch (chatErr) {
            console.error("Broadcast failed (non-fatal):", chatErr);
          }

          AudioSystem.playAchievement();
          alert("Official Raffle Created & Broadcasted Successfully!");
          
          fetchRaffles();
          // Reset form basics
          setNewRaffle({ 
              ...newRaffle, title: '', description: '', actionLink: '', actionLabel: 'Follow on X'
          });
      } catch (e: any) {
          console.error("Raffle Launch Error:", e);
          let errorMessage = "Unknown error occurred.";
          
          // Better error serialization
          if (e && typeof e === 'object') {
              errorMessage = e.message || e.details || JSON.stringify(e);
          } else if (typeof e === 'string') {
              errorMessage = e;
          }
          
          alert("Error launching raffle: " + errorMessage);
      } finally {
          setLoading(false);
      }
  };

  const handleDrawRaffle = async (raffle: any) => {
      if (!confirm(`Draw winners for "${raffle.title}"? If Prize XP is set, it will be paid out from the Treasury.`)) return;

      setLoading(true);
      try {
          // 1. Get Participants
          const { data: participants } = await supabase.from('raffle_participants').select('user_id, weight, users(username)').eq('raffle_id', raffle.id);
          
          if (!participants || participants.length === 0) return alert("No participants found.");

          // 2. Weighted Draw Logic
          let totalWeight = participants.reduce((acc, p) => acc + (p.weight || 1), 0);
          let winners: string[] = [];
          let winnerNames: string[] = [];
          let pool = [...participants];

          for(let i=0; i < raffle.winners_count && pool.length > 0; i++) {
              let r = Math.random() * totalWeight;
              let accum = 0;
              for(let j=0; j < pool.length; j++) {
                  accum += (pool[j].weight || 1);
                  if (r <= accum) {
                      winners.push(pool[j].user_id);
                      winnerNames.push((pool[j].users as any).username);
                      totalWeight -= (pool[j].weight || 1);
                      pool.splice(j, 1);
                      break;
                  }
              }
          }

          // 3. Treasury Payout (If Prize XP set)
          if (raffle.prize_xp > 0) {
              const prizePerWinner = Math.floor(raffle.prize_xp / winners.length);
              for (const winnerId of winners) {
                  const { error: payoutErr } = await supabase.rpc('treasury_payout', {
                      p_target_user_id: winnerId,
                      p_amount: prizePerWinner,
                      p_source_id: raffle.id,
                      p_reason: `Winner of ${raffle.title}`
                  });
                  if (payoutErr) console.error("Payout failed for winner", winnerId, payoutErr);
              }
          }

          // 4. Update DB
          await supabase.from('raffles').update({ status: 'drawn', winner_ids: winners }).eq('id', raffle.id);

          // 5. Generate Announcement
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `Announce the winners of the "${raffle.title}" raffle. Winners: ${winnerNames.join(', ')}. Prize pool was ${raffle.prize_xp || 0} Spirit XP. Keep it majestic and brief.`;
          const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });

          // 6. Broadcast
          await supabase.from('chat_messages').insert({
              user_id: currentUser.id,
              username: 'SANCTUARY_HERALD',
              message: `🎺 RAFFLE RESULTS: ${response.text}`,
              type: 'milestone'
          });

          alert("Winners Selected & Payouts Processed!");
          fetchRaffles();

      } catch (e: any) {
          console.error("Draw Error", e);
          const msg = e.message || (typeof e === 'object' ? JSON.stringify(e) : String(e));
          alert("Draw failed: " + msg);
      } finally {
          setLoading(false);
      }
  };

  const sendBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    try {
        await supabase.from('chat_messages').insert({
            user_id: currentUser.id,
            username: 'SYSTEM',
            avatar: 'https://image.pollinations.ai/prompt/pixel%20art%20shield%20icon%20gold?width=50&height=50&nologo=true',
            message: `[ADMIN ALERT]: ${broadcastMsg}`,
            type: 'milestone'
        });
        setBroadcastMsg('');
        alert("Broadcast Sent.");
    } catch (e: any) {
        alert("Broadcast failed: " + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-green-400 font-mono p-4 pt-20 flex flex-col items-center">
      
      <div className="w-full max-w-7xl bg-black border-2 border-green-800 rounded-lg shadow-[0_0_50px_rgba(0,255,0,0.1)] overflow-hidden min-h-[80vh] flex flex-col md:flex-row">
        
        {/* SIDEBAR */}
        <div className="w-full md:w-64 bg-gray-900 border-r-2 border-green-800 p-4 flex flex-col gap-2 shrink-0">
            <div className="mb-8 p-2 border border-green-800 text-center">
                <h1 className="font-bold text-xl font-retro text-green-500">ADMIN CORE</h1>
                <p className="text-[10px] text-green-700">v9.5.0 // SOVEREIGN</p>
            </div>

            <button onClick={() => setActiveTab('overview')} className={`text-left p-3 hover:bg-green-900/30 transition-colors border-l-4 ${activeTab === 'overview' ? 'border-green-500 bg-green-900/20' : 'border-transparent text-gray-500'}`}>
                📊 OVERVIEW
            </button>
            <button onClick={() => setActiveTab('users')} className={`text-left p-3 hover:bg-green-900/30 transition-colors border-l-4 ${activeTab === 'users' ? 'border-green-500 bg-green-900/20' : 'border-transparent text-gray-500'}`}>
                👥 USER MGMT
            </button>
            <button onClick={() => setActiveTab('raffles')} className={`text-left p-3 hover:bg-green-900/30 transition-colors border-l-4 ${activeTab === 'raffles' ? 'border-green-500 bg-green-900/20' : 'border-transparent text-gray-500'}`}>
                🎟️ RAFFLE CONTROL
            </button>
            <button onClick={() => setActiveTab('broadcast')} className={`text-left p-3 hover:bg-green-900/30 transition-colors border-l-4 ${activeTab === 'broadcast' ? 'border-green-500 bg-green-900/20' : 'border-transparent text-gray-500'}`}>
                📣 BROADCAST
            </button>

            <div className="mt-auto">
                <Button onClick={onBack} variant="secondary" className="w-full text-xs">EXIT TERMINAL</Button>
            </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 p-6 overflow-y-auto custom-scroll relative">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white border-b border-gray-800 pb-2">SYSTEM STATUS</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gray-900 p-6 border border-green-900 rounded-xl">
                            <p className="text-xs text-gray-500 uppercase">Treasury Balance</p>
                            <p className="text-3xl font-bold text-yellow-500">{stats?.balance?.toLocaleString() || 0}</p>
                        </div>
                        <div className="bg-gray-900 p-6 border border-green-900 rounded-xl">
                            <p className="text-xs text-gray-500 uppercase">Total Circulation</p>
                            <p className="text-3xl font-bold text-blue-500">{stats?.circulation?.toLocaleString() || 0}</p>
                        </div>
                        <div className="bg-gray-900 p-6 border border-green-900 rounded-xl">
                            <p className="text-xs text-gray-500 uppercase">Total Transactions</p>
                            <p className="text-3xl font-bold text-white">{stats?.tx_count?.toLocaleString() || 0}</p>
                        </div>
                    </div>
                    
                    <div className="bg-gray-900 p-6 border border-green-900 rounded-xl">
                        <h3 className="text-sm font-bold text-white mb-4">RECENT LEDGER ACTIVITY</h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-xs">
                            {stats?.transactions?.map((tx: any) => (
                                <div key={tx.id} className="flex justify-between border-b border-gray-800 pb-1">
                                    <span className="text-gray-400">{new Date(tx.created_at).toLocaleTimeString()}</span>
                                    <span className="text-blue-400">{tx.type}</span>
                                    <span className="text-yellow-500">+{tx.amount} XP</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* USERS TAB */}
            {activeTab === 'users' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                        <h2 className="text-2xl font-bold text-white">USER DIRECTORY</h2>
                        <input 
                            type="text" 
                            placeholder="Search User..." 
                            className="bg-black border border-green-800 p-2 text-xs w-64 rounded text-white"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); fetchUsers(); }}
                        />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-gray-900 text-gray-400">
                                <tr>
                                    <th className="p-3">User</th>
                                    <th className="p-3">Role</th>
                                    <th className="p-3">Balance</th>
                                    <th className="p-3">Joined</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} className="border-b border-gray-800 hover:bg-gray-900">
                                        <td className="p-3">
                                            <div className="font-bold text-white">{u.username}</div>
                                            <div className="text-[10px] text-gray-600">{u.id}</div>
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded ${u.role === 'admin' ? 'bg-red-900 text-red-300' : 'bg-blue-900 text-blue-300'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="p-3 font-mono text-yellow-500">{u.total_points.toLocaleString()}</td>
                                        <td className="p-3 text-gray-500">{new Date(u.joined_date).toLocaleDateString()}</td>
                                        <td className="p-3 text-right">
                                            <button 
                                                onClick={() => { setSelectedUser(u); setRoleAction('grant_xp'); }}
                                                className="bg-green-900 hover:bg-green-800 text-green-300 px-3 py-1 rounded border border-green-700 mr-2"
                                            >
                                                MANAGE
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* RAFFLES TAB */}
            {activeTab === 'raffles' && (
                <div className="space-y-8">
                    <div className="bg-gray-900 p-6 border-l-4 border-yellow-500 rounded-r-xl">
                        <h3 className="text-white font-bold mb-4">CREATE OFFICIAL RAFFLE</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" placeholder="Raffle Title" className="bg-black border border-gray-700 p-2 text-white text-sm" value={newRaffle.title} onChange={e => setNewRaffle({...newRaffle, title: e.target.value})} />
                            
                            <div className="flex gap-2">
                                <input type="text" placeholder="Image URL (Optional)" className="flex-1 bg-black border border-gray-700 p-2 text-white text-sm" value={newRaffle.image} onChange={e => setNewRaffle({...newRaffle, image: e.target.value})} />
                                {newRaffle.image && <img src={newRaffle.image} className="w-10 h-10 object-cover border border-gray-600 rounded" alt="Preview" />}
                            </div>

                            <input type="number" placeholder="Entry Fee (XP)" className="bg-black border border-gray-700 p-2 text-white text-sm" value={newRaffle.entryFee} onChange={e => setNewRaffle({...newRaffle, entryFee: parseInt(e.target.value)})} />
                            <input type="number" placeholder="Prize Pool (XP)" className="bg-black border border-gray-700 p-2 text-white text-sm" value={newRaffle.prizeXp} onChange={e => setNewRaffle({...newRaffle, prizeXp: parseInt(e.target.value)})} />
                            
                            {/* Requirement Links */}
                            <input type="text" placeholder="Action Link (e.g. https://x.com/sponsor)" className="bg-black border border-gray-700 p-2 text-white text-sm" value={newRaffle.actionLink} onChange={e => setNewRaffle({...newRaffle, actionLink: e.target.value})} />
                            <input type="text" placeholder="Button Label (e.g. Follow on X)" className="bg-black border border-gray-700 p-2 text-white text-sm" value={newRaffle.actionLabel} onChange={e => setNewRaffle({...newRaffle, actionLabel: e.target.value})} />

                            <div className="flex gap-4 items-center">
                                <label className="text-xs text-gray-400">Winners:</label>
                                <input type="number" className="bg-black border border-gray-700 p-1 w-16 text-white text-sm" value={newRaffle.winners} onChange={e => setNewRaffle({...newRaffle, winners: parseInt(e.target.value)})} />
                                <label className="text-xs text-gray-400">Hours:</label>
                                <input type="number" className="bg-black border border-gray-700 p-1 w-16 text-white text-sm" value={newRaffle.durationHours} onChange={e => setNewRaffle({...newRaffle, durationHours: parseInt(e.target.value)})} />
                            </div>
                            <input type="text" placeholder="Description" className="bg-black border border-gray-700 p-2 text-white text-sm md:col-span-2" value={newRaffle.description} onChange={e => setNewRaffle({...newRaffle, description: e.target.value})} />
                            
                            <div className="md:col-span-2 flex justify-end">
                                <Button onClick={handleCreateRaffle} disabled={loading} className="bg-yellow-700 border-yellow-500 text-xs">
                                    {loading ? 'LAUNCHING...' : 'LAUNCH RAFFLE'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-white font-bold mb-4">ACTIVE & RECENT RAFFLES</h3>
                        <div className="grid grid-cols-1 gap-4">
                            {raffles.map(r => (
                                <div key={r.id} className="flex justify-between items-center bg-gray-900 p-4 border border-gray-800 rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <img src={r.image} className="w-10 h-10 rounded object-cover border border-gray-700" alt="" />
                                        <div>
                                            <h4 className="text-white font-bold text-sm">{r.title}</h4>
                                            <p className="text-xs text-gray-500">{r.participants_count} Entrants • Fee: {r.entry_fee} • Prize: {r.prize_xp || 0} XP</p>
                                            <p className="text-[10px] text-gray-600 font-mono">ID: {r.id}</p>
                                            {r.action_link && <span className="text-[9px] text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded">Link Required</span>}
                                        </div>
                                    </div>
                                    <div>
                                        {r.status === 'active' ? (
                                            <Button onClick={() => handleDrawRaffle(r)} disabled={loading} className="bg-blue-700 border-blue-500 text-xs">DRAW WINNER</Button>
                                        ) : (
                                            <span className="px-3 py-1 bg-gray-800 text-gray-500 text-xs rounded border border-gray-700">FINISHED</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* BROADCAST TAB */}
            {activeTab === 'broadcast' && (
                <div className="max-w-xl mx-auto mt-10">
                    <div className="bg-gray-900 p-6 border border-red-900/50 rounded-xl shadow-lg">
                        <h3 className="text-red-500 font-bold mb-4 font-retro">EMERGENCY BROADCAST SYSTEM</h3>
                        <textarea 
                            className="w-full bg-black border border-red-900 text-white p-4 h-32 outline-none focus:border-red-500 font-mono text-sm"
                            placeholder="Type system-wide alert message..."
                            value={broadcastMsg}
                            onChange={e => setBroadcastMsg(e.target.value)}
                        />
                        <Button onClick={sendBroadcast} className="w-full mt-4 bg-red-800 hover:bg-red-700 border-red-600">
                            TRANSMIT TO ALL CHANNELS
                        </Button>
                    </div>
                </div>
            )}

        </div>
      </div>

      {/* MANAGE USER MODAL */}
      {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="bg-gray-900 border-2 border-green-500 p-6 rounded-xl w-96 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-white font-bold">Manage {selectedUser.username}</h3>
                      <div className="flex gap-2">
                          <button onClick={() => setRoleAction('grant_xp')} className={`text-xs px-2 py-1 rounded ${roleAction === 'grant_xp' ? 'bg-green-700 text-white' : 'text-gray-500'}`}>XP</button>
                          <button onClick={() => setRoleAction('change_role')} className={`text-xs px-2 py-1 rounded ${roleAction === 'change_role' ? 'bg-blue-700 text-white' : 'text-gray-500'}`}>ROLE</button>
                      </div>
                  </div>

                  {roleAction === 'grant_xp' ? (
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs text-gray-400 mb-1">Amount</label>
                              <input type="number" value={grantAmount} onChange={e => setGrantAmount(parseInt(e.target.value))} className="w-full bg-black border border-gray-700 p-2 text-white" />
                          </div>
                          <div>
                              <label className="block text-xs text-gray-400 mb-1">Reason (Public Log)</label>
                              <input type="text" value={grantReason} onChange={e => setGrantReason(e.target.value)} className="w-full bg-black border border-gray-700 p-2 text-white" />
                          </div>
                          <div className="flex gap-2 pt-2">
                              <Button onClick={handleGrantXP} className="flex-1 bg-green-700 border-green-500">CONFIRM GRANT</Button>
                              <Button onClick={() => setSelectedUser(null)} variant="secondary" className="flex-1">CANCEL</Button>
                          </div>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          <p className="text-xs text-gray-400">Current Role: <span className="text-white font-bold uppercase">{selectedUser.role}</span></p>
                          <div className="grid grid-cols-1 gap-2">
                              <button onClick={() => handlePromoteUser('admin')} className="bg-red-900/50 border border-red-700 text-red-300 p-2 rounded hover:bg-red-800 transition-colors">PROMOTE TO ADMIN</button>
                              <button onClick={() => handlePromoteUser('user')} className="bg-blue-900/50 border border-blue-700 text-blue-300 p-2 rounded hover:bg-blue-800 transition-colors">DEMOTE TO USER</button>
                          </div>
                          <Button onClick={() => setSelectedUser(null)} variant="secondary" className="w-full mt-2">CANCEL</Button>
                      </div>
                  )}
              </div>
          </div>
      )}

    </div>
  );
};

export default AdminView;
