// frontend/lib/competitionPref.ts
// Храним выбранный пользователем чемпионат и даём разумный дефолт по стране

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

const STORAGE_KEY = 'pref:competitionId';

export type CompetitionId = string;

/** Сохранить выбор пользователя */
export async function setPreferredCompetitionId(id: CompetitionId): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, id);
  } catch (e) {
    console.warn('[competitionPref] setPreferredCompetitionId failed:', e);
  }
}

/** Прочитать сохранённый выбор (или null, если ещё нет) */
export async function getPreferredCompetitionId(): Promise<CompetitionId | null> {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEY)) as CompetitionId | null;
  } catch (e) {
    console.warn('[competitionPref] getPreferredCompetitionId failed:', e);
    return null;
  }
}

/** Удалить сохранённый выбор (на всякий) */
export async function clearPreferredCompetitionId(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('[competitionPref] clearPreferredCompetitionId failed:', e);
  }
}

/**
 * Дефолт по стране (упрощённо).
 * Поставь здесь нужные айди твоих лиг (как они называются в роуте/бэке).
 */
function getDefaultCompetitionIdByLocale(): CompetitionId {
  const country = (Localization.region ?? Localization.timezone?.split('/')?.[1] ?? '').toUpperCase();

  switch (country) {
    case 'ES': // Spain
      return 'la-liga';
    case 'IT': // Italy
      return 'serie-a';
    case 'GB': // United Kingdom
    case 'UK':
    case 'EN':
      return 'premier-league';
    case 'DE': // Germany
      return 'bundesliga';
    case 'FR': // France
      return 'ligue-1';
    default:
      return 'la-liga'; // общий дефолт, поменяй при желании
  }
}

/** Вернуть сохранённый чемпионат или дефолт по стране */
export async function getInitialCompetitionId(): Promise<CompetitionId> {
  const saved = await getPreferredCompetitionId();
  return saved ?? getDefaultCompetitionIdByLocale();
}
