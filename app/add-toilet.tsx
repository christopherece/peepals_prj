import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import PressableScale from '@/components/PressableScale';
import SheetGrabber from '@/components/SheetGrabber';
import { Text, useThemeColor } from '@/components/Themed';
import { Radius, Space } from '@/constants/Typography';
import { useToilets } from '@/lib/ToiletsContext';

/** "Add missing spot" sheet. Opened from the map's + button, members only (see useRequireMember). */
export default function AddToiletSheet() {
  const router = useRouter();
  const { location, addToilet } = useToilets();
  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');

  const [name, setName] = useState('');
  const [hours, setHours] = useState('');
  const [free, setFree] = useState(false);
  const [customersOnly, setCustomersOnly] = useState(false);
  const [wheelchair, setWheelchair] = useState(false);
  const [changingTable, setChangingTable] = useState(false);
  const [genderNeutral, setGenderNeutral] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!location) {
      Alert.alert('Location needed', "We place the toilet where you're standing, so turn on location first.");
      return;
    }
    setSaving(true);
    try {
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: '/toilet/[id]', params: { id: toilet.id } });
    } catch (e) {
      Alert.alert('Toilet not added', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [styles.input, { color: text, backgroundColor: card }];

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <SheetGrabber />
      <View style={styles.header}>
        <Text type="title">Add a missing spot</Text>
        <Text type="callout" muted>
          📍 We&apos;ll pin it where you&apos;re standing now.
        </Text>
      </View>

      <View style={styles.field}>
        <Text type="subhead">Name or place</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Central Station, level 1"
          placeholderTextColor={muted}
          maxLength={100}
          style={inputStyle}
        />
      </View>
      <View style={styles.field}>
        <Text type="subhead">
          Opening hours{' '}
          <Text type="subhead" muted>
            (optional)
          </Text>
        </Text>
        <TextInput
          value={hours}
          onChangeText={setHours}
          placeholder="e.g. Mo-Fr 08:00-20:00 or 24/7"
          placeholderTextColor={muted}
          autoCapitalize="none"
          maxLength={200}
          style={inputStyle}
        />
      </View>

      <View style={[styles.group, { backgroundColor: card }]}>
        <Toggle label="Free to use" value={free} onChange={setFree} />
        <Toggle
          label="Customers only / code-locked"
          value={customersOnly}
          onChange={setCustomersOnly}
          border={border}
        />
        <Toggle label="♿ Wheelchair accessible" value={wheelchair} onChange={setWheelchair} border={border} />
        <Toggle label="👶 Changing table" value={changingTable} onChange={setChangingTable} border={border} />
        <Toggle label="Gender-neutral" value={genderNeutral} onChange={setGenderNeutral} border={border} />
      </View>
      <Text type="caption" muted>
        Leave a switch off if you&apos;re not sure.
      </Text>

      <PressableScale onPress={save} disabled={saving} style={[styles.save, { backgroundColor: tint }]}>
        {saving ? (
          <ActivityIndicator color={onTint} />
        ) : (
          <Text type="headline" style={{ color: onTint }}>
            Add toilet
          </Text>
        )}
      </PressableScale>
    </ScrollView>
  );
}

function Toggle({
  label,
  value,
  onChange,
  border,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  /** Top separator color; omit for the first row. */
  border?: string;
}) {
  const tint = useThemeColor({}, 'tint');
  return (
    <View style={[styles.toggle, border && { borderTopColor: border, borderTopWidth: StyleSheet.hairlineWidth }]}>
      <Text type="body" style={styles.toggleLabel}>
        {label}
      </Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: tint }} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Space.xl, paddingTop: Platform.OS === 'ios' ? Space.xl + Space.sm : Space.sm, gap: Space.md },
  header: { gap: Space.xs, marginBottom: Space.xs },
  field: { gap: Space.xs + 2 },
  input: { borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16 },
  group: { borderRadius: Radius.md, paddingHorizontal: Space.lg },
  toggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  toggleLabel: { flexShrink: 1 },
  save: {
    borderRadius: Radius.pill,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Space.sm,
  },
});
