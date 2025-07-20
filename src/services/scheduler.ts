import env from "#config/env/env.js";
import wbApiService from "#services/wb-api.js";
import tariffsDbService from "#services/tariffs-db.js";
import logger from "#utils/logger.js";

export class SchedulerService {
    private intervalId?: NodeJS.Timeout;
    private isRunning = false;

    /**
     * Запускает планировщик
     */
    start(): void {
        if (this.isRunning) {
            logger.warn("Планировщик уже запущен");
            return;
        }

        const intervalHours = env.SCHEDULER_INTERVAL_HOURS;
        const intervalMs = intervalHours * 60 * 60 * 1000; // часы в миллисекунды

        logger.info(`Запуск планировщика с интервалом ${intervalHours} час(ов)`);

        // Запускаем первую задачу сразу
        this.runTask();

        // Устанавливаем интервал для последующих задач
        this.intervalId = setInterval(() => {
            this.runTask();
        }, intervalMs);

        this.isRunning = true;
        logger.info("Планировщик успешно запущен");
    }

    /**
     * Останавливает планировщик
     */
    stop(): void {
        if (!this.isRunning) {
            logger.warn("Планировщик не запущен");
            return;
        }

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }

        this.isRunning = false;
        logger.info("Планировщик остановлен");
    }

    /**
     * Выполняет задачу получения тарифов
     */
    private async runTask(): Promise<void> {
        const startTime = Date.now();
        const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        try {
            logger.info(`Начало выполнения задачи получения тарифов для даты: ${currentDate}`);

            // Получаем тарифы с API WB
            const tariffsData = await wbApiService.getBoxTariffs(currentDate);

            // Сохраняем в БД
            await tariffsDbService.saveTariffs(tariffsData);

            const duration = Date.now() - startTime;
            logger.info(`Задача выполнена успешно за ${duration}ms`);
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error(`Ошибка выполнения задачи (${duration}ms):`, error);
            
            // Не прерываем работу планировщика при ошибке
            // Следующая попытка будет через интервал
        }
    }

    /**
     * Проверяет, запущен ли планировщик
     */
    isSchedulerRunning(): boolean {
        return this.isRunning;
    }

    /**
     * Получает информацию о планировщике
     */
    getSchedulerInfo(): {
        isRunning: boolean;
        intervalHours: number;
        nextRun?: Date;
    } {
        const info = {
            isRunning: this.isRunning,
            intervalHours: env.SCHEDULER_INTERVAL_HOURS,
        };

        if (this.isRunning && this.intervalId) {
            // Примерное время следующего запуска
            const nextRun = new Date(Date.now() + env.SCHEDULER_INTERVAL_HOURS * 60 * 60 * 1000);
            return { ...info, nextRun };
        }

        return info;
    }
}

export default new SchedulerService(); 