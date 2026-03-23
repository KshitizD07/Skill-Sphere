// ============================================================================
// STRATEGY REGISTRY SERVICE
// ============================================================================
// 
// Purpose: Central registry for all matching strategies in the system
//
// Responsibilities:
// 1. Maintain list of all strategies (ACTIVE, SHADOW, DEPRECATED)
// 2. Enforce hard cap on active strategies (prevent explosion)
// 3. Provide strategy lookup and metadata
// 4. Handle strategy promotion/demotion
//
// Philosophy:
// - Strategies are STATELESS (no internal state)
// - Strategies are VERSIONED (can be replaced, not modified)
// - Strategies COMPETE (multiple can be active)
//
// This is the "genome pool" in our evolutionary system.
// ============================================================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class StrategyRegistry {
  
  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================
  constructor() {
    // In-memory cache of active strategies (cleared every 5 minutes)
    this._cache = {
      active: null,
      shadow: null,
      lastRefresh: null,
      ttl: 5 * 60 * 1000 // 5 minutes
    };
  }

  // ============================================================================
  // GET ALL ACTIVE STRATEGIES
  // ============================================================================
  // Returns strategies that currently influence decisions
  //
  // Why Cache: 
  // - Called on EVERY match decision
  // - Strategies change infrequently (hours/days, not seconds)
  // - Reduces DB load
  //
  // Cache Invalidation:
  // - On strategy state change
  // - Every 5 minutes (safety)

  async getActiveStrategies() {
    console.log('📋 StrategyRegistry: Fetching active strategies...');

    // Check cache first
    const now = Date.now();
    if (this._cache.active && 
        this._cache.lastRefresh && 
        (now - this._cache.lastRefresh) < this._cache.ttl) {
      console.log('⚡ Cache HIT: Returning cached active strategies');
      return this._cache.active;
    }

    // Cache miss - fetch from database
    console.log('💾 Cache MISS: Querying database for active strategies');
    
    const strategies = await prisma.matchStrategy.findMany({
      where: { state: 'ACTIVE' },
      orderBy: [
        { influenceLevel: 'desc' }, // HIGH → MEDIUM → LOW
        { createdAt: 'asc' }        // Older strategies first (stability)
      ]
    });

    console.log(`✅ Found ${strategies.length} active strategies`);

    // Update cache
    this._cache.active = strategies;
    this._cache.lastRefresh = now;

    return strategies;
  }

  // ============================================================================
  // GET ALL SHADOW STRATEGIES
  // ============================================================================
  // Returns strategies running in parallel but not affecting decisions
  //
  // Shadow Mode Purpose:
  // - Safe testing of new strategies
  // - Counterfactual analysis ("what if we used this?")
  // - Continuous innovation without risk

  async getShadowStrategies() {
    console.log('👻 StrategyRegistry: Fetching shadow strategies...');

    // Check cache
    const now = Date.now();
    if (this._cache.shadow && 
        this._cache.lastRefresh && 
        (now - this._cache.lastRefresh) < this._cache.ttl) {
      console.log('⚡ Cache HIT: Returning cached shadow strategies');
      return this._cache.shadow;
    }

    // Fetch from database
    const strategies = await prisma.matchStrategy.findMany({
      where: { state: 'SHADOW' },
      orderBy: { createdAt: 'desc' } // Newest shadows first
    });

    console.log(`✅ Found ${strategies.length} shadow strategies`);

    // Update cache
    this._cache.shadow = strategies;
    this._cache.lastRefresh = now;

    return strategies;
  }

  // ============================================================================
  // GET STRATEGY BY ID
  // ============================================================================
  async getStrategyById(strategyId) {
    return await prisma.matchStrategy.findUnique({
      where: { id: strategyId }
    });
  }

  // ============================================================================
  // GET STRATEGY BY NAME
  // ============================================================================
  async getStrategyByName(name) {
    return await prisma.matchStrategy.findUnique({
      where: { name }
    });
  }

  // ============================================================================
  // GET ALL STRATEGIES (regardless of state)
  // ============================================================================
  async getAllStrategies() {
    return await prisma.matchStrategy.findMany({
      orderBy: [
        { state: 'asc' },           // ACTIVE first
        { influenceLevel: 'desc' }
      ]
    });
  }

  // ============================================================================
  // REGISTER NEW STRATEGY
  // ============================================================================
  // Adds a new strategy to the system
  //
  // Rules:
  // - New strategies start in SHADOW mode
  // - Must have unique name
  // - Cannot exceed shadow cap
  //
  // Returns: Created strategy object

  async registerStrategy(data) {
    console.log(`➕ StrategyRegistry: Registering new strategy "${data.name}"`);

    // ========================================
    // STEP 1: Validate inputs
    // ========================================
    if (!data.name || !data.displayName) {
      throw new Error('Strategy name and displayName are required');
    }

    // Check for duplicate name
    const existing = await this.getStrategyByName(data.name);
    if (existing) {
      throw new Error(`Strategy "${data.name}" already exists`);
    }

    // ========================================
    // STEP 2: Check shadow cap
    // ========================================
    const config = await this.getSystemConfig();
    const shadowCount = await prisma.matchStrategy.count({
      where: { state: 'SHADOW' }
    });

    if (shadowCount >= config.maxShadowStrategies) {
      throw new Error(
        `Shadow strategy cap reached (${config.maxShadowStrategies}). ` +
        `Deprecate an existing shadow strategy first.`
      );
    }

    // ========================================
    // STEP 3: Create strategy
    // ========================================
    const strategy = await prisma.matchStrategy.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        description: data.description || '',
        version: data.version || '1.0.0',
        state: 'SHADOW', // Always start in shadow mode
        influenceLevel: 'MEDIUM', // Default influence
        config: data.config || {}
      }
    });

    console.log(`✅ Strategy "${data.name}" registered successfully`);
    console.log(`   State: SHADOW (will not affect decisions yet)`);

    // Clear cache
    this.clearCache();

    return strategy;
  }

  // ============================================================================
  // PROMOTE STRATEGY
  // ============================================================================
  // Moves strategy from SHADOW → ACTIVE
  //
  // Requirements:
  // - Strategy must be in SHADOW state
  // - Active cap not exceeded
  // - (Usually) Must have proven performance in shadow mode
  //
  // This is a MANUAL decision (requires human approval)

  async promoteStrategy(strategyId, reason) {
    console.log(`⬆️  StrategyRegistry: Promoting strategy ${strategyId}`);

    // ========================================
    // STEP 1: Get strategy and validate
    // ========================================
    const strategy = await this.getStrategyById(strategyId);
    
    if (!strategy) {
      throw new Error('Strategy not found');
    }

    if (strategy.state !== 'SHADOW') {
      throw new Error(`Cannot promote strategy in ${strategy.state} state`);
    }

    // ========================================
    // STEP 2: Check active cap
    // ========================================
    const config = await this.getSystemConfig();
    const activeCount = await prisma.matchStrategy.count({
      where: { state: 'ACTIVE' }
    });

    if (activeCount >= config.maxActiveStrategies) {
      throw new Error(
        `Active strategy cap reached (${config.maxActiveStrategies}). ` +
        `Deprecate or demote an active strategy first.`
      );
    }

    // ========================================
    // STEP 3: Promote strategy
    // ========================================
    const updated = await prisma.matchStrategy.update({
      where: { id: strategyId },
      data: {
        state: 'ACTIVE',
        activatedAt: new Date()
      }
    });

    // ========================================
    // STEP 4: Log promotion
    // ========================================
    await prisma.strategyPromotion.create({
      data: {
        strategyId,
        fromState: 'SHADOW',
        toState: 'ACTIVE',
        reason: reason || 'Manual promotion',
        triggeredBy: 'SYSTEM'
      }
    });

    console.log(`✅ Strategy "${strategy.name}" is now ACTIVE`);
    console.log(`   Will participate in all future decisions`);

    // Clear cache
    this.clearCache();

    return updated;
  }

  // ============================================================================
  // DEMOTE STRATEGY
  // ============================================================================
  // Moves strategy from ACTIVE → SHADOW
  //
  // When to use:
  // - Strategy consistently underperforms
  // - Testing different strategy combination
  // - Temporarily reduce active count

  async demoteStrategy(strategyId, reason) {
    console.log(`⬇️  StrategyRegistry: Demoting strategy ${strategyId}`);

    const strategy = await this.getStrategyById(strategyId);
    
    if (!strategy) {
      throw new Error('Strategy not found');
    }

    if (strategy.state !== 'ACTIVE') {
      throw new Error(`Cannot demote strategy in ${strategy.state} state`);
    }

    // Update strategy
    const updated = await prisma.matchStrategy.update({
      where: { id: strategyId },
      data: { state: 'SHADOW' }
    });

    // Log demotion
    await prisma.strategyPromotion.create({
      data: {
        strategyId,
        fromState: 'ACTIVE',
        toState: 'SHADOW',
        reason: reason || 'Manual demotion',
        triggeredBy: 'SYSTEM'
      }
    });

    console.log(`✅ Strategy "${strategy.name}" is now SHADOW`);

    // Clear cache
    this.clearCache();

    return updated;
  }

  // ============================================================================
  // DEPRECATE STRATEGY
  // ============================================================================
  // Moves strategy to DEPRECATED (no longer used)
  //
  // Use when:
  // - Strategy is obsolete
  // - Replaced by better version
  // - Permanently removing from system
  //
  // Note: Kept in database for historical analysis

  async deprecateStrategy(strategyId, reason) {
    console.log(`🗑️  StrategyRegistry: Deprecating strategy ${strategyId}`);

    const strategy = await this.getStrategyById(strategyId);
    
    if (!strategy) {
      throw new Error('Strategy not found');
    }

    // Update strategy
    const updated = await prisma.matchStrategy.update({
      where: { id: strategyId },
      data: {
        state: 'DEPRECATED',
        deprecatedAt: new Date()
      }
    });

    // Log deprecation
    await prisma.strategyPromotion.create({
      data: {
        strategyId,
        fromState: strategy.state,
        toState: 'DEPRECATED',
        reason: reason || 'Manual deprecation',
        triggeredBy: 'SYSTEM'
      }
    });

    console.log(`✅ Strategy "${strategy.name}" is now DEPRECATED`);

    // Clear cache
    this.clearCache();

    return updated;
  }

  // ============================================================================
  // UPDATE STRATEGY INFLUENCE
  // ============================================================================
  // Changes strategy's influence level (LOW → MEDIUM → HIGH)
  //
  // This is the PRIMARY mechanism of evolution.
  // Successful strategies gain influence, unsuccessful ones lose it.
  //
  // Important: This is COARSE-GRAINED, not continuous optimization

  async updateInfluence(strategyId, newLevel, reason) {
    console.log(`🎚️  StrategyRegistry: Updating influence for ${strategyId} → ${newLevel}`);

    const strategy = await this.getStrategyById(strategyId);
    
    if (!strategy) {
      throw new Error('Strategy not found');
    }

    // Validate influence level
    const validLevels = ['LOW', 'MEDIUM', 'HIGH'];
    if (!validLevels.includes(newLevel)) {
      throw new Error(`Invalid influence level: ${newLevel}`);
    }

    // Update strategy
    const updated = await prisma.matchStrategy.update({
      where: { id: strategyId },
      data: {
        influenceLevel: newLevel,
        lastPromotedAt: newLevel === 'HIGH' ? new Date() : strategy.lastPromotedAt,
        lastDemotedAt: newLevel === 'LOW' ? new Date() : strategy.lastDemotedAt
      }
    });

    // Log change
    await prisma.strategyPromotion.create({
      data: {
        strategyId,
        fromState: strategy.state,
        toState: strategy.state,
        fromInfluence: strategy.influenceLevel,
        toInfluence: newLevel,
        reason: reason || 'Influence adjustment',
        triggeredBy: 'SYSTEM'
      }
    });

    console.log(`✅ Strategy "${strategy.name}" influence: ${strategy.influenceLevel} → ${newLevel}`);

    // Clear cache
    this.clearCache();

    return updated;
  }

  // ============================================================================
  // GET SYSTEM CONFIG
  // ============================================================================
  // Returns global antifragile system parameters
  //
  // These control:
  // - Strategy caps
  // - Randomness rates
  // - Consensus rules
  // - Decay settings

  async getSystemConfig() {
    // Check if config exists
    let config = await prisma.systemConfig.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    // Create default config if none exists
    if (!config) {
      console.log('⚙️  No system config found, creating default...');
      config = await prisma.systemConfig.create({
        data: {
          maxActiveStrategies: 5,
          maxShadowStrategies: 3,
          minRandomnessRate: 0.10,
          maxRandomnessRate: 0.30,
          minConsensusStrategies: 2,
          influenceDecayDays: 30,
          performanceWindowDays: 7,
          promotionWindowCount: 3,
          demotionWindowCount: 3
        }
      });
      console.log('✅ Default config created');
    }

    return config;
  }

  // ============================================================================
  // UPDATE SYSTEM CONFIG
  // ============================================================================
  async updateSystemConfig(updates, updatedBy = 'SYSTEM') {
    const config = await this.getSystemConfig();

    const updated = await prisma.systemConfig.update({
      where: { id: config.id },
      data: {
        ...updates,
        updatedBy
      }
    });

    console.log('⚙️  System config updated');
    
    // Clear cache (affects strategy limits)
    this.clearCache();

    return updated;
  }

  // ============================================================================
  // CLEAR CACHE
  // ============================================================================
  // Invalidates in-memory cache
  // Called when strategies change state

  clearCache() {
    console.log('🗑️  Clearing strategy cache');
    this._cache.active = null;
    this._cache.shadow = null;
    this._cache.lastRefresh = null;
  }

  // ============================================================================
  // GET STRATEGY STATS
  // ============================================================================
  // Returns summary statistics for a strategy

  async getStrategyStats(strategyId) {
    const strategy = await this.getStrategyById(strategyId);
    
    if (!strategy) {
      throw new Error('Strategy not found');
    }

    // Get recent performance windows
    const recentPerformance = await prisma.strategyPerformance.findMany({
      where: { strategyId },
      orderBy: { windowEnd: 'desc' },
      take: 4 // Last 4 weeks
    });

    // Count total decisions influenced
    const totalDecisions = await prisma.matchDecision.count({
      where: {
        strategies: {
          some: { id: strategyId }
        }
      }
    });

    return {
      strategy,
      totalDecisions,
      recentPerformance,
      avgAcceptanceRate: this._calculateAvgRate(recentPerformance, 'acceptanceRate'),
      avgRetention30d: this._calculateAvgRate(recentPerformance, 'retention30dRate')
    };
  }

  // Helper: Calculate average rate from performance windows
  _calculateAvgRate(windows, field) {
    const validWindows = windows.filter(w => w[field] !== null);
    if (validWindows.length === 0) return null;
    
    const sum = validWindows.reduce((acc, w) => acc + w[field], 0);
    return sum / validWindows.length;
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================
// Single instance shared across application
// Maintains cache consistency

module.exports = new StrategyRegistry();