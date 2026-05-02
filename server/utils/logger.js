import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';

const { combine, timestamp, errors, json, colorize, printf } = format;

// Human-readable coloured output for local development
const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    return `${timestamp} ${level}: ${message}${metaStr}${stack ? '\n' + stack : ''}`;
  })
);

// Structured JSON for log aggregators in production
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const isDev = process.env.NODE_ENV !== 'production';

const logger = createLogger({
  level: isDev ? 'debug' : 'info',
  format: isDev ? devFormat : prodFormat,
  defaultMeta: { service: 'skillsphere-api' },
  transports: [new transports.Console()],
});

// Rotating file transports — production only
if (!isDev) {
  logger.add(new transports.DailyRotateFile({
    filename: path.join('logs', 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxFiles: '14d',
    zippedArchive: true,
  }));

  logger.add(new transports.DailyRotateFile({
    filename: path.join('logs', 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '7d',
    zippedArchive: true,
  }));
}

export default logger;