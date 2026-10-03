import { colors } from '../theme/colors';

// Screens that have no back control of their own get a quiet native header: just the back
// arrow, on the page background, with no title or divider.
export const backHeader = {
  headerShown: true,
  title: '',
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.textPrimary,
  headerBackButtonDisplayMode: 'minimal',
};
