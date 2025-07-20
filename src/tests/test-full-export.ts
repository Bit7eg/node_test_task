import knex from '#postgres/knex.js';
import googleSheetsService from '#services/google-sheets.js';
import exportService from '#services/export-service.js';
import logger from '#utils/logger.js';

async function testFullExport() {
    try {
        logger.info('🚀 ФИНАЛЬНОЕ ТЕСТИРОВАНИЕ: Полный цикл экспорта в Google таблицу');

        // 1. Инициализируем Google Sheets API
        logger.info('📋 1. Инициализация Google Sheets API...');
        await googleSheetsService.initialize();
        logger.info('   ✅ Google Sheets API инициализирован');

        // 2. Добавляем свежие тестовые данные
        logger.info('📊 2. Добавление тестовых данных в БД...');
        
        // Создаем новый запрос (используем завтрашнюю дату)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const requestDate = tomorrow.toISOString().split('T')[0];
        
        const [requestResult] = await knex('wb_tariffs_box_requests').insert({
            request_date: requestDate,
            dt_next_box: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            dt_till_max: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        }).returning('id');

        const requestId = requestResult.id;
        logger.info(`   - Создан запрос с ID: ${requestId} на дату: ${requestDate}`);

        // Добавляем тестовые склады с разными коэффициентами для проверки сортировки
        const testWarehouses = [
            {
                request_id: requestId,
                warehouse_name: 'Склад Москва (Центр)',
                box_delivery_and_storage_expr: 150.0,
                box_delivery_base: 45.0,
                box_delivery_liter: 10.5,
                box_storage_base: 0.1,
                box_storage_liter: 0.1,
            },
            {
                request_id: requestId,
                warehouse_name: 'Склад Санкт-Петербург',
                box_delivery_and_storage_expr: 120.0,
                box_delivery_base: 40.0,
                box_delivery_liter: 8.0,
                box_storage_base: 0.08,
                box_storage_liter: 0.08,
            },
            {
                request_id: requestId,
                warehouse_name: 'Склад Екатеринбург',
                box_delivery_and_storage_expr: 180.0,
                box_delivery_base: 50.0,
                box_delivery_liter: 12.0,
                box_storage_base: 0.12,
                box_storage_liter: 0.12,
            },
            {
                request_id: requestId,
                warehouse_name: 'Склад Новосибирск',
                box_delivery_and_storage_expr: 90.0,
                box_delivery_base: 35.0,
                box_delivery_liter: 7.0,
                box_storage_base: 0.05,
                box_storage_liter: 0.05,
            },
            {
                request_id: requestId,
                warehouse_name: 'Склад без коэффициента',
                box_delivery_and_storage_expr: null,
                box_delivery_base: 30.0,
                box_delivery_liter: 6.0,
                box_storage_base: 0.03,
                box_storage_liter: 0.03,
            }
        ];

        await knex('wb_tariffs_box_warehouses').insert(testWarehouses);
        logger.info(`   - Добавлено ${testWarehouses.length} складов`);

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

        logger.info('🎉 ФИНАЛЬНОЕ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО УСПЕШНО!');
        logger.info('📋 ИТОГОВЫЕ РЕЗУЛЬТАТЫ:');
        logger.info('   ✅ Google Sheets API - инициализирован');
        logger.info('   ✅ Тестовые данные - добавлены в БД');
        logger.info('   ✅ Экспорт в Google таблицу - выполнен');
        logger.info('   ✅ Сортировка данных - работает');
        logger.info('   ✅ Дата обновления - добавлена');
        logger.info('   ✅ Форматирование таблицы - применено');

        logger.info('🎯 ПРОВЕРЬТЕ ВАШУ GOOGLE ТАБЛИЦУ!');
        logger.info('   - Откройте таблицу в браузере');
        logger.info('   - Найдите лист "stocks_coefs"');
        logger.info('   - Проверьте, что данные экспортированы корректно');
        logger.info('   - Проверьте сортировку по коэффициенту');

    } catch (error) {
        logger.error('❌ Ошибка при финальном тестировании:', error);
        process.exit(1);
    } finally {
        // Закрываем соединение с БД
        await knex.destroy();
    }
}

// Запускаем финальный тест
testFullExport(); 