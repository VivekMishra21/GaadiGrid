import { createContext, useContext } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput } from 'react-native';

import { familyForWeight, fonts } from '../theme/fonts';

// Drop-in replacements for React Native's Text and TextInput that render in Manrope.
// Import these (not the react-native ones) so typography stays in one place.

const NestedText = createContext(false);

function withFont(style, nested) {
  const flat = StyleSheet.flatten(style) || {};
  if (flat.fontFamily) return style; // an explicit family (e.g. the wordmark) always wins
  // Nested text with no weight of its own inherits its parent's font instead of resetting it.
  if (nested && flat.fontWeight === undefined) return style;
  // The weight is baked into the chosen family file, so drop it: leaving it in would make
  // browsers fake an extra bold on top (RN-web ignores `fontWeight: undefined` overrides).
  const { fontWeight, ...rest } = flat;
  return { ...rest, fontFamily: familyForWeight(fontWeight) };
}

export function Text({ style, children, ...props }) {
  const nested = useContext(NestedText);
  return (
    <RNText {...props} style={withFont(style, nested)}>
      <NestedText.Provider value>{children}</NestedText.Provider>
    </RNText>
  );
}

export function TextInput({ style, ...props }) {
  return <RNTextInput {...props} style={withFont(style, false)} />;
}

export { fonts };
