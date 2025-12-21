// Simple Web Audio API synthesizer for retro sound effects
export const AudioSystem = {
  ctx: null as AudioContext | null,

  init: () => {
    if (!AudioSystem.ctx) {
      AudioSystem.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (AudioSystem.ctx.state === 'suspended') {
      AudioSystem.ctx.resume().catch(console.error);
    }
  },

  playMessage: () => {
    AudioSystem.init();
    if (!AudioSystem.ctx) return;
    
    const t = AudioSystem.ctx.currentTime;
    const osc = AudioSystem.ctx.createOscillator();
    const gain = AudioSystem.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(AudioSystem.ctx.destination);
    
    // Soft high-pitch blip for UI message
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
    
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    
    osc.start(t);
    osc.stop(t + 0.1);
  },

  playVoxelTap: () => {
    // Subtle tick for hovering over blocks
    AudioSystem.init();
    if (!AudioSystem.ctx) return;
    
    const t = AudioSystem.ctx.currentTime;
    const osc = AudioSystem.ctx.createOscillator();
    const gain = AudioSystem.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(AudioSystem.ctx.destination);
    
    osc.type = 'sine';
    // Slight pitch variation for organic feel
    const freq = 800 + (Math.random() * 200);
    osc.frequency.setValueAtTime(freq, t);
    
    // Very short, very quiet
    gain.gain.setValueAtTime(0.02, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    
    osc.start(t);
    osc.stop(t + 0.05);
  },

  playAchievement: () => {
    AudioSystem.init();
    if (!AudioSystem.ctx) return;
    const t = AudioSystem.ctx.currentTime;
    
    // Rapid ascending major arpeggio
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C E G C
    
    freqs.forEach((f, i) => {
        const osc = AudioSystem.ctx!.createOscillator();
        const gain = AudioSystem.ctx!.createGain();
        osc.connect(gain);
        gain.connect(AudioSystem.ctx!.destination);
        
        osc.type = 'triangle';
        osc.frequency.value = f;
        
        const start = t + (i * 0.08);
        gain.gain.setValueAtTime(0.05, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
        
        osc.start(start);
        osc.stop(start + 0.3);
    });
  },

  playLevelComplete: () => {
    AudioSystem.init();
    if (!AudioSystem.ctx) return;
    const t = AudioSystem.ctx.currentTime;
    
    // Victory fanfare (C Major sequence)
    // C4, E4, G4, C5 (held)
    const notes = [
      { f: 261.63, d: 0.15, t: 0 },
      { f: 329.63, d: 0.15, t: 0.15 },
      { f: 392.00, d: 0.15, t: 0.30 },
      { f: 523.25, d: 0.80, t: 0.45 }
    ];

    notes.forEach((n) => {
        const osc = AudioSystem.ctx!.createOscillator();
        const gain = AudioSystem.ctx!.createGain();
        osc.connect(gain);
        gain.connect(AudioSystem.ctx!.destination);
        
        osc.type = 'square'; // 8-bit NES style
        osc.frequency.value = n.f;
        
        const start = t + n.t;
        gain.gain.setValueAtTime(0.03, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + n.d);
        
        osc.start(start);
        osc.stop(start + n.d);
    });
  }
}