import { Image } from 'expo-image';
import { FlatList, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { formatAgo } from '@/lib/format';
import type { Photo } from '@/lib/types';

type Props = {
  photos: Photo[];
  /** Index to open at, or null when closed. */
  index: number | null;
  onClose: () => void;
};

/** Full-screen, swipeable photo viewer. */
export default function PhotoViewer({ photos, index, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={index !== null} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <FlatList
          data={photos}
          keyExtractor={(p) => p.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={index ?? 0}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          renderItem={({ item }) => (
            <View style={{ width, height }}>
              <Image source={{ uri: item.url }} style={StyleSheet.absoluteFill} contentFit="contain" />
              <Text type="footnote" style={[styles.caption, { bottom: insets.bottom + 24 }]}>
                Added {formatAgo(item.createdAt)}
              </Text>
            </View>
          )}
        />
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close photo"
          hitSlop={12}
          style={[styles.close, { top: insets.top + 12 }]}>
          <Text type="headline" style={styles.closeText}>
            ✕
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000' },
  caption: { position: 'absolute', alignSelf: 'center', color: '#fff', opacity: 0.8 },
  close: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff' },
});
