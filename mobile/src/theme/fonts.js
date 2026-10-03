import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';

// GaadiGrid's single typeface. React Native picks a font file by family name, not by
// fontWeight, so each weight we use is registered as its own family.
//   400 Regular   body copy
//   600 SemiBold  buttons, navigation, labels, sub-headings
//   700 Bold      headings, prices, numbers
//   800 ExtraBold the GaadiGrid wordmark only
export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
};

export const fontAssets = {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
};

// Existing styles ask for a fontWeight; this maps it onto the right Manrope file. 800/900
// are deliberately Bold: ExtraBold is reserved for the wordmark (it sets fontFamily itself),
// so headings written as '800' render as the spec'd Bold without touching every style.
export function familyForWeight(weight) {
  switch (String(weight ?? '400')) {
    case '100':
    case '200':
    case '300':
    case '400':
    case 'normal':
      return fonts.regular;
    case '500':
      return fonts.medium;
    case '600':
      return fonts.semibold;
    default:
      return fonts.bold;
  }
}
