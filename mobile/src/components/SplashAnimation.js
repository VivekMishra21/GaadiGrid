import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

import { SPLASH_FONT_BASE64 } from './splashFont';
import { SPLASH_SVG } from './splashAnimationSvg';

// react-native-svg can't play SMIL (<animate>), which this asset is built from, so a
// WebView renders the SVG natively and the browser timeline drives the animation.
function buildHtml(background) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>@font-face{font-family:Manrope;font-weight:200 800;src:url(data:font/woff2;base64,${SPLASH_FONT_BASE64}) format('woff2')}
html,body{margin:0;height:100%;overflow:hidden;background:${background}}
body{display:flex;align-items:center;justify-content:center}svg{width:100vmin;height:100vmin}svg text{font-weight:800}</style>
</head><body>${SPLASH_SVG}</body></html>`;
}

export function SplashAnimation({ background, onStart }) {
  return (
    <WebView
      originWhitelist={['*']}
      source={{ html: buildHtml(background) }}
      style={[styles.web, { backgroundColor: background }]}
      containerStyle={{ backgroundColor: background }}
      scrollEnabled={false}
      bounces={false}
      overScrollMode="never"
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      pointerEvents="none"
      onLoadEnd={onStart}
    />
  );
}

const styles = StyleSheet.create({
  web: { flex: 1 },
});
