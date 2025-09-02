# MVP-app

## Frontend (Expo)

### Запуск с данными (Football-Data.org)
1. Зарегистрируйтесь на https://www.football-data.org/ и скопируйте API Token (бесплатный план).
2. Создайте файл `frontend/.env` и пропишите:
   ```
   EXPO_PUBLIC_FD_API_TOKEN=ВАШ_ТОКЕН
   ```
3. Установите зависимости и запустите:
   ```bash
   cd frontend
   npm install
   npx expo install @react-native-async-storage/async-storage
   npx expo start --clear --host lan
   ```

Примечания:
- Если токен не задан или лимит превышен, приложение покажет демо-данные.
- Роутинг: две вкладки (competitions, matches), без дубликатов файлов.
- Тёмная тема, без белых полос. StatusBar светлый.