// Sound helper for pleasant bus horn ("Bi-bi!") and speech synthesis
export function playBusHornSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // Pleasant double horn "Bi-bi!"
    playTone(440, now, 0.12);           // First tone (A4)
    playTone(523.25, now + 0.14, 0.18);  // Second tone (C5)
  } catch (e) {
    console.warn("Audio playback not supported or blocked:", e);
  }
}

// Pre-load and cache voices to prevent empty list on first trigger
let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoices() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        cachedVoices = v;
      }
    } catch (e) {
      // ignore
    }
  }
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    refreshVoices();
  };
}

export function getBestTiaVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  
  refreshVoices();
  const voices = cachedVoices.length > 0 ? cachedVoices : (window.speechSynthesis.getVoices() || []);
  if (!voices || voices.length === 0) return null;

  const ptVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('pt'));
  if (ptVoices.length === 0) return voices[0] || null;

  // Preferred friendly natural Brazilian Portuguese voices (e.g. Luciana, Maria, Letícia, Francisca, Google, Microsoft, Apple, Vitória)
  const naturalPtVoice = ptVoices.find(v => 
    /luciana|maria|leticia|letícia|francisca|google|pt-br-wavenet|pt-br-standard|helena|zira|vitoria|vitória|brazil|brasil/i.test(v.name)
  );
  if (naturalPtVoice) return naturalPtVoice;

  // Fallback to any PT-BR voice
  return ptVoices.find(v => v.lang && v.lang.toLowerCase().includes('br')) || ptVoices[0] || null;
}

export function speakTiaPrompt(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  try {
    window.speechSynthesis.cancel();

    // Ensure voices are loaded
    refreshVoices();

    const cleanText = text.replace(/[*_#~`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';

    const voice = getBestTiaVoice();
    if (voice) {
      utterance.voice = voice;
    }

    // Natural, warm, friendly speech cadence for T.IA copiloto
    utterance.rate = 1.02;
    utterance.pitch = 1.05;

    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }
    
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("Speech synthesis error:", e);
    if (onEnd) onEnd();
  }
}

// Backward-compatibility alias
export const speakTioIAPrompt = speakTiaPrompt;

