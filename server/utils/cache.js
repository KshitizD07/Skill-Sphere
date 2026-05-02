import logger from './logger.js';

// ── In-memory store (fallback when Redis is unavailable) ─────────────────────
class MemoryStore {
  constructor() {
    this.store    = new Map(); // key → { value, expiresAt }
    this.counters = new Map(); // key → { count, expiresAt }

    // Sweep expired keys every 60 seconds
    setInterval(() => this._sweep(), 60_000).unref();
  }

  async get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key, value, ttlSeconds) {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  async del(key) {
    this.store.delete(key);
    this.counters.delete(key);
  }

  async checkRateLimit(identifier, prefix, maxAttempts, windowSeconds) {
    const key   = `${prefix}:${identifier}`;
    const now   = Date.now();
    const entry = this.counters.get(key);

    if (!entry || now > entry.expiresAt) {
      this.counters.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
      return { allowed: true, remaining: maxAttempts - 1, resetIn: windowSeconds };
    }

    entry.count += 1;
    return {
      allowed:   entry.count <= maxAttempts,
      remaining: Math.max(0, maxAttempts - entry.count),
      resetIn:   Math.ceil((entry.expiresAt - now) / 1000),
    };
  }

  _sweep() {
    const now = Date.now();
    for (const [key, entry] of this.store)    { if (entry.expiresAt && now > entry.expiresAt) this.store.delete(key); }
    for (const [key, entry] of this.counters) { if (now > entry.expiresAt) this.counters.delete(key); }
  }
}

// ── Redis store ───────────────────────────────────────────────────────────────
class RedisStore {
  constructor(client) { this.client = client; }

  async get(key) {
    const val = await this.client.get(key);
    return val ? JSON.parse(val) : null;
  }

  async set(key, value, ttlSeconds) {
    const serialized = JSON.stringify(value);
    ttlSeconds ? await this.client.setex(key, ttlSeconds, serialized)
               : await this.client.set(key, serialized);
  }

  async del(key) { await this.client.del(key); }

  async checkRateLimit(identifier, prefix, maxAttempts, windowSeconds) {
    const key   = `rl:${prefix}:${identifier}`;
    const count = await this.client.incr(key);

    if (count === 1) await this.client.expire(key, windowSeconds);

    const ttl = await this.client.ttl(key);
    return {
      allowed:   count <= maxAttempts,
      remaining: Math.max(0, maxAttempts - count),
      resetIn:   ttl > 0 ? ttl : windowSeconds,
    };
  }
}

// ── Cache factory — tries Redis, falls back silently ─────────────────────────
let store      = new MemoryStore();
let usingRedis = false;

async function init() {
  if (!process.env.REDIS_URL) {
    logger.info('Cache: no REDIS_URL — using in-memory store (fine for dev)');
    return;
  }

  try {
    // Dynamic import so the ioredis module is only loaded when REDIS_URL is set
    const { default: Redis } = await import('ioredis');
    const client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      connectTimeout:       3000,
      lazyConnect:          true,
    });

    await client.connect();
    await client.ping();

    client.on('error', (err) => {
      logger.warn('Redis error, falling back to memory store', { err: err.message });
      if (usingRedis) { store = new MemoryStore(); usingRedis = false; }
    });

    store      = new RedisStore(client);
    usingRedis = true;
    logger.info('Cache: Redis connected ✓');
  } catch (err) {
    logger.warn('Cache: Redis unavailable, using in-memory fallback', { err: err.message });
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
const cache = {
  init,
  isRedis: () => usingRedis,
  get:     (key)            => store.get(key),
  set:     (key, value, ttl) => store.set(key, value, ttl),
  del:     (key)            => store.del(key),
  checkRateLimit: (id, prefix, max, window) => store.checkRateLimit(id, prefix, max, window),

  // Convenience: cache-aside pattern
  async getOrSet(key, ttlSeconds, fetchFn) {
    const cached = await store.get(key);
    if (cached !== null) return cached;
    const fresh = await fetchFn();
    await store.set(key, fresh, ttlSeconds);
    return fresh;
  },
};

export default cache;