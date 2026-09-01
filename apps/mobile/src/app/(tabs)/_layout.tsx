import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';

import { colors, typography } from '@/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.mute,
        tabBarStyle: {
          backgroundColor: colors.canvas,
          borderTopColor: colors.canvasSoft,
        },
        tabBarLabelStyle: typography.caption,
        headerStyle: { backgroundColor: colors.canvas },
        headerTitleStyle: typography.bodyMdStrong,
        headerShadowVisible: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Panel',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="view-dashboard" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Movimientos',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="swap-horizontal" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Cuentas',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="wallet" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Cartera',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="chart-line" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cog" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}