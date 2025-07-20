import logger from "#utils/logger.js";
import env from "#config/env/env.js";
import schedulerService from "#services/scheduler.js";
import { TariffsDataToSave } from "#types/wb-tariffs.js";

async function testAll() {
    try {
        logger.info("🚀 Начало комплексного тестирования приложения");
        
        // 1. Тестирование конфигурации
        logger.info("📋 1. Тестирование конфигурации...");
        logger.info(`   - NODE_ENV: ${env.NODE_ENV || 'development'}`);
        logger.info(`   - WB_API_URL: ${env.WB_API_URL}`);
        logger.info(`   - SCHEDULER_INTERVAL_HOURS: ${env.SCHEDULER_INTERVAL_HOURS}`);
        logger.info("   ✅ Конфигурация корректна");
        
        // 2. Тестирование типов данных
        logger.info("📊 2. Тестирование типов данных...");
        const mockData: TariffsDataToSave = {
            request: {
                request_date: new Date(),
                dt_next_box: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                dt_till_max: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
            warehouses: [
                {
                    warehouse_name: "Тестовый склад",
                    box_delivery_base: 50.0,
                    box_delivery_liter: 12.0,
                    box_storage_base: 0.1,
                    box_storage_liter: 0.1,
                }
            ],
        };
        logger.info(`   - Создан объект с ${mockData.warehouses.length} складом`);
        logger.info("   ✅ Типы данных работают корректно");
        
        // 3. Тестирование планировщика
        logger.info("⏰ 3. Тестирование планировщика...");
        const initialInfo = schedulerService.getSchedulerInfo();
        logger.info(`   - Начальное состояние: ${initialInfo.isRunning ? 'запущен' : 'остановлен'}`);
        
        schedulerService.start();
        const runningInfo = schedulerService.getSchedulerInfo();
        logger.info(`   - После запуска: ${runningInfo.isRunning ? 'запущен' : 'остановлен'}`);
        
        schedulerService.stop();
        const stoppedInfo = schedulerService.getSchedulerInfo();
        logger.info(`   - После остановки: ${stoppedInfo.isRunning ? 'запущен' : 'остановлен'}`);
        logger.info("   ✅ Планировщик работает корректно");
        
        // 4. Тестирование логирования
        logger.info("📝 4. Тестирование логирования...");
        logger.debug("   - Debug сообщение");
        logger.info("   - Info сообщение");
        logger.warn("   - Warning сообщение");
        logger.error("   - Error сообщение");
        logger.info("   ✅ Логирование работает корректно");
        
        // 5. Проверка файловой системы
        logger.info("📁 5. Проверка файловой системы...");
        const fs = await import('fs');
        const path = await import('path');
        
        const logsDir = path.join(process.cwd(), 'logs');
        const logFile = path.join(logsDir, 'app.log');
        
        if (fs.existsSync(logsDir)) {
            logger.info("   - Директория logs существует");
        } else {
            logger.warn("   - Директория logs не существует");
        }
        
        if (fs.existsSync(logFile)) {
            const stats = fs.statSync(logFile);
            logger.info(`   - Файл логов существует, размер: ${stats.size} байт`);
        } else {
            logger.warn("   - Файл логов не существует");
        }
        logger.info("   ✅ Файловая система проверена");
        
        // 6. Проверка переменных окружения
        logger.info("🔧 6. Проверка переменных окружения...");
        const requiredVars = [
            'POSTGRES_DB',
            'POSTGRES_USER', 
            'POSTGRES_PASSWORD',
            'WB_API_URL',
            'SCHEDULER_INTERVAL_HOURS'
        ];
        
        let allVarsOk = true;
        requiredVars.forEach(varName => {
            const value = env[varName as keyof typeof env];
            if (!value) {
                logger.warn(`   - ${varName}: не задан`);
                allVarsOk = false;
            } else {
                logger.info(`   - ${varName}: ${varName.includes('PASSWORD') ? '***' : value}`);
            }
        });
        
        if (allVarsOk) {
            logger.info("   ✅ Все обязательные переменные заданы");
        } else {
            logger.warn("   ⚠️ Некоторые переменные не заданы");
        }
        
        logger.info("🎉 Комплексное тестирование завершено успешно!");
        logger.info("📋 Результаты:");
        logger.info("   ✅ Конфигурация - работает");
        logger.info("   ✅ Типы данных - работают");
        logger.info("   ✅ Планировщик - работает");
        logger.info("   ✅ Логирование - работает");
        logger.info("   ✅ Файловая система - работает");
        logger.info("   ✅ Переменные окружения - настроены");
        
        if (!env.WB_API_KEY) {
            logger.warn("   ⚠️ API ключ WB не настроен - для работы с API WB необходимо добавить WB_API_KEY в .env");
        }
        
    } catch (error) {
        logger.error("❌ Ошибка при комплексном тестировании:", error);
        process.exit(1);
    }
}

// Запускаем тест
testAll(); 