export const logger = {
  info: (message: string, meta?: any) => {
    console.log(JSON.stringify({
      level: 'INFO',
      message,
      meta,
      timestamp: new Date().toISOString(),
    }));
  },

  error: (message: string, error?: any) => {
    console.error(JSON.stringify({
      level: 'ERROR',
      message,
      error: error?.message || error,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    }));
  },

  warn: (message: string, meta?: any) => {
    console.warn(JSON.stringify({
      level: 'WARN',
      message,
      meta,
      timestamp: new Date().toISOString(),
    }));
  },

  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(JSON.stringify({
        level: 'DEBUG',
        message,
        meta,
        timestamp: new Date().toISOString(),
      }));
    }
  },
};
