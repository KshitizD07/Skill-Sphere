import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Gatekeeper enforces squad application eligibility.
 *
 * Checks (in order):
 *  1. Basic validation (squad exists, open, not self-applying)
 *  2. Duplicate application guard
 *  3. Visibility / campus access control
 *  4. Pending application cap (Ghost Rule — max 5 per user)
 *  5. Event exclusivity (can't join two squads for the same event)
 *  6. Slot matching
 *  7. Skill verification and score gate
 */
class GatekeeperService {

  async checkEligibility(userId, squadId, slotId = null) {
    // Phase 1: Basic validations
    const squad = await prisma.squad.findUnique({
      where:   { id: squadId },
      include: { slots: true, leader: { select: { id: true, college: true } } },
    });

    if (!squad)                    return this.reject('Squad not found');
    if (squad.status !== 'OPEN')   return this.reject(`Squad is ${squad.status.toLowerCase()}`);
    if (squad.leaderId === userId)  return this.reject('You are the squad leader');

    const userApps = await prisma.squadApplication.findMany({ where: { squadId, userId } });
    if (userApps.some((a) => a.status === 'ACCEPTED')) return this.reject('Already a member of this squad');
    if (userApps.some((a) => a.status === 'PENDING'))  return this.reject('You already have a pending application in this squad');

    const rejectedSlotIds = userApps.filter((a) => a.status === 'REJECTED').map((a) => a.slotId).filter(Boolean);

    // Phase 2: Visibility & access control
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { college: true, skills: { select: { name: true, level: true, isVerified: true, calculatedScore: true } } },
    });

    if (squad.visibility === 'CAMPUS_ONLY') {
      const leaderCollege = squad.leader?.college;
      if (!user.college || !leaderCollege || user.college !== leaderCollege) {
        return this.reject(`This squad is only open to ${leaderCollege || 'campus'} students`, { requiredCollege: leaderCollege });
      }
    }

    // Phase 3: Constraint checks
    const pendingCount = await prisma.squadApplication.count({ where: { userId, status: 'PENDING' } });
    if (pendingCount >= 5) {
      return this.reject('You have too many pending applications (max 5)', { pendingCount, maxAllowed: 5 });
    }

    // Event exclusivity — check if user already committed to another squad for the same event
    if (squad.event) {
      const existingCommitment = await prisma.squadApplication.findFirst({
        where: {
          userId,
          status: 'ACCEPTED',
          squad: { event: squad.event },
          squadId: { not: squadId },
        },
        include: { squad: { select: { title: true } } },
      });
      if (existingCommitment) {
        return this.reject(
          `Already committed to "${existingCommitment.squad.title}" for ${squad.event}`,
          { event: squad.event, existingSquad: existingCommitment.squad.title }
        );
      }
    }

    // Phase 4: Slot matching
    let targetSlot = slotId
      ? squad.slots.find((s) => s.id === slotId)
      : this.findBestSlotMatch(squad.slots, user.skills, rejectedSlotIds);

    if (slotId && !targetSlot) return this.reject('Slot not found');
    if (targetSlot && rejectedSlotIds.includes(targetSlot.id)) {
      return this.reject('You have been rejected for this role and cannot re-apply for it');
    }
    if (slotId && targetSlot?.status === 'FILLED') return this.reject('Slot already filled');
    if (!targetSlot) return this.reject('No available slots match your skills');

    // Phase 5: Skill gate (open roles bypass this)
    if (!targetSlot.requiredSkill) {
      return { allowed: true, slot: { id: targetSlot.id, role: targetSlot.roleTitle }, skillRequired: false };
    }

    const userSkill = user.skills.find((s) => s.name.toLowerCase() === targetSlot.requiredSkill.toLowerCase());
    if (!userSkill) {
      return this.reject(`Missing required skill: ${targetSlot.requiredSkill}`, { slot: targetSlot.roleTitle, requiredSkill: targetSlot.requiredSkill });
    }

    if (targetSlot.requireVerified && !userSkill.isVerified) {
      return this.reject(
        `${targetSlot.requiredSkill} must be GitHub verified for this role`,
        { slot: targetSlot.roleTitle, requiredSkill: targetSlot.requiredSkill, userScore: userSkill.calculatedScore, isVerified: false }
      );
    }

    const userScore = userSkill.calculatedScore || 0;
    const minScore  = targetSlot.minScore || 0;

    if (userScore < minScore) {
      return this.reject(
        `Insufficient skill level for ${targetSlot.roleTitle}. Required: ${minScore}/10, Your score: ${userScore}/10`,
        { slot: targetSlot.roleTitle, requiredSkill: targetSlot.requiredSkill, requiredScore: minScore, userScore, isVerified: userSkill.isVerified }
      );
    }

    // Phase 6: Approved
    const result = {
      allowed: true,
      slot:  { id: targetSlot.id, role: targetSlot.roleTitle, requiredSkill: targetSlot.requiredSkill },
      skill: { name: userSkill.name, score: userScore, isVerified: userSkill.isVerified, level: userSkill.level },
      matchScore: this.calculateMatchScore(userScore, minScore),
    };

    logger.debug('Gatekeeper passed', { userId, squadId, matchScore: result.matchScore });
    return result;
  }

  /** Finds the best open slot for the user's skills. Prefers open roles, then highest-scoring match. */
  findBestSlotMatch(slots, userSkills, rejectedSlotIds = []) {
    const open = slots.filter((s) => s.status === 'OPEN' && !rejectedSlotIds.includes(s.id));

    // Prefer slots without skill requirements (e.g. PM / Designer)
    const openRoles = open.filter((s) => !s.requiredSkill);
    if (openRoles.length > 0) return openRoles[0];

    for (const slot of open) {
      const userSkill = userSkills.find((s) => s.name.toLowerCase() === slot.requiredSkill?.toLowerCase());
      if (userSkill && userSkill.calculatedScore >= (slot.minScore || 0)) {
        if (!slot.requireVerified || userSkill.isVerified) return slot;
      }
    }

    return null;
  }

  /** Returns compatibility percentage across all open slots. Used for UI filtering. */
  async checkSquadCompatibility(userId, squadId) {
    const [user, squad] = await Promise.all([
      prisma.user.findUnique({
        where:  { id: userId },
        select: { skills: { select: { name: true, level: true, isVerified: true, calculatedScore: true } } },
      }),
      prisma.squad.findUnique({
        where:   { id: squadId },
        include: { slots: { where: { status: 'OPEN' } } },
      }),
    ]);

    if (!squad) return { compatible: false };

    let matchedSlots = 0;
    let maxScore     = 0;
    let bestMatch    = null;

    for (const slot of squad.slots) {
      if (!slot.requiredSkill) { matchedSlots++; continue; }

      const userSkill = user.skills.find((s) => s.name.toLowerCase() === slot.requiredSkill.toLowerCase());
      if (!userSkill) continue;

      const score    = userSkill.calculatedScore || 0;
      const minScore = slot.minScore || 0;

      if (score >= minScore && (!slot.requireVerified || userSkill.isVerified)) {
        matchedSlots++;
        const matchPercent = this.calculateMatchScore(score, minScore);
        if (matchPercent > maxScore) {
          maxScore  = matchPercent;
          bestMatch = { slot: slot.roleTitle, skill: userSkill.name, score };
        }
      }
    }

    const total = squad.slots.length || 1;

    return {
      compatible:           matchedSlots > 0,
      compatibilityPercent: Math.round((matchedSlots / total) * 100),
      matchedSlots,
      totalSlots:           squad.slots.length,
      bestMatch,
    };
  }

  /** Fetches the current skill snapshot to store alongside an application record. */
  async getSkillSnapshot(userId, skillName) {
    const skill = await prisma.skill.findFirst({
      where: { userId, name: { equals: skillName, mode: 'insensitive' } },
    });

    return {
      skillName:            skill?.name || skillName,
      skillScoreSnapshot:   skill?.calculatedScore || 0,
      wasVerifiedSnapshot:  skill?.isVerified || false,
    };
  }

  calculateMatchScore(userScore, requiredScore) {
    if (requiredScore === 0) return 100;
    return Math.min(100, Math.round((userScore / requiredScore) * 100));
  }

  reject(reason, meta = {}) {
    logger.debug('Gatekeeper rejected', { reason, ...meta });
    return { allowed: false, reason, ...meta };
  }
}

export default new GatekeeperService();