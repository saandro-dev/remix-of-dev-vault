type LogLevel = "debug" | "info" | "warn" | "error";

const isDev = import.meta.env.DEV;

function formatMessage(level: LogLevel, module: string, message: string): string {
  const timestamp = new Date().toISOString().slice(11, 23);
  return `[${timestamp}] [${level.toUpperCase()}] [${module}] ${message}`;
}

function createLogger(module: string) {
  return {
    debug: (message: string, ...args: unknown[]) => {
      if (isDev) console.debug(formatMessage("debug", module, message), ...args);
    },
    info: (message: string, ...args: unknown[]) => {
      if (isDev) console.info(formatMessage("info", module, message), ...args);
    },
    warn: (message: string, ...args: unknown[]) => {
      console.warn(formatMessage("warn", module, message), ...args);
    },
    error: (message: string, ...args: unknown[]) => {
      console.error(formatMessage("error", module, message), ...args);
    },
  };
}

export const logger = { create: createLogger };
