
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { SupportTicket, User } from '../types';
import { LanguageCode, UI_TEXT } from '../translations';

interface SupportViewProps {
  user: User | null;
  tickets: SupportTicket[];
  onCreateTicket: (ticket: SupportTicket) => void;
  onBack: () => void;
  language: LanguageCode;
}

const SupportView: React.FC<SupportViewProps> = ({ user, tickets, onCreateTicket, onBack, language }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('list');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'account' | 'bug' | 'spiritual' | 'billing' | 'other'>('account');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const t = (key: keyof typeof UI_TEXT['en']) => UI_TEXT.en[key];

  const requestNotificationPermission = async () => {
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      new Notification("Notifications Enabled", {
        body: "You will now receive updates on your support tickets.",
        icon: '/vite.svg'
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      const newTicket: SupportTicket = {
        id: `#SUP-${Math.floor(Math.random() * 10000)}`,
        subject,
        category,
        status: 'open',
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        messages: [
          {
            id: `msg-${Date.now()}`,
            sender: 'user',
            text: message,
            timestamp: Date.now()
          }
        ]
      };

      onCreateTicket(newTicket);
      
      // Reset form
      setSubject('');
      setMessage('');
      setIsSubmitting(false);
      setActiveTab('list');

      // Visual feedback simulating email trigger
      alert(`Confirmation email sent to ${user?.email || 'your inbox'}. Support Token: ${newTicket.id}`);

    }, 1500);
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

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  return (
    <div className="min-h-screen bg-gray-900 p-4 pt-20 md:p-8 md:pt-24 flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] animate-fade-in">
      
      <div className="max-w-4xl w-full bg-gray-800 rounded-xl border-2 border-gray-600 shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[80vh] relative">
        
        {/* MOBILE STICKY NAV (Slider) */}
        <div className="md:hidden sticky top-0 z-30 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 p-2 flex gap-2 overflow-x-auto no-scrollbar">
           <button 
             onClick={() => { setActiveTab('list'); setSelectedTicketId(null); }}
             className={`flex-1 py-2 px-4 rounded text-xs font-bold whitespace-nowrap border ${activeTab === 'list' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
           >
             {t('my_tickets')}
           </button>
           <button 
             onClick={() => { setActiveTab('create'); setSelectedTicketId(null); }}
             className={`flex-1 py-2 px-4 rounded text-xs font-bold whitespace-nowrap border ${activeTab === 'create' ? 'bg-green-600 border-green-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
           >
             + {t('create_ticket')}
           </button>
           {notificationPermission !== 'granted' && (
              <button onClick={requestNotificationPermission} className="px-3 py-2 bg-gray-700 rounded text-xs">🔔</button>
           )}
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
             onClick={() => { setActiveTab('list'); setSelectedTicketId(null); }}
             className={`p-3 text-left rounded font-mono text-sm transition-colors ${activeTab === 'list' ? 'bg-blue-900 text-white border-l-4 border-blue-500' : 'text-gray-400 hover:bg-gray-800'}`}
           >
             {t('my_tickets')}
           </button>
           
           <button 
             onClick={() => { setActiveTab('create'); setSelectedTicketId(null); }}
             className={`p-3 text-left rounded font-mono text-sm transition-colors ${activeTab === 'create' ? 'bg-green-900 text-white border-l-4 border-green-500' : 'text-gray-400 hover:bg-gray-800'}`}
           >
             + {t('create_ticket')}
           </button>

           <div className="mt-auto">
             {notificationPermission !== 'granted' ? (
                <button 
                  onClick={requestNotificationPermission}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 px-3 rounded flex items-center justify-center gap-2 mb-2"
                >
                  🔔 {t('enable_notifications')}
                </button>
             ) : (
                <div className="text-center text-xs text-green-500 font-mono border border-green-900 bg-green-900/20 p-2 rounded mb-2">
                  ✓ {t('notifications_active')}
                </div>
             )}
             
             <Button onClick={onBack} variant="secondary" className="w-full text-xs">
               ← {t('exit')}
             </Button>
           </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-gray-900/50 p-4 md:p-8 overflow-y-auto">
           
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
                   <p className="text-center text-gray-500 text-xs mt-3">
                     Responses will be sent to your inbox and notification center.
                   </p>
                 </div>
               </form>
             </div>
           )}

           {/* LIST TICKETS VIEW */}
           {activeTab === 'list' && !selectedTicketId && (
             <div className="animate-fade-in">
                <h3 className="text-2xl text-white font-bold mb-6 border-b border-gray-700 pb-2">{t('my_tickets')}</h3>
                
                {tickets.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-4">📭</div>
                    <p>No tickets found.</p>
                    <button onClick={() => setActiveTab('create')} className="text-blue-400 hover:underline mt-2">Create one now</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tickets.map(ticket => (
                      <div 
                        key={ticket.id}
                        onClick={() => setSelectedTicketId(ticket.id)}
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
                               {ticket.messages && ticket.messages.length > 0 ? ticket.messages[0].text : 'No messages'}
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
                <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-4">
                   <div>
                     <button onClick={() => setSelectedTicketId(null)} className="text-gray-400 text-xs hover:text-white mb-2">← Back to list</button>
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
                             <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                           </div>
                           <p className="text-sm">{msg.text}</p>
                        </div>
                     </div>
                   ))}
                </div>

                {selectedTicket.status !== 'closed' && (
                  <div className="bg-black/30 p-4 rounded border border-gray-700">
                     <p className="text-gray-500 text-xs text-center">Reply feature is disabled for this demo.</p>
                  </div>
                )}
             </div>
           )}

        </div>
      </div>
    </div>
  );
};

export default SupportView;
