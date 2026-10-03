import { createElement, useEffect, useRef } from 'react';
import { View } from 'react-native';

import { SPLASH_SVG } from './splashAnimationSvg';

// react-native-webview has no web build; on web the SVG is injected inline so the
// browser's own SMIL timeline plays it when the element is inserted.
export function SplashAnimation({ background, onStart }) {
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;
  useEffect(() => {
    onStartRef.current?.();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: background, alignItems: 'center', justifyContent: 'center' }}>
      {createElement('div', {
        style: { width: 'min(100vw, 100vh)', height: 'min(100vw, 100vh)' },
        dangerouslySetInnerHTML: { __html: SPLASH_SVG },
      })}
    </View>
  );
}
