import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { useToilets } from '@/lib/ToiletsContext';

export default function AddToiletScreen() {
  const router = useRouter();
  const { location, addToilet } = useToilets();
  const tint = useThemeColor({}, 'tint');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');

  const [name, setName] = useState('');
  const [hours, setHours] = useState('');
  const [free, setFree] = useState(false);
  const [customersOnly, setCustomersOnly] = useState(false);
  const [wheelchair, setWheelchair] = useState(false);
  const [changingTable, setChangingTable] = useState(false);
  const [genderNeutral, setGenderNeutral] = useState(false);

  const save = async () => {
    if (!location) {
      Alert.alert('Location needed', "We place the toilet where you're standing, so turn on location first.");
      return;
    }
    // Unchecked switches mean "don't know" rather than "no".
    const toilet = await addToilet({
      ...location,
      name: name.trim() || 'Public toilet',
      fee: free ? false : null,
      access: customersOnly ? 'customers' : 'public',
      wheelchair: wheelchair || null,
      changingTable: changingTable || null,
      genderNeutral: genderNeutral || null,
      openingHours: hours.trim() || null,
    });
    router.replace({ pathname: '/toilet/[id]', params: { id: toilet.id } });
  };

  const inputStyle = [styles.input, { color: text, borderColor: muted }];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={{ color: muted }}>The toilet will be pinned at your current location.</Text>

      <Text style={styles.label}>Name or place</Text>
      <TextInput value={name} onChangeText={setName} placeholder="e.g. Central Station, Level 1" placeholderTextColor={muted} style={inputStyle} />

      <Text style={styles.label}>Opening hours (optional)</Text>
      <TextInput value={hours} onChangeText={setHours} placeholder="e.g. Mo-Fr 08:00-20:00 or 24/7" placeholderTextColor={muted} autoCapitalize="none" style={inputStyle} />

      <Toggle label="Free to use" value={free} onChange={setFree} />
      <Toggle label="Customers only" value={customersOnly} onChange={setCustomersOnly} />
      <Toggle label="♿ Wheelchair accessible" value={wheelchair} onChange={setWheelchair} />
      <Toggle label="👶 Changing table" value={changingTable} onChange={setChangingTable} />
      <Toggle label="Gender-neutral" value={genderNeutral} onChange={setGenderNeutral} />

      <Pressable onPress={save} style={({ pressed }) => [styles.save, { backgroundColor: tint, opacity: pressed ? 0.8 : 1 }]}>
        <Text style={styles.saveText}>Add toilet</Text>
      </Pressable>

      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </ScrollView>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10 },
  label: { fontSize: 15, fontWeight: '600', marginTop: 6 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, fontSize: 16 },
  toggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  toggleLabel: { fontSize: 16 },
  save: { borderRadius: 999, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
