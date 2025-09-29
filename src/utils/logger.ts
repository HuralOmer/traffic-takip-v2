/**
 * Logger Utility - Centralized logging
 */

export interface LogLevel {
  ERROR: 0;
  WARN: 1;
  INFO: 2;
  DEBUG: 3;
}

export const LOG_LEVELS: LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

export interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  context?: string;
  meta?: any;
}

export class Logger {
  private context: string;
  private level: number;

  constructor(context: string = 'app') {
    this.context = context;
    this.level = this.getLogLevel();
  }

  private getLogLevel(): number {
    const envLevel = process.env['LOG_LEVEL']?.toUpperCase() || 'INFO';
    return LOG_LEVELS[envLevel as keyof LogLevel] ?? LOG_LEVELS.INFO;
  }

  private shouldLog(level: number): boolean {
    return level <= this.level;
  }

  private formatMessage(level: string, message: string, meta?: any): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.context,
      meta
    };
  }

  private log(level: string, levelNum: number, message: string, meta?: any): void {
    if (!this.shouldLog(levelNum)) return;

    const logEntry = this.formatMessage(level, message, meta);
    
    if (process.env['LOG_FORMAT'] === 'json') {
      console.log(JSON.stringify(logEntry));
    } else {
      const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
      console.log(`[${logEntry.timestamp}] ${level} [${this.context}] ${message}${metaStr}`);
    }
  }

  public error(message: string, meta?: any): void {
    this.log('ERROR', LOG_LEVELS.ERROR, message, meta);
  }

  public warn(message: string, meta?: any): void {
    this.log('WARN', LOG_LEVELS.WARN, message, meta);
  }

  public info(message: string, meta?: any): void {
    this.log('INFO', LOG_LEVELS.INFO, message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.log('DEBUG', LOG_LEVELS.DEBUG, message, meta);
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context);
}
