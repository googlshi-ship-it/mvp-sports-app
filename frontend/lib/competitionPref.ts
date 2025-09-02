import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'preferred_competition_id';

export async function saveCompetitionPref(id: string) {
  try { await AsyncStorage.setItem(KEY, id); } catch {}
}

export async function getCompetitionPref(): Promise<string | null> {
  try { return await AsyncStorage.getItem(KEY); } catch { return null; }
}