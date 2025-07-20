import schedulerService from "#services/scheduler.js";
import logger from "#utils/logger.js";

async function testScheduler() {
    try {
        logger.info("Начало тестирования планировщика");
        
        // Проверяем начальное состояние
        const initialInfo = schedulerService.getSchedulerInfo();
        logger.info("Начальное состояние планировщика:", initialInfo);
        
        // Запускаем планировщик
        logger.info("Запуск планировщика...");
        schedulerService.start();
        
        // Проверяем состояние после запуска
        const runningInfo = schedulerService.getSchedulerInfo();
        logger.info("Состояние планировщика после запуска:", runningInfo);
        
        // Ждем немного, чтобы увидеть выполнение задачи
        logger.info("Ожидание 5 секунд для выполнения задачи...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Проверяем состояние во время работы
        const workingInfo = schedulerService.getSchedulerInfo();
        logger.info("Состояние планировщика во время работы:", workingInfo);
        
        // Останавливаем планировщик
        logger.info("Остановка планировщика...");
        schedulerService.stop();
        
        // Проверяем состояние после остановки
        const stoppedInfo = schedulerService.getSchedulerInfo();
        logger.info("Состояние планировщика после остановки:", stoppedInfo);
        
        logger.info("✅ Тестирование планировщика завершено успешно");
        
    } catch (error) {
        logger.error("❌ Ошибка при тестировании планировщика:", error);
        process.exit(1);
    }
}

// Запускаем тест
testScheduler(); 