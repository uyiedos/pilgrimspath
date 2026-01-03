import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { AudioSystem } from '../utils/audio';

interface GlobalChatProps {
  user: User | null;
  onAddPoints?: (amount: number) => void;
  onUnlockAchievement?: (id: string) => void;
}

interface ChatMessage {
  id: string;
  user: string;
  avatar?: string;
  text: string;
  created_at: string;
  is_me?: boolean;
  reply_to_id?: string;
  reply_context?: { username: string, message: string };
  type?: 'chat' | 'milestone';
}

const GlobalChat: React.FC<GlobalChatProps> = ({ user, onAddPoints, onUnlockAchievement }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    fetchChatHistory();
    setupRealtime();

    return () => {
        if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [user]);

  useEffect(() => {
    if (showChat) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setUnreadCount(0);
    }
  }, [messages, showChat]);

  const fetchChatHistory = async () => {
    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (data && !error) {
        const history = data.reverse().map((msg: any) => ({
            id: msg.id,
            user: msg.username,
            avatar: msg.avatar,
            text: msg.message,
            created_at: msg.created_at,
            is_me: user ? msg.user_id === user.id : false,
            reply_to_id: msg.reply_to_id,
            reply_context: msg.reply_context,
            type: msg.type || 'chat'
        }));
        setMessages(history);
    }
  };

  const setupRealtime = () => {
    const channel = supabase.channel('public:chat_messages')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'chat_messages' 
        }, (payload) => {
            const newMsg = payload.new;
            
            setMessages((prev) => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                
                if (!showChat) {
                    setUnreadCount(c => c + 1);
                    AudioSystem.playMessage();
                }
                
                return [...prev, {
                    id: newMsg.id,
                    user: newMsg.username,
                    avatar: newMsg.avatar,
                    text: newMsg.message,
                    created_at: newMsg.created_at,
                    is_me: user ? newMsg.user_id === user.id : false,
                    reply_to_id: newMsg.reply_to_id,
                    reply_context: newMsg.reply_context,
                    type: newMsg.type || 'chat'
                }];
            });
        })
        .subscribe();
    
    channelRef.current = channel;
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const messageText = input.trim();
    const replyContext = replyTo ? { 
        username: replyTo.user, 
        message: replyTo.text.substring(0, 50) + (replyTo.text.length > 50 ? '...' : '') 
    } : null;
    const replyId = replyTo ? replyTo.id : null;

    setInput('');
    setReplyTo(null);
    AudioSystem.playVoxelTap();

    try {
        await supabase.from('chat_messages').insert({
            user_id: user.id,
            username: user.username,
            avatar: user.avatar,
            message: messageText,
            reply_to_id: replyId,
            reply_context: replyContext,
            type: 'chat'
        });
        
        // Grant small reward for participation
        if (onAddPoints) onAddPoints(5);
        if (onUnlockAchievement) onUnlockAchievement('socialite');

    } catch (err) {
        console.error("Failed to send message", err);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* FLOATING TOGGLE BUTTON - Adjusted to bottom-28 to clear mobile nav (20px) + margin */}
      <button 
        onClick={() => { setShowChat(!showChat); setUnreadCount(0); AudioSystem.playVoxelTap(); }} 
        className="fixed bottom-28 md:bottom-20 right-6 z-[100] w-16 h-16 bg-blue-600 hover:bg-blue-500 rounded-full shadow-[0_0_30px_rgba(37,99,235,0.4)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 border-4 border-white group"
        title="Sanctuary Chat"
      >
        <span className="text-3xl group-hover:rotate-12 transition-transform">💬</span>
        {unreadCount > 0 && !showChat && (
            <div className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-black animate-bounce shadow-lg">
                {unreadCount > 9 ? '9+' : unreadCount}
            </div>
        )}
      </button>

      {/* CHAT PANEL */}
      <div className={`fixed bottom-28 right-4 md:right-6 z-[100] w-[calc(100%-2rem)] md:w-96 h-[50vh] md:h-[60vh] bg-black/40 backdrop-blur-2xl border-4 border-blue-600/30 rounded-[3rem] shadow-2xl flex flex-col overflow-hidden transition-all duration-500 origin-bottom-right ${showChat ? 'scale-100 opacity-100 translate-y-0' : 'scale-0 opacity-0 pointer-events-none translate-y-10'}`}>
          <div className="bg-blue-600 p-5 flex justify-between items-center text-white cursor-pointer shadow-lg" onClick={() => setShowChat(false)}>
              <div className="flex items-center gap-3">
                  <span className="text-sm font-bold font-retro tracking-widest">SANctuary CHAT</span>
                  <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full text-[9px] font-bold border border-white/10">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(74,222,128,1)]"></span>
                    ONLINE
                  </span>
              </div>
              <button className="text-white/80 hover:text-white text-xl p-1">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs custom-scroll bg-white/5 no-scrollbar">
              {messages.length === 0 && (
                  <div className="text-center text-gray-500 mt-10 py-10 opacity-40 italic">
                      <p>The scroll is currently empty.</p>
                      <p className="text-[10px] mt-2 uppercase tracking-widest">Be the first to speak, pilgrim.</p>
                  </div>
              )}
              
              {messages.map(msg => (
                  <div key={msg.id} className={`flex gap-3 ${msg.is_me ? 'flex-row-reverse text-right' : ''} animate-fade-in`}>
                      {msg.avatar && (
                          <div className="w-9 h-9 rounded-xl border-2 border-white/10 overflow-hidden shrink-0 shadow-lg">
                              <img src={msg.avatar} className="w-full h-full object-cover" alt="" />
                          </div>
                      )}
                      <div className={`flex flex-col ${msg.is_me ? 'items-end' : 'items-start'} max-w-[80%]`}>
                          <span className={`font-bold text-[9px] mb-1 uppercase tracking-tighter ${msg.is_me ? 'text-yellow-400' : 'text-blue-400'}`}>
                            {msg.user}
                          </span>
                          
                          {msg.reply_context && (
                              <div className="mb-1 p-2 rounded-lg bg-white/5 border-l-2 border-white/20 text-[8px] text-gray-500 italic truncate w-full">
                                  @{msg.reply_context.username}: {msg.reply_context.message}
                              </div>
                          )}

                          <div 
                            onClick={() => !msg.is_me && setReplyTo(msg)}
                            className={`px-4 py-2.5 rounded-2xl break-words border border-white/10 backdrop-blur-md cursor-pointer transition-all hover:border-white/30 ${msg.type === 'milestone' ? 'bg-gradient-to-r from-yellow-600/30 to-orange-600/30 border-yellow-500/50 text-yellow-100 italic' : msg.is_me ? 'bg-blue-600/40 text-blue-50 shadow-lg' : 'bg-white/10 text-gray-200'}`}
                          >
                              {msg.text}
                          </div>
                          
                          <span className="text-[7px] text-gray-600 mt-1 uppercase font-mono">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                      </div>
                  </div>
              ))}
              <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendChat} className="p-4 bg-black/40 border-t border-white/10 space-y-3">
              {replyTo && (
                  <div className="flex justify-between items-center bg-blue-900/20 p-2 rounded-xl border border-blue-800/30">
                      <span className="text-[9px] text-blue-400 truncate">Replying to @{replyTo.user}</span>
                      <button onClick={() => setReplyTo(null)} className="text-gray-500 hover:text-white">✕</button>
                  </div>
              )}
              <div className="flex gap-2">
                <input 
                    type="text" 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)} 
                    placeholder="Scribe your heart..." 
                    className="flex-1 bg-black/60 border border-white/10 text-white p-4 rounded-2xl outline-none focus:border-blue-500 transition-all text-xs shadow-inner" 
                />
                <button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-2xl text-xs font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-50" 
                    disabled={!input.trim()}
                >
                    ➤
                </button>
              </div>
          </form>
      </div>
    </>
  );
};

export default GlobalChat;