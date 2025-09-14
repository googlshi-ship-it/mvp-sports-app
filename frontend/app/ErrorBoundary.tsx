import React from 'react';
import { View, Text, ScrollView } from 'react-native';
export default class ErrorBoundary extends React.Component<any, { error?: Error }> {
  state = { error: undefined as Error | undefined };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children as any;
    return (
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flex: 1, backgroundColor: '#000', padding: 16, justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
            App crashed
          </Text>
          <Text selectable style={{ color: '#8ef' }}>
            {String(this.state.error?.stack || this.state.error?.message)}
          </Text>
        </View>
      </ScrollView>
    );
  }
}