
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { BIBLE_BOOKS } from '../constants';
import { AudioSystem } from '../utils/audio';

interface BibleReaderViewProps {
  onBack: () => void;
  onSaveToJournal?: (type: 'verse', content: string, reference: string) => void;
  onAddPoints?: (amount: number) => void;
  onUnlockAchievement?: (id: string) => void;
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

const BibleReaderView: React.FC<BibleReaderViewProps> = ({ onBack, onSaveToJournal, onAddPoints, onUnlockAchievement }) => {
  const [version, setVersion] = useState('web');
  const [book, setBook] = useState('John');
  const [chapter, setChapter] = useState(1);
  const [data, setData] = useState<BibleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Share Modal State
  const [selectedVerse, setSelectedVerse] = useState<BibleVerse | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const fetchChapter = async () => {
    setLoading(true);
    setError('');
    try {
      const encodedBook = encodeURIComponent(book);
      const res = await fetch(`https://bible-api.com/${encodedBook}+${chapter}?translation=${version}`);
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

  const handleVerseClick = (verse: BibleVerse) => {
      AudioSystem.playVoxelTap();
      setSelectedVerse(verse);
      setShowShareModal(true);
  };

  const handleSaveToJournal = () => {
      if (!onSaveToJournal || !selectedVerse) return;
      const ref = `${book} ${chapter}:${selectedVerse.verse}`;
      onSaveToJournal('verse', selectedVerse.text.trim(), ref);
      setShowShareModal(false);
      alert("Verse saved to your Personal Journal!");
  };

  const handleShare = async () => {
      if (!selectedVerse) return;
      const ref = `${book} ${chapter}:${selectedVerse.verse}`;
      const shareText = `"${selectedVerse.text.trim()}" — ${ref} (${version.toUpperCase()})\nShared via The Journey App`;

      let shared = false;

      // Try native share first
      if (navigator.share) {
          try {
              await navigator.share({
                  title: 'The Journey: Scripture',
                  text: shareText,
                  url: window.location.href
              });
              shared = true;
          } catch (e) { 
              console.log('Share aborted');
              // Don't mark shared if aborted, user might retry or use copy
          }
      } 
      
      // Fallback to Clipboard if native share failed or user cancelled but wants to "share via copy"
      // Note: We usually award points on "Copy" too since we can't track external apps
      if (!shared) {
          try {
              await navigator.clipboard.writeText(shareText);
              alert("Scripture copied to clipboard! Share it with a friend.");
              shared = true;
          } catch (e) {
              alert("Failed to copy to clipboard.");
          }
      }

      if (shared) {
          AudioSystem.playAchievement();
          
          if (onAddPoints) {
              onAddPoints(20);
              // Explicit feedback to user
              // We delay slighty to ensure the first alert (if any) is cleared
              setTimeout(() => alert("Evangelist Bonus: +20 Spirit XP Awarded!"), 500);
          }
          
          if (onUnlockAchievement) onUnlockAchievement('evangelist');
      }
      setShowShareModal(false);
  };

  const renderVerseText = (text: string, currentBook: string) => {
    const bookIndex = BIBLE_BOOKS.indexOf(currentBook);
    const isNT = bookIndex >= 39;
    if (!isNT) return text;
    const parts = text.split(/(".*?"|“.*?”)/g);
    return parts.map((part, i) => {
      if (part.startsWith('"') || part.startsWith('“')) {
        return <span key={i} className="text-red-700 font-medium">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="min-h-screen bg-amber-50 text-stone-900 font-serif flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] relative">
       
       {/* Share Modal */}
       {showShareModal && selectedVerse && (
           <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 animate-fade-in backdrop-blur-sm">
               <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border-4 border-amber-800 animate-slide-up">
                   <div className="bg-amber-900 text-amber-50 p-4 flex justify-between items-center">
                       <h3 className="font-retro text-[10px] uppercase tracking-widest">Share Scripture</h3>
                       <button onClick={() => setShowShareModal(false)} className="text-xl">✕</button>
                   </div>
                   <div className="p-8">
                       <div className="bg-amber-50 p-6 rounded-xl border border-amber-200 mb-6 shadow-inner italic text-lg leading-relaxed text-stone-800">
                           "{selectedVerse.text.trim()}"
                           <div className="text-right mt-4 font-bold text-sm not-italic text-amber-900">
                               — {book} {chapter}:{selectedVerse.verse}
                           </div>
                       </div>
                       <div className="grid grid-cols-1 gap-3">
                           <Button onClick={handleShare} className="bg-blue-600 hover:bg-blue-500 border-blue-800">
                               ↗️ Share / Copy Verse (+20 XP)
                           </Button>
                           <Button onClick={handleSaveToJournal} className="bg-amber-700 hover:bg-amber-600 border-amber-900">
                               📜 Save to Journal
                           </Button>
                           <Button onClick={() => setShowShareModal(false)} variant="secondary" className="border-gray-300">
                               Cancel
                           </Button>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {/* Header / Controls */}
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
                    <select 
                      value={version} 
                      onChange={(e) => setVersion(e.target.value)}
                      className="flex-1 bg-stone-800 border border-stone-600 text-amber-50 p-2 rounded text-xs md:text-sm font-sans focus:border-amber-500 outline-none"
                    >
                      {VERSIONS.map(v => <option key={v.id} value={v.id}>{v.id.toUpperCase()}</option>)}
                    </select>

                    <select 
                      value={book} 
                      onChange={(e) => { setBook(e.target.value); setChapter(1); }}
                      className="flex-[2] bg-stone-800 border border-stone-600 text-amber-50 p-2 rounded text-xs md:text-sm font-sans focus:border-amber-500 outline-none"
                    >
                      {BIBLE_BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>

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
                        onClick={() => handleVerseClick(verse)}
                        title="Click to share or save"
                    >
                       <sup className="text-[10px] md:text-xs text-amber-700 font-bold mr-1 select-none opacity-60 group-hover:opacity-100">{verse.verse}</sup>
                       {renderVerseText(verse.text, book)}
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
