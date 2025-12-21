
import React, { useState } from 'react';
import { AppView, VideoContent } from '../types';
import { AudioSystem } from '../utils/audio';
import { findChristianResources } from '../services/geminiService';

interface BrowserViewProps {
  onBack: () => void;
  onNavigate: (view: AppView) => void;
  onAddPoints: (amount: number) => void;
  initialUrl?: string | null;
  activeVideo?: VideoContent | null;
}

interface ResourceItem {
  title: string;
  url: string;
  description: string;
  type: string;
}

const SUGGESTED_TOPICS = [
  "Free Bible Study Guides",
  "Joel Osteen Devotionals",
  "C.S. Lewis E-books",
  "Billy Graham Sermons",
  "Christian Counseling Resources",
  "Desiring God Articles",
  "Worship Chord Sheets",
  "Spurgeon's Sermons"
];

const BrowserView: React.FC<BrowserViewProps> = ({ onBack, onAddPoints }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResourceItem[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (overrideQuery?: string) => {
    const q = overrideQuery || query;
    if (!q.trim()) return;

    setLoading(true);
    setHasSearched(true);
    setQuery(q);
    AudioSystem.playVoxelTap();

    try {
      const data = await findChristianResources(q);
      if (data) {
        setResults(data.resources || []);
        setSummary(data.summary || "Here are the resources revealed for your journey.");
        onAddPoints(5); // Small reward for seeking wisdom
        AudioSystem.playMessage();
      } else {
        setSummary("The archives were silent. Please try a different query.");
        setResults([]);
      }
    } catch (e) {
      setSummary("Connection to the archives interrupted.");
    } finally {
      setLoading(false);
    }
  };

  const handleResourceClick = (url: string) => {
    // Open in new system tab to avoid iframe restrictions
    window.open(url, '_blank');
    AudioSystem.playAchievement(); // Sound effect for finding a resource
  };

  return (
    <div className="min-h-full bg-[#0a0a0c] flex flex-col pt-14 md:pt-16 animate-fade-in relative overflow-hidden">
        {/* Background FX */}
        <div className="absolute inset-0 bg-[url('https://image.pollinations.ai/prompt/ancient%20library%20scrolls%20digital%20hologram?width=1080&height=1080&nologo=true')] bg-cover bg-center opacity-20 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-900/90 to-black pointer-events-none"></div>

        {/* Content Container - Scrollable */}
        <div className="relative z-10 w-full h-full overflow-y-auto custom-scroll p-4 md:p-8">
            <div className="max-w-4xl mx-auto flex flex-col items-center min-h-min pb-20">
            
                {/* Nav */}
                <div className="w-full flex justify-between items-center mb-8 md:mb-12">
                    <div className="flex items-center gap-3">
                        <div className="text-3xl md:text-4xl animate-pulse">🕯️</div>
                        <div>
                            <h1 className="text-xl md:text-3xl font-retro text-yellow-500 uppercase tracking-tighter">Kingdom Resources</h1>
                            <p className="text-gray-500 font-mono text-[9px] md:text-xs uppercase tracking-widest">AI-Powered Librarian</p>
                        </div>
                    </div>
                    <button 
                        onClick={onBack}
                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl text-xs font-bold border border-gray-600 transition-all"
                    >
                        EXIT
                    </button>
                </div>

                {/* Search Bar */}
                <div className={`w-full transition-all duration-500 ${hasSearched ? 'translate-y-0' : 'translate-y-[10vh] md:translate-y-[20vh]'}`}>
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <form 
                            onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
                            className="relative flex items-center bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl p-2"
                        >
                            <span className="pl-4 text-2xl">🔍</span>
                            <input 
                                type="text" 
                                className="w-full bg-transparent p-3 md:p-4 text-white outline-none font-serif text-base md:text-lg placeholder-gray-600"
                                placeholder="Ask for books, sermons, or ministries..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoFocus
                            />
                            <button 
                                type="submit"
                                disabled={loading}
                                className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-2 px-4 md:py-3 md:px-8 rounded-xl font-retro text-[10px] md:text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 whitespace-nowrap"
                            >
                                {loading ? 'Seeking...' : 'Search'}
                            </button>
                        </form>
                    </div>

                    {/* Suggestions (Only show if no search yet) */}
                    {!hasSearched && (
                        <div className="mt-8 animate-fade-in">
                            <p className="text-center text-gray-500 text-xs font-mono uppercase tracking-widest mb-4">Suggested Inquiries</p>
                            <div className="flex flex-wrap justify-center gap-3">
                                {SUGGESTED_TOPICS.map(topic => (
                                    <button
                                        key={topic}
                                        onClick={() => handleSearch(topic)}
                                        className="bg-gray-800/50 hover:bg-blue-900/30 border border-gray-700 hover:border-blue-500 text-gray-300 hover:text-white px-4 py-2 rounded-full text-xs transition-all"
                                    >
                                        {topic}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Results Area */}
                {hasSearched && (
                    <div className="w-full mt-8 md:mt-12 animate-slide-up space-y-8">
                        
                        {/* AI Summary */}
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-yellow-500 font-retro text-xs animate-pulse">Consulting the Archives...</p>
                            </div>
                        ) : (
                            <>
                                {summary && (
                                    <div className="bg-blue-900/20 border-l-4 border-blue-500 p-6 rounded-r-xl backdrop-blur-md">
                                        <h3 className="text-blue-400 font-retro text-xs uppercase tracking-widest mb-2">Librarian's Note</h3>
                                        <p className="text-gray-200 font-serif italic leading-relaxed text-sm md:text-base">{summary}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                    {results.map((item, idx) => (
                                        <div 
                                            key={idx}
                                            onClick={() => handleResourceClick(item.url)}
                                            className="bg-gray-800/60 hover:bg-gray-800 border border-gray-700 hover:border-yellow-500 p-5 rounded-2xl cursor-pointer transition-all group flex flex-col justify-between h-full shadow-lg hover:shadow-yellow-900/20"
                                        >
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="bg-gray-900 text-gray-400 text-[9px] px-2 py-1 rounded border border-gray-700 uppercase tracking-wider font-bold">
                                                        {item.type}
                                                    </span>
                                                    <span className="text-gray-500 text-xl group-hover:text-yellow-500 transition-colors">↗</span>
                                                </div>
                                                <h4 className="text-white font-bold text-lg mb-2 font-serif group-hover:text-blue-300 transition-colors leading-tight">
                                                    {item.title}
                                                </h4>
                                                <p className="text-gray-400 text-sm leading-relaxed mb-4 line-clamp-3">
                                                    {item.description}
                                                </p>
                                            </div>
                                            <div className="text-blue-400 text-xs font-mono truncate opacity-60 group-hover:opacity-100 transition-opacity">
                                                {item.url}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {results.length === 0 && !loading && (
                                    <div className="text-center py-10 text-gray-500">
                                        <p>No resources found matching your request.</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default BrowserView;
