import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { useToilets } from '@/lib/ToiletsContext';

/** Placeholder shown until we have a location, or when loading failed. */
export default function StatusMessage() {
  const { status, error, refresh } = useToilets();
  const tint = useThemeColor({}, 'tint');

  if (status === 'error') {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>{error}</Text>
        <Pressable onPress={refresh} style={[styles.button, { backgroundColor: tint }]}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator />
      <Text style={styles.text}>{status === 'locating' ? 'Finding your location…' : 'Looking for toilets…'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  text: { textAlign: 'center', fontSize: 16 },
  button: { borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
