import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { PinColors } from '@/constants/Colors';
import { toiletStatus } from '@/lib/status';
import type { Coords, NearbyToilet } from '@/lib/types';

type Props = {
  location: Coords;
  toilets: NearbyToilet[];
  onOpen: (id: string) => void;
  /** Extra space under map controls (e.g. the floating buttons) so the Google logo stays visible. */
  bottomInset?: number;
};

export default function ToiletMap({ location, toilets, onOpen, bottomInset = 0 }: Props) {
  const now = new Date();

  return (
    <MapView
      style={StyleSheet.absoluteFill}
      showsUserLocation
      showsMyLocationButton={false}
      mapPadding={{ top: 0, left: 0, right: 0, bottom: bottomInset }}
      initialRegion={{ ...location, latitudeDelta: 0.02, longitudeDelta: 0.02 }}>
      {toilets.map((t) => (
        <ToiletPin key={t.id} toilet={t} color={PinColors[toiletStatus(t, now).tone]} onPress={() => onOpen(t.id)} />
      ))}
    </MapView>
  );
}

function ToiletPin({ toilet, color, onPress }: { toilet: NearbyToilet; color: string; onPress: () => void }) {
  // Custom marker views must re-render natively until they've drawn once (Android shows them
  // blank otherwise), then stop tracking so a map full of pins doesn't redraw every frame.
  const [drawnColor, setDrawnColor] = useState<string | null>(null);
  const tracks = drawnColor !== color;
  useEffect(() => {
    const timer = setTimeout(() => setDrawnColor(color), 500);
    return () => clearTimeout(timer);
  }, [color]);

  return (
    <Marker
      coordinate={{ latitude: toilet.latitude, longitude: toilet.longitude }}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracks}
      onPress={onPress}
      accessibilityLabel={toilet.name}>
      <View style={styles.pin}>
        <View style={[styles.head, { backgroundColor: color }]}>
          <Text style={styles.glyph}>{toilet.source === 'user' ? '★' : 'WC'}</Text>
        </View>
        <View style={[styles.tail, { borderTopColor: color }]} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  pin: { alignItems: 'center' },
  head: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { color: '#fff', fontSize: 11, fontWeight: '800' },
  tail: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
