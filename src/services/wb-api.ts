import axios, { AxiosError } from "axios";
import { z } from "zod";
import env from "#config/env/env.js";
import { wbTariffsBoxResponseSchema, WbTariffsBoxResponse, TariffsDataToSave } from "#types/wb-tariffs.js";
import logger from "#utils/logger.js";

export class WbApiService {
    private readonly baseUrl: string;
    private readonly apiKey?: string;

    constructor() {
        this.baseUrl = env.WB_API_URL;
        this.apiKey = env.WB_API_KEY;
    }

    /**
     * Получает тарифы коробов с API WB
     * @param date Дата для получения тарифов (формат YYYY-MM-DD)
     * @returns Данные тарифов, готовые для сохранения в БД
     */
    async getBoxTariffs(date: string): Promise<TariffsDataToSave> {
        try {
            logger.info(`Запрос тарифов WB для даты: ${date}`);

            const url = `${this.baseUrl}/api/v1/tariffs/box`;
            const params = { date };
            const headers: Record<string, string> = {};

            // Добавляем API ключ если он есть
            if (this.apiKey) {
                headers["Authorization"] = `Bearer ${this.apiKey}`;
            }

            const response = await axios.get(url, {
                params,
                headers,
                timeout: 30000, // 30 секунд таймаут
            });

            // Валидируем ответ
            const validatedData = wbTariffsBoxResponseSchema.parse(response.data);
            
            // Преобразуем данные для сохранения в БД
            const tariffsData = this.transformApiResponse(validatedData, date);
            
            logger.info(`Успешно получены тарифы для ${validatedData.response.data.warehouseList.length} складов`);
            
            return tariffsData;
        } catch (error) {
            if (error instanceof z.ZodError) {
                logger.error("Ошибка валидации ответа API WB:", error.errors);
                throw new Error(`Неверный формат ответа API WB: ${error.message}`);
            }
            
            if (error instanceof AxiosError) {
                const status = error.response?.status;
                const message = error.response?.data?.message || error.message;
                
                logger.error(`Ошибка API WB (${status}): ${message}`);
                
                if (status === 401) {
                    throw new Error("Неверный API ключ WB");
                } else if (status === 429) {
                    throw new Error("Превышен лимит запросов к API WB");
                } else if (status === 400) {
                    throw new Error(`Неверный запрос к API WB: ${message}`);
                } else {
                    throw new Error(`Ошибка API WB (${status}): ${message}`);
                }
            }
            
            logger.error("Неожиданная ошибка при запросе к API WB:", error);
            throw new Error(`Ошибка при запросе к API WB: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        }
    }

    /**
     * Преобразует ответ API в формат для сохранения в БД
     */
    private transformApiResponse(apiResponse: WbTariffsBoxResponse, requestDate: string): TariffsDataToSave {
        const { data } = apiResponse.response;
        
        // Преобразуем строки в числа для числовых полей
        const warehouses = data.warehouseList.map(warehouse => ({
            warehouse_name: warehouse.warehouseName,
            box_delivery_and_storage_expr: this.parseDecimal(warehouse.boxDeliveryAndStorageExpr),
            box_delivery_base: this.parseDecimal(warehouse.boxDeliveryBase),
            box_delivery_liter: this.parseDecimal(warehouse.boxDeliveryLiter),
            box_storage_base: this.parseDecimal(warehouse.boxStorageBase),
            box_storage_liter: this.parseDecimal(warehouse.boxStorageLiter),
        }));

        // Преобразуем даты
        const request: TariffsDataToSave["request"] = {
            request_date: new Date(requestDate),
            dt_next_box: data.dtNextBox ? new Date(data.dtNextBox) : undefined,
            dt_till_max: data.dtTillMax ? new Date(data.dtTillMax) : undefined,
        };

        return {
            request,
            warehouses,
        };
    }

    /**
     * Преобразует строку в число, учитывая русскую запятую
     */
    private parseDecimal(value?: string): number | undefined {
        if (!value) return undefined;
        
        // Заменяем запятую на точку и убираем пробелы
        const cleanValue = value.replace(/,/g, '.').replace(/\s/g, '');
        const parsed = parseFloat(cleanValue);
        
        return isNaN(parsed) ? undefined : parsed;
    }
}

export default new WbApiService(); 