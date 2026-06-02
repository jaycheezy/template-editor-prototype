import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

/**
 * Marketing Cloud design tokens, mirrored from the production
 * `@adflow/theme` package so the prototype reads as the real product.
 */
export const mc = {
  blue: '#3367D6',
  blueDark: '#2750A8',
  blueLight: '#7095E2',
  blueLighter: '#ADC2EF',
  navy: '#00003C',
  red: '#FF0000',
  green: '#149436',
  orange: '#F49B12',
  grey: '#E3E3E3',
  greyDark: '#9F9F9F',
  greyDarker: '#404040',
  secondary: '#E4F3FF',
  secondaryText: '#3367D6',
  error: '#DA0101',
};

const theme = extendTheme({
  config,
  fonts: {
    heading: `'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif`,
    body: `'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif`,
  },
  colors: {
    mcBlue: {
      50: '#eef3fc',
      100: '#d6e2f7',
      200: mc.blueLighter,
      300: mc.blueLight,
      400: '#4c7bdd',
      500: mc.blue,
      600: mc.blueDark,
      700: '#1f4187',
      800: '#19346e',
      900: '#102249',
    },
    brand: {
      500: mc.blue,
      600: mc.blueDark,
    },
  },
  styles: {
    global: {
      'html, body, #root': {
        height: '100%',
        margin: 0,
      },
      body: {
        bg: 'white',
        color: '#1f2733',
        fontSize: '14px',
        WebkitFontSmoothing: 'antialiased',
      },
      '*::-webkit-scrollbar': {
        width: '10px',
        height: '10px',
      },
      '*::-webkit-scrollbar-thumb': {
        background: '#cdd5df',
        borderRadius: '8px',
      },
      '*::-webkit-scrollbar-track': {
        background: 'transparent',
      },
    },
  },
  components: {
    Button: {
      baseStyle: { fontWeight: 700, borderRadius: '6px' },
      defaultProps: { colorScheme: 'mcBlue' },
    },
  },
});

export default theme;
