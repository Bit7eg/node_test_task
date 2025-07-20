import wbApiService from "#services/wb-api.js";
import tariffsDbService from "#services/tariffs-db.js";
import logger from "#utils/logger.js";

async function testApi() {
    try {
        logger.info("Начало тестирования API WB");
        
        const currentDate = new Date().toISOString().split('T')[0];
        logger.info(`Тестируем получение тарифов для даты: ${currentDate}`);
        
        // Тестируем получение данных с API
        const tariffsData = await wbApiService.getBoxTariffs(currentDate);
        logger.info(`Получены данные: ${tariffsData.warehouses.length} складов`);
        
        // Выводим информацию о полученных данных
        logger.info("Информация о запросе:");
        logger.info(`- Дата запроса: ${tariffsData.request.request_date}`);
        logger.info(`- Дата следующего изменения: ${tariffsData.request.dt_next_box}`);
        logger.info(`- Дата до макс. тарифов: ${tariffsData.request.dt_till_max}`);
        
        logger.info("Информация о складах:");
        tariffsData.warehouses.forEach((warehouse, index) => {
            logger.info(`${index + 1}. ${warehouse.warehouse_name}:`);
            logger.info(`   - Доставка базовая: ${warehouse.box_delivery_base}`);
            logger.info(`   - Доставка за литр: ${warehouse.box_delivery_liter}`);
            logger.info(`   - Хранение базовая: ${warehouse.box_storage_base}`);
            logger.info(`   - Хранение за литр: ${warehouse.box_storage_liter}`);
        });
        
        // Тестируем сохранение в БД (если БД доступна)
        try {
            await tariffsDbService.saveTariffs(tariffsData);
            logger.info("Данные успешно сохранены в БД");
        } catch (dbError) {
            logger.warn("Не удалось сохранить в БД (возможно, БД не запущена):", dbError);
        }
        
        logger.info("Тестирование завершено успешно");
        
    } catch (error) {
        logger.error("Ошибка при тестировании:", error);
        process.exit(1);
    }
}

// Запускаем тест
testApi(); 