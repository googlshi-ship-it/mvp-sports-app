import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { tokens } from "../ui/theme";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  fixedHeight?: number;
  topGlow?: boolean;
};

export default function GlassCard({ children, style, fixedHeight, topGlow }: Props) {
  return (
    <View style={[styles.wrap, fixedHeight ? { height: fixedHeight } : null, style]}>
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.inner}>{children}</View>
      {topGlow ? <View style={styles.topGlow} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    borderRadius: tokens.radius,
    borderWidth: 1,
    borderColor: tokens.cardBorder,
    backgroundColor: tokens.cardBg,
  },
  inner: {
    padding: tokens.spacing,
  },
  topGlow: {
    position: "absolute",
    left: 0, right: 0, top: 0, height: 38,
    borderTopLeftRadius: tokens.radius,
    borderTopRightRadius: tokens.radius,
    backgroundColor: tokens.cardGlow,
  },
});