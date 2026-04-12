import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: { fontSize: 11 },
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
