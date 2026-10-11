import { useRouter } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';

import FilterChips from '@/components/FilterChips';
import StatusMessage from '@/components/StatusMessage';
import { Text, View, useThemeColor } from '@/components/Themed';
import ToiletRow from '@/components/ToiletRow';
import { useToilets } from '@/lib/ToiletsContext';

export default function NearbyScreen() {
  const router = useRouter();
  const { status, visible, allNearby, reviews, refresh } = useToilets();
  const muted = useThemeColor({}, 'muted');

  if (status !== 'ready' && allNearby.length === 0) return <StatusMessage />;

  return (
    <View style={styles.container}>
      <FilterChips />
      <FlatList
        data={visible}
        keyExtractor={(t) => t.id}
        refreshing={status === 'locating' || status === 'loading'}
        onRefresh={refresh}
        renderItem={({ item }) => (
          <ToiletRow
            toilet={item}
            reviews={reviews.filter((r) => r.toiletId === item.id)}
            onPress={() => router.push({ pathname: '/toilet/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: muted }]}>
            {allNearby.length === 0
              ? 'No toilets mapped within 2 km. Be the first to add one with the + button on the Map tab.'
              : 'No toilets match these filters.'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { textAlign: 'center', padding: 32, fontSize: 15 },
});
