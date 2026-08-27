import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';
import strategyRegistry from '../services/strategyRegistry.js';

const prisma = new PrismaClient();

async function runStrategyEvolution() {
  logger.info('Starting weekly N.E.X.U.S. strategy evolution cycle...');
  try {
    const strategies = await strategyRegistry.getAllStrategies();
    
    // For each strategy, calculate 30-day performance
    const windowEnd = new Date();
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - 30);

    const performanceData = [];

    for (const strategy of strategies) {
      // Get all decisions in last 30 days where this strategy voted
      const decisions = await prisma.matchDecision.findMany({
        where: {
          timestamp: { gte: windowStart, lte: windowEnd },
          strategies: { some: { id: strategy.id } }
        },
        include: { outcome: true }
      });

      const totalVotes = decisions.length;
      let acceptedCount = 0;
      let rejectedCount = 0;
      let retention30dCount = 0;

      for (const dec of decisions) {
        if (dec.outcome) {
          if (dec.outcome.accepted) acceptedCount++;
          else rejectedCount++;
          
          if (dec.outcome.retention30d) retention30dCount++;
        }
      }

      const acceptanceRate = totalVotes > 0 && (acceptedCount + rejectedCount) > 0 
        ? acceptedCount / (acceptedCount + rejectedCount) 
        : null;

      const retention30dRate = acceptedCount > 0
        ? retention30dCount / acceptedCount
        : null;

      performanceData.push({
        strategyId: strategy.id,
        strategy,
        totalVotes,
        acceptedCount,
        rejectedCount,
        acceptanceRate,
        retention30dRate
      });

      // Save to StrategyPerformance
      await prisma.strategyPerformance.create({
        data: {
          strategyId: strategy.id,
          windowStart,
          windowEnd,
          totalVotes,
          acceptedCount,
          rejectedCount,
          acceptanceRate,
          retention30dRate,
          rankInWindow: 0 // Will update below
        }
      });
    }

    // Rank strategies by acceptanceRate
    performanceData.sort((a, b) => (b.acceptanceRate || 0) - (a.acceptanceRate || 0));

    // Update ranks and apply rules
    for (let i = 0; i < performanceData.length; i++) {
      const data = performanceData[i];
      const rank = i + 1;
      
      // Update rank in latest performance record
      const latestPerf = await prisma.strategyPerformance.findFirst({
        where: { strategyId: data.strategyId },
        orderBy: { calculatedAt: 'desc' }
      });
      if (latestPerf) {
        await prisma.strategyPerformance.update({
          where: { id: latestPerf.id },
          data: { rankInWindow: rank }
        });
      }

      const { strategy, acceptanceRate, retention30dRate } = data;

      // 1. Promote/Demote rules
      if (strategy.state === 'SHADOW' && acceptanceRate > 0.7 && retention30dRate > 0.6) {
        await strategyRegistry.promoteStrategy(strategy.id, 'Automatic evolution: High performance');
      } 
      else if (strategy.state === 'ACTIVE' && acceptanceRate !== null && acceptanceRate < 0.4) {
        await strategyRegistry.demoteStrategy(strategy.id, 'Automatic evolution: Low performance');
      }

      // 2. Adjust influenceLevel based on rank (only for ACTIVE)
      if (strategy.state === 'ACTIVE') {
        let newInfluence = 'MEDIUM';
        if (rank <= 2) newInfluence = 'HIGH';
        else if (rank >= performanceData.length - 1) newInfluence = 'LOW';
        
        if (newInfluence !== strategy.influenceLevel) {
          await strategyRegistry.updateInfluence(strategy.id, newInfluence, `Automatic evolution: Rank ${rank}`);
        }
      }
    }

    logger.info('Strategy evolution cycle completed', { evaluated: strategies.length });
  } catch (error) {
    logger.error('Error during strategy evolution', { error: error.message });
  }
}

export function setupStrategyEvolutionJob() {
  // Run weekly (e.g., Sunday at midnight)
  cron.schedule('0 0 * * 0', async () => {
    await runStrategyEvolution();
  });
  logger.info('Strategy evolution job scheduled (weekly on Sunday)');
}
