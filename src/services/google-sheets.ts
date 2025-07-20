import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import env from '#config/env/env.js';
import { GoogleSheetsConfig, ExportTariffData, ExportResult, SHEET_HEADERS, SHEET_NAME } from '#types/google-sheets.js';
import logger from '#utils/logger.js';

export class GoogleSheetsService {
    private auth: JWT | null = null;
    private sheets: any = null;
    private config: GoogleSheetsConfig;

    constructor() {
        this.config = {
            credentialsFile: env.GOOGLE_SHEETS_CREDENTIALS_FILE,
            scopes: env.GOOGLE_SHEETS_SCOPES,
        };
    }

    /**
     * Инициализация Google Sheets API
     */
    async initialize(): Promise<void> {
        try {
            logger.info('Инициализация Google Sheets API...');

            // Проверяем наличие файла credentials
            if (!fs.existsSync(this.config.credentialsFile)) {
                throw new Error(`Файл credentials не найден: ${this.config.credentialsFile}`);
            }

            // Загружаем credentials
            const credentials = JSON.parse(fs.readFileSync(this.config.credentialsFile, 'utf8'));

            // Создаем JWT клиент
            this.auth = new JWT({
                email: credentials.client_email,
                key: credentials.private_key,
                scopes: this.config.scopes,
            });

            // Создаем Google Sheets API клиент
            this.sheets = google.sheets({ version: 'v4', auth: this.auth });

            logger.info('Google Sheets API инициализирован успешно');
        } catch (error) {
            logger.error('Ошибка инициализации Google Sheets API:', error);
            throw new Error(`Ошибка инициализации Google Sheets API: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        }
    }

    /**
     * Проверяет доступ к таблице
     */
    async checkAccess(spreadsheetId: string): Promise<boolean> {
        try {
            if (!this.sheets) {
                throw new Error('Google Sheets API не инициализирован');
            }

            await this.sheets.spreadsheets.get({
                spreadsheetId,
                ranges: [SHEET_NAME],
            });

            logger.info(`Доступ к таблице ${spreadsheetId} подтвержден`);
            return true;
        } catch (error) {
            logger.error(`Ошибка доступа к таблице ${spreadsheetId}:`, error);
            return false;
        }
    }

    /**
     * Создает или обновляет лист в таблице
     */
    async ensureSheet(spreadsheetId: string): Promise<void> {
        try {
            if (!this.sheets) {
                throw new Error('Google Sheets API не инициализирован');
            }

            // Проверяем существование листа
            try {
                await this.sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range: `${SHEET_NAME}!A1`,
                });
                logger.info(`Лист ${SHEET_NAME} уже существует в таблице ${spreadsheetId}`);
            } catch (error) {
                // Лист не существует, создаем его
                logger.info(`Создание листа ${SHEET_NAME} в таблице ${spreadsheetId}...`);
                
                await this.sheets.spreadsheets.batchUpdate({
                    spreadsheetId,
                    requestBody: {
                        requests: [
                            {
                                addSheet: {
                                    properties: {
                                        title: SHEET_NAME,
                                    },
                                },
                            },
                        ],
                    },
                });

                logger.info(`Лист ${SHEET_NAME} создан в таблице ${spreadsheetId}`);
            }
        } catch (error) {
            logger.error(`Ошибка при работе с листом в таблице ${spreadsheetId}:`, error);
            throw error;
        }
    }

    /**
     * Экспортирует данные в Google таблицу
     */
    async exportData(spreadsheetId: string, data: ExportTariffData[]): Promise<ExportResult> {
        try {
            if (!this.sheets) {
                throw new Error('Google Sheets API не инициализирован');
            }

            logger.info(`Экспорт данных в таблицу ${spreadsheetId}: ${data.length} записей`);

            // Убеждаемся, что лист существует
            await this.ensureSheet(spreadsheetId);

            // Подготавливаем данные для экспорта
            const exportData = [
                SHEET_HEADERS, // Заголовки
                ...data.map(row => [
                    row.warehouse_name,
                    row.box_delivery_and_storage_expr,
                    row.box_delivery_base,
                    row.box_delivery_liter,
                    row.box_storage_base,
                    row.box_storage_liter,
                    row.last_updated,
                ])
            ];

            // Очищаем существующие данные
            await this.sheets.spreadsheets.values.clear({
                spreadsheetId,
                range: `${SHEET_NAME}!A:Z`,
            });

            // Записываем новые данные
            await this.sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${SHEET_NAME}!A1`,
                valueInputOption: 'RAW',
                requestBody: {
                    values: exportData,
                },
            });

            // Форматируем заголовки
            await this.formatHeaders(spreadsheetId);

            const lastUpdated = new Date().toISOString();
            logger.info(`Данные успешно экспортированы в таблицу ${spreadsheetId}: ${data.length} строк`);

            return {
                spreadsheetId,
                success: true,
                rowsUpdated: data.length,
                lastUpdated,
            };
        } catch (error) {
            logger.error(`Ошибка экспорта в таблицу ${spreadsheetId}:`, error);
            return {
                spreadsheetId,
                success: false,
                error: error instanceof Error ? error.message : 'Неизвестная ошибка',
            };
        }
    }

    /**
     * Форматирует заголовки таблицы
     */
    private async formatHeaders(spreadsheetId: string): Promise<void> {
        try {
            await this.sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                    requests: [
                        {
                            repeatCell: {
                                range: {
                                    sheetId: await this.getSheetId(spreadsheetId),
                                    startRowIndex: 0,
                                    endRowIndex: 1,
                                },
                                cell: {
                                    userEnteredFormat: {
                                        backgroundColor: {
                                            red: 0.8,
                                            green: 0.8,
                                            blue: 0.8,
                                        },
                                        textFormat: {
                                            bold: true,
                                        },
                                    },
                                },
                                fields: 'userEnteredFormat(backgroundColor,textFormat)',
                            },
                        },
                    ],
                },
            });
        } catch (error) {
            logger.warn(`Не удалось отформатировать заголовки в таблице ${spreadsheetId}:`, error);
        }
    }

    /**
     * Получает ID листа
     */
    private async getSheetId(spreadsheetId: string): Promise<number> {
        const response = await this.sheets.spreadsheets.get({
            spreadsheetId,
        });

        const sheet = response.data.sheets?.find((s: any) => s.properties.title === SHEET_NAME);
        return sheet?.properties?.sheetId || 0;
    }

    /**
     * Проверяет, инициализирован ли сервис
     */
    isInitialized(): boolean {
        return this.sheets !== null;
    }
}

export default new GoogleSheetsService(); 