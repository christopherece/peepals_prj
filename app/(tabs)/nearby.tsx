import { useRouter } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';

import FilterChips from '@/components/FilterChips';
import { ToiletListSkeleton } from '@/components/Skeleton';
import StatusMessage from '@/components/StatusMessage';
import { Text, View } from '@/components/Themed';
import ToiletRow from '@/components/ToiletRow';
import { useToilets } from '@/lib/ToiletsContext';

export default function NearbyScreen() {
  const router = useRouter();
  const { status, visible, allNearby, reviews, refresh } = useToilets();

  if (status === 'error' && allNearby.length === 0) return <StatusMessage />;

  // First load: show the list's shape instead of a spinner.
  const firstLoad = status !== 'ready' && allNearby.length === 0;

  return (
    <View style={styles.container}>
      <FilterChips />
      {firstLoad ? (
        <ToiletListSkeleton />
      ) : (
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
          ListHeaderComponent={
            visible.length > 0 ? (
              <Text type="footnote" muted style={styles.count}>
                {visible.length} toilet{visible.length === 1 ? '' : 's'} within 2 km, nearest first
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <Text type="callout" muted style={styles.empty}>
              {allNearby.length === 0
                ? 'No toilets mapped within 2 km. Be the first to add one with the + button on the Map tab.'
                : 'No toilets match these filters.'}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { textAlign: 'center', padding: 32 },
  count: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
});
