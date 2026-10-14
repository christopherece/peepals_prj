import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius } from '@/constants/Typography';
import { ToiletsProvider } from '@/lib/ToiletsContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on a sheet route keeps the tabs underneath.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

/** React Navigation theme built from our tokens, so tab bars and screen backgrounds match the app. */
function navigationTheme(scheme: 'light' | 'dark') {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const c = Colors[scheme];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.tint,
      background: c.background,
      card: c.elevated,
      text: c.text,
      border: c.border,
    },
  };
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  // Native bottom sheets (UISheetPresentationController / Material bottom sheet).
  // Sheets render their own titles: native headers don't show inside form sheets.
  const sheet = {
    presentation: 'formSheet',
    headerShown: false,
    sheetGrabberVisible: true,
    sheetCornerRadius: Radius.lg,
    contentStyle: { backgroundColor: Colors[colorScheme].elevated },
  } as const;

  return (
    <ThemeProvider value={navigationTheme(colorScheme)}>
      <ToiletsProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* At the small detent the map stays visible and usable above the card. */}
          <Stack.Screen
            name="toilet/[id]"
            options={{ ...sheet, sheetAllowedDetents: [0.45, 1], sheetLargestUndimmedDetentIndex: 0 }}
          />
          <Stack.Screen name="add-toilet" options={{ ...sheet, sheetAllowedDetents: [0.8, 1] }} />
          <Stack.Screen name="sign-in" options={{ ...sheet, sheetAllowedDetents: [0.7, 1] }} />
        </Stack>
      </ToiletsProvider>
    </ThemeProvider>
  );
}
