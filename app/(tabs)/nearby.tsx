import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet } from 'react-native';

import FilterChips from '@/components/FilterChips';
import StatusMessage from '@/components/StatusMessage';
import { Text, View, useThemeColor } from '@/components/Themed';
import ToiletRow from '@/components/ToiletRow';
import { useToilets } from '@/lib/ToiletsContext';
import { NO_FILTERS, type Review } from '@/lib/types';

const NO_REVIEWS: Review[] = [];

export default function NearbyScreen() {
  const router = useRouter();
  const { status, visible, allNearby, reviewsByToilet, refresh, setFilters } = useToilets();
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');

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
            reviews={reviewsByToilet.get(item.id) ?? NO_REVIEWS}
            onPress={() => router.push({ pathname: '/toilet/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          allNearby.length === 0 ? (
            <Text style={[styles.empty, { color: muted }]}>
              No toilets mapped within 2 km. Be the first to add one with the + button on the Map tab.
            </Text>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={[styles.empty, { color: muted }]}>
                No toilets match these filters ({allNearby.length} nearby in total).
              </Text>
              <Pressable
                onPress={() => setFilters(NO_FILTERS)}
                accessibilityRole="button"
                style={[styles.clear, { backgroundColor: tint }]}>
                <Text style={styles.clearText}>Clear filters</Text>
              </Pressable>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { textAlign: 'center', padding: 32, fontSize: 15 },
  emptyBox: { alignItems: 'center' },
  clear: { borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10 },
  clearText: { color: '#fff', fontWeight: '600' },
});
