import winston from 'winston';
import path from 'path';

// 确保日志目录存在
import fs from 'fs';
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 创建日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// 创建控制台格式
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

// 创建日志记录器
const logger = winston.createLogger({
  level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'app-review-service' },
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: consoleFormat
    }),
    // 文件输出 - 综合日志
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: logFormat
    }),
    // 文件输出 - 错误日志
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: logFormat
    })
  ]
});

export default logger;
