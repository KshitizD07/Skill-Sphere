// ============================================================================
// ANTIFRAGILE N.E.X.U.S. API ROUTES
// ============================================================================
//
// Purpose: REST API for managing the antifragile matching system
//
// Endpoints:
// - GET /antifragile/strategies - List all strategies
// - POST /antifragile/strategies/:id/promote - Promote strategy
// - POST /antifragile/strategies/:id/demote - Demote strategy
// - GET /antifragile/config - Get system configuration
// - GET /antifragile/health - System health check
// - GET /antifragile/decisions/recent - Recent decisions
// - GET /antifragile/consensus-history - Consensus rate over time
//
// ============================================================================

const express = require('express');
const router = express.Router();

// Import services
const strategyRegistry = require('../services/strategyRegistry');
const consensusEngine = require('../services/consensusEngine');
const decisionLogger = require('../services/decisionLogger');
const { authenticateToken, requireRole } = require('../middleware/auth');

// ============================================================================
// MIDDLEWARE: Admin only
// ============================================================================
// These routes should only be accessible to admins
const requireAdmin = requireRole('ADMIN');

// For demo purposes, you might want to temporarily allow any authenticated user:
// const requireAdmin = authenticateToken;

// ============================================================================
// 1. GET ALL STRATEGIES
// ============================================================================
router.get('/strategies', authenticateToken, async (req, res) => {
  try {
    const strategies = await strategyRegistry.getAllStrategies();
    res.json(strategies);
  } catch (error) {
    console.error('Error fetching strategies:', error);
    res.status(500).json({ error: 'Failed to fetch strategies' });
  }
});

// ============================================================================
// 2. GET SINGLE STRATEGY WITH STATS
// ============================================================================
router.get('/strategies/:id', authenticateToken, async (req, res) => {
  try {
    const stats = await strategyRegistry.getStrategyStats(req.params.id);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching strategy stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 3. PROMOTE STRATEGY (SHADOW → ACTIVE)
// ============================================================================
router.post('/strategies/:id/promote', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const updated = await strategyRegistry.promoteStrategy(
      req.params.id,
      reason || `Promoted by ${req.user.email}`
    );
    res.json({ success: true, strategy: updated });
  } catch (error) {
    console.error('Error promoting strategy:', error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// 4. DEMOTE STRATEGY (ACTIVE → SHADOW)
// ============================================================================
router.post('/strategies/:id/demote', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const updated = await strategyRegistry.demoteStrategy(
      req.params.id,
      reason || `Demoted by ${req.user.email}`
    );
    res.json({ success: true, strategy: updated });
  } catch (error) {
    console.error('Error demoting strategy:', error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// 5. DEPRECATE STRATEGY
// ============================================================================
router.post('/strategies/:id/deprecate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const updated = await strategyRegistry.deprecateStrategy(
      req.params.id,
      reason || `Deprecated by ${req.user.email}`
    );
    res.json({ success: true, strategy: updated });
  } catch (error) {
    console.error('Error deprecating strategy:', error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// 6. UPDATE STRATEGY INFLUENCE
// ============================================================================
router.post('/strategies/:id/influence', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { level, reason } = req.body; // level: LOW, MEDIUM, HIGH
    const updated = await strategyRegistry.updateInfluence(
      req.params.id,
      level,
      reason || `Influence updated by ${req.user.email}`
    );
    res.json({ success: true, strategy: updated });
  } catch (error) {
    console.error('Error updating influence:', error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// 7. GET SYSTEM CONFIGURATION
// ============================================================================
router.get('/config', authenticateToken, async (req, res) => {
  try {
    const config = await strategyRegistry.getSystemConfig();
    res.json(config);
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// ============================================================================
// 8. UPDATE SYSTEM CONFIGURATION
// ============================================================================
router.put('/config', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updated = await strategyRegistry.updateSystemConfig(
      req.body,
      req.user.userId
    );
    res.json({ success: true, config: updated });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// 9. GET CONSENSUS HISTORY
// ============================================================================
router.get('/consensus-history', authenticateToken, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const history = await consensusEngine.getConsensusHistory(days);
    res.json(history);
  } catch (error) {
    console.error('Error fetching consensus history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ============================================================================
// 10. SYSTEM HEALTH CHECK
// ============================================================================
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const health = await consensusEngine.healthCheck();
    res.json(health);
  } catch (error) {
    console.error('Error checking health:', error);
    res.status(500).json({ error: 'Failed to check system health' });
  }
});

// ============================================================================
// 11. GET RECENT DECISIONS
// ============================================================================
router.get('/decisions/recent', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const decisions = await prisma.matchDecision.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        squad: {
          select: { title: true }
        },
        selectedUser: {
          select: { name: true, avatar: true }
        },
        outcome: true
      }
    });

    res.json(decisions);
  } catch (error) {
    console.error('Error fetching decisions:', error);
    res.status(500).json({ error: 'Failed to fetch decisions' });
  }
});

// ============================================================================
// 12. GET DECISION BY ID
// ============================================================================
router.get('/decisions/:id', authenticateToken, async (req, res) => {
  try {
    const decision = await decisionLogger.getDecision(req.params.id);
    res.json(decision);
  } catch (error) {
    console.error('Error fetching decision:', error);
    res.status(404).json({ error: error.message });
  }
});

// ============================================================================
// 13. ANALYZE DECISION QUALITY
// ============================================================================
router.get('/analytics/quality', authenticateToken, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const analysis = await decisionLogger.analyzeDecisionQuality(days);
    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing quality:', error);
    res.status(500).json({ error: 'Failed to analyze decisions' });
  }
});

// ============================================================================
// 14. LOG OUTCOME (Called when squad leader accepts/rejects)
// ============================================================================
router.post('/outcomes/:decisionId', authenticateToken, async (req, res) => {
  try {
    const outcome = await decisionLogger.logOutcome(
      req.params.decisionId,
      req.body
    );
    res.json({ success: true, outcome });
  } catch (error) {
    console.error('Error logging outcome:', error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// EXPORT ROUTES
// ============================================================================
module.exports = router;