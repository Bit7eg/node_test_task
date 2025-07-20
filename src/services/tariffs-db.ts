import knex from "#postgres/knex.js";
import { TariffsDataToSave, WbTariffsBoxRequest, WbTariffsBoxWarehouse } from "#types/wb-tariffs.js";
import logger from "#utils/logger.js";
import exportService from "#services/export-service.js";

export class TariffsDbService {
    /**
     * Сохраняет или обновляет тарифы в БД
     * @param tariffsData Данные тарифов для сохранения
     */
    async saveTariffs(tariffsData: TariffsDataToSave): Promise<void> {
        const { request, warehouses } = tariffsData;
        
        try {
            await knex.transaction(async (trx) => {
                // Проверяем, есть ли уже запись для этой даты
                const existingRequest = await trx("wb_tariffs_box_requests")
                    .where("request_date", request.request_date)
                    .first();

                let requestId: number;

                if (existingRequest) {
                    // Обновляем существующую запись
                    await trx("wb_tariffs_box_requests")
                        .where("id", existingRequest.id)
                        .update({
                            dt_next_box: request.dt_next_box,
                            dt_till_max: request.dt_till_max,
                        });
                    requestId = existingRequest.id;
                    logger.info(`Обновлена существующая запись для даты ${request.request_date.toISOString().split('T')[0]}`);
                } else {
                    // Создаем новую запись
                    const [newRequest] = await trx("wb_tariffs_box_requests")
                        .insert(request)
                        .returning("id");
                    requestId = newRequest.id;
                    logger.info(`Создана новая запись для даты ${request.request_date.toISOString().split('T')[0]}`);
                }

                // Удаляем старые записи складов для этого запроса
                await trx("wb_tariffs_box_warehouses")
                    .where("request_id", requestId)
                    .del();

                // Добавляем новые записи складов
                const warehousesWithRequestId = warehouses.map(warehouse => ({
                    ...warehouse,
                    request_id: requestId,
                }));

                await trx("wb_tariffs_box_warehouses")
                    .insert(warehousesWithRequestId);

                logger.info(`Сохранены тарифы для ${warehouses.length} складов`);
            });

            // Экспортируем данные в Google таблицы после успешного сохранения
            try {
                logger.info('Запуск экспорта в Google таблицы...');
                const exportResults = await exportService.exportLatestTariffs();
                
                const successCount = exportResults.filter(r => r.success).length;
                const errorCount = exportResults.filter(r => !r.success).length;
                
                if (successCount > 0) {
                    logger.info(`✅ Экспорт завершен: ${successCount} таблиц обновлено`);
                }
                if (errorCount > 0) {
                    logger.warn(`⚠️ Экспорт: ${errorCount} таблиц с ошибками`);
                }
            } catch (exportError) {
                logger.error('Ошибка при экспорте в Google таблицы:', exportError);
                // Не прерываем работу приложения при ошибке экспорта
            }
        } catch (error) {
            logger.error("Ошибка при сохранении тарифов в БД:", error);
            throw new Error(`Ошибка при сохранении тарифов: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        }
    }

    /**
     * Получает тарифы за указанный период
     * @param startDate Начальная дата (включительно)
     * @param endDate Конечная дата (включительно)
     */
    async getTariffsForPeriod(startDate: Date, endDate: Date): Promise<{
        request: WbTariffsBoxRequest;
        warehouses: WbTariffsBoxWarehouse[];
    }[]> {
        try {
            const requests = await knex("wb_tariffs_box_requests")
                .whereBetween("request_date", [startDate, endDate])
                .orderBy("request_date", "desc");

            const result = [];

            for (const request of requests) {
                const warehouses = await knex("wb_tariffs_box_warehouses")
                    .where("request_id", request.id)
                    .orderBy("warehouse_name");

                result.push({
                    request,
                    warehouses,
                });
            }

            logger.info(`Получены тарифы за период ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}: ${result.length} записей`);
            
            return result;
        } catch (error) {
            logger.error("Ошибка при получении тарифов из БД:", error);
            throw new Error(`Ошибка при получении тарифов: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        }
    }

    /**
     * Получает последние тарифы
     */
    async getLatestTariffs(): Promise<{
        request: WbTariffsBoxRequest;
        warehouses: WbTariffsBoxWarehouse[];
    } | null> {
        try {
            const latestRequest = await knex("wb_tariffs_box_requests")
                .orderBy("request_date", "desc")
                .first();

            if (!latestRequest) {
                return null;
            }

            const warehouses = await knex("wb_tariffs_box_warehouses")
                .where("request_id", latestRequest.id)
                .orderBy("warehouse_name");

            return {
                request: latestRequest,
                warehouses,
            };
        } catch (error) {
            logger.error("Ошибка при получении последних тарифов:", error);
            throw new Error(`Ошибка при получении последних тарифов: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        }
    }

    /**
     * Получает тарифы для конкретной даты
     * @param date Дата для получения тарифов
     */
    async getTariffsForDate(date: Date): Promise<{
        request: WbTariffsBoxRequest;
        warehouses: WbTariffsBoxWarehouse[];
    } | null> {
        try {
            const request = await knex("wb_tariffs_box_requests")
                .where("request_date", date)
                .first();

            if (!request) {
                return null;
            }

            const warehouses = await knex("wb_tariffs_box_warehouses")
                .where("request_id", request.id)
                .orderBy("warehouse_name");

            return {
                request,
                warehouses,
            };
        } catch (error) {
            logger.error("Ошибка при получении тарифов для даты:", error);
            throw new Error(`Ошибка при получении тарифов для даты: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        }
    }

    /**
     * Проверяет, есть ли данные для указанной даты
     * @param date Дата для проверки
     */
    async hasDataForDate(date: Date): Promise<boolean> {
        try {
            const count = await knex("wb_tariffs_box_requests")
                .where("request_date", date)
                .count("* as count")
                .first();
            
            return Number(count?.count) > 0;
        } catch (error) {
            logger.error("Ошибка при проверке наличия данных:", error);
            return false;
        }
    }
}

export default new TariffsDbService(); 