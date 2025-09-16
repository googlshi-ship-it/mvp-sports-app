import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { apiPost } from "./api/client";

let cachedToken: string | null = null;

export function getRegisteredPushToken() {
  return cachedToken;
}

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

  const projectId = (Constants.expoConfig as any)?.extra?.eas?.projectId || (Constants.expoConfig as any)?.extra?.projectId;
  const pushToken = await Notifications.getExpoPushTokenAsync({ projectId: projectId as string | undefined });
  token = pushToken.data;
  cachedToken = token;

  await apiPost("/api/push/register", {
    token,
    platform: Platform.OS,
    country,
    remind12h,
  });
  return token;
}

export async function sendLocalTestNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "MVP (Local)",
      body: "This is a local test notification",
    },
    trigger: null,
  });
}