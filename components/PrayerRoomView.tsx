
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import Button from './Button';
import { User } from '../types';
import { LanguageCode } from '../translations';
import { AudioSystem } from '../utils/audio';

interface PrayerRoomViewProps {
  user: User | null;
  onBack: () => void;
  language: LanguageCode;
  onAddPoints: (amount: number) => void;
  onUnlockAchievement: (id: string) => void;
  spendPoints?: (amount: number, type?: string) => Promise<boolean>;
}

const PRAYER_HINTS = [
  "🙏 'Pray for peace in my heart'",
  "📖 'Read Psalm 23 to me'",
  "🛡️ 'Help me find strength'",
  "🕊️ 'Guide me through forgiveness'",
  "✨ 'Explain the Beatitudes'"
];

function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

function createBlob(data: Float32Array) {
  const int16 = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
  return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
}

const PrayerRoomView: React.FC<PrayerRoomViewProps> = ({ user, onBack, language, spendPoints }) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('Sanctuary Entrance');
  const [transcription, setTranscription] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const handleMakeOffering = async () => {
      if (!user) return alert("Sign in to enter.");
      setIsProcessing(true);
      const success = spendPoints ? await spendPoints(10, 'prayer_offering') : true;
      if (success) {
          setHasAccess(true);
          setStatus('Offering Accepted');
          AudioSystem.playAchievement();
      } else {
          alert("Insufficient XP.");
      }
      setIsProcessing(false);
  };

  const handleConnect = async () => {
      if (isActive) return;
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = { input: inputCtx, output: outputCtx };

      setIsProcessing(true);
      setStatus('Communing...');

      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
          
          const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
              onopen: () => {
                setIsActive(true);
                setIsProcessing(false);
                setStatus('Presence Felt');
                const source = inputCtx.createMediaStreamSource(stream);
                const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
                scriptProcessor.onaudioprocess = (e) => {
                  const pcmBlob = createBlob(e.inputBuffer.getChannelData(0));
                  sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                };
                source.connect(scriptProcessor);
                scriptProcessor.connect(inputCtx.destination);
              },
              onmessage: async (message: LiveServerMessage) => {
                if (message.serverContent?.outputTranscription) {
                    setTranscription(prev => {
                      const newText = message.serverContent?.outputTranscription?.text;
                      return newText ? [...prev.slice(-3), newText] : prev;
                    });
                }
                const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (audioData) {
                  // Ensure output context is running
                  if (outputCtx.state === 'suspended') {
                      await outputCtx.resume();
                  }
                  nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                  const buffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
                  const source = outputCtx.createBufferSource();
                  source.buffer = buffer;
                  source.connect(outputCtx.destination);
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += buffer.duration;
                  sourcesRef.current.add(source);
                  source.onended = () => {
                      sourcesRef.current.delete(source);
                  };
                }
              },
              onclose: () => cleanup()
            },
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
              systemInstruction: `You are 'The Eternal Guide'. Provide compassionate biblical wisdom. Respond in ${language}.`,
              outputAudioTranscription: {},
            }
          });

          sessionRef.current = await sessionPromise;
      } catch (err) {
          console.error(err);
          cleanup();
      }
  };

  const cleanup = () => {
    if (sessionRef.current) {
        sessionRef.current.close();
        sessionRef.current = null;
    }
    
    if (audioContextRef.current) {
        const { input, output } = audioContextRef.current;
        try {
            if (input.state !== 'closed') input.close();
        } catch (e) { console.warn("Input ctx close error", e); }
        
        try {
            if (output.state !== 'closed') output.close();
        } catch (e) { console.warn("Output ctx close error", e); }
        
        audioContextRef.current = null;
    }

    sourcesRef.current.forEach(s => {
        try {
            s.stop();
        } catch (e) {
            // Ignore errors if source already stopped
        }
    });
    sourcesRef.current.clear();
    
    setIsActive(false);
    setStatus('Severed');
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 overflow-hidden">
      <header className="w-full max-w-4xl flex justify-between p-6 bg-white/5 rounded-[2rem] border border-white/10 mb-8">
           <div>
              <h1 className="text-xl md:text-3xl font-retro text-white uppercase">Prayer Sanctuary</h1>
              <p className="text-cyan-400 text-[10px] uppercase font-mono">{status}</p>
           </div>
           <Button onClick={() => { cleanup(); onBack(); }} variant="secondary">Exit</Button>
      </header>

      <div className="relative flex flex-col items-center">
           <div className={`w-64 h-64 md:w-80 md:h-80 rounded-[5rem] border-4 transition-all flex items-center justify-center mb-8 ${isActive ? 'border-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.3)]' : 'border-white/10'}`}>
              {isActive ? (
                  <div className="flex gap-2">
                     {Array.from({length: 8}).map((_, i) => <div key={i} className="w-1 h-8 bg-cyan-400 animate-pulse" style={{animationDelay: `${i * 0.1}s`}} />)}
                  </div>
              ) : hasAccess ? (
                  <div onClick={handleConnect} className="cursor-pointer text-center group">
                     <div className="text-8xl mb-4 group-hover:scale-110 transition-transform">🕯️</div>
                     <p className="font-retro text-[8px] text-white">IGNITE CONNECTION</p>
                  </div>
              ) : (
                  <div onClick={handleMakeOffering} className="cursor-pointer text-center group">
                     <div className="text-7xl mb-4 group-hover:scale-110 transition-transform">🪙</div>
                     <p className="font-retro text-[8px] text-yellow-500">OFFER 10 XP</p>
                  </div>
              )}
           </div>

           {/* PRAYER HINTS - Non-intrusive suggestions */}
           {!isActive && (
               <div className="max-w-md w-full flex flex-wrap justify-center gap-2 mb-8 animate-fade-in px-4">
                   {PRAYER_HINTS.map((hint, idx) => (
                       <span 
                         key={idx} 
                         className="text-[10px] text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 hover:bg-white/10 hover:text-cyan-300 transition-colors cursor-default"
                       >
                           {hint}
                       </span>
                   ))}
               </div>
           )}
      </div>

      <div className="max-w-2xl w-full text-center p-8 bg-white/5 rounded-[3rem] min-h-[100px] border border-white/5">
           <p className="text-white font-serif italic text-lg leading-relaxed">{transcription.join(' ')}</p>
      </div>

      {isActive && <button onClick={cleanup} className="mt-8 bg-red-600/80 hover:bg-red-600 p-6 rounded-full text-4xl shadow-lg transition-transform active:scale-95">🛑</button>}
    </div>
  );
};

export default PrayerRoomView;
