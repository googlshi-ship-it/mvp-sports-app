import React from "react";
import { View, StyleSheet, Platform, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { useCardTokens } from "../theme";

interface Props {
  children?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  fixedHeight?: number;
}

export default function GlassCard({ children, style, fixedHeight }: Props) {
  const tokens = useCardTokens();
  const baseStyle = [styles.base, tokens.layout, tokens.glass, fixedHeight ? { height: fixedHeight } : null, style];

  if (Platform.OS === "ios") {
    return (
      <BlurView style={baseStyle as any} intensity={tokens.blurIntensity} tint={tokens.isDark ? "dark" : "light"}>
        {children}
      </BlurView>
    );
  }
  return <View style={baseStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    overflow: Platform.select({ ios: "visible", android: "hidden", default: "hidden" }) as any,
  },
});