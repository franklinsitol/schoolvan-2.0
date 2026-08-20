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

  // Preferred friendly, natural Brazilian Portuguese FEMALE voices across Chrome, iOS, Android, Edge, Windows, macOS
  // e.g. Luciana, Letícia, Maria, Francisca, Helena, Vitória, Camila, Thalita, Alice, Joana, Fernanda, Google Português do Brasil, Microsoft Maria
  const femaleVoiceOrder = [
    /luciana/i,
    /leticia|letícia/i,
    /maria/i,
    /francisca/i,
    /helena/i,
    /vitoria|vitória/i,
    /camila/i,
    /thalita/i,
    /alice/i,
    /fernanda/i,
    /google português.*brasil/i,
    /google.*pt.*br/i,
    /microsoft.*maria/i,
    /microsoft.*francisca/i,
    /pt-br-wavenet/i,
    /pt-br-standard/i,
    /brazil.*female/i,
    /brasil.*feminino/i
  ];

  for (const regex of femaleVoiceOrder) {
    const found = ptVoices.find(v => regex.test(v.name));
    if (found) return found;
  }

  // Fallback to any PT-BR voice
  return ptVoices.find(v => v.lang && v.lang.toLowerCase().includes('br')) || ptVoices[0] || null;
}

/**
 * Strips all emojis, unicode pictographs, formatting marks, and URLs so speech synthesis
 * speaks clean, natural spoken Portuguese without reading emoji descriptions (e.g. "rosto sorridente").
 */
export function cleanTextForSpeech(raw: string): string {
  if (!raw) return '';
  return raw
    // Remove JSON action blocks if present in string
    .replace(/```action[\s\S]*?```/gi, '')
    .replace(/```[\s\S]*?```/gi, '')
    // Remove markdown links [Text](url) -> Text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove URLs
    .replace(/https?:\/\/\S+/gi, '')
    // Remove all Unicode emojis and pictographs
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\u{1F000}-\u{1FAFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{2300}-\u{23FF}]/gu, '')
    .replace(/[\u{2B50}-\u{2B55}]/gu, '')
    .replace(/[\u{203C}-\u{2049}]/gu, '')
    .replace(/[\u{2194}-\u{21AA}]/gu, '')
    .replace(/[\u{25AA}-\u{25FE}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '') // variation selectors
    // Remove formatting characters (*, _, #, ~, `, •, bullet points)
    .replace(/[*_#~`•|]/g, ' ')
    // Normalize punctuation & whitespace
    .replace(/\s+/g, ' ')
    .trim();
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

    // Clean text completely from emojis, markdown and non-spoken symbols
    const cleanText = cleanTextForSpeech(text);

    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';

    const voice = getBestTiaVoice();
    if (voice) {
      utterance.voice = voice;
    }

    // Natural, warm, friendly female speech cadence for T.IA copiloto
    utterance.rate = 1.05;
    utterance.pitch = 1.1;

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
