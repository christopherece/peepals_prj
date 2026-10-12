import { useEffect, useRef } from 'react';
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

const DELTA = 0.02;

export default function ToiletMap({ location, toilets, onOpen }: Props) {
  const mapRef = useRef<MapView>(null);
  const now = new Date();

  // initialRegion only applies on mount; follow the user when a refresh finds a new location.
  useEffect(() => {
    mapRef.current?.animateToRegion({ ...location, latitudeDelta: DELTA, longitudeDelta: DELTA }, 500);
  }, [location]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      showsUserLocation
      initialRegion={{ ...location, latitudeDelta: DELTA, longitudeDelta: DELTA }}>
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
