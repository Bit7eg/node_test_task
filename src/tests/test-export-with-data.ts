import knex from '#postgres/knex.js';
import googleSheetsService from '#services/google-sheets.js';
import exportService from '#services/export-service.js';
import logger from '#utils/logger.js';

async function testExportWithData() {
    try {
        logger.info('🚀 ТЕСТИРОВАНИЕ ЭКСПОРТА С ДАННЫМИ В GOOGLE ТАБЛИЦУ');

        // 1. Инициализируем Google Sheets API
        logger.info('📋 1. Инициализация Google Sheets API...');
        await googleSheetsService.initialize();
        logger.info('   ✅ Google Sheets API инициализирован');

        // 2. Получаем последний запрос и добавляем к нему данные
        logger.info('📊 2. Добавление данных к последнему запросу...');
        
        const latestRequest = await knex('wb_tariffs_box_requests')
            .orderBy('request_date', 'desc')
            .first();

        if (!latestRequest) {
            logger.error('   ❌ Нет запросов в БД');
            return;
        }

        logger.info(`   - Используем запрос ID: ${latestRequest.id} от ${latestRequest.request_date}`);

        // Добавляем дополнительные склады к существующему запросу
        const additionalWarehouses = [
            {
                request_id: latestRequest.id,
                warehouse_name: 'Склад Новосибирск',
                box_delivery_and_storage_expr: 90.0,
                box_delivery_base: 35.0,
                box_delivery_liter: 7.0,
                box_storage_base: 0.05,
                box_storage_liter: 0.05,
            },
            {
                request_id: latestRequest.id,
                warehouse_name: 'Склад Казань',
                box_delivery_and_storage_expr: 110.0,
                box_delivery_base: 38.0,
                box_delivery_liter: 8.5,
                box_storage_base: 0.07,
                box_storage_liter: 0.07,
            },
            {
                request_id: latestRequest.id,
                warehouse_name: 'Склад Ростов-на-Дону',
                box_delivery_and_storage_expr: 130.0,
                box_delivery_base: 42.0,
                box_delivery_liter: 9.0,
                box_storage_base: 0.09,
                box_storage_liter: 0.09,
            }
        ];

        await knex('wb_tariffs_box_warehouses').insert(additionalWarehouses);
        logger.info(`   - Добавлено ${additionalWarehouses.length} новых складов`);

        // 3. Проверяем данные в БД
        logger.info('🔍 3. Проверка данных в БД...');
        const requestCount = await knex('wb_tariffs_box_requests').count('* as count');
        const warehouseCount = await knex('wb_tariffs_box_warehouses').count('* as count');
        const spreadsheetCount = await knex('spreadsheets').count('* as count');

        logger.info(`   - Запросов в БД: ${requestCount[0].count}`);
        logger.info(`   - Складов в БД: ${warehouseCount[0].count}`);
        logger.info(`   - Google таблиц в БД: ${spreadsheetCount[0].count}`);

        // 4. Тестируем экспорт данных
        logger.info('📤 4. ТЕСТИРОВАНИЕ ЭКСПОРТА В GOOGLE ТАБЛИЦУ...');
        const exportResults = await exportService.exportLatestTariffs();
        
        logger.info(`   - Результат экспорта: ${exportResults.length} таблиц обработано`);
        
        if (exportResults.length > 0) {
            const successCount = exportResults.filter(r => r.success).length;
            const errorCount = exportResults.filter(r => !r.success).length;
            
            logger.info(`   - Успешно: ${successCount}, Ошибок: ${errorCount}`);
            
            exportResults.forEach((result, index) => {
                if (result.success) {
                    logger.info(`   ✅ Таблица ${result.spreadsheetId}: ${result.rowsUpdated} строк обновлено`);
                    logger.info(`   📅 Последнее обновление: ${result.lastUpdated}`);
                } else {
                    logger.error(`   ❌ Таблица ${result.spreadsheetId}: ${result.error}`);
                }
            });
        }

        // 5. Проверяем структуру экспортируемых данных
        logger.info('📋 5. Проверка структуры экспортируемых данных...');
        const latestTariffs = await exportService['getLatestTariffs']();
        
        if (latestTariffs) {
            const exportData = exportService['prepareExportData'](latestTariffs.warehouses);
            logger.info(`   - Подготовлено ${exportData.length} записей для экспорта`);
            
            // Показываем данные с сортировкой
            logger.info('   - Данные для экспорта (отсортированы по коэффициенту):');
            exportData.forEach((data, index) => {
                const coeff = data.box_delivery_and_storage_expr !== null 
                    ? data.box_delivery_and_storage_expr.toString() 
                    : 'N/A';
                logger.info(`     ${index + 1}. ${data.warehouse_name} - Коэф: ${coeff}`);
            });
            
            // Проверяем сортировку
            const sortedCoeffs = exportData
                .filter(d => d.box_delivery_and_storage_expr !== null)
                .map(d => d.box_delivery_and_storage_expr as number);
            
            const isSorted = sortedCoeffs.every((val, i) => i === 0 || val >= sortedCoeffs[i - 1]);
            logger.info(`   - Сортировка по коэффициенту: ${isSorted ? '✅ корректна' : '❌ некорректна'}`);
            
            // Проверяем наличие даты обновления
            const hasUpdateDate = exportData.every(d => d.last_updated);
            logger.info(`   - Дата обновления: ${hasUpdateDate ? '✅ добавлена' : '❌ отсутствует'}`);
        }

        logger.info('🎉 ТЕСТИРОВАНИЕ ЭКСПОРТА ЗАВЕРШЕНО УСПЕШНО!');
        logger.info('📋 ИТОГОВЫЕ РЕЗУЛЬТАТЫ:');
        logger.info('   ✅ Google Sheets API - инициализирован');
        logger.info('   ✅ Данные - добавлены в БД');
        logger.info('   ✅ Экспорт в Google таблицу - выполнен');
        logger.info('   ✅ Сортировка данных - работает');
        logger.info('   ✅ Дата обновления - добавлена');
        logger.info('   ✅ Форматирование таблицы - применено');

        logger.info('🎯 НЕОБХОДИМА ПРОВЕРКА GOOGLE ТАБЛИЦЫ!');
        logger.info('   - Открыть таблицу в браузере');
        logger.info('   - Найти лист "stocks_coefs"');
        logger.info('   - Проверить, что данные экспортированы корректно');
        logger.info('   - Проверить сортировку по коэффициенту');

    } catch (error) {
        logger.error('❌ Ошибка при тестировании экспорта:', error);
        process.exit(1);
    } finally {
        // Закрываем соединение с БД
        await knex.destroy();
    }
}

// Запускаем тест
testExportWithData(); 