import React, { Component, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, StyleSheet, AppState, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';

// Simple Error Boundary to avoid silent white screen
class RootErrorBoundary extends Component<{ children: React.ReactNode }, { error?: Error }> {
  constructor(props: any) {
    super(props);
    this.state = { error: undefined };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: any) {
    console.error('ERROR BOUNDARY CAUGHT', error?.message || error, info?.componentStack || '');
  }
  render() {
    if (this.state.error) {
      return (
        <View style={styles.fallback}>
          <Text style={styles.fallbackTitle}>App crashed</Text>
          <Text style={styles.fallbackMsg}>{String(this.state.error?.message || 'Unknown error')}</Text>
          <Text style={styles.fallbackHint}>Logs shown in the bottom-left</Text>
        </View>
      );
    }
    return this.props.children as any;
  }
}

// Visible logger overlay: capture last 10 messages from console + unhandled errors
function LoggerOverlay() {
  const [lines, setLines] = useState<string[]>([]);
  const append = (msg: string) =>
    setLines((prev) => {
      const next = [...prev, msg];
      return next.slice(Math.max(0, next.length - 10));
    });

  useEffect(() => {
    const origErr = console.error;
    const origWarn = console.warn;
    console.error = (...args: any[]) => {
      try { append(`[error] ${args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}`); } catch {}
      origErr(...args);
    };
    console.warn = (...args: any[]) => {
      try { append(`[warn] ${args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}`); } catch {}
      origWarn(...args);
    };

    // RN global error
    // @ts-ignore
    if (typeof ErrorUtils !== 'undefined' && ErrorUtils.setGlobalHandler) {
      // @ts-ignore
      const prev = ErrorUtils._globalHandler;
      // @ts-ignore
      ErrorUtils.setGlobalHandler((e: any, isFatal?: boolean) => {
        append(`[fatal:${isFatal ? 'yes' : 'no'}] ${e?.message || e}`);
        prev && prev(e, isFatal);
      });
    }

    // Promise rejections (may not exist on RN, but safe guard)
    try {
      // @ts-ignore
      const handler = (event: any) => append(`[unhandledrejection] ${event?.reason?.message || event?.reason || 'unknown'}`);
      // @ts-ignore
      globalThis.addEventListener && globalThis.addEventListener('unhandledrejection', handler as any);
    } catch {}

    // App state hint for visibility
    const sub = AppState.addEventListener('change', (s) => append(`[appstate] ${s}`));
    append(`[env] Platform=${Platform.OS}`);

    return () => {
      console.error = origErr;
      console.warn = origWarn;
      sub.remove();
    };
  }, []);

  if (lines.length === 0) return null;
  return (
    <View pointerEvents="none" style={styles.logWrap}>
      {lines.map((l, i) => (
        <Text key={i} style={styles.logLine} numberOfLines={2}>
          {l}
        </Text>
      ))}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <RootErrorBoundary>
        <Stack screenOptions={{ headerShown: false }} />
      </RootErrorBoundary>
      <LoggerOverlay />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 24 },
  fallbackTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  fallbackMsg: { color: '#fff', opacity: 0.9, textAlign: 'center', marginBottom: 12 },
  fallbackHint: { color: '#9AA3B2' },
  logWrap: { position: 'absolute', left: 10, bottom: 10, right: 10, opacity: 0.7 },
  logLine: { color: '#0f0', fontSize: 11 },
});