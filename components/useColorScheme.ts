import { useColorScheme as useColorSchemeCore } from 'react-native';

/** The system scheme; anything other than dark (unset, unknown) counts as light. */
export const useColorScheme = (): 'light' | 'dark' => (useColorSchemeCore() === 'dark' ? 'dark' : 'light');
