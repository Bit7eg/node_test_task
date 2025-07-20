# WB Tariffs Service

## Описание
Сервис для регулярного получения информации о тарифах Wildberries и сохранения их в базу данных PostgreSQL. Приложение также поддерживает обновление информации в Google таблицах.

### Основной функционал:
- ✅ Ежечасное получение тарифов коробов с API WB
- ✅ Сохранение и обновление данных в PostgreSQL
- ✅ Автоматический экспорт в Google таблицы
- ✅ Планировщик задач с настраиваемым интервалом
- ✅ Логирование всех операций
- ✅ Graceful shutdown
- ✅ Docker контейнеризация

## Архитектура

### Структура БД:
- `wb_tariffs_box_requests` - общие данные запросов к API WB
- `wb_tariffs_box_warehouses` - тарифы по складам
- `spreadsheets` - ID Google таблиц для экспорта

### Основные компоненты:
- `src/services/wb-api.ts` - сервис для работы с API WB
- `src/services/tariffs-db.ts` - сервис для работы с БД
- `src/services/google-sheets.ts` - сервис для работы с Google Sheets
- `src/services/export-service.ts` - сервис экспорта данных
- `src/services/scheduler.ts` - планировщик задач
- `src/utils/logger.ts` - система логирования

## Установка и запуск

### 1. Клонирование и установка зависимостей
```bash
git clone https://github.com/Bit7eg/node_test_task
cd node_test_task
npm install
```

### 2. Настройка переменных окружения
```bash
cp example.env .env
```

Отредактируйте `.env` файл:
```env
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
APP_PORT=5000

# WB API настройки
WB_API_URL=https://common-api.wildberries.ru
WB_API_KEY=your_api_key_here

# Настройки планировщика (часы)
SCHEDULER_INTERVAL_HOURS=1

# Google Sheets настройки
GOOGLE_SHEETS_CREDENTIALS_FILE=./credentials/service-account.json
GOOGLE_SHEETS_SCOPES=["https://www.googleapis.com/auth/spreadsheets"]
```

### 3. Запуск с Docker (рекомендуется)
```bash
# Запуск всех сервисов
docker compose up --build

# Или только база данных
docker compose up -d --build postgres
```

### 4. Запуск в режиме разработки
```bash
# Применение миграций
npm run knex:dev migrate latest

# Запуск сидов
npm run knex:dev seed run

# Запуск приложения
npm run dev
```

## Команды

### Управление БД:
```bash
# Применение миграций
npm run knex:dev migrate latest

# Откат миграций
npm run knex:dev migrate rollback

# Список миграций
npm run knex:dev migrate list

# Запуск сидов
npm run knex:dev seed run
```

### Тестирование:
```bash
# Комплексный тест всех компонентов
npm run test:all

# Тест API WB (требует API ключ)
npm run test:api

# Тест с мок-данными (без API)
npm run test:mock

# Тест планировщика
npm run test:scheduler

# Тест конфигурации
npm run test:config

# Тест Google Sheets
npm run test:google-sheets

# Проверка TypeScript
npm run tsc:check
```

### Сборка:
```bash
# Сборка для production
npm run build

# Запуск production версии
npm start
```

## API WB

Приложение использует API Wildberries для получения тарифов коробов:
- **Endpoint**: `https://common-api.wildberries.ru/api/v1/tariffs/box`
- **Метод**: GET
- **Параметры**: `date` (YYYY-MM-DD)
- **Лимиты**: 60 запросов в минуту

## Google Sheets

Приложение автоматически экспортирует данные в Google таблицы:
- **Лист**: `stocks_coefs`
- **Сортировка**: по коэффициенту `box_delivery_and_storage_expr` (возрастание)
- **Обновление**: после каждого успешного сохранения в БД
- **Аутентификация**: Service Account

### Настройка Google Sheets:
1. Создать проект в Google Cloud Console
2. Включить Google Sheets API
3. Создать Service Account
4. Скачать credentials в `credentials/service-account.json`
5. Предоставить доступ к таблицам для service account email

## Логирование

Логи сохраняются в:
- Консоль (все уровни)
- Файл `logs/app.log` (ротация по 10MB, до 5 файлов)

## Мониторинг

Приложение логирует:
- Запуск/остановку планировщика
- Успешные запросы к API WB
- Ошибки и их детали
- Время выполнения задач
- Операции с БД

## Структура проекта

```
src/
├── app.ts                 # Главный файл приложения
├── types/
│   └── wb-tariffs.ts     # Типы данных
├── services/
│   ├── wb-api.ts         # API WB сервис
│   ├── tariffs-db.ts     # БД сервис
│   └── scheduler.ts      # Планировщик
├── utils/
│   ├── logger.ts         # Логирование
│   └── knex.ts           # CLI для knex
├── config/
│   ├── env/
│   │   └── env.ts        # Конфигурация окружения
│   └── knex/
│       └── knexfile.ts   # Конфигурация БД
└── postgres/
    ├── knex.ts           # Подключение к БД
    ├── migrations/       # Миграции
    └── seeds/            # Сиды
```

## Требования

- Node.js 18+
- PostgreSQL 16+
- Docker (опционально)

## Лицензия

ISC
