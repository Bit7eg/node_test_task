import knex from '#postgres/knex.js';
import logger from '#utils/logger.js';

async function updateSpreadsheetId() {
    try {
        logger.info('🔄 Обновление ID Google таблицы в БД...');

        // Очищаем старые записи
        await knex('spreadsheets').del();
        logger.info('   - Старые записи удалены');

        // Добавляем новый ID
        const newId = '1iJxLzkQzD5HksfzNaFOHzY3hQDHxOSolmH31euhYFqE';
        await knex('spreadsheets').insert({ spreadsheet_id: newId });
        logger.info(`   - Добавлен новый ID: ${newId}`);

        // Проверяем результат
        const spreadsheets = await knex('spreadsheets').select('*');
        logger.info(`   - В БД теперь ${spreadsheets.length} таблиц:`);
        spreadsheets.forEach(sheet => {
            logger.info(`     - ${sheet.spreadsheet_id}`);
        });

        logger.info('✅ ID таблицы успешно обновлен!');

    } catch (error) {
        logger.error('❌ Ошибка при обновлении ID таблицы:', error);
        process.exit(1);
    } finally {
        await knex.destroy();
    }
}

// Запускаем скрипт
updateSpreadsheetId(); 