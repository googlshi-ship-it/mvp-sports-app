# Frontend (Expo)

## Run (clean)
```bash
cd frontend
npm install
npx expo install
npm run start:clean
```

## Troubleshooting
- LAN не коннектится → `expo start --tunnel`
- Странный кэш → `npm run clean && npm run start:clean`

## Live matches (football-data.org)
1. Получи API ключ: https://www.football-data.org/client/register
2. Сохрани в `frontend/.env`:
   ```
   EXPO_PUBLIC_FD_API_KEY=YOUR_KEY
   ```
3. Запуск:
   ```
   cd frontend
   npm install
   npx expo start --clear --host lan
   ```
Если ключ не задан — экран покажет пустые списки без ошибок.