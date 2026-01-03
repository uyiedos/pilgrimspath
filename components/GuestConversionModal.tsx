
import React, { useState } from 'react';
import Button from './Button';

interface GuestConversionModalProps {
  onConvert: (email: string, password: string, username: string) => Promise<void>;
  onCancel: () => void;
}

const GuestConversionModal: React.FC<GuestConversionModalProps> = ({ onConvert, onCancel }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !username) return;
    
    setIsLoading(true);
    setError('');

    try {
      await onConvert(email, password, username);
      // Parent handles closing on success via state change
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create account. Email might be taken.");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-gray-900 border-4 border-yellow-500 rounded-xl max-w-md w-full p-8 shadow-[0_0_50px_rgba(234,179,8,0.3)] relative">
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-500 hover:text-white"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="text-5xl mb-4 animate-bounce">💾</div>
          <h2 className="text-2xl font-retro text-yellow-400 mb-2">Save Your Soul... Record</h2>
          <p className="text-gray-300 font-serif text-sm">
            Create an account to permanently save your XP, badges, and verses to the cloud.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded text-xs mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-xs uppercase mb-1">Pilgrim Name</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black border border-gray-600 text-white p-3 rounded focus:border-yellow-500 outline-none"
              placeholder="Your Name"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-400 text-xs uppercase mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-gray-600 text-white p-3 rounded focus:border-yellow-500 outline-none"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs uppercase mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-gray-600 text-white p-3 rounded focus:border-yellow-500 outline-none"
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-green-600 hover:bg-green-500 border-green-800 py-4 mt-2"
            disabled={isLoading}
          >
            {isLoading ? 'Syncing Data...' : 'Confirm & Sync Progress'}
          </Button>
        </form>
        
        <p className="text-center text-gray-500 text-xs mt-4">
          All your current progress will be transferred to the new account.
        </p>
      </div>
    </div>
  );
};

export default GuestConversionModal;
