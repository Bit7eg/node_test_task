import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.union([z.undefined(), z.enum(["development", "production"])]),
    POSTGRES_HOST: z.union([z.undefined(), z.string()]),
    POSTGRES_PORT: z
        .string()
        .regex(/^[0-9]+$/)
        .transform((value) => parseInt(value)),
    POSTGRES_DB: z.string(),
    POSTGRES_USER: z.string(),
    POSTGRES_PASSWORD: z.string(),
    APP_PORT: z.union([
        z.undefined(),
        z
            .string()
            .regex(/^[0-9]+$/)
            .transform((value) => parseInt(value)),
    ]),
    // WB API настройки
    WB_API_URL: z.string().default("https://common-api.wildberries.ru"),
    WB_API_KEY: z.string().optional(),
    // Настройки планировщика
    SCHEDULER_INTERVAL_HOURS: z
        .string()
        .regex(/^[0-9]+$/)
        .transform((value) => parseInt(value))
        .default("1"),
    // Google Sheets настройки
    GOOGLE_SHEETS_CREDENTIALS_FILE: z.string().default("./credentials/service-account.json"),
    GOOGLE_SHEETS_SCOPES: z.array(z.string()).default(["https://www.googleapis.com/auth/spreadsheets"]),
});

const env = envSchema.parse({
    POSTGRES_HOST: process.env.POSTGRES_HOST,
    POSTGRES_PORT: process.env.POSTGRES_PORT,
    POSTGRES_DB: process.env.POSTGRES_DB,
    POSTGRES_USER: process.env.POSTGRES_USER,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
    NODE_ENV: process.env.NODE_ENV,
    APP_PORT: process.env.APP_PORT,
    WB_API_URL: process.env.WB_API_URL,
    WB_API_KEY: process.env.WB_API_KEY,
    SCHEDULER_INTERVAL_HOURS: process.env.SCHEDULER_INTERVAL_HOURS,
    GOOGLE_SHEETS_CREDENTIALS_FILE: process.env.GOOGLE_SHEETS_CREDENTIALS_FILE,
    GOOGLE_SHEETS_SCOPES: process.env.GOOGLE_SHEETS_SCOPES ? JSON.parse(process.env.GOOGLE_SHEETS_SCOPES) : undefined,
});

export default env;
