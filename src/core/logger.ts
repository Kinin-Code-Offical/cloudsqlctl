import winston from 'winston';
import path from 'path';
import { PATHS } from './config.js';

// Ensure logs dir exists before creating logger (synchronously if possible, or just handle it)
// Since winston might try to create the file immediately, we should ensure the dir exists.
// However, we can't await here at top level easily in CJS/TS without top-level await.
// We'll rely on the app initialization to call ensureDirs(), but for safety, we can use fs-extra sync.
import fs from 'fs-extra';
try {
    fs.ensureDirSync(PATHS.LOGS);
} catch (_e) {
    // Ignore if it fails, might be permission issue or already exists
}

const maskSensitive = winston.format((info) => {
    if (typeof info.message === 'string') {
        // Simple masking for things that look like bearer tokens
        info.message = info.message.replace(/ya29\.[a-zA-Z0-9_.-]+/g, '[MASKED_TOKEN]');
    }
    return info;
});

export const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        maskSensitive(),
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: path.join(PATHS.LOGS, 'error.log'), level: 'error' }),
        new winston.transports.File({ filename: path.join(PATHS.LOGS, 'combined.log') }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ level, message }) => {
                    return `${level}: ${message}`;
                })
            )
        })
    ],
});
