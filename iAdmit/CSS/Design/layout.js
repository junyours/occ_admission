import { StyleSheet } from 'react-native';
import { spacing } from './theme';

export const layout = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mtMd: { marginTop: spacing.md },
  mtLg: { marginTop: spacing.lg },
});
