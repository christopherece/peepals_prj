import { SymbolView } from 'expo-symbols';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';

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
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'map', android: 'map', web: 'map' }} tintColor={color} size={28} />
          ),
          headerRight: () => (
            <Link href="/add-toilet" asChild>
              <Pressable style={{ marginRight: 15 }} accessibilityLabel="Add a toilet">
                {({ pressed }) => (
                  <SymbolView
                    name={{ ios: 'plus.circle', android: 'add_circle', web: 'add_circle' }}
                    size={25}
                    tintColor={Colors[colorScheme].tint}
                    style={{ opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
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
    </Tabs>
  );
}
