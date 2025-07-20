import { z } from "zod";

// Схема валидации для ответа API WB
export const wbTariffsBoxResponseSchema = z.object({
    response: z.object({
        data: z.object({
            dtNextBox: z.string().optional(),
            dtTillMax: z.string().optional(),
            warehouseList: z.array(z.object({
                boxDeliveryAndStorageExpr: z.string().optional(),
                boxDeliveryBase: z.string().optional(),
                boxDeliveryLiter: z.string().optional(),
                boxStorageBase: z.string().optional(),
                boxStorageLiter: z.string().optional(),
                warehouseName: z.string(),
            })),
        }),
    }),
});

// Типы для API
export type WbTariffsBoxResponse = z.infer<typeof wbTariffsBoxResponseSchema>;
export type WbWarehouseTariff = WbTariffsBoxResponse["response"]["data"]["warehouseList"][0];

// Типы для БД
export interface WbTariffsBoxRequest {
    id?: number;
    request_date: Date;
    dt_next_box?: Date;
    dt_till_max?: Date;
}

export interface WbTariffsBoxWarehouse {
    id?: number;
    request_id: number;
    warehouse_name: string;
    box_delivery_and_storage_expr?: number;
    box_delivery_base?: number;
    box_delivery_liter?: number;
    box_storage_base?: number;
    box_storage_liter?: number;
}

// Тип для сохранения данных
export interface TariffsDataToSave {
    request: WbTariffsBoxRequest;
    warehouses: Omit<WbTariffsBoxWarehouse, "request_id">[];
} 