import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/lib/theme';

// Icon components (inline SVG-based for zero extra deps)
function WorkshopIcon({ color, size }: { color: string; size: number }) {
  return null; // Replaced by emoji or react-native-svg in production
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
        tabBarStyle: {
          backgroundColor: 'rgba(5, 5, 8, 0.95)',
          borderTopColor: 'rgba(255,255,255,0.05)',
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Workshop',
          tabBarIcon: ({ color }) => (
            // Using unicode symbols as lightweight icon stand-ins
            null
          ),
          tabBarLabel: 'Workshop',
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: 'Market',
          tabBarLabel: 'Market',
        }}
      />
      <Tabs.Screen
        name="trade"
        options={{
          title: 'Trade',
          tabBarLabel: 'Trade',
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarLabel: 'Wallet',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
        }}
      />
    </Tabs>
  );
}
