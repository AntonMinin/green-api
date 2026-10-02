# GREEN-API Telegram Chat

Простой веб-интерфейс в стиле Telegram для отправки и получения текстовых сообщений через [GREEN-API](https://green-api.com/telegram).

- Отправка: [SendMessage](https://green-api.com/v3/docs/api/sending/SendMessage/)
- Получение: [HTTP API](https://green-api.com/v3/docs/api/receiving/technology-http-api/) (`ReceiveNotification` + `DeleteNotification`, long polling)

## Использование

1. В [консоли GREEN-API](https://console.green-api.com) создайте инстанс Telegram и авторизуйте его.
2. В настройках инстанса включите получение входящих уведомлений (`incomingWebhook`) и оставьте `webhookUrl` пустым — иначе HTTP API не будет получать уведомления.
3. Откройте сайт, введите `apiUrl`, `idInstance` и `apiTokenInstance` из консоли.
4. Введите номер телефона получателя (например `79991234567`) и нажмите `+`.
5. Отправьте сообщение — ответы получателя появятся в чате автоматически.

Данные для входа хранятся только в памяти страницы и пропадают при перезагрузке.

## Локальный запуск

Нужен Node.js 20+.

```bash
npm install
npm run dev
```

Откройте адрес из консоли (обычно http://localhost:5173).

Другие команды:

```bash
npm test         # тесты разбора входящих уведомлений
npm run build    # сборка в dist/
npm run preview  # просмотр собранной версии
```

## Деплой на GitHub Pages

Workflow `.github/workflows/deploy.yml` собирает и публикует проект при каждом пуше в `main`.
В настройках репозитория: **Settings → Pages → Source: GitHub Actions**.
