import log4js from "log4js";
import env from "#config/env/env.js";

// Конфигурация логирования
log4js.configure({
    appenders: {
        console: {
            type: "console",
            layout: {
                type: "pattern",
                pattern: "%d{yyyy-MM-dd hh:mm:ss.SSS} [%p] %c - %m",
            },
        },
        file: {
            type: "file",
            filename: "logs/app.log",
            maxLogSize: 10485760, // 10MB
            backups: 5,
            layout: {
                type: "pattern",
                pattern: "%d{yyyy-MM-dd hh:mm:ss.SSS} [%p] %c - %m",
            },
        },
    },
    categories: {
        default: {
            appenders: ["console", "file"],
            level: env.NODE_ENV === "production" ? "info" : "debug",
        },
    },
});

const logger = log4js.getLogger("wb-tariffs-app");

export default logger; 