import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Central registry for all matching strategies.
 *
 * Responsibilities:
 * - Maintain strategy state (ACTIVE / SHADOW / DEPRECATED)
 * - Enforce caps on active and shadow strategy counts
 * - Provide lookup and lifecycle methods
 *
 * Strategies are stateless, versioned, and compete for influence — this
 * registry is the "genome pool" in the evolutionary matching system.
 */
class StrategyRegistry {
  constructor() {
    // In-memory cache cleared every 5 minutes
    this._cache = { active: null, shadow: null, lastRefresh: null, ttl: 5 * 60 * 1000 };
  }

  // ── Strategy retrieval ────────────────────────────────────────────────────

  async getActiveStrategies() {
    const now = Date.now();
    if (this._cache.active && this._cache.lastRefresh && (now - this._cache.lastRefresh) < this._cache.ttl) {
      return this._cache.active;
    }

    const strategies = await prisma.matchStrategy.findMany({
      where:   { state: 'ACTIVE' },
      orderBy: [{ influenceLevel: 'desc' }, { createdAt: 'asc' }],
    });

    this._cache.active      = strategies;
    this._cache.lastRefresh = now;
    return strategies;
  }

  async getShadowStrategies() {
    const now = Date.now();
    if (this._cache.shadow && this._cache.lastRefresh && (now - this._cache.lastRefresh) < this._cache.ttl) {
      return this._cache.shadow;
    }

    const strategies = await prisma.matchStrategy.findMany({
      where:   { state: 'SHADOW' },
      orderBy: { createdAt: 'desc' },
    });

    this._cache.shadow      = strategies;
    this._cache.lastRefresh = now;
    return strategies;
  }

  async getStrategyById(strategyId) {
    return prisma.matchStrategy.findUnique({ where: { id: strategyId } });
  }

  async getStrategyByName(name) {
    return prisma.matchStrategy.findUnique({ where: { name } });
  }

