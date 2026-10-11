import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { emergencyRed, openGreen, unknownAmber } from '@/constants/Colors';
import { feeLabel, formatDistance } from '@/lib/format';
import { isOpenNow } from '@/lib/openingHours';
import type { Coords, NearbyToilet } from '@/lib/types';

type Props = {
  location: Coords;
  toilets: NearbyToilet[];
  onOpen: (id: string) => void;
};

export default function ToiletMap({ location, toilets, onOpen }: Props) {
  const now = new Date();

  return (
    <MapView
      style={StyleSheet.absoluteFill}
      showsUserLocation
      initialRegion={{ ...location, latitudeDelta: 0.02, longitudeDelta: 0.02 }}>
      {toilets.map((t) => {
        const open = isOpenNow(t.openingHours, now);
        return (
          <Marker
            key={t.id}
            coordinate={{ latitude: t.latitude, longitude: t.longitude }}
            title={t.name}
            description={`${formatDistance(t.distance)} · ${feeLabel(t)} · Tap for details`}
            pinColor={open === true ? openGreen : open === false ? emergencyRed : unknownAmber}
            onCalloutPress={() => onOpen(t.id)}
          />
        );
      })}
    </MapView>
  );
}
