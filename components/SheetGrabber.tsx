import { Platform, StyleSheet, View } from 'react-native';

import { useThemeColor } from '@/components/Themed';

/** Drag handle for form sheets. iOS draws its own (`sheetGrabberVisible`), Android doesn't. */
export default function SheetGrabber() {
  const color = useThemeColor({}, 'starOff');
  if (Platform.OS === 'ios') return null;
  return <View style={[styles.grabber, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, marginTop: 8 },
});
