// server/services/gatekeeper-production.js
// THE GATEKEEPER - Production Version with Slot System

const { PrismaClient } = require('@prisma/client');
const cache = require('../utils/cache');
const { tr } = require('zod/v4/locales');
const prisma = new PrismaClient();

class GatekeeperService {
  
  /**
   * MAIN CHECK: Can user apply to this squad?
   * Now includes: slot matching, event exclusivity, pending limit
   */
  async checkEligibility(userId, squadId, slotId = null) {
    console.log(`🔍 GATEKEEPER CHECK: User ${userId} → Squad ${squadId}${slotId ? ` → Slot ${slotId}` : ''}`);

    // ============================================
    // PHASE 1: BASIC VALIDATIONS
    // ============================================
    
    // 1.1: Fetch Squad
    const squad = await prisma.squadRequest.findUnique({
      where: { id: squadId },
      include: {
        slots: true,
        leader: { select: { id: true, college: true } }
      }
    });

    if (!squad) {
      return this.reject('Squad not found');
    }

    // 1.2: Check Squad Status
    if (squad.status !== 'OPEN') {
      return this.reject(`Squad is ${squad.status.toLowerCase()}`);
    }

    // 1.3: Check if user is leader
    if (squad.leaderId === userId) {
      return this.reject('You are the squad leader');
    }

    // 1.4: Check if already applied
    const existingApp = await prisma.squadMember.findUnique({
      where: { squadId_userId: { squadId, userId } }
    });

    if (existingApp) {
      if (existingApp.status === 'PENDING') {
        return this.reject('Application already pending');
      }
      if (existingApp.status === 'ACCEPTED') {
        return this.reject('Already a member');
      }
      // REJECTED = can re-apply
    }

    // ============================================
    // PHASE 2: VISIBILITY & ACCESS CONTROL
    // ============================================
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { college: true, 
        skills: {
          select: {
            name: true,
            level: true,
            isVerified: true,
            calculatedScore: true
          }
        } }
    });

    // 2.1: Campus-Only Check
    if (squad.visibility === 'CAMPUS_ONLY') {
      if (!user.college || user.college !== squad.campusOnly) {
        return this.reject(
          `This squad is only open to ${squad.campusOnly} students`,
          { requiredCollege: squad.campusOnly }
        );
      }
    }

    // 2.2: Stealth Mode (handled at UI level - user needs invite link)
    if (squad.visibility === 'STEALTH') {
      // If they got here, they have the code - allow
    }

    // ============================================
    // PHASE 3: CONSTRAINT CHECKS
    // ============================================

    // 3.1: Ghost Rule - Max 5 pending applications
    const pendingCount = await prisma.squadMember.count({
      where: {
        userId,
        status: 'PENDING'
      }
    });

    if (pendingCount >= 5) {
      return this.reject(
        'You have too many pending applications (max 5)',
        { pendingCount, maxAllowed: 5 }
      );
    }

    // 3.2: Event Exclusivity - Can't join 2 squads for same event
    if (squad.event) {
      const existingCommitment = await prisma.eventCommitment.findUnique({
        where: {
          userId_event: {
            userId,
            event: squad.event
          }
        },
        include: {
          squad: { select: { title: true } }
        }
      });

      if (existingCommitment) {
        return this.reject(
          `Already committed to "${existingCommitment.squad.title}" for ${squad.event}`,
          {
            event: squad.event,
            existingSquad: existingCommitment.squad.title
          }
        );
      }
    }

    // ============================================
    // PHASE 4: SLOT MATCHING
    // ============================================

    // 4.1: Check if specific slot requested
    let targetSlot = null;
    if (slotId) {
      targetSlot = squad.slots.find(s => s.id === slotId);
      
      if (!targetSlot) {
        return this.reject('Slot not found');
      }

      if (targetSlot.status === 'FILLED') {
        return this.reject('Slot already filled');
      }
    }

    // 4.2: If no specific slot, find best match
    if (!targetSlot) {
      targetSlot = this.findBestSlotMatch(squad.slots, user.skills);
      
      if (!targetSlot) {
        return this.reject('No available slots match your skills');
      }
    }

    // ============================================
    // PHASE 5: SKILL VERIFICATION (The Core Gate)
    // ============================================

    // 5.1: If slot doesn't require skills (e.g., PM role)
    if (!targetSlot.requiredSkill) {
      return {
        allowed: true,
        slot: {
          id: targetSlot.id,
          role: targetSlot.role
        },
        skillRequired: false
      };
    }

    // 5.2: Check if user has the required skill
    const userSkill = user.skills.find(
      s => s.name.toLowerCase() === targetSlot.requiredSkill.toLowerCase()
    );

    if (!userSkill) {
      return this.reject(
        `Missing required skill: ${targetSlot.requiredSkill}`,
        {
          slot: targetSlot.role,
          requiredSkill: targetSlot.requiredSkill
        }
      );
    }

    // 5.3: Verification Check
    if (targetSlot.requireVerified && !userSkill.isVerified) {
      return this.reject(
        `${targetSlot.requiredSkill} must be GitHub verified for this role`,
        {
          slot: targetSlot.role,
          requiredSkill: targetSlot.requiredSkill,
          userScore: userSkill.calculatedScore,
          isVerified: false
        }
      );
    }

    // 5.4: Score Check
    const userScore = userSkill.calculatedScore || 0;
    const minScore = targetSlot.minScore || 0;

    if (userScore < minScore) {
      return this.reject(
        `Insufficient skill level for ${targetSlot.role}. Required: ${minScore}/10, Your score: ${userScore}/10`,
        {
          slot: targetSlot.role,
          requiredSkill: targetSlot.requiredSkill,
          requiredScore: minScore,
          userScore: userScore,
          isVerified: userSkill.isVerified
        }
      );
    }

    // ============================================
    // PHASE 6: APPROVED ✅
    // ============================================

    const result = {
      allowed: true,
      slot: {
        id: targetSlot.id,
        role: targetSlot.role,
        requiredSkill: targetSlot.requiredSkill
      },
      skill: {
        name: userSkill.name,
        score: userScore,
        isVerified: userSkill.isVerified,
        level: userSkill.level
      },
      matchScore: this.calculateMatchScore(userScore, minScore)
    };

    console.log('✅ GATEKEEPER PASSED:', result);
    return result;
  }

  /**
   * Find best slot match for user's skills
   */
  findBestSlotMatch(slots, userSkills) {
    const openSlots = slots.filter(s => s.status === 'OPEN');
    
    // Priority 1: Slots without skill requirements (open roles)
    const openRoles = openSlots.filter(s => !s.requiredSkill);
    if (openRoles.length > 0) return openRoles[0];

    // Priority 2: Slots where user exceeds requirements
    for (const slot of openSlots) {
      const userSkill = userSkills.find(
        s => s.name.toLowerCase() === slot.requiredSkill?.toLowerCase()
      );
      
      if (userSkill && userSkill.calculatedScore >= (slot.minScore || 0)) {
        if (!slot.requireVerified || userSkill.isVerified) {
          return slot;
        }
      }
    }

    return null;
  }

  /**
   * Calculate compatibility percentage
   */
  calculateMatchScore(userScore, requiredScore) {
    if (requiredScore === 0) return 100;
    const ratio = userScore / requiredScore;
    return Math.min(100, Math.round(ratio * 100));
  }

  /**
   * Check if user qualifies for ANY slot in squad
   * Used for UI filtering
   */
  async checkSquadCompatibility(userId, squadId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { skills: {
        select: {
          name: true,
          level: true,
          isVerified: true,
          calculatedScore: true
        }
      }

       }
    });

    const squad = await prisma.squadRequest.findUnique({
      where: { id: squadId },
      include: { slots: { where: { status: 'OPEN' } } }
    });

    if (!squad) return { compatible: false };

    let totalSlots = squad.slots.length;
    let matchedSlots = 0;
    let bestMatch = null;
    let maxScore = 0;

    for (const slot of squad.slots) {
      // Open role (no skill required)
      if (!slot.requiredSkill) {
        matchedSlots++;
        continue;
      }

      // Check user's skills
      const userSkill = user.skills.find(
        s => s.name.toLowerCase() === slot.requiredSkill.toLowerCase()
      );

      if (userSkill) {
        const score = userSkill.calculatedScore || 0;
        const minScore = slot.minScore || 0;

        if (score >= minScore) {
          if (!slot.requireVerified || userSkill.isVerified) {
            matchedSlots++;
            
            const matchPercent = this.calculateMatchScore(score, minScore);
            if (matchPercent > maxScore) {
              maxScore = matchPercent;
              bestMatch = {
                slot: slot.role,
                skill: userSkill.name,
                score: score
              };
            }
          }
        }
      }
    }

    const compatibilityPercent = totalSlots > 0 
      ? Math.round((matchedSlots / totalSlots) * 100) 
      : 0;

    return {
      compatible: matchedSlots > 0,
      compatibilityPercent,
      matchedSlots,
      totalSlots,
      bestMatch
    };
  }

  /**
   * Get skill snapshot for application record
   */
  async getSkillSnapshot(userId, skillName) {
    const skill = await prisma.skill.findFirst({
      where: { 
        userId,
        name: { equals: skillName, mode: 'insensitive' }
      }
    });

    return {
      skillName: skill?.name || skillName,
      skillScoreSnapshot: skill?.calculatedScore || 0,
      wasVerifiedSnapshot: skill?.isVerified || false
    };
  }

  /**
   * Rejection helper
   */
  reject(reason, meta = {}) {
    const result = {
      allowed: false,
      reason,
      ...meta
    };
    console.log('❌ GATEKEEPER REJECTED:', result);
    return result;
  }
}

module.exports = new GatekeeperService();