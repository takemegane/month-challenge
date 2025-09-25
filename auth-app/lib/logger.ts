const isDevelopment = process.env.NODE_ENV === 'development';
const enableDebugLogs = process.env.ENABLE_DEBUG_LOGS === 'true';

export const logger = {
  // Critical errors - always logged
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },

  // Warnings - always logged
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  // Info logs - only in development or when explicitly enabled
  info: (message: string, ...args: any[]) => {
    if (isDevelopment || enableDebugLogs) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  // Debug logs - only when explicitly enabled
  debug: (message: string, ...args: any[]) => {
    if (enableDebugLogs) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }
};