import { useColorScheme, Platform } from "react-native";

export type Typography = {
  TitleXL: any;
  TitleM: any;
  BodyM: any;
  BodyR: any;
  CaptionM: any;
  CaptionR: any;
};

export function useTypography(): Typography {
  return {
    TitleXL: { fontSize: 20, lineHeight: 24, fontWeight: Platform.select({ ios: "600", android: "700", default: "600" }) },
    TitleM: { fontSize: 17, lineHeight: 22, fontWeight: Platform.select({ ios: "600", android: "700", default: "600" }) },
    BodyM: { fontSize: 15, lineHeight: 20, fontWeight: Platform.select({ ios: "500", android: "500", default: "500" }) },
    BodyR: { fontSize: 15, lineHeight: 20, fontWeight: Platform.select({ ios: "400", android: "400", default: "400" }) },
    CaptionM: { fontSize: 13, lineHeight: 18, fontWeight: Platform.select({ ios: "500", android: "500", default: "500" }) },
    CaptionR: { fontSize: 12, lineHeight: 16, fontWeight: Platform.select({ ios: "400", android: "400", default: "400" }) },
  };
}

export function useCardTokens() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  return {
    layout: {
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 16,
      borderRadius: 16,
    },
    glass: {
      backgroundColor: "rgba(255,255,255,0.05)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.08)",
      ...(Platform.OS === "ios"
        ? {
            shadowColor: "#000",
            shadowOpacity: isDark ? 0.18 : 0.12,
            shadowRadius: isDark ? 20 : 16,
            shadowOffset: { width: 0, height: isDark ? 10 : 8 },
          }
        : { elevation: isDark ? 8 : 6 }),
    },
    blurIntensity: Platform.OS === "ios" ? 30 : 0,
    isDark,
  };
}