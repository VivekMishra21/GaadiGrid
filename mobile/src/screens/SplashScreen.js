import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { SplashAnimation } from '../components/SplashAnimation';

// The artwork has dark lettering, so it needs a light canvas (same as the website).
const SPLASH_BG = '#F8FAF9';
// One full play of assets/splashscreen.svg (5s timeline; the wordmark lands at ~4.8s).
const SPLASH_ANIMATION_MS = 5000;
// If the WebView never reports it finished loading, start the clock anyway.
const START_FALLBACK_MS = 2000;

export function SplashScreen({ onFinish }) {
  const finishTimer = useRef(null);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  function startClock() {
    if (finishTimer.current) return;
    finishTimer.current = setTimeout(() => onFinishRef.current?.(), SPLASH_ANIMATION_MS);
  }

  useEffect(() => {
    const fallback = setTimeout(startClock, START_FALLBACK_MS);
    return () => {
      clearTimeout(fallback);
      clearTimeout(finishTimer.current);
    };
  }, []);

  return (
    <View style={styles.container}>
      <SplashAnimation background={SPLASH_BG} onStart={startClock} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SPLASH_BG,
  },
});
