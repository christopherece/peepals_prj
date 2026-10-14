import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Peepals',
          tabBarLabel: 'Map',
          // Full-bleed map; filters and actions float over it.
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'map', android: 'map', web: 'map' }} tintColor={color} size={28} />
          ),
        }}
      />
      <Tabs.Screen
        name="nearby"
        options={{
          title: 'Nearby',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'list.bullet', android: 'list', web: 'list' }} tintColor={color} size={28} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
    </Tabs>
  );
}
