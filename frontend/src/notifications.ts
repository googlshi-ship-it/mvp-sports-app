import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { apiPost } from "./api/client";

export async function registerForPushNotificationsAsync(country: string = "CH", remind12h: boolean = false) {
  let token: string | null = null;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    throw new Error("Permission not granted for notifications");
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.expoConfig?.extra?.projectId;
  const pushToken = await Notifications.getExpoPushTokenAsync({ projectId: projectId as string | undefined });
  token = pushToken.data;

  await apiPost("/api/push/register", {
    token,
    platform: Platform.OS,
    country,
    remind12h,
  });
  return token;
}