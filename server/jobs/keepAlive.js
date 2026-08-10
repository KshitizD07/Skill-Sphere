import cron from 'node-cron';
import https from 'https';
import http from 'http';
import logger from '../utils/logger.js';

export function setupKeepAliveJob() {
  const isProd = process.env.NODE_ENV === 'production';
  const targetUrl = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL || 'https://skill-sphere-backend-29kn.onrender.com/ping';

  if (!isProd && !process.env.ENABLE_KEEP_ALIVE) {
    logger.info('Keep-alive self-ping disabled in local environment');
    return;
  }

  // Schedule self-ping every 10 minutes
  cron.schedule('*/10 * * * *', () => {
    try {
      const client = targetUrl.startsWith('https') ? https : http;
      client.get(targetUrl, (res) => {
        logger.info(`Keep-alive self-ping sent to ${targetUrl}`, { statusCode: res.statusCode });
      }).on('error', (err) => {
        logger.warn(`Keep-alive self-ping network error`, { error: err.message });
      });
    } catch (err) {
      logger.warn(`Keep-alive job exception`, { error: err.message });
    }
  });

  logger.info(`Keep-alive job scheduled (every 10 mins -> ${targetUrl})`);
}
