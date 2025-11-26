import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1E88E5',
    onPrimary: '#FFFFFF',
    secondary: '#26A69A',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    error: '#D32F2F',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#90CAF9',
    onPrimary: '#0D47A1',
    secondary: '#80CBC4',
    background: '#0B0F14',
    surface: '#121212',
    error: '#EF5350',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};
