
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { BIBLE_BOOKS } from '../constants';
import { AudioSystem } from '../utils/audio';

interface BibleReaderViewProps {
  onBack: () => void;
  onSaveToJournal?: (type: 'verse', content: string, reference: string) => void;
}

interface BibleVerse {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

interface BibleData {
  reference: string;
  verses: BibleVerse[];
  text: string;
  translation_id: string;
  translation_name: string;
  translation_note: string;
}

const VERSIONS = [
  { id: 'web', name: 'World English Bible' },
  { id: 'kjv', name: 'King James Version' },
  { id: 'bbe', name: 'Bible in Basic English' },
  { id: 'asv', name: 'American Standard Version' }
];

// Simple Share Icon SVG
const ShareIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path fillRule="evenodd" d="M15.75 4.5a3 3 0 11.825 2.066l-8.421 4.679a3.002 3.002 0 010 1.51l8.421 4.679a3 3 0 11-.729 1.31l-8.421-4.678a3 3 0 110-4.132l8.421-4.679a3 3 0 01-.096-.755z" clipRule="evenodd" />
  </svg>
);

const BibleReaderView: React.FC<BibleReaderViewProps> = ({ onBack, onSaveToJournal }) => {
  // Default to WEB because it has consistent quotes for Red Letter logic
  const [version, setVersion] = useState('web');
  const [book, setBook] = useState('John');
  const [chapter, setChapter] = useState(1);
  const [data, setData] = useState<BibleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Share Modal State
  const [sharingVerse, setSharingVerse] = useState<BibleVerse | null>(null);

  const fetchChapter = async () => {
    setLoading(true);
    setError('');
    try {
      // API request: https://bible-api.com/book+chapter?translation=version
      const res = await fetch(`https://bible-api.com/${book}+${chapter}?translation=${version}`);
      if (!res.ok) throw new Error('Failed to fetch scripture');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setError('Could not load scripture. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChapter();
    // Scroll to top when chapter changes
    window.scrollTo(0, 0);
  }, [book, chapter, version]);

  const handleNextChapter = () => {
      AudioSystem.playVoxelTap();
      setChapter(c => c + 1);
  };
  const handlePrevChapter = () => {
      AudioSystem.playVoxelTap();
      setChapter(c => Math.max(1, c - 1));
  };

  const openShareModal = (verse: BibleVerse) => {
    AudioSystem.playVoxelTap();
    setSharingVerse(verse);
  };

  const closeShareModal = () => {
    setSharingVerse(null);
  };

  const handleSaveToJournal = () => {
      if (!sharingVerse || !onSaveToJournal) return;
      
      AudioSystem.playAchievement(); // Positive feedback for saving scripture
      
      const ref = `${book} ${chapter}:${sharingVerse.verse}`;
      onSaveToJournal('verse', sharingVerse.text.trim(), ref);
      alert("Verse saved to your Personal Journal!");
      closeShareModal();
  };

  const handleCopyText = () => {
    if (!sharingVerse) return;
    const textToShare = `"${sharingVerse.text.trim()}"\n— ${book} ${chapter}:${sharingVerse.verse} (${version.toUpperCase()})`;
    navigator.clipboard.writeText(textToShare);
    AudioSystem.playVoxelTap();
    alert("Verse copied to clipboard!");
    closeShareModal();
  };

  const handleShareTwitter = () => {
    if (!sharingVerse) return;
    const text = `"${sharingVerse.text.trim()}" — ${book} ${chapter}:${sharingVerse.verse}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=TheJourney,Scripture`;
    window.open(url, '_blank');
    AudioSystem.playVoxelTap();
    closeShareModal();
  };

  const handleNativeShare = async () => {
    if (!sharingVerse) return;
    const textToShare = `"${sharingVerse.text.trim()}"\n\n— ${book} ${chapter}:${sharingVerse.verse} (${version.toUpperCase()})\nRead on The Journey App`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Verse: ${book} ${chapter}:${sharingVerse.verse}`,
          text: textToShare,
          url: window.location.href,
        });
        AudioSystem.playVoxelTap();
        closeShareModal();
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      handleCopyText();
    }
  };

  // Helper to render text with Red Letters for Christ's words (Dialogue in NT)
  const renderVerseText = (text: string, currentBook: string) => {
    // Check if New Testament (Matthew is index 39)
    const bookIndex = BIBLE_BOOKS.indexOf(currentBook);
    const isNT = bookIndex >= 39;

    if (!isNT) return text;

    // Split by standard quotes or smart quotes to identify dialogue
    // This assumes the API returns quotes. WEB version does. KJV often does not.
    const parts = text.split(/(".*?"|“.*?”)/g);

    return parts.map((part, i) => {
      // If the segment starts with a quote, color it red
      if (part.startsWith('"') || part.startsWith('“')) {
        return <span key={i} className="text-red-700 font-medium">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="min-h-screen bg-amber-50 text-stone-900 font-serif flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] relative">
       
       {/* SHARE MODAL */}
       {sharingVerse && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-stone-100 border-4 border-amber-700 rounded-xl max-w-md w-full shadow-2xl overflow-hidden relative">
               
               {/* Close Button */}
               <button 
                 onClick={closeShareModal}
                 className="absolute top-2 right-2 text-stone-500 hover:text-red-600 font-bold p-2"
               >
                 ✕
               </button>

               {/* Card Content */}
               <div className="p-8 text-center bg-[url('https://www.transparenttextures.com/patterns/paper.png')]">
                  <div className="mb-4 text-amber-600 text-4xl">❝</div>
                  <p className="text-xl md:text-2xl font-serif text-stone-900 italic leading-relaxed mb-6">
                    {sharingVerse.text.trim()}
                  </p>
                  <div className="w-16 h-1 bg-amber-300 mx-auto mb-4"></div>
                  <p className="font-retro text-stone-700 font-bold uppercase tracking-wider">
                    {book} {chapter}:{sharingVerse.verse}
                  </p>
                  <p className="text-xs text-stone-500 mt-1">{version.toUpperCase()}</p>
               </div>

               {/* Action Buttons */}
               <div className="bg-stone-200 p-4 grid grid-cols-1 gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={handleNativeShare}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded shadow-md flex items-center justify-center gap-2 text-xs md:text-sm"
                    >
                        <ShareIcon className="w-4 h-4" /> Share
                    </button>
                    <button 
                        onClick={handleSaveToJournal}
                        className="bg-green-700 hover:bg-green-600 text-white font-bold py-3 rounded shadow-md flex items-center justify-center gap-2 text-xs md:text-sm"
                    >
                        <span className="text-lg">📖</span> Save to Journal
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={handleCopyText}
                      className="bg-stone-300 hover:bg-stone-400 text-stone-800 font-bold py-2 rounded shadow-sm border border-stone-400 text-xs"
                    >
                      📋 Copy
                    </button>
                    <button 
                      onClick={handleShareTwitter}
                      className="bg-black hover:bg-gray-800 text-white font-bold py-2 rounded shadow-sm flex items-center justify-center gap-2 text-xs"
                    >
                      <span>𝕏</span> Post
                    </button>
                  </div>
               </div>
            </div>
         </div>
       )}

       {/* Header / Controls - Sticky below the main StatusBar (approx top-14) */}
       <header className="sticky top-14 z-50 w-full bg-stone-900 text-amber-50 border-b-4 border-amber-700 shadow-lg p-2 md:p-4">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="flex items-center justify-between w-full md:w-auto">
                <Button onClick={onBack} variant="secondary" className="text-xs px-3 py-2 border-stone-600 bg-stone-800">
                  🏠 Home
                </Button>
                <h1 className="text-lg md:text-xl font-retro text-amber-500 md:hidden block ml-2">Holy Scriptures</h1>
                <h1 className="text-xl font-retro text-amber-500 hidden md:block ml-4">The Holy Scriptures</h1>
             </div>

             <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 w-full md:w-auto">
                <div className="flex gap-2 w-full md:w-auto">
                    {/* Version Selector */}
                    <select 
                      value={version} 
                      onChange={(e) => setVersion(e.target.value)}
                      className="flex-1 bg-stone-800 border border-stone-600 text-amber-50 p-2 rounded text-xs md:text-sm font-sans focus:border-amber-500 outline-none"
                    >
                      {VERSIONS.map(v => <option key={v.id} value={v.id}>{v.id.toUpperCase()}</option>)}
                    </select>

                    {/* Book Selector */}
                    <select 
                      value={book} 
                      onChange={(e) => { setBook(e.target.value); setChapter(1); }}
                      className="flex-[2] bg-stone-800 border border-stone-600 text-amber-50 p-2 rounded text-xs md:text-sm font-sans focus:border-amber-500 outline-none"
                    >
                      {BIBLE_BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>

                {/* Chapter Controls */}
                <div className="flex items-center justify-center gap-1 bg-stone-800 rounded border border-stone-600 w-full md:w-auto">
                   <button 
                     onClick={handlePrevChapter}
                     disabled={chapter <= 1}
                     className="px-4 py-2 hover:bg-stone-700 disabled:opacity-30 text-amber-50 flex-1 md:flex-none"
                   >
                     ‹ Prev
                   </button>
                   <span className="px-4 font-mono text-amber-500 min-w-[3rem] text-center font-bold text-lg">{chapter}</span>
                   <button 
                     onClick={handleNextChapter}
                     className="px-4 py-2 hover:bg-stone-700 text-amber-50 flex-1 md:flex-none"
                   >
                     Next ›
                   </button>
                </div>
             </div>
          </div>
       </header>

       {/* Main Content Content */}
       <main className="flex-1 w-full max-w-4xl p-4 md:p-12 pt-20">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 opacity-60">
               <div className="text-4xl animate-bounce mb-4">📜</div>
               <p className="font-retro text-stone-600">Scribing...</p>
            </div>
          ) : error ? (
             <div className="text-center p-12 bg-red-50 border-2 border-red-200 rounded-lg text-red-800">
               <p className="text-xl mb-2">⚠️</p>
               <p>{error}</p>
               <Button onClick={fetchChapter} className="mt-4 bg-red-700">Retry</Button>
             </div>
          ) : data ? (
             <div className="bg-white/80 p-6 md:p-16 rounded shadow-xl border border-stone-200 min-h-[60vh] relative">
                {/* Decorative Drop Cap Background (visual only) */}
                <div className="absolute top-4 right-4 md:top-10 md:right-10 opacity-5 font-retro text-6xl md:text-9xl pointer-events-none select-none">
                  {book.charAt(0)}
                </div>

                <div className="text-center mb-6 md:mb-10 border-b-2 border-stone-800 pb-4 md:pb-6">
                   <h2 className="text-3xl md:text-5xl font-bold text-stone-900 mb-2 font-serif">{book} {chapter}</h2>
                   <p className="text-stone-500 text-xs md:text-sm uppercase tracking-widest">{data.translation_name}</p>
                   {BIBLE_BOOKS.indexOf(book) >= 39 && (
                      <p className="text-red-700/60 text-[10px] uppercase mt-1 tracking-wider font-mono">Red Letter Edition</p>
                   )}
                </div>

                <div className="space-y-4 text-base md:text-xl leading-relaxed text-stone-800">
                  {data.verses.map((verse) => (
                    <span 
                        key={verse.verse} 
                        className="hover:bg-yellow-100 transition-colors rounded px-1 relative group inline cursor-pointer border-b border-transparent hover:border-yellow-300"
                        onClick={() => openShareModal(verse)}
                    >
                       <sup className="text-[10px] md:text-xs text-amber-700 font-bold mr-1 select-none opacity-60 group-hover:opacity-100">{verse.verse}</sup>
                       {renderVerseText(verse.text, book)}
                       
                       {/* Inline Share Icon on Hover */}
                       <span className="hidden group-hover:inline-block align-middle ml-1 text-amber-600 animate-fade-in">
                          <ShareIcon className="w-4 h-4" />
                       </span>
                    </span>
                  ))}
                </div>

                <div className="mt-10 md:mt-16 pt-8 border-t border-stone-300 text-center">
                   <div className="flex flex-col md:flex-row justify-center gap-4">
                      <Button 
                        onClick={handlePrevChapter} 
                        disabled={chapter <= 1}
                        variant="secondary"
                        className="bg-stone-200 text-stone-800 border-stone-400 hover:bg-stone-300 w-full md:w-auto"
                      >
                        Previous Chapter
                      </Button>
                      <Button 
                        onClick={handleNextChapter}
                        className="bg-stone-800 border-stone-900 w-full md:w-auto"
                      >
                        Next Chapter
                      </Button>
                   </div>
                   <p className="text-xs text-stone-400 mt-6">{data.translation_note}</p>
                </div>
             </div>
          ) : null}
       </main>

    </div>
  );
};

export default BibleReaderView;
