import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type User = { id: string; email: string; score: number };

type AuthState = {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => Promise<void>;
  clear: () => Promise<void>;
  rehydrate: () => Promise<void>;
};

export const useAuth = create<AuthState>(() => ({
  token: null,
  user: null,
  setAuth: async (token, user) => {
    await AsyncStorage.setItem("auth_token", token);
    await AsyncStorage.setItem("auth_user", JSON.stringify(user));
    useAuth.setState({ token, user });
  },
  clear: async () => {
    await AsyncStorage.removeItem("auth_token");
    await AsyncStorage.removeItem("auth_user");
    useAuth.setState({ token: null, user: null });
  },
  rehydrate: async () => {
    try {
      const t = await AsyncStorage.getItem("auth_token");
      const u = await AsyncStorage.getItem("auth_user");
      if (t && u) {
        useAuth.setState({ token: t, user: JSON.parse(u) });
      }
    } catch {}
  },
}));