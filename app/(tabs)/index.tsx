import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FilterChips from '@/components/FilterChips';
import PressableScale from '@/components/PressableScale';
import StatusMessage from '@/components/StatusMessage';
import { Text, useThemeColor } from '@/components/Themed';
import ToiletMap from '@/components/ToiletMap';
import { emergencyRed } from '@/constants/Colors';
import { Radius, Space } from '@/constants/Typography';
import { findEmergencyToilet } from '@/lib/emergency';
import { useToilets } from '@/lib/ToiletsContext';
import { useRequireMember } from '@/lib/useRequireMember';

const EMERGENCY_HEIGHT = 60;
const FAB_SIZE = 56;

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const requireMember = useRequireMember();
  const { location, status, visible, allNearby } = useToilets();
  const elevated = useThemeColor({}, 'elevated');
  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');

  const openToilet = (id: string) => router.push({ pathname: '/toilet/[id]', params: { id } });

  const onEmergency = () => {
    const best = findEmergencyToilet(allNearby);
    if (!best) {
      Alert.alert(
        'No free toilet found nearby',
        'Try a café or shopping mall, or turn off filters in the Nearby tab to see paid and customers-only options.'
      );
      return;
    }
    router.push({ pathname: '/toilet/[id]', params: { id: best.id, emergency: '1' } });
  };

  const onAddSpot = () => {
    if (requireMember('add-toilet')) router.push('/add-toilet');
  };

  return (
    <View style={styles.container}>
      {location ? (
        <ToiletMap
          location={location}
          toilets={visible}
          onOpen={openToilet}
          bottomInset={EMERGENCY_HEIGHT + Space.lg * 2}
        />
      ) : (
        <StatusMessage />
      )}

      <View style={[styles.top, { paddingTop: insets.top + Space.xs }]} pointerEvents="box-none">
        <FilterChips floating />
        {location && status === 'loading' && (
          <View style={[styles.loading, styles.shadow, { backgroundColor: elevated }]}>
            <ActivityIndicator size="small" />
            <Text type="subhead">Looking for toilets…</Text>
          </View>
        )}
      </View>

      {location && (
        <PressableScale
          onPress={onAddSpot}
          accessibilityRole="button"
          accessibilityLabel="Add a missing toilet here"
          style={[
            styles.fab,
            styles.shadow,
            { backgroundColor: tint, bottom: (status === 'ready' ? EMERGENCY_HEIGHT : 0) + Space.lg * 2 },
          ]}>
          <Text style={[styles.fabIcon, { color: onTint }]}>+</Text>
        </PressableScale>
      )}

      {status === 'ready' && (
        <PressableScale
          onPress={onEmergency}
          pressedScale={0.97}
          accessibilityRole="button"
          accessibilityHint="Opens the nearest free toilet that is open now"
          style={[styles.emergency, styles.shadow]}>
          <Text type="headline" style={styles.emergencyText}>
            🚨 I need to go NOW
          </Text>
        </PressableScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', gap: Space.sm },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
  },
  fab: {
    position: 'absolute',
    right: Space.lg,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: { fontSize: 32, lineHeight: 34, fontWeight: '400' },
  emergency: {
    position: 'absolute',
    bottom: Space.lg,
    left: Space.lg,
    right: Space.lg,
    height: EMERGENCY_HEIGHT,
    backgroundColor: emergencyRed,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyText: { color: '#fff', fontSize: 19, fontWeight: '800' },
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
