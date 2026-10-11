import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import type { Coords, NearbyToilet } from '@/lib/types';

type Props = {
  location: Coords;
  toilets: NearbyToilet[];
  onOpen: (id: string) => void;
};

// react-native-maps has no web support. The web build is only for quick UI checks.
export default function ToiletMap({ toilets }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        The map only works on iOS and Android. {toilets.length} toilets found; see the Nearby tab.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 24 },
  text: { textAlign: 'center' },
});
