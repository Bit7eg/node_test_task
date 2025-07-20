import { migrate, seed } from "#postgres/knex.js";
import schedulerService from "#services/scheduler.js";
import googleSheetsService from "#services/google-sheets.js";
import logger from "#utils/logger.js";

async function main() {
    try {
        logger.info("Запуск приложения WB Tariffs Service");

        // Применяем миграции
        logger.info("Применение миграций...");
        await migrate.latest();
        logger.info("Миграции применены успешно");

        // Запускаем сиды
        logger.info("Запуск сидов...");
        await seed.run();
        logger.info("Сиды выполнены успешно");

        // Инициализируем Google Sheets API
        logger.info("Инициализация Google Sheets API...");
        try {
            await googleSheetsService.initialize();
            logger.info("Google Sheets API инициализирован успешно");
        } catch (error) {
            logger.warn("Google Sheets API не инициализирован (проверьте credentials):", error);
        }

        // Запускаем планировщик
        logger.info("Запуск планировщика задач...");
        schedulerService.start();

        logger.info("Приложение успешно запущено");

        // Обработка graceful shutdown
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);

    } catch (error) {
        logger.error("Ошибка при запуске приложения:", error);
        process.exit(1);
    }
}

async function gracefulShutdown(signal: string) {
    logger.info(`Получен сигнал ${signal}, начинаем graceful shutdown...`);
    
    try {
        // Останавливаем планировщик
        if (schedulerService.isSchedulerRunning()) {
            logger.info("Остановка планировщика...");
            schedulerService.stop();
        }

        logger.info("Graceful shutdown завершен");
        process.exit(0);
    } catch (error) {
        logger.error("Ошибка при graceful shutdown:", error);
        process.exit(1);
    }
}

// Запускаем приложение
main().catch((error) => {
    logger.error("Критическая ошибка при запуске:", error);
    process.exit(1);
});