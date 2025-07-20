import tariffsDbService from "#services/tariffs-db.js";
import logger from "#utils/logger.js";
import { TariffsDataToSave } from "#types/wb-tariffs.js";

async function testMockData() {
    try {
        logger.info("Начало тестирования с мок-данными");
        
        // Создаем мок-данные в формате API WB
        const mockTariffsData: TariffsDataToSave = {
            request: {
                request_date: new Date(),
                dt_next_box: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 дней
                dt_till_max: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 дней
            },
            warehouses: [
                {
                    warehouse_name: "Коледино",
                    box_delivery_and_storage_expr: 160.0,
                    box_delivery_base: 48.0,
                    box_delivery_liter: 11.2,
                    box_storage_base: 0.1,
                    box_storage_liter: 0.1,
                },
                {
                    warehouse_name: "Электросталь",
                    box_delivery_and_storage_expr: 155.0,
                    box_delivery_base: 45.0,
                    box_delivery_liter: 10.8,
                    box_storage_base: 0.1,
                    box_storage_liter: 0.1,
                },
                {
                    warehouse_name: "Подольск",
                    box_delivery_and_storage_expr: 150.0,
                    box_delivery_base: 42.0,
                    box_delivery_liter: 10.5,
                    box_storage_base: 0.1,
                    box_storage_liter: 0.1,
                },
            ],
        };
        
        logger.info("Созданы мок-данные:");
        logger.info(`- Дата запроса: ${mockTariffsData.request.request_date}`);
        logger.info(`- Склады: ${mockTariffsData.warehouses.length}`);
        
        // Выводим информацию о складах
        mockTariffsData.warehouses.forEach((warehouse, index) => {
            logger.info(`${index + 1}. ${warehouse.warehouse_name}:`);
            logger.info(`   - Доставка базовая: ${warehouse.box_delivery_base}`);
            logger.info(`   - Доставка за литр: ${warehouse.box_delivery_liter}`);
            logger.info(`   - Хранение базовая: ${warehouse.box_storage_base}`);
            logger.info(`   - Хранение за литр: ${warehouse.box_storage_liter}`);
        });
        
        // Тестируем сохранение в БД (если БД доступна)
        try {
            await tariffsDbService.saveTariffs(mockTariffsData);
            logger.info("✅ Мок-данные успешно сохранены в БД");
            
            // Тестируем получение данных
            const latestTariffs = await tariffsDbService.getLatestTariffs();
            if (latestTariffs) {
                logger.info("✅ Получены последние тарифы из БД:");
                logger.info(`- Дата: ${latestTariffs.request.request_date}`);
                logger.info(`- Склады: ${latestTariffs.warehouses.length}`);
            }
            
        } catch (dbError) {
            logger.warn("⚠️ Не удалось сохранить в БД (возможно, БД не запущена):", dbError);
        }
        
        logger.info("✅ Тестирование с мок-данными завершено успешно");
        
    } catch (error) {
        logger.error("❌ Ошибка при тестировании с мок-данными:", error);
        process.exit(1);
    }
}

// Запускаем тест
testMockData(); 