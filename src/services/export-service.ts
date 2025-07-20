import knex from '#postgres/knex.js';
import googleSheetsService from '#services/google-sheets.js';
import { ExportTariffData, ExportResult } from '#types/google-sheets.js';
import logger from '#utils/logger.js';

export class ExportService {
    /**
     * Экспортирует последние данные тарифов во все Google таблицы
     */
    async exportLatestTariffs(): Promise<ExportResult[]> {
        try {
            logger.info('Начало экспорта данных в Google таблицы');

            // Проверяем инициализацию Google Sheets
            if (!googleSheetsService.isInitialized()) {
                logger.warn('Google Sheets API не инициализирован, пропускаем экспорт');
                return [];
            }

            // Получаем последние данные тарифов
            const latestTariffs = await this.getLatestTariffs();
            if (!latestTariffs) {
                logger.warn('Нет данных тарифов для экспорта');
                return [];
            }

            // Подготавливаем данные для экспорта
            const exportData = this.prepareExportData(latestTariffs.warehouses);

            // Получаем список всех таблиц
            const spreadsheets = await this.getSpreadsheetsList();

            // Экспортируем в каждую таблицу
            const results: ExportResult[] = [];
            for (const spreadsheet of spreadsheets) {
                const result = await this.exportToSpreadsheet(spreadsheet.spreadsheet_id, exportData);
                results.push(result);
            }

            // Логируем результаты
            const successCount = results.filter(r => r.success).length;
            const errorCount = results.filter(r => !r.success).length;

            logger.info(`Экспорт завершен: ${successCount} успешно, ${errorCount} с ошибками`);

            return results;
        } catch (error) {
            logger.error('Ошибка при экспорте данных:', error);
            return [];
        }
    }

    /**
     * Получает последние данные тарифов из БД
     */
    private async getLatestTariffs(): Promise<{
        request: any;
        warehouses: any[];
    } | null> {
        try {
            const latestRequest = await knex('wb_tariffs_box_requests')
                .orderBy('request_date', 'desc')
                .first();

            if (!latestRequest) {
                return null;
            }

            const warehouses = await knex('wb_tariffs_box_warehouses')
                .where('request_id', latestRequest.id)
                .orderBy('warehouse_name');

            return {
                request: latestRequest,
                warehouses,
            };
        } catch (error) {
            logger.error('Ошибка при получении последних тарифов:', error);
            return null;
        }
    }

    /**
     * Подготавливает данные для экспорта
     */
    private prepareExportData(warehouses: any[]): ExportTariffData[] {
        const currentDate = new Date().toISOString();

        // Сортируем по коэффициенту (box_delivery_and_storage_expr) по возрастанию
        const sortedWarehouses = warehouses
            .filter(w => w.box_delivery_and_storage_expr !== null)
            .sort((a, b) => {
                const aValue = a.box_delivery_and_storage_expr || 0;
                const bValue = b.box_delivery_and_storage_expr || 0;
                return aValue - bValue;
            });

        // Добавляем записи без коэффициента в конец
        const warehousesWithoutCoeff = warehouses.filter(w => w.box_delivery_and_storage_expr === null);
        const allWarehouses = [...sortedWarehouses, ...warehousesWithoutCoeff];

        return allWarehouses.map(warehouse => ({
            warehouse_name: warehouse.warehouse_name,
            box_delivery_and_storage_expr: warehouse.box_delivery_and_storage_expr,
            box_delivery_base: warehouse.box_delivery_base,
            box_delivery_liter: warehouse.box_delivery_liter,
            box_storage_base: warehouse.box_storage_base,
            box_storage_liter: warehouse.box_storage_liter,
            last_updated: currentDate,
        }));
    }

    /**
     * Получает список всех Google таблиц
     */
    private async getSpreadsheetsList(): Promise<{ spreadsheet_id: string }[]> {
        try {
            const spreadsheets = await knex('spreadsheets').select('spreadsheet_id');
            logger.info(`Найдено ${spreadsheets.length} Google таблиц для экспорта`);
            return spreadsheets;
        } catch (error) {
            logger.error('Ошибка при получении списка таблиц:', error);
            return [];
        }
    }

    /**
     * Экспортирует данные в конкретную таблицу
     */
    private async exportToSpreadsheet(spreadsheetId: string, data: ExportTariffData[]): Promise<ExportResult> {
        try {
            logger.info(`Экспорт в таблицу ${spreadsheetId}...`);

            // Проверяем доступ к таблице
            const hasAccess = await googleSheetsService.checkAccess(spreadsheetId);
            if (!hasAccess) {
                return {
                    spreadsheetId,
                    success: false,
                    error: 'Нет доступа к таблице',
                };
            }

            // Экспортируем данные
            const result = await googleSheetsService.exportData(spreadsheetId, data);

            if (result.success) {
                logger.info(`✅ Успешно экспортировано в ${spreadsheetId}: ${result.rowsUpdated} строк`);
            } else {
                logger.error(`❌ Ошибка экспорта в ${spreadsheetId}: ${result.error}`);
            }

            return result;
        } catch (error) {
            logger.error(`Ошибка при экспорте в таблицу ${spreadsheetId}:`, error);
            return {
                spreadsheetId,
                success: false,
                error: error instanceof Error ? error.message : 'Неизвестная ошибка',
            };
        }
    }

    /**
     * Проверяет доступность Google Sheets API
     */
    async checkGoogleSheetsAvailability(): Promise<boolean> {
        try {
            if (!googleSheetsService.isInitialized()) {
                await googleSheetsService.initialize();
            }
            return true;
        } catch (error) {
            logger.warn('Google Sheets API недоступен:', error);
            return false;
        }
    }
}

export default new ExportService(); 