module.exports = (client) => {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Anti-Crash] Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (err, origin) => {
    console.error('[Anti-Crash] Uncaught Exception:', err, 'origin:', origin);
  });

  process.on('uncaughtExceptionMonitor', (err, origin) => {
    console.error('[Anti-Crash] Uncaught Exception Monitor:', err, 'origin:', origin);
  });
  
  console.log('[Handlers] Anti-Crash Handler loaded successfully.');
};
