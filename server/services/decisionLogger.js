import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Records every matching decision with full context for auditing,
 * strategy evolution, and reproducibility.
 *
 * Design principles:
 * - Log first, analyse later
 * - Never skip logging (even on errors — use fallback)
 * - Records are immutable (append-only)
 */
class DecisionLogger {

  // ── Log decision ──────────────────────────────────────────────────────────

  async logDecision(data) {
    const required = ['squadId', 'selectedUserId', 'wasConsensus', 'wasRandom', 'strategyVotes'];
    for (const field of required) {
      if (data[field] === undefined || data[field] === null) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    try {
      const decision = await prisma.matchDecision.create({
        data: {
          squadId:          data.squadId,
          slotId:           data.slotId || null,
          selectedUserId:   data.selectedUserId,
          alternativesShown: data.alternativesShown || [],
          wasConsensus:     data.wasConsensus,
          wasRandom:        data.wasRandom,
          consensusCount:   data.consensusCount || 0,
          strategyVotes:    JSON.stringify(data.strategyVotes),
          activeStrategies: JSON.stringify(data.activeStrategies || []),
          systemVersion:    data.systemVersion || 'unknown',
        },
      });

      logger.info('Decision logged', { id: decision.id, method: decision.wasConsensus ? 'CONSENSUS' : 'RANDOM', selected: decision.selectedUserId });

      await this._updateStrategyStats(data.strategyVotes, decision.wasConsensus);
      return decision;
    } catch (error) {
      logger.error('Decision logger error', { err: error.message });
      await this._fallbackLog(data, error);
      throw error;
    }
  }

  // ── Log outcome (called hours/days after decision) ────────────────────────

  async logOutcome(decisionId, outcomeData) {
    try {
      const existing = await prisma.matchOutcome.findUnique({ where: { decisionId } });

      if (existing) {
        const updated = await prisma.matchOutcome.update({
          where: { decisionId },
          data:  { ...outcomeData, lastUpdatedAt: new Date() },
        });
        logger.info('Outcome updated', { decisionId });
        return updated;
      }

      const outcome = await prisma.matchOutcome.create({
        data: {
          decisionId,
          accepted:       outcomeData.accepted,
          acceptedAt:     outcomeData.accepted  ? (outcomeData.acceptedAt  || new Date()) : null,
          rejectedAt:     !outcomeData.accepted ? (outcomeData.rejectedAt  || new Date()) : null,
          timeToDecision: outcomeData.timeToDecision  || null,
          memberJoinedAt: outcomeData.memberJoinedAt  || null,
          memberLeftAt:   outcomeData.memberLeftAt    || null,
          retention30d:   outcomeData.retention30d    || null,
          retention60d:   outcomeData.retention60d    || null,
          squadCompleted: outcomeData.squadCompleted  || null,
          leaderRating:   outcomeData.leaderRating    || null,
          memberRating:   outcomeData.memberRating    || null,
        },
      });

      logger.info('Outcome logged', { decisionId, accepted: outcome.accepted });
      await this._notifyOutcomeRecorded(decisionId);
      return outcome;
    } catch (error) {
      logger.error('Outcome logger error', { err: error.message, decisionId });
      await this._fallbackLog({ decisionId, ...outcomeData }, error);
      throw error;
    }
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  async getDecision(decisionId) {
    const decision = await prisma.matchDecision.findUnique({
      where:   { id: decisionId },
      include: {
        squad:        { select: { id: true, title: true, status: true } },
        selectedUser: { select: { id: true, name: true, avatar: true } },
        outcome:      true,
      },
    });

    if (!decision) throw new Error('Decision not found');

    return {
      ...decision,
      strategyVotes:    JSON.parse(decision.strategyVotes),
      activeStrategies: JSON.parse(decision.activeStrategies),
    };
  }

  async getSquadDecisions(squadId) {
    const decisions = await prisma.matchDecision.findMany({
      where:   { squadId },
      include: { selectedUser: { select: { id: true, name: true, avatar: true } }, outcome: true },
      orderBy: { timestamp: 'desc' },
    });

    return decisions.map((d) => ({
      ...d,
      strategyVotes:    JSON.parse(d.strategyVotes),
      activeStrategies: JSON.parse(d.activeStrategies),
    }));
  }

  async getUserDecisions(userId) {
    const decisions = await prisma.matchDecision.findMany({
      where:   { selectedUserId: userId },
      include: { squad: { select: { id: true, title: true, status: true } }, outcome: true },
      orderBy: { timestamp: 'desc' },
    });

    return decisions.map((d) => ({
      ...d,
      strategyVotes:    JSON.parse(d.strategyVotes),
      activeStrategies: JSON.parse(d.activeStrategies),
    }));
  }

  /** Returns decisions older than `olderThanHours` hours that have no outcome recorded yet. */
  async getPendingDecisions(olderThanHours = 24) {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - olderThanHours);

    return prisma.matchDecision.findMany({
      where:   { timestamp: { lt: cutoff }, outcome: null },
      include: { squad: true, selectedUser: { select: { id: true, name: true } } },
      orderBy: { timestamp: 'asc' },
    });
  }

  /** Retrospective quality analysis comparing consensus vs random decisions. */
  async analyzeDecisionQuality(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const decisions = await prisma.matchDecision.findMany({
      where:   { timestamp: { gte: since }, outcome: { isNot: null } },
      include: { outcome: true },
    });

    const consensusD = decisions.filter((d) => d.wasConsensus);
    const randomD    = decisions.filter((d) => d.wasRandom);

    const cAccepted  = consensusD.filter((d) => d.outcome.accepted).length;
    const rAccepted  = randomD.filter((d) => d.outcome.accepted).length;

    const avgTime = (arr) => {
      const times = arr.filter((d) => d.outcome.timeToDecision).map((d) => d.outcome.timeToDecision);
      return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null;
    };

    return {
      period:         `Last ${days} days`,
      totalDecisions: decisions.length,
      consensus: {
        count:          consensusD.length,
        accepted:       cAccepted,
        acceptanceRate: consensusD.length > 0 ? cAccepted / consensusD.length : 0,
        avgTimeToDecision: avgTime(consensusD),
      },
      random: {
        count:          randomD.length,
        accepted:       rAccepted,
        acceptanceRate: randomD.length > 0 ? rAccepted / randomD.length : 0,
        avgTimeToDecision: avgTime(randomD),
      },
      consensusAdvantage: {
        acceptanceRateDiff: consensusD.length > 0 && randomD.length > 0
          ? (cAccepted / consensusD.length) - (rAccepted / randomD.length)
          : null,
        speedAdvantage: avgTime(consensusD) && avgTime(randomD)
          ? avgTime(randomD) - avgTime(consensusD)
          : null,
      },
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  async _updateStrategyStats(strategyVotes, wasConsensus) {
    try {
      for (const [strategyId, vote] of Object.entries(strategyVotes)) {
        if (vote.isShadow) continue;
        await prisma.matchStrategy.update({
          where: { id: strategyId },
          data:  { totalDecisions: { increment: 1 }, consensusWins: wasConsensus ? { increment: 1 } : undefined },
        });
      }
    } catch (error) {
      // Non-critical counter update — log and continue
      logger.warn('Failed to update strategy stats', { err: error.message });
    }
  }

  async _notifyOutcomeRecorded(decisionId) {
    // TODO: Implement event queue (Redis pub/sub, RabbitMQ, or SQS) to notify
    // the Selection Pressure Worker that a new outcome is available for scoring.
    logger.debug('Outcome notification queued', { decisionId });
  }

  /** Last-resort fallback: write decision data to a local log file when DB is unavailable. */
  async _fallbackLog(data, error) {
    const logEntry = JSON.stringify({ timestamp: new Date().toISOString(), error: error.message, data }) + '\n';

    try {
      const logPath = path.join(process.cwd(), 'logs', 'decision-fallback.log');
      fs.appendFileSync(logPath, logEntry);
      logger.warn('Decision written to fallback log', { path: logPath });
    } catch (fsError) {
      logger.error('Fallback logging also failed', { err: fsError.message });
    }
  }
}

export default new DecisionLogger();