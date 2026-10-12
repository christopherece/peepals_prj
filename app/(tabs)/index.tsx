import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, StyleSheet } from 'react-native';

import FilterChips from '@/components/FilterChips';
import StatusMessage from '@/components/StatusMessage';
import { Text, View } from '@/components/Themed';
import ToiletMap from '@/components/ToiletMap';
import { emergencyRed } from '@/constants/Colors';
import { findEmergencyToilet } from '@/lib/emergency';
import { useToilets } from '@/lib/ToiletsContext';

export default function MapScreen() {
  const router = useRouter();
  const { location, status, visible, allNearby, refresh } = useToilets();
  const busy = status === 'locating' || status === 'loading';

  const openToilet = (id: string) => router.push({ pathname: '/toilet/[id]', params: { id } });

  const onEmergency = () => {
    const best = findEmergencyToilet(allNearby);
    if (!best) {
      Alert.alert(
        'No free toilet found nearby',
        'None of the toilets within 2 km are known to be free and open to everyone. Check the Nearby tab for paid and customers-only options, or try a café or shopping mall.'
      );
      return;
    }
    router.push({ pathname: '/toilet/[id]', params: { id: best.id, emergency: '1' } });
  };

  return (
    <View style={styles.container}>
      {location ? <ToiletMap location={location} toilets={visible} onOpen={openToilet} /> : <StatusMessage />}

      <View style={styles.filters} lightColor="rgba(255,255,255,0.92)" darkColor="rgba(0,0,0,0.75)">
        <FilterChips />
      </View>

      {location && busy && (
        <View style={styles.loading} lightColor="#fff" darkColor="#1E293B">
          <ActivityIndicator />
          <Text>Looking for toilets…</Text>
        </View>
      )}

      {location && status === 'error' && (
        <View style={styles.loading} lightColor="#fff" darkColor="#1E293B">
          <Text>Couldn’t refresh. Tap ↻ to try again.</Text>
        </View>
      )}

      {location && (
        <Pressable
          onPress={refresh}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Re-center on my location and search again"
          style={({ pressed }) => [styles.refresh, { opacity: pressed || busy ? 0.6 : 1 }]}>
          <Text style={styles.refreshText}>↻</Text>
        </Pressable>
      )}

      {status === 'ready' && (
        <Pressable
          onPress={onEmergency}
          accessibilityRole="button"
          accessibilityHint="Opens the nearest free toilet that is open now"
          style={({ pressed }) => [styles.emergency, { opacity: pressed ? 0.85 : 1 }]}>
          <Text style={styles.emergencyText}>🚨 I need to go NOW</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filters: { position: 'absolute', top: 0, left: 0, right: 0 },
  loading: {
    position: 'absolute',
    top: 64,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  refresh: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  refreshText: { fontSize: 24, color: '#0F172A' },
  emergency: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: emergencyRed,
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  emergencyText: { color: '#fff', fontSize: 20, fontWeight: '800' },
});
