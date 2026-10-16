import { useCallback, useEffect, useRef, useState } from 'react';

const Recognition =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

const FATAL_ERRORS = {
  'not-allowed':
    'Microphone permission was denied. You can allow it in your browser settings, or just type your answer.',
  'service-not-allowed':
    'Speech recognition is blocked by the browser or device settings. You can type your answer instead.',
  'audio-capture': 'No microphone was found. Check your device, or type your answer instead.',
  network:
    'Speech recognition needs a network connection in this browser. Check your connection, or type your answer.',
  'language-not-supported': 'This recognition language is not supported in your browser.',
};

/**
 * Speech-to-text via the browser Web Speech API.
 * Final phrases are passed to onFinalText; in-progress words are exposed as `interim`.
 */
export default function useSpeechRecognition({ lang = 'en-US', onFinalText }) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');

  const recRef = useRef(null);
  const wantListeningRef = useRef(false);
  const callbackRef = useRef(onFinalText);

  useEffect(() => {
    callbackRef.current = onFinalText;
  });

  const start = useCallback(() => {
    if (!Recognition) return;
    setError('');
    if (recRef.current) {
      try {
        recRef.current.abort();
      } catch {
        /* ignore */
      }
    }

    const rec = new Recognition();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    let fatal = false;

    rec.onstart = () => setListening(true);
    rec.onresult = (event) => {
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) callbackRef.current?.(text);
        else interimText += text;
      }
      setInterim(interimText);
    };
    rec.onerror = (event) => {
      if (FATAL_ERRORS[event.error]) {
        fatal = true;
        wantListeningRef.current = false;
        setError(FATAL_ERRORS[event.error]);
      } else if (event.error === 'no-speech') {
        setError('No speech detected yet. Keep talking, or press stop.');
      }
    };
    rec.onend = () => {
      setInterim('');
      // Browsers end continuous sessions after silence; restart while the user still wants it.
      if (wantListeningRef.current && !fatal) {
        try {
          rec.start();
          return;
        } catch {
          /* fall through */
        }
      }
      wantListeningRef.current = false;
      setListening(false);
    };

    recRef.current = rec;
    wantListeningRef.current = true;
    try {
      rec.start();
    } catch {
      wantListeningRef.current = false;
      setListening(false);
      setError('Could not start speech recognition. You can type your answer instead.');
    }
  }, [lang]);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    if (recRef.current) {
      try {
        recRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    setListening(false);
    setInterim('');
  }, []);

  useEffect(
    () => () => {
      wantListeningRef.current = false;
      if (recRef.current) {
        try {
          recRef.current.abort();
        } catch {
          /* ignore */
        }
      }
    },
    [],
  );

  return { supported: Boolean(Recognition), listening, interim, error, start, stop };
}
