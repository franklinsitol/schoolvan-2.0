// Sound helper for pleasant bus horn ("Bi-bi!") and speech synthesis
export function playBusHornSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.25, startTime);
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

export function speakTioIAPrompt(text: string) {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#~]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';

    // Search available system voices for natural Brazilian Portuguese male or friendly voices
    const voices = window.speechSynthesis.getVoices();
    const ptVoices = voices.filter(v => v.lang.includes('pt') || v.lang.includes('PT'));
    
    // Look for male/natural PT-BR voice profiles (e.g. Daniel, Felipe, Ricardo, Antonio, Google, Microsoft)
    const preferredMaleVoice = ptVoices.find(v => 
      /daniel|felipe|ricardo|antonio|mario|homem|male|google|microsoft/i.test(v.name)
    ) || ptVoices[0];

    if (preferredMaleVoice) {
      utterance.voice = preferredMaleVoice;
    }

    // Natural speech cadence & friendly warm male driver tone ("Tio da Van")
    utterance.rate = 1.0;
    utterance.pitch = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("Speech synthesis error:", e);
  }
}
