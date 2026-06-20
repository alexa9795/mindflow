import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../../constants/fonts';
import { useSettings } from '../../context/SettingsContext';

function TabIcon({ name, focused, color }: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  focused: boolean;
  color: string;
}) {
  return <Ionicons name={name} size={22} color={color} />;
}

export default function TabLayout() {
  const { theme } = useSettings();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          // Soft upward shadow instead of a hard hairline border for a
          // cleaner, more unified separation from the content.
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -3 },
          // Safe-area-aware sizing so the bar sits correctly on every device.
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontFamily: FONTS.modern, marginTop: 2 },
        tabBarItemStyle: { paddingTop: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Journal',
          tabBarIcon: ({ focused, color }) =>
            <TabIcon name={focused ? 'book' : 'book-outline'} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ focused, color }) =>
            <TabIcon name={focused ? 'sparkles' : 'sparkles-outline'} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused, color }) =>
            <TabIcon name={focused ? 'settings' : 'settings-outline'} focused={focused} color={color} />,
        }}
      />
    </Tabs>
  );
}
