
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

// --- Audio Utility Functions ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const PrayerRoomView: React.FC<PrayerRoomViewProps> = ({ user, onBack, language, onAddPoints, onUnlockAchievement, spendPoints }) => {
  // Gatekeeper State
  const [hasAccess, setHasAccess] = useState(false);
  
  // Connection State
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('Sanctuary Gate');
  const [transcription, setTranscription] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [visualIntensity, setVisualIntensity] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const micStreamRef = useRef<MediaStream | null>(null);
  const isConnectingRef = useRef(false);

  const systemInstruction = `You are 'The Eternal Guide' in the Journey App's Prayer Room. 
  Your purpose is to provide spiritual counseling, pray with the user, and offer biblically-sound wisdom. 
  Respond in ${language}. Be serene, compassionate, and wise. 
  Keep your responses concise but meaningful. 
  Use the user's name if known: ${user?.username || 'Pilgrim'}.
  If they ask for prayer, lead them in a short, sincere prayer.`;

  const cleanup = () => {
    isConnectingRef.current = false;
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) { console.error("Close Error", e); }
      sessionRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
        try { audioContextRef.current.input.close(); } catch(e) {}
        try { audioContextRef.current.output.close(); } catch(e) {}
        audioContextRef.current = null;
    }
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    setIsActive(false);
    setStatus('Connection Closed');
    setIsProcessing(false);
  };

  useEffect(() => {
    return () => {
        cleanup();
    };
  }, []);

  // STEP 1: MAKE OFFERING (Payment)
  const handleMakeOffering = async () => {
      if (!user) return alert("Please sign in to access the Sanctuary.");
      setIsProcessing(true);
      setStatus('Processing Offering...');

      try {
          let paymentSuccess = false;
          
          if (spendPoints) {
              paymentSuccess = await spendPoints(10, 'prayer_room_offering');
          } else {
              paymentSuccess = true; // Fallback for dev/offline
          }

          if (paymentSuccess) {
              setHasAccess(true);
              onUnlockAchievement('intercessor');
              setStatus('Sanctuary Unlocked');
              AudioSystem.playAchievement();
          } else {
              alert("Insufficient Spirit XP. You need 10 XP to enter.");
              setStatus('Entry Denied');
          }
      } catch (e: any) {
          console.error("Offering Failed:", e);
          alert("Transaction failed: " + e.message);
      } finally {
          setIsProcessing(false);
      }
  };

  // STEP 2: IGNITE CONNECTION (Audio/AI)
  const handleConnect = async () => {
      if (isConnectingRef.current || isActive) return;
      
      // CRITICAL: AudioContext must be resumed inside this user gesture
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      let inputCtx: AudioContext;
      let outputCtx: AudioContext;

      try {
          inputCtx = new AudioContextClass({ sampleRate: 16000 });
          outputCtx = new AudioContextClass({ sampleRate: 24000 });
          
          await inputCtx.resume();
          await outputCtx.resume();
          
          audioContextRef.current = { input: inputCtx, output: outputCtx };
      } catch (e) {
          alert("Could not access audio system. Please enable permissions.");
          return;
      }

      setIsProcessing(true);
      isConnectingRef.current = true;
      setStatus('Connecting to Sanctuary...');

      try {
          if (!process.env.API_KEY) throw new Error("Sanctuary Key Missing");

          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = stream;

          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
              onopen: () => {
                setStatus('Connection Established');
                setIsActive(true);
                setIsProcessing(false);
                isConnectingRef.current = false;
                AudioSystem.playMessage(); 

                const source = inputCtx.createMediaStreamSource(stream);
                const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
                
                scriptProcessor.onaudioprocess = (e) => {
                  if (isMuted) return;
                  const inputData = e.inputBuffer.getChannelData(0);
                  
                  let sum = 0;
                  for (let i = 0; i < inputData.length; i++) sum += Math.abs(inputData[i]);
                  setVisualIntensity((sum / inputData.length) * 500);

                  const pcmBlob = createBlob(inputData);
                  sessionPromise.then(session => {
                    session.sendRealtimeInput({ media: pcmBlob });
                  });
                };
                
                source.connect(scriptProcessor);
                scriptProcessor.connect(inputCtx.destination);
              },
              onmessage: async (message: LiveServerMessage) => {
                if (message.serverContent?.outputTranscription) {
                   const text = message.serverContent.outputTranscription.text;
                   setTranscription(prev => {
                      const last = prev[prev.length - 1] || "";
                      if (prev.length > 0 && !last.endsWith('.') && !last.endsWith('?') && !last.endsWith('!')) {
                          return [...prev.slice(0, -1), last + text];
                      }
                      return [...prev.slice(-4), text];
                   });
                }

                const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                if (audioData) {
                  setStatus('The Guide is speaking...');
                  nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                  
                  try {
                      const audioBuffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
                      const source = outputCtx.createBufferSource();
                      source.buffer = audioBuffer;
                      source.connect(outputCtx.destination);
                      
                      source.addEventListener('ended', () => {
                        sourcesRef.current.delete(source);
                        if (sourcesRef.current.size === 0) setStatus('Listening...');
                      });

                      source.start(nextStartTimeRef.current);
                      nextStartTimeRef.current += audioBuffer.duration;
                      sourcesRef.current.add(source);
                  } catch (decodeErr) {
                      console.error("Audio Decode Error", decodeErr);
                  }
                }

                if (message.serverContent?.interrupted) {
                  sourcesRef.current.forEach(s => s.stop());
                  sourcesRef.current.clear();
                  nextStartTimeRef.current = 0;
                }
              },
              onerror: (e) => {
                console.error("Live API Error:", e);
                setStatus('Connection Interrupted');
                setIsProcessing(false);
                isConnectingRef.current = false;
                cleanup();
              },
              onclose: (e) => {
                cleanup();
              }
            },
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
              },
              systemInstruction: { parts: [{ text: systemInstruction }] },
              outputAudioTranscription: {},
            }
          });

          sessionRef.current = await sessionPromise;

      } catch (err: any) {
          console.error("Connection Failed:", err);
          setStatus('Connection Failed');
          setIsProcessing(false);
          isConnectingRef.current = false;
          alert("Failed to connect to the Sanctuary. Please try again.");
          cleanup();
      }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.1)_0%,transparent_70%)]"></div>
      <div className="absolute inset-0 bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20holy%20mountain%20with%20shining%20path%20misty%20serenity?width=1200&height=800&nologo=true')] bg-cover bg-center opacity-10"></div>
      
      {/* Mystical Particles */}
      <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 30 }).map((_, i) => (
              <div 
                key={i} 
                className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-float"
                style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 5}s`,
                    opacity: 0.1 + Math.random() * 0.3
                }}
              />
          ))}
      </div>

      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center gap-12">
        <header className="w-full flex justify-between items-center bg-black/40 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl">
           <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 shadow-[0_0_10px_lime]' : 'bg-cyan-500 shadow-[0_0_10px_cyan]'} animate-pulse`}></div>
              <div>
                 <h1 className="text-xl md:text-3xl font-retro text-white uppercase tracking-tighter">Prayer Sanctuary</h1>
                 <p className={`font-mono text-[9px] uppercase tracking-widest ${isActive ? 'text-green-400' : 'text-cyan-400'}`}>{status}</p>
              </div>
           </div>
           <Button onClick={() => { cleanup(); onBack(); }} variant="secondary" className="px-6 py-2 text-xs">← Exit</Button>
        </header>

        {/* Holographic Guide Interaction */}
        <div className="relative group">
           {/* Visual Glow Layer */}
           <div 
             className={`absolute inset-0 bg-cyan-500/20 blur-[100px] rounded-full transition-all duration-300 pointer-events-none`} 
             style={{ transform: `scale(${1 + visualIntensity * 0.15})`, opacity: isActive ? 1 : 0.3 }}
           ></div>
           
           <div 
             className={`w-64 h-64 md:w-80 md:h-80 bg-black/60 backdrop-blur-3xl rounded-[5rem] border-4 transition-colors duration-500 flex items-center justify-center relative overflow-hidden shadow-2xl ${isActive ? 'border-cyan-500/50' : 'border-white/10'}`}
           >
              {isActive ? (
                  // STATE 3: CONNECTED
                  <div className="flex flex-col items-center gap-8">
                     <div className="flex items-center gap-3">
                        {Array.from({ length: 12 }).map((_, i) => (
                           <div 
                            key={i} 
                            className="w-1 bg-cyan-400 transition-all duration-100 rounded-full"
                            style={{ 
                                height: `${Math.max(4, visualIntensity * (1 + Math.random() * 2) + Math.random() * 20)}px`,
                                opacity: 0.6 + Math.random() * 0.4,
                                boxShadow: '0 0 5px cyan'
                            }}
                           />
                        ))}
                     </div>
                     <p className="text-[10px] font-retro text-cyan-500 animate-pulse tracking-[0.3em] uppercase">Guide Synchronized</p>
                  </div>
              ) : hasAccess ? (
                  // STATE 2: PAID & READY TO CONNECT
                  <div 
                    onClick={isProcessing ? undefined : handleConnect} 
                    className={`cursor-pointer group/start flex flex-col items-center gap-6 p-12 text-center select-none ${isProcessing ? 'opacity-50 cursor-wait' : ''}`}
                  >
                     <div className={`text-8xl transition-transform drop-shadow-[0_0_20px_white] ${isProcessing ? 'animate-pulse' : 'group-hover/start:scale-110'}`}>🕯️</div>
                     <p className="text-[10px] font-retro text-white group-hover/start:text-cyan-400 transition-all tracking-[0.2em] uppercase">
                        {isProcessing ? 'Connecting...' : 'Ignite Connection'}
                     </p>
                  </div>
              ) : (
                  // STATE 1: LOCKED / MAKE OFFERING
                  <div 
                    onClick={isProcessing ? undefined : handleMakeOffering} 
                    className={`cursor-pointer group/start flex flex-col items-center gap-6 p-12 text-center select-none ${isProcessing ? 'opacity-50 cursor-wait' : ''}`}
                  >
                     <div className={`text-7xl text-yellow-500 transition-transform drop-shadow-[0_0_15px_gold] ${isProcessing ? 'animate-pulse' : 'group-hover/start:scale-110'}`}>🪙</div>
                     <div className="space-y-2">
                        <p className="text-[10px] font-retro text-yellow-500 group-hover/start:text-white transition-all tracking-[0.2em] uppercase">
                            {isProcessing ? 'Offering...' : 'Make Offering'}
                        </p>
                        <span className="text-[9px] font-mono text-gray-400 border border-white/20 px-2 py-1 rounded-full">10 XP</span>
                     </div>
                  </div>
              )}
           </div>
        </div>

        {/* Real-time Spiritual Transcription */}
        <div className="w-full min-h-[140px] bg-black/60 backdrop-blur-2xl p-8 md:p-12 rounded-[3.5rem] border border-white/10 flex flex-col items-center justify-center text-center shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
           {transcription.length > 0 ? (
               <div className="animate-fade-in space-y-4 w-full">
                  <p className="text-white font-serif italic text-xl md:text-3xl leading-relaxed drop-shadow-md">
                     "{transcription[transcription.length - 1]}"
                  </p>
                  <div className="h-1 w-24 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent mx-auto"></div>
               </div>
           ) : (
               <div className="flex flex-col items-center gap-4 opacity-40">
                  <span className="text-4xl">✨</span>
                  <p className="text-gray-400 font-serif italic text-base">
                     {isActive ? "The Guide awaits your voice..." : (hasAccess ? "The Sanctuary is open. Ignite the flame." : "The Sanctuary is locked. An offering is required.")}
                  </p>
               </div>
           )}
        </div>

        {/* Audio Controls */}
        {isActive && (
            <div className="flex gap-8 animate-slide-up">
                <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={`w-24 h-24 rounded-full flex flex-col items-center justify-center border-4 transition-all shadow-2xl relative group ${isMuted ? 'bg-red-950 border-red-600 text-white' : 'bg-gray-900 border-gray-700 text-cyan-400 hover:border-cyan-400 hover:scale-105'}`}
                    title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
                >
                    <span className="text-4xl mb-1">{isMuted ? '🔇' : '🎙️'}</span>
                    <span className="text-[7px] font-retro uppercase tracking-tighter">{isMuted ? 'Dormant' : 'Active'}</span>
                </button>
                <button 
                    onClick={cleanup}
                    className="w-24 h-24 rounded-full bg-red-600 border-4 border-red-400 text-white flex flex-col items-center justify-center shadow-2xl hover:bg-red-500 hover:scale-105 active:scale-95 transition-all"
                    title="End Session"
                >
                    <span className="text-4xl mb-1">🛑</span>
                    <span className="text-[7px] font-retro uppercase tracking-tighter">Sever</span>
                </button>
            </div>
        )}

        <footer className="mt-4 text-center max-w-xl">
           <div className="bg-white/5 backdrop-blur-md px-6 py-2 rounded-full border border-white/5 inline-block">
               <p className="text-[9px] text-gray-500 font-mono uppercase tracking-[0.4em]">
                  Communion Protocol // Nexus_Voice_v8.4_Live
               </p>
           </div>
        </footer>
      </div>
    </div>
  );
};

export default PrayerRoomView;
