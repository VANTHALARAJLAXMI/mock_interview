import { useCallback, useEffect, useState } from 'react';

const supported =
  typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

/** Text-to-speech via the browser SpeechSynthesis API. */
export default function useSpeechSynthesis(lang = 'en-US') {
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supported) return undefined;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load);
      window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text) => {
      if (!supported || !text) return;
      setError('');
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      const wanted = lang.toLowerCase();
      const base = wanted.split('-')[0];
      const voice =
        voices.find((v) => v.lang.toLowerCase() === wanted) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(base));
      if (voice) utterance.voice = voice;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = (e) => {
        setSpeaking(false);
        if (e.error && e.error !== 'canceled' && e.error !== 'interrupted') {
          setError('Audio playback failed. This device may not have a suitable voice installed.');
        }
      };
      window.speechSynthesis.speak(utterance);
    },
    [lang, voices],
  );

  return { supported, speaking, speak, stop, error, noVoices: supported && voices.length === 0 };
}