  async getAllStrategies() {
    return prisma.matchStrategy.findMany({
      orderBy: [{ state: 'asc' }, { influenceLevel: 'desc' }],
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /** Register a new strategy — always starts in SHADOW mode. */
  async registerStrategy(data) {
    if (!data.name || !data.displayName) throw new Error('Strategy name and displayName are required');

    const existing = await this.getStrategyByName(data.name);
    if (existing) throw new Error(`Strategy "${data.name}" already exists`);

    const config      = await this.getSystemConfig();
    const shadowCount = await prisma.matchStrategy.count({ where: { state: 'SHADOW' } });

    if (shadowCount >= config.maxShadowStrategies) {
      throw new Error(`Shadow strategy cap reached (${config.maxShadowStrategies}). Deprecate an existing shadow strategy first.`);
    }

    const strategy = await prisma.matchStrategy.create({
      data: {
        name:         data.name,
        displayName:  data.displayName,
        description:  data.description || '',
        version:      data.version || '1.0.0',
        state:        'SHADOW',
        influenceLevel: 'MEDIUM',
        config:       data.config || {},
      },
    });

    this.clearCache();
    logger.info('Strategy registered', { name: data.name, state: 'SHADOW' });
    return strategy;
  }

  /** Promote a SHADOW strategy to ACTIVE. Requires human approval (admin endpoint). */
  async promoteStrategy(strategyId, reason) {
    const strategy = await this.getStrategyById(strategyId);
    if (!strategy) throw new Error('Strategy not found');
    if (strategy.state !== 'SHADOW') throw new Error(`Cannot promote strategy in ${strategy.state} state`);

    const config      = await this.getSystemConfig();
    const activeCount = await prisma.matchStrategy.count({ where: { state: 'ACTIVE' } });

    if (activeCount >= config.maxActiveStrategies) {
      throw new Error(`Active strategy cap reached (${config.maxActiveStrategies}). Demote an active strategy first.`);
    }

    const updated = await prisma.matchStrategy.update({
      where: { id: strategyId },
      data:  { state: 'ACTIVE', activatedAt: new Date() },
    });

    await prisma.strategyPromotion.create({
      data: { strategyId, fromState: 'SHADOW', toState: 'ACTIVE', reason: reason || 'Manual promotion', triggeredBy: 'SYSTEM' },
    });

    this.clearCache();
    logger.info('Strategy promoted', { name: strategy.name, state: 'ACTIVE' });
    return updated;
  }

  /** Demote an ACTIVE strategy back to SHADOW. */
  async demoteStrategy(strategyId, reason) {
    const strategy = await this.getStrategyById(strategyId);
    if (!strategy) throw new Error('Strategy not found');
    if (strategy.state !== 'ACTIVE') throw new Error(`Cannot demote strategy in ${strategy.state} state`);

    const updated = await prisma.matchStrategy.update({ where: { id: strategyId }, data: { state: 'SHADOW' } });

    await prisma.strategyPromotion.create({
      data: { strategyId, fromState: 'ACTIVE', toState: 'SHADOW', reason: reason || 'Manual demotion', triggeredBy: 'SYSTEM' },
    });

    this.clearCache();
    logger.info('Strategy demoted', { name: strategy.name, state: 'SHADOW' });
    return updated;
  }

  /** Permanently retire a strategy (kept in DB for historical analysis). */
  async deprecateStrategy(strategyId, reason) {
    const strategy = await this.getStrategyById(strategyId);
    if (!strategy) throw new Error('Strategy not found');

    const updated = await prisma.matchStrategy.update({
      where: { id: strategyId },
      data:  { state: 'DEPRECATED', deprecatedAt: new Date() },
    });

    await prisma.strategyPromotion.create({
      data: { strategyId, fromState: strategy.state, toState: 'DEPRECATED', reason: reason || 'Manual deprecation', triggeredBy: 'SYSTEM' },
    });

    this.clearCache();
    logger.info('Strategy deprecated', { name: strategy.name });
    return updated;
  }

  /** Coarse-grained influence adjustment — the primary evolution mechanism. */
  async updateInfluence(strategyId, newLevel, reason) {
    const validLevels = ['LOW', 'MEDIUM', 'HIGH'];
    if (!validLevels.includes(newLevel)) throw new Error(`Invalid influence level: ${newLevel}`);

    const strategy = await this.getStrategyById(strategyId);
    if (!strategy) throw new Error('Strategy not found');

    const updated = await prisma.matchStrategy.update({
      where: { id: strategyId },
      data: {
        influenceLevel:  newLevel,
        lastPromotedAt:  newLevel === 'HIGH' ? new Date() : strategy.lastPromotedAt,
        lastDemotedAt:   newLevel === 'LOW'  ? new Date() : strategy.lastDemotedAt,
      },
    });

    await prisma.strategyPromotion.create({
      data: { strategyId, fromState: strategy.state, toState: strategy.state, fromInfluence: strategy.influenceLevel, toInfluence: newLevel, reason: reason || 'Influence adjustment', triggeredBy: 'SYSTEM' },
    });

    this.clearCache();
    logger.info('Strategy influence updated', { name: strategy.name, from: strategy.influenceLevel, to: newLevel });
    return updated;
  }

  // ── System config ─────────────────────────────────────────────────────────

  async getSystemConfig() {
    let config = await prisma.systemConfig.findFirst({ orderBy: { updatedAt: 'desc' } });

    if (!config) {
      config = await prisma.systemConfig.create({
        data: {
          maxActiveStrategies:  5,
          maxShadowStrategies:  3,
          minRandomnessRate:    0.10,
          maxRandomnessRate:    0.30,
          minConsensusStrategies: 2,
          influenceDecayDays:   30,
          performanceWindowDays: 7,
          promotionWindowCount: 3,
          demotionWindowCount:  3,
        },
      });
      logger.info('Default system config created');
    }

    return config;
  }

  async updateSystemConfig(updates, updatedBy = 'SYSTEM') {
    const config  = await this.getSystemConfig();
    const updated = await prisma.systemConfig.update({ where: { id: config.id }, data: { ...updates, updatedBy } });
    this.clearCache();
    return updated;
  }

  // ── Stats & Cache ─────────────────────────────────────────────────────────

  async getStrategyStats(strategyId) {
    const strategy = await this.getStrategyById(strategyId);
    if (!strategy) throw new Error('Strategy not found');

    const [recentPerformance, totalDecisions] = await Promise.all([
      prisma.strategyPerformance.findMany({ where: { strategyId }, orderBy: { windowEnd: 'desc' }, take: 4 }),
      prisma.matchDecision.count({ where: { strategies: { some: { id: strategyId } } } }),
    ]);

    return {
      strategy,
      totalDecisions,
      recentPerformance,
      avgAcceptanceRate: this._calculateAvgRate(recentPerformance, 'acceptanceRate'),
      avgRetention30d:   this._calculateAvgRate(recentPerformance, 'retention30dRate'),
    };
  }

  clearCache() {
    this._cache.active = null;
    this._cache.shadow = null;
    this._cache.lastRefresh = null;
  }

  _calculateAvgRate(windows, field) {
    const valid = windows.filter((w) => w[field] !== null);
    if (valid.length === 0) return null;
    return valid.reduce((acc, w) => acc + w[field], 0) / valid.length;
  }
}

// Singleton — maintains cache consistency across the application
export default new StrategyRegistry();