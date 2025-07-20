import env from "#config/env/env.js";
import logger from "#utils/logger.js";

function testConfig() {
    try {
        logger.info("Начало тестирования конфигурации");
        
        // Проверяем все переменные окружения
        logger.info("Проверка переменных окружения:");
        logger.info(`- NODE_ENV: ${env.NODE_ENV || 'не задан'}`);
        logger.info(`- POSTGRES_HOST: ${env.POSTGRES_HOST || 'localhost'}`);
        logger.info(`- POSTGRES_PORT: ${env.POSTGRES_PORT}`);
        logger.info(`- POSTGRES_DB: ${env.POSTGRES_DB}`);
        logger.info(`- POSTGRES_USER: ${env.POSTGRES_USER}`);
        logger.info(`- POSTGRES_PASSWORD: ${env.POSTGRES_PASSWORD ? '***' : 'не задан'}`);
        logger.info(`- APP_PORT: ${env.APP_PORT || 'не задан'}`);
        logger.info(`- WB_API_URL: ${env.WB_API_URL}`);
        logger.info(`- WB_API_KEY: ${env.WB_API_KEY ? '***' : 'не задан'}`);
        logger.info(`- SCHEDULER_INTERVAL_HOURS: ${env.SCHEDULER_INTERVAL_HOURS}`);
        
        // Проверяем валидность конфигурации
        const issues = [];
        
        if (!env.POSTGRES_DB) issues.push("POSTGRES_DB не задан");
        if (!env.POSTGRES_USER) issues.push("POSTGRES_USER не задан");
        if (!env.POSTGRES_PASSWORD) issues.push("POSTGRES_PASSWORD не задан");
        if (!env.WB_API_URL) issues.push("WB_API_URL не задан");
        
        if (issues.length > 0) {
            logger.warn("⚠️ Обнаружены проблемы в конфигурации:");
            issues.forEach(issue => logger.warn(`  - ${issue}`));
        } else {
            logger.info("✅ Конфигурация корректна");
        }
        
        // Проверяем логику приложения
        logger.info("Проверка логики приложения:");
        logger.info(`- Интервал планировщика: ${env.SCHEDULER_INTERVAL_HOURS} час(ов)`);
        logger.info(`- URL API WB: ${env.WB_API_URL}/api/v1/tariffs/box`);
        
        if (env.WB_API_KEY) {
            logger.info("✅ API ключ WB настроен");
        } else {
            logger.warn("⚠️ API ключ WB не настроен - запросы к API будут неуспешными");
        }
        
        logger.info("✅ Тестирование конфигурации завершено успешно");
        
    } catch (error) {
        logger.error("❌ Ошибка при тестировании конфигурации:", error);
        process.exit(1);
    }
}

// Запускаем тест
testConfig(); 