// Tiny generated sound effects: short WebAudio blips, no audio files, no
// network. Sound starts only after the player's first key or click (the
// browser's autoplay rule), and every failure is silent — a game that cannot
// beep must still play.

export function createAudio() {
  let context = null;

  function ensureContext() {
    if (context) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return context;
    }
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      context = new AudioCtor();
      return context;
    } catch {
      return null;
    }
  }

  function blip(frequency, seconds, type, volume, slideTo) {
    const ctx = ensureContext();
    if (!ctx) return;
    try {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + seconds);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + seconds);
    } catch {
      // A busy or closed context must never break the game loop.
    }
  }

  return {
    unlock() { ensureContext(); },
    orb() { blip(880, 0.12, 'sine', 0.16, 1320); },
    shield() { blip(520, 0.2, 'triangle', 0.18, 780); },
    dash() { blip(240, 0.16, 'sawtooth', 0.07, 620); },
    hit() { blip(160, 0.3, 'square', 0.16, 60); },
    clear() { blip(660, 0.28, 'sine', 0.18, 990); },
    over() { blip(320, 0.7, 'triangle', 0.2, 55); }
  };
}
