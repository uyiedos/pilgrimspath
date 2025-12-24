import React, { useState, useEffect, useRef } from 'react';
import Button from './Button';
import { SupportTicket, User, SupportMessage } from '../types';
import { UI_TEXT, LanguageCode, getTranslation } from '../translations';
import { supabase } from '../lib/supabase';
import { AudioSystem } from '../utils/audio';

interface SupportViewProps {
  user: User | null;
  tickets: SupportTicket[]; // Kept for interface compatibility, but we fetch fresh
  onCreateTicket: (ticket: SupportTicket) => void;
  onBack: () => void;
  language: LanguageCode;
}

const SupportView: React.FC<SupportViewProps> = ({ user, onCreateTicket, onBack, language }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('list');
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'account' | 'bug' | 'spiritual' | 'billing' | 'other'>('account');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Detail View State
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = (key: keyof typeof UI_TEXT['en']) => {
    return getTranslation(language, key);
  };

  useEffect(() => {
    if (user) {
        fetchMyTickets();
        
        // Subscribe to changes
        const subscription = supabase
            .channel('public:support_tickets')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets', filter: `user_id=eq.${user.id}` }, 
            (payload) => {
                fetchMyTickets(); // Refresh on update
            })
            .subscribe();

        return () => { supabase.removeChannel(subscription); }
    }
  }, [user]);

  // Scroll to bottom of chat when opening ticket
  useEffect(() => {
      if (selectedTicket) {
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
  }, [selectedTicket]);

  const fetchMyTickets = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('user_id', user.id)
          .order('last_updated', { ascending: false });
      
      if (data && !error) {
          // Map DB structure to Type
          const mapped: SupportTicket[] = data.map((t: any) => ({
              id: t.id,
              subject: t.subject,
              category: t.category,
              status: t.status,
              createdAt: t.created_at,
              lastUpdated: t.last_updated,
              messages: t.messages_json || []
          }));
          setMyTickets(mapped);
          
          // Update selected ticket if open
          if (selectedTicket) {
              const updatedSelected = mapped.find(t => t.id === selectedTicket.id);
              if (updatedSelected) setSelectedTicket(updatedSelected);
          }
      }
      setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!subject.trim() || !message.trim()) return;

    setIsSubmitting(true);
    AudioSystem.playVoxelTap();

    const ticketId = `#SUP-${Math.floor(1000 + Math.random() * 9000)}`;
    const timestamp = Date.now();
    
    const initialMessage: SupportMessage = {
        id: `msg-${timestamp}`,
        sender: 'user',
        text: message,
        timestamp: timestamp
    };

    const newTicketPayload = {
        id: ticketId,
        user_id: user.id,
        subject,
        category,
        status: 'open',
        created_at: timestamp,
        last_updated: timestamp,
        messages_json: [initialMessage]
    };

    try {
        const { error } = await supabase.from('support_tickets').insert(newTicketPayload);
        if (error) throw error;

        alert(`Ticket Created: ${ticketId}`);
        setSubject('');
        setMessage('');
        setActiveTab('list');
        fetchMyTickets();
        onCreateTicket(newTicketPayload as any); // Update parent state if needed
    } catch (e: any) {
        alert("Failed to create ticket: " + e.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedTicket || !replyMessage.trim()) return;
      setIsSubmitting(true);

      const newMessage: SupportMessage = {
          id: `msg-${Date.now()}`,
          sender: 'user',
          text: replyMessage,
          timestamp: Date.now()
      };

      try {
          const { error } = await supabase.rpc('reply_to_ticket', {
              p_ticket_id: selectedTicket.id,
              p_message_object: newMessage,
              p_new_status: 'open' // Re-open if admin closed it, or keep open
          });

          if (error) throw error;
          
          setReplyMessage('');
          fetchMyTickets();
          AudioSystem.playMessage();
      } catch (e: any) {
          alert("Reply failed: " + e.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'resolved': return 'bg-blue-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4 pt-20 md:p-8 md:pt-24 flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] animate-fade-in custom-scroll">
      
      <div className="max-w-4xl w-full bg-gray-800 rounded-xl border-2 border-gray-600 shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[80vh] relative">
        
        {/* MOBILE STICKY NAV */}
        <div className="md:hidden sticky top-0 z-30 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 p-2 flex gap-2 overflow-x-auto no-scrollbar">
           <button 
             onClick={() => { setActiveTab('list'); setSelectedTicket(null); }}
             className={`flex-1 py-2 px-4 rounded text-xs font-bold whitespace-nowrap border ${activeTab === 'list' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
           >
             {t('my_tickets')}
           </button>
           <button 
             onClick={() => { setActiveTab('create'); setSelectedTicket(null); }}
             className={`flex-1 py-2 px-4 rounded text-xs font-bold whitespace-nowrap border ${activeTab === 'create' ? 'bg-green-600 border-green-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
           >
             + {t('create_ticket')}
           </button>
           <Button onClick={onBack} variant="secondary" className="py-2 px-3 text-xs">✕</Button>
        </div>

        {/* DESKTOP SIDEBAR */}
        <div className="hidden md:flex w-64 bg-black/50 p-4 border-r border-gray-700 flex-col gap-2 shrink-0">
           <div className="mb-6">
             <h2 className="text-xl font-retro text-yellow-500 flex items-center gap-2">
               <span>🔧</span> {t('support_center')}
             </h2>
             <p className="text-gray-500 text-xs mt-1">Status: Online</p>
           </div>
           
           <button 
             onClick={() => { setActiveTab('list'); setSelectedTicket(null); }}
             className={`p-3 text-left rounded font-mono text-sm transition-colors ${activeTab === 'list' ? 'bg-blue-900 text-white border-l-4 border-blue-500' : 'text-gray-400 hover:bg-gray-800'}`}
           >
             {t('my_tickets')}
           </button>
           
           <button 
             onClick={() => { setActiveTab('create'); setSelectedTicket(null); }}
             className={`p-3 text-left rounded font-mono text-sm transition-colors ${activeTab === 'create' ? 'bg-green-900 text-white border-l-4 border-green-500' : 'text-gray-400 hover:bg-gray-800'}`}
           >
             + {t('create_ticket')}
           </button>

           <div className="mt-auto">
             <Button onClick={onBack} variant="secondary" className="w-full text-xs">
               ← {t('exit')}
             </Button>
           </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-gray-900/50 p-4 md:p-8 overflow-y-auto custom-scroll relative">
           
           {/* CREATE TICKET VIEW */}
           {activeTab === 'create' && (
             <div className="max-w-lg mx-auto animate-slide-up">
               <h3 className="text-2xl text-white font-bold mb-6 border-b border-gray-700 pb-2">{t('create_ticket')}</h3>
               <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                   <label className="block text-gray-400 text-xs uppercase mb-1">{t('category')}</label>
                   <select 
                     value={category}
                     onChange={(e) => setCategory(e.target.value as any)}
                     className="w-full bg-black text-white p-3 rounded border border-gray-600 focus:border-yellow-500 outline-none"
                   >
                     <option value="account">Account Issue</option>
                     <option value="bug">Report a Bug</option>
                     <option value="spiritual">Spiritual Guidance</option>
                     <option value="billing">Billing / Tokens</option>
                     <option value="other">Other</option>
                   </select>
                 </div>
                 
                 <div>
                   <label className="block text-gray-400 text-xs uppercase mb-1">{t('subject')}</label>
                   <input 
                     type="text" 
                     value={subject}
                     onChange={(e) => setSubject(e.target.value)}
                     className="w-full bg-black text-white p-3 rounded border border-gray-600 focus:border-yellow-500 outline-none"
                     placeholder="Brief summary of issue..."
                     required
                   />
                 </div>

                 <div>
                   <label className="block text-gray-400 text-xs uppercase mb-1">{t('message')}</label>
                   <textarea 
                     value={message}
                     onChange={(e) => setMessage(e.target.value)}
                     className="w-full bg-black text-white p-3 rounded border border-gray-600 focus:border-yellow-500 outline-none h-32"
                     placeholder="Describe your issue in detail..."
                     required
                   />
                 </div>

                 <div className="pt-4">
                   <Button type="submit" className="w-full" disabled={isSubmitting}>
                     {isSubmitting ? 'Sending...' : t('submit_ticket')}
                   </Button>
                 </div>
               </form>
             </div>
           )}

           {/* LIST TICKETS VIEW */}
           {activeTab === 'list' && !selectedTicket && (
             <div className="animate-fade-in">
                <h3 className="text-2xl text-white font-bold mb-6 border-b border-gray-700 pb-2">{t('my_tickets')}</h3>
                
                {loading ? (
                    <div className="text-center text-gray-500 py-10">Syncing tickets...</div>
                ) : myTickets.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-4">📭</div>
                    <p>No tickets found.</p>
                    <button onClick={() => setActiveTab('create')} className="text-blue-400 hover:underline mt-2">Create one now</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myTickets.map(ticket => (
                      <div 
                        key={ticket.id}
                        onClick={() => { setSelectedTicket(ticket); AudioSystem.playVoxelTap(); }}
                        className="bg-gray-800 p-4 rounded border border-gray-700 hover:border-blue-500 cursor-pointer transition-all hover:translate-x-1 group"
                      >
                        <div className="flex justify-between items-start">
                           <div>
                             <div className="flex items-center gap-2 mb-1">
                               <span className="font-mono text-yellow-500 text-xs">{ticket.id}</span>
                               <span className={`text-[10px] px-2 rounded-full text-black font-bold uppercase ${getStatusColor(ticket.status)}`}>
                                 {ticket.status.replace('_', ' ')}
                               </span>
                             </div>
                             <h4 className="text-white font-bold group-hover:text-blue-300">{ticket.subject}</h4>
                             <p className="text-gray-400 text-sm mt-1 line-clamp-1">
                               {ticket.messages && ticket.messages.length > 0 ? ticket.messages[ticket.messages.length - 1].text : 'No messages'}
                             </p>
                           </div>
                           <div className="text-right">
                             <span className="text-gray-600 text-xs">{new Date(ticket.lastUpdated).toLocaleDateString()}</span>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
           )}

           {/* TICKET DETAIL VIEW */}
           {activeTab === 'list' && selectedTicket && (
             <div className="h-full flex flex-col animate-slide-in">
                <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-4 sticky top-0 bg-gray-900/90 z-10 backdrop-blur-md p-2">
                   <div>
                     <button onClick={() => setSelectedTicket(null)} className="text-gray-400 text-xs hover:text-white mb-2">← Back to list</button>
                     <h3 className="text-xl text-white font-bold">{selectedTicket.subject}</h3>
                     <span className="text-yellow-500 font-mono text-xs">{selectedTicket.id}</span>
                   </div>
                   <div className={`px-3 py-1 rounded text-black font-bold text-xs uppercase ${getStatusColor(selectedTicket.status)}`}>
                      {selectedTicket.status.replace('_', ' ')}
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 custom-scroll">
                   {selectedTicket.messages && selectedTicket.messages.map((msg, idx) => (
                     <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg ${msg.sender === 'user' ? 'bg-blue-900 text-white' : 'bg-gray-700 text-gray-200'}`}>
                           <div className="text-[10px] opacity-50 mb-1 flex justify-between gap-4">
                             <span className="uppercase font-bold">{msg.sender === 'user' ? 'You' : 'Support Agent'}</span>
                             <span>{new Date(msg.timestamp).toLocaleTimeString()} {new Date(msg.timestamp).toLocaleDateString()}</span>
                           </div>
                           <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        </div>
                     </div>
                   ))}
                   <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleReply} className="mt-auto bg-black/40 p-3 rounded border border-gray-700 flex gap-2">
                    <input 
                        type="text" 
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder="Type a reply..."
                        disabled={selectedTicket.status === 'closed' || isSubmitting}
                        className="flex-1 bg-transparent text-white outline-none text-sm"
                    />
                    <button 
                        type="submit" 
                        disabled={selectedTicket.status === 'closed' || !replyMessage.trim() || isSubmitting}
                        className="text-blue-400 font-bold text-xs uppercase hover:text-white disabled:opacity-50"
                    >
                        Send
                    </button>
                </form>
             </div>
           )}

        </div>
      </div>
    </div>
  );
};

export default SupportView;
