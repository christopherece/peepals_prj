import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import PhotoViewer from '@/components/PhotoViewer';
import PressableScale from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { Text, useThemeColor } from '@/components/Themed';
import { Radius, Space } from '@/constants/Typography';
import { useRequireMember } from '@/lib/useRequireMember';
import { useToiletPhotos, type PhotoSource } from '@/lib/useToiletPhotos';

const WIDTH = 168;
const HEIGHT = 126;

/** Horizontal photo slider for a toilet, ending with an "Add photo" tile (members only). */
export default function PhotoStrip({ toiletId }: { toiletId: string }) {
  const { photos, loading, uploading, upload } = useToiletPhotos(toiletId);
  const requireMember = useRequireMember();
  const card = useThemeColor({}, 'card');
  const tint = useThemeColor({}, 'tint');
  const [viewing, setViewing] = useState<number | null>(null);

  const start = (source: PhotoSource) =>
    upload(source).catch((e) => Alert.alert('Photo not added', e instanceof Error ? e.message : String(e)));

  const onAdd = () => {
    if (!requireMember('photo')) return;
    Alert.alert('Add a photo', 'Show what the next person can expect. No people in shot, please.', [
      { text: 'Take photo', onPress: () => start('camera') },
      { text: 'Choose from library', onPress: () => start('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <>
      <PhotoViewer photos={photos} index={viewing} onClose={() => setViewing(null)} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={WIDTH + Space.sm}
        decelerationRate="fast"
        contentContainerStyle={styles.row}>
        <PressableScale
          onPress={onAdd}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel="Add a photo"
          style={[styles.tile, styles.add, { backgroundColor: card, borderColor: tint }]}>
          {uploading ? (
            <ActivityIndicator color={tint} />
          ) : (
            <>
              <Text style={[styles.addIcon, { color: tint }]}>＋</Text>
              <Text type="subhead" style={{ color: tint }}>
                Add photo
              </Text>
            </>
          )}
        </PressableScale>

        {loading
          ? [0, 1].map((i) => <Skeleton key={i} width={WIDTH} height={HEIGHT} radius={Radius.md} />)
          : photos.map((p, i) => (
              <Pressable key={p.id} onPress={() => setViewing(i)} accessibilityLabel="Open photo">
                <Image
                  source={{ uri: p.url }}
                  style={[styles.tile, { backgroundColor: card }]}
                  contentFit="cover"
                  transition={250}
                />
              </Pressable>
            ))}

        {!loading && photos.length === 0 && (
          <View style={[styles.tile, styles.empty]}>
            <Text type="footnote" muted style={{ textAlign: 'center' }}>
              No photos yet. Be the first!
            </Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  row: { gap: Space.sm },
  tile: { width: WIDTH, height: HEIGHT, borderRadius: Radius.md, overflow: 'hidden' },
  add: { alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 1.5, borderStyle: 'dashed' },
  addIcon: { fontSize: 26, lineHeight: 30 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: Space.md },
});
