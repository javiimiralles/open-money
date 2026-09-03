import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fab } from '@/components/Fab';
import { spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.ink,
          tabBarInactiveTintColor: colors.mute,
          tabBarStyle: {
            backgroundColor: colors.canvas,
            borderTopColor: colors.canvasSoft,
          },
          tabBarLabelStyle: typography.caption,
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
      <Fab
        onPress={() => router.push('/transaction-form')}
        style={[styles.fab, { bottom: insets.bottom + 72 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
  },
});
