import 'react-native-gesture-handler'; // MUST be first
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { Component, useEffect, useState } from 'react';
import { View, Text, StyleSheet, AppState, Platform } from 'react-native';

// Error boundary + visible logger to avoid silent white screen
class RootErrorBoundary extends Component<{ children: React.ReactNode }, { error?: Error }> {
  constructor(props: any) { super(props); this.state = { error: undefined }; }
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: any) { console.error('ERROR BOUNDARY CAUGHT', error?.message || error, info?.componentStack || ''); }
  render() {
    if (this.state.error) {
      return (
        <View style={styles.fallback}>
          <Text style={styles.fallbackTitle}>App crashed</Text>
          <Text style={styles.fallbackMsg}>{String(this.state.error?.message || 'Unknown error')}</Text>
          <LogsOverlay />
        </View>
      );
    }
    return this.props.children as any;
  }
}

function LogsOverlay() {
  const [lines, setLines] = useState<string[]>([]);
  const push = (t: string) => setLines((p) => [...p, t].slice(-10));
  useEffect(() => {
    const e = console.error; const w = console.warn;
    console.error = (...a: any[]) => { try { push('[error] ' + a.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')); } catch {} e(...a); };
    console.warn = (...a: any[]) => { try { push('[warn] ' + a.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')); } catch {} w(...a); };
    // @ts-ignore
    if (typeof ErrorUtils !== 'undefined' && ErrorUtils.setGlobalHandler) {
      // @ts-ignore
      const prev = ErrorUtils._globalHandler;
      // @ts-ignore
      ErrorUtils.setGlobalHandler((err: any, isFatal?: boolean) => { push(`[fatal:${isFatal ? 'yes' : 'no'}] ${err?.message || err}`); prev && prev(err, isFatal); });
    }
    const sub = AppState.addEventListener('change', (s) => push(`[appstate] ${s}`));
    push(`[env] Platform=${Platform.OS}`);
    return () => { console.error = e; console.warn = w; sub.remove(); };
  }, []);
  if (!lines.length) return null;
  return (
    <View pointerEvents="none" style={styles.logWrap}>
      {lines.map((l, i) => (<Text key={i} style={styles.logLine} numberOfLines={2}>{l}</Text>))}
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
      <LogsOverlay />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 24 },
  fallbackTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  fallbackMsg: { color: '#fff', opacity: 0.9, textAlign: 'center', marginBottom: 12 },
  logWrap: { position: 'absolute', left: 10, bottom: 10, right: 10, opacity: 0.7 },
  logLine: { color: '#0f0', fontSize: 11 },
});