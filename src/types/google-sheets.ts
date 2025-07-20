// Типы для Google Sheets API
export interface GoogleSheetsConfig {
    credentialsFile: string;
    scopes: string[];
}

// Структура экспортируемых данных
export interface ExportTariffData {
    warehouse_name: string;
    box_delivery_and_storage_expr: number | null;
    box_delivery_base: number | null;
    box_delivery_liter: number | null;
    box_storage_base: number | null;
    box_storage_liter: number | null;
    last_updated: string; // Дата последнего обновления
}

// Результат экспорта
export interface ExportResult {
    spreadsheetId: string;
    success: boolean;
    error?: string;
    rowsUpdated?: number;
    lastUpdated?: string;
}

// Заголовки таблицы
export const SHEET_HEADERS = [
    'Склад',
    'Коэффициент',
    'Доставка базовая',
    'Доставка за литр',
    'Хранение базовая',
    'Хранение за литр',
    'Дата обновления'
];

// Название листа
export const SHEET_NAME = 'stocks_coefs'; 