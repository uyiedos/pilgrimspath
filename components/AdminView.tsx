
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface AdminViewProps {
  currentUser: User;
  onBack: () => void;
}

const AdminView: React.FC<AdminViewProps> = ({ currentUser, onBack }) => {
  const [activeTab, setActiveTab] = useState<'broadcast' | 'users' | 'moderation'>('broadcast');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'moderation') fetchMessages();
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('users').select('*').order('joined_date', { ascending: false }).limit(20);
    if (data) setUsers(data);
    setLoading(false);
  };

  const fetchMessages = async () => {
    setLoading(true);
    const { data } = await supabase.from('chat_messages').select('*').order('created_at', { ascending: false }).limit(20);
    if (data) setRecentMessages(data);
    setLoading(false);
  };

  const sendBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    
    // Send as System
    await supabase.from('chat_messages').insert({
        user_id: currentUser.id,
        username: 'SYSTEM',
        avatar: 'https://image.pollinations.ai/prompt/pixel%20art%20shield%20icon%20gold?width=50&height=50&nologo=true',
        message: `[ADMIN ALERT]: ${broadcastMsg}`
    });
    
    setBroadcastMsg('');
    alert("Broadcast sent to Journey TV.");
  };

  const deleteMessage = async (id: string) => {
    if(!confirm("Delete this message?")) return;
    
    const { error } = await supabase.from('chat_messages').delete().eq('id', id);
    if (error) alert("Error deleting: " + error.message);
    else fetchMessages();
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8 pt-24 text-white font-mono">
      <div className="max-w-4xl mx-auto border-4 border-red-900 bg-gray-950 p-6 rounded-lg shadow-2xl">
        <div className="flex justify-between items-center mb-8 border-b border-red-900 pb-4">
           <h1 className="text-2xl font-bold text-red-500 font-retro">ADMIN TERMINAL</h1>
           <div className="flex gap-4">
             <span className="text-gray-500 text-xs mt-2">Logged in as: {currentUser.email}</span>
             <Button onClick={onBack} variant="secondary" className="text-xs">Exit</Button>
           </div>
        </div>

        <div className="flex gap-4 mb-6">
           <button onClick={() => setActiveTab('broadcast')} className={`px-4 py-2 border ${activeTab === 'broadcast' ? 'bg-red-900 border-red-500' : 'border-gray-700'}`}>Broadcast</button>
           <button onClick={() => setActiveTab('users')} className={`px-4 py-2 border ${activeTab === 'users' ? 'bg-red-900 border-red-500' : 'border-gray-700'}`}>Users</button>
           <button onClick={() => setActiveTab('moderation')} className={`px-4 py-2 border ${activeTab === 'moderation' ? 'bg-red-900 border-red-500' : 'border-gray-700'}`}>Moderation</button>
        </div>

        {/* BROADCAST */}
        {activeTab === 'broadcast' && (
          <div className="space-y-4">
             <div className="bg-gray-900 p-4 border border-gray-700">
               <label className="block text-red-400 mb-2">Global System Notification (Journey TV)</label>
               <textarea 
                 value={broadcastMsg}
                 onChange={(e) => setBroadcastMsg(e.target.value)}
                 className="w-full bg-black text-white p-2 border border-gray-600 h-24"
                 placeholder="Enter system announcement..."
               />
               <Button onClick={sendBroadcast} className="mt-4 bg-red-700 hover:bg-red-600 border-red-900">Send Alert</Button>
             </div>
          </div>
        )}

        {/* USERS */}
        {activeTab === 'users' && (
          <div>
             <h3 className="text-gray-400 mb-4">Recent Users</h3>
             <div className="overflow-x-auto">
               <table className="w-full text-xs text-left">
                 <thead className="bg-gray-800 text-gray-400">
                   <tr>
                     <th className="p-2">Username</th>
                     <th className="p-2">Email</th>
                     <th className="p-2">Joined</th>
                     <th className="p-2">Role</th>
                   </tr>
                 </thead>
                 <tbody>
                   {users.map(u => (
                     <tr key={u.id} className="border-b border-gray-800 hover:bg-gray-900">
                       <td className="p-2">{u.username}</td>
                       <td className="p-2 text-gray-500">{u.email}</td>
                       <td className="p-2">{new Date(u.joined_date).toLocaleDateString()}</td>
                       <td className="p-2">
                         <span className={`px-1 rounded ${u.role === 'admin' ? 'bg-red-900 text-red-200' : 'bg-blue-900 text-blue-200'}`}>
                           {u.role || 'user'}
                         </span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {/* MODERATION */}
        {activeTab === 'moderation' && (
          <div>
             <h3 className="text-gray-400 mb-4">Recent Chat Messages</h3>
             <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {recentMessages.map(msg => (
                  <div key={msg.id} className="flex justify-between items-center bg-gray-900 p-2 border border-gray-800">
                     <div className="flex gap-2">
                       <span className="text-blue-400 font-bold">{msg.username}:</span>
                       <span className="text-gray-300">{msg.message}</span>
                     </div>
                     <button onClick={() => deleteMessage(msg.id)} className="text-red-500 hover:text-red-300 border border-red-900 px-2 text-xs">DEL</button>
                  </div>
                ))}
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminView;
