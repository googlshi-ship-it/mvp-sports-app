import { Appearance } from "react-native";

export const colors = {
  bg: (Appearance.getColorScheme() === "dark" ? "#0a0a0f" : "#f5f7fb"),
  glass: (Appearance.getColorScheme() === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)"),
  border: (Appearance.getColorScheme() === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
};
