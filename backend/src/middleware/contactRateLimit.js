// Простейший in-memory rate-limiter: 5 запросов с одного IP за 15 минут.
// Живёт только в памяти процесса — сбрасывается при рестарте сервера
// и не общий между несколькими инстансами. Для одного процесса достаточно.

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;

const hits = new Map(); // ip -> [timestamps]

function contactRateLimit(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();

  const timestamps = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  timestamps.push(now);
  hits.set(ip, timestamps);
  next();
}

module.exports = contactRateLimit;