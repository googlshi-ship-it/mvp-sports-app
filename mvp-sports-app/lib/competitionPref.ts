import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'pref:competitionId';

export async function savePreferredCompetitionId(id: number) {
  await AsyncStorage.setItem(KEY, String(id));
}

export async function getPreferredCompetitionId(): Promise<number | null> {
  const v = await AsyncStorage.getItem(KEY);
  return v ? Number(v) : null;
}