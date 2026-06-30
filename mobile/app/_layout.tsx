import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { theme } from '@/lib/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={theme.colors.background} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal/agent-detail"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="modal/trade-confirm"
            options={{
              presentation: 'transparentModal',
              animation: 'slide_from_bottom',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="modal/send-crypto"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
              headerShown: false,
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
