import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';
import gatekeeper from './gatekeeper.js';
import matchOrchestrator from './matchOrchestrator.js';
import decisionLogger from './decisionLogger.js';
import { getVerifiedSkillProfile } from './verifiedSkillProfile.js';
import { calculateCompatibility } from './skillCompatibility.js';

const prisma = new PrismaClient();

// ── Reusable select shape ─────────────────────────────────────────────────────
const SQUAD_SELECT = {
  id: true, title: true, description: true, event: true,
  visibility: true, maxMembers: true, currentMembers: true, status: true,
  createdAt: true, expiresAt: true,
  leader: { select: { id: true, name: true, avatar: true, college: true } },
  slots:  { select: { id: true, roleTitle: true, roleDescription: true, preferredSkills: true, requiredSkill: true, minScore: true, requireVerified: true, status: true, filledBy: true, position: true }, orderBy: { position: 'asc' } },
  _count: { select: { applications: true } },
};


// ── Create squad ──────────────────────────────────────────────────────────────
export async function createSquad({ title, description, event, maxMembers = 4, visibility = 'PUBLIC', expiresAt, slots = [] }, leaderId) {
  if (!title?.trim())       throw ApiError.badRequest('Title is required');
  if (title.trim().length < 3 || title.trim().length > 200) throw ApiError.badRequest('Title must be 3-200 characters');
  if (!description?.trim()) throw ApiError.badRequest('Description is required');
  if (description.trim().length < 10 || description.trim().length > 5000) throw ApiError.badRequest('Description must be 10-5000 characters');
  if (slots.length > 10)    throw ApiError.badRequest('Maximum 10 slots per squad');

  // Limit: max 3 active squads per user
  const activeCount = await prisma.squad.count({
    where: { leaderId, status: { in: ['OPEN', 'FULL'] } },
  });
  if (activeCount >= 3) {
    throw ApiError.badRequest('You can lead a maximum of 3 active squads at a time.');
  }

  const expiryDate = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const squad = await prisma.squad.create({
    data: {
      title:       title.trim(),
      description: description.trim(),
      event:       event?.trim() || null,
      maxMembers:  Math.min(20, Math.max(2, parseInt(maxMembers) || 4)),
      visibility,
      leaderId,
      expiresAt:   expiryDate,
      slots: {
        create: slots.map((s, i) => ({
          roleTitle:       s.roleTitle || 'Member',
          roleDescription: s.roleDescription || null,
          preferredSkills: Array.isArray(s.preferredSkills) ? s.preferredSkills.slice(0, 10) : [],
          requiredSkill:   s.requiredSkill || null,
          minScore:        Math.min(10, Math.max(0, parseInt(s.minScore) || 0)),
          requireVerified: !!s.requireVerified,
          position:        i,
        })),
      },
    },
    include: { slots: true, leader: { select: { id: true, name: true, avatar: true } } },
  });

  await prisma.activityLog.create({
    data: { userId: leaderId, action: 'SQUAD_CREATED', details: `Created squad: ${title}` },
  });

  logger.info('Squad created', { squadId: squad.id, leaderId, title });
  return squad;
}

// ── Feed & Query ──────────────────────────────────────────────────────────────
export async function getFeed({ skill, event, status, search, maxScore, cursor, page = 1, limit = 12 } = {}) {
  const where = {};

  if (status && status !== 'ALL') {
    where.status = status;
  } else {
    where.status = { in: ['OPEN', 'FULL'] };
  }

  if (event && event !== 'ALL') {
    where.event = event;
  }

  if (skill?.trim()) {
    where.slots = {
      some: {
        requiredSkill: { contains: skill.trim(), mode: 'insensitive' },
      },
    };
  }

  if (maxScore) {
    where.slots = {
      some: { minScore: { lte: parseInt(maxScore) } },
    };
  }

  if (search?.trim()) {
    where.OR = [
      { title: { contains: search.trim(), mode: 'insensitive' } },
      { description: { contains: search.trim(), mode: 'insensitive' } },
      { leader: { name: { contains: search.trim(), mode: 'insensitive' } } },
    ];
  }

  if (cursor) {
    const cursorSquad = await prisma.squad.findUnique({
      where: { id: cursor },
      select: { createdAt: true },
    });
    if (cursorSquad) {
      where.createdAt = { lt: cursorSquad.createdAt };
    }
  }

  const [squads, total] = await Promise.all([
    prisma.squad.findMany({
      where,
      select: SQUAD_SELECT,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? {} : { skip: (page - 1) * limit }),
    }),
    prisma.squad.count({ where }),
  ]);

  const hasMore = squads.length > limit;
  const items = hasMore ? squads.slice(0, limit) : squads;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

  return {
    success: true,
    squads: items,
    nextCursor,
    hasMore,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ── Single squad ──────────────────────────────────────────────────────────────
export async function getSquad(squadId) {
  const squad = await prisma.squad.findUnique({
    where: { id: squadId },
    include: {
      leader:       { select: { id: true, name: true, avatar: true, college: true, headline: true } },
      slots:        { orderBy: { position: 'asc' } },
      applications: {
        include: {
          user: {
            select: {
              id: true, name: true, avatar: true, college: true, role: true, headline: true,
              skills: { select: { id: true, name: true, isVerified: true, calculatedScore: true } },
            },
          },
          slot: { select: { id: true, roleTitle: true, requiredSkill: true, minScore: true } },
        },
        orderBy: { appliedAt: 'desc' },
      },
    },
  });

  if (!squad) throw ApiError.notFound('Squad');
  return squad;
}

// ── Edit squad (Leader only) ──────────────────────────────────────────────────
export async function editSquad(squadId, { title, description, event, expiresAt }, leaderId) {
  const squad = await prisma.squad.findUnique({ where: { id: squadId } });
  if (!squad) throw ApiError.notFound('Squad');
  if (squad.leaderId !== leaderId) throw ApiError.forbidden('Only the squad leader can edit this squad');

  const data = {};
  if (title?.trim()) data.title = title.trim();
  if (description?.trim()) data.description = description.trim();
  if (event) data.event = event.trim();
  if (expiresAt) data.expiresAt = new Date(expiresAt);

  const updated = await prisma.squad.update({
    where: { id: squadId },
    data,
    include: { slots: true, leader: { select: { id: true, name: true, avatar: true } } },
  });

  return updated;
}

// ── Close / Delete squad (Leader only) ────────────────────────────────────────
export async function deleteSquad(squadId, leaderId) {
  const squad = await prisma.squad.findUnique({
    where: { id: squadId },
    include: { applications: { where: { status: 'PENDING' }, select: { userId: true } } },
  });
  if (!squad) throw ApiError.notFound('Squad');
  if (squad.leaderId !== leaderId) throw ApiError.forbidden('Only the squad leader can delete this squad');

  // Notify pending applicants
  for (const app of squad.applications) {
    try {
      const notif = await prisma.inAppNotification.create({
        data: {
          userId: app.userId,
          type: 'SQUAD_REJECTED',
          title: 'Squad Closed',
          message: `The squad "${squad.title}" has been deleted by its leader.`,
          actionUrl: '/nexus',
        },
      });
      const { getIO } = await import('../socket.js');
      getIO().to(app.userId).emit('NOTIFICATION', notif);
    } catch {
      // Non-blocking
    }
  }

  // Delete all applications for this squad
  await prisma.squadApplication.deleteMany({
    where: { squadId },
  });

  // Delete all slots for this squad
  await prisma.squadSlot.deleteMany({
    where: { squadId },
  });

  // Delete squad permanently
  await prisma.squad.delete({
    where: { id: squadId },
  });

  return { success: true, message: 'Squad deleted successfully' };
}

// ── Slot Management (Leader only) ─────────────────────────────────────────────
export async function addSlot(squadId, slotData, leaderId) {
  const squad = await prisma.squad.findUnique({
    where: { id: squadId },
    include: { slots: true },
  });
  if (!squad) throw ApiError.notFound('Squad');
  if (squad.leaderId !== leaderId) throw ApiError.forbidden('Only the squad leader can add roles');
  if (squad.slots.length >= 10) throw ApiError.badRequest('Maximum 10 slots per squad');

  const slot = await prisma.squadSlot.create({
    data: {
      squadId,
      roleTitle: slotData.roleTitle?.trim() || 'Member',
      roleDescription: slotData.roleDescription?.trim() || null,
      preferredSkills: Array.isArray(slotData.preferredSkills) ? slotData.preferredSkills.slice(0, 10) : [],
      requiredSkill: slotData.requiredSkill?.trim() || null,
      minScore: Math.min(10, Math.max(0, parseInt(slotData.minScore) || 0)),
      requireVerified: !!slotData.requireVerified,
      position: squad.slots.length,
      status: 'OPEN',
    },
  });
  return slot;
}

export async function editSlot(squadId, slotId, slotData, leaderId) {
  const squad = await prisma.squad.findUnique({ where: { id: squadId } });
  if (!squad) throw ApiError.notFound('Squad');
  if (squad.leaderId !== leaderId) throw ApiError.forbidden('Only the squad leader can edit roles');

  const existingSlot = await prisma.squadSlot.findUnique({ where: { id: slotId } });
  if (!existingSlot || existingSlot.squadId !== squadId) throw ApiError.notFound('Role Slot');

  const updatedSlot = await prisma.squadSlot.update({
    where: { id: slotId },
    data: {
      roleTitle: slotData.roleTitle?.trim() || existingSlot.roleTitle,
      roleDescription: slotData.roleDescription !== undefined ? slotData.roleDescription?.trim() : existingSlot.roleDescription,
      requiredSkill: slotData.requiredSkill !== undefined ? slotData.requiredSkill?.trim() : existingSlot.requiredSkill,
      minScore: slotData.minScore !== undefined ? Math.min(10, Math.max(0, parseInt(slotData.minScore) || 0)) : existingSlot.minScore,
      requireVerified: slotData.requireVerified !== undefined ? !!slotData.requireVerified : existingSlot.requireVerified,
    },
  });
  return updatedSlot;
}

export async function deleteSlot(squadId, slotId, leaderId) {
  const squad = await prisma.squad.findUnique({ where: { id: squadId } });
  if (!squad) throw ApiError.notFound('Squad');
  if (squad.leaderId !== leaderId) throw ApiError.forbidden('Only the squad leader can delete roles');

  const slot = await prisma.squadSlot.findUnique({ where: { id: slotId } });
  if (!slot || slot.squadId !== squadId) throw ApiError.notFound('Role Slot');
  if (slot.status === 'FILLED') {
    throw ApiError.badRequest('Cannot delete a filled slot. Member must leave or be removed first.');
  }

  // Delete pending applications for this slot
  await prisma.squadApplication.deleteMany({
    where: { slotId, status: 'PENDING' },
  });

  await prisma.squadSlot.delete({ where: { id: slotId } });
  return { success: true, message: 'Role slot removed' };
}

// ── Withdraw / Delete application (Applicant or Leader) ───────────────────────
export async function withdrawApplication(applicationId, userId) {
  const app = await prisma.squadApplication.findUnique({
    where: { id: applicationId },
    include: { squad: true },
  });
  if (!app) throw ApiError.notFound('Application');
  if (app.userId !== userId && app.squad.leaderId !== userId) {
    throw ApiError.forbidden('You do not have permission to delete this application');
  }
  if (app.status === 'ACCEPTED') {
    throw ApiError.badRequest('Cannot withdraw an accepted application. Please leave the squad instead.');
  }

  await prisma.squadApplication.delete({ where: { id: applicationId } });
  return { success: true, message: 'Application removed' };
}

// ── Leave squad (Member only) ─────────────────────────────────────────────────
export async function leaveSquad(squadId, userId) {
  const squad = await prisma.squad.findUnique({ where: { id: squadId } });
  if (!squad) throw ApiError.notFound('Squad');
  if (squad.leaderId === userId) {
    throw ApiError.badRequest('Squad leaders cannot leave the squad. You can close the squad instead.');
  }

  // Find slot filled by user
  const filledSlot = await prisma.squadSlot.findFirst({
    where: { squadId, filledBy: userId },
  });

  if (filledSlot) {
    await prisma.squadSlot.update({
      where: { id: filledSlot.id },
      data: { status: 'OPEN', filledBy: null },
    });
  }

  // Remove accepted application
  await prisma.squadApplication.deleteMany({
    where: { squadId, userId, status: 'ACCEPTED' },
  });

  // Decrement currentMembers and reopen squad if full
  const newMemberCount = Math.max(1, squad.currentMembers - 1);
  await prisma.squad.update({
    where: { id: squadId },
    data: {
      currentMembers: newMemberCount,
      status: squad.status === 'FULL' ? 'OPEN' : squad.status,
    },
  });

  // Notify squad leader
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const notif = await prisma.inAppNotification.create({
      data: {
        userId: squad.leaderId,
        type: 'SQUAD_REJECTED',
        title: 'Member Left Squad',
        message: `${user?.name || 'A member'} has left ${squad.title}.`,
        actionUrl: `/squad/${squadId}`,
      },
    });
    const { getIO } = await import('../socket.js');
    getIO().to(squad.leaderId).emit('NOTIFICATION', notif);
  } catch {
    // Non-blocking
  }

  return { success: true, message: 'Successfully left squad' };
}

// ── Gatekeeper: check if user qualifies for a squad ──────────────────────────
export async function checkQualification(squadId, userId) {
  const [squad, user, userApps] = await Promise.all([
    prisma.squad.findUnique({ where: { id: squadId }, include: { slots: { where: { status: 'OPEN' } } } }),
    prisma.user.findUnique({ where: { id: userId }, include: { skills: true } }),
    prisma.squadApplication.findMany({ where: { squadId, userId } }),
  ]);

  if (!squad) throw ApiError.notFound('Squad');
  if (!user)  throw ApiError.notFound('User');
  if (squad.status !== 'OPEN') return { qualifies: false, reason: 'Squad is not open' };
  if (squad.currentMembers >= squad.maxMembers) return { qualifies: false, reason: 'Squad is full' };

  const rejectedSlotIds = userApps.filter((a) => a.status === 'REJECTED').map((a) => a.slotId).filter(Boolean);

  // User qualifies if they can fill at least one open non-rejected slot
  for (const slot of squad.slots) {
    if (rejectedSlotIds.includes(slot.id)) continue;

    if (!slot.requiredSkill || slot.minScore === 0) {
      return { qualifies: true, matchScore: 5, slotId: slot.id };
    }

    const userSkill = user.skills.find((s) => s.name.toLowerCase() === slot.requiredSkill.toLowerCase());
    if (!userSkill) continue;
    if (slot.requireVerified && !userSkill.isVerified) continue;

    const score = userSkill.calculatedScore ?? 5;
    if (score >= slot.minScore) return { qualifies: true, matchScore: score, slotId: slot.id };
  }

  return { qualifies: false, reason: 'Score too low or missing required skill for open roles' };
}

// ── Apply to squad (with Gatekeeper + Antifragile AI) ─────────────────────────
export async function applyToSquad(squadId, userId, message, slotId = null) {
  // Step 1: Gatekeeper check
  const gate = await gatekeeper.checkEligibility(userId, squadId, slotId);
  if (!gate.allowed) throw ApiError.forbidden(gate.reason || 'You do not qualify for this squad');

  // Step 2: Duplicate check for target slot
  const existingForSlot = await prisma.squadApplication.findFirst({
    where: { squadId, userId, slotId: gate.slot.id },
  });
  if (existingForSlot) {
    if (existingForSlot.status === 'PENDING') throw ApiError.conflict('Application for this role is already pending');
    if (existingForSlot.status === 'ACCEPTED') throw ApiError.conflict('Already a member of this squad');
    if (existingForSlot.status === 'REJECTED') throw ApiError.forbidden('You have been rejected for this role');
    if (existingForSlot.status === 'WITHDRAWN') {
      await prisma.squadApplication.delete({ where: { id: existingForSlot.id } });
    }
  }

  // Step 3: Antifragile matching (graceful fallback if engine fails)
  let matchResult = null;
  try {
    matchResult = await matchOrchestrator.matchCandidatesForSlot(
      squadId, gate.slot.id, [userId]
    );
  } catch (err) {
    logger.warn('Antifragile matching failed, proceeding with gatekeeper score', { err: err.message });
  }

  // Step 4: Create application with AI results
  const application = await prisma.squadApplication.create({
    data: {
      squadId,
      userId,
      slotId: gate.slot.id,
      message: message?.trim() || null,
      matchScore: matchResult?.explanation?.confidence
        ? Math.round(matchResult.explanation.confidence * 10)
        : gate.matchScore || 5,
      matchDecisionId: matchResult?.decisionId || null,
    },
  });

  await prisma.activityLog.create({
    data: { userId, action: 'SQUAD_APPLIED', details: `Applied to squad ${squadId}` },
  });

  // Step 5: Notify squad leader
  try {
    const [squad, user] = await Promise.all([
      prisma.squad.findUnique({ where: { id: squadId }, select: { title: true, leaderId: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { name: true, avatar: true } }),
    ]);

    if (squad && user) {
      const notif = await prisma.inAppNotification.create({
        data: {
          userId: squad.leaderId,
          type: 'SQUAD_APPLICATION',
          title: 'New Application',
          message: `${user.name} applied for ${gate.slot.role} in ${squad.title}`,
          actionUrl: `/squad/${squadId}/manage`,
          senderAvatar: user.avatar,
        },
      });

      try {
        const { getIO } = await import('../socket.js');
        getIO().to(squad.leaderId).emit('NOTIFICATION', notif);
      } catch { /* non-blocking */ }
    }
  } catch (err) {
    logger.warn('Failed to send application notification', { err: err.message });
  }

  logger.info('Application submitted', { squadId, userId, slotId: gate.slot.id, matchScore: application.matchScore });
  return { ...application, explanation: matchResult?.explanation || null };
}

// ── Update application status (leader only) ───────────────────────────────────
export async function updateApplicationStatus(squadId, applicationId, status, leaderId) {
  const squad = await prisma.squad.findUnique({ where: { id: squadId } });
  if (!squad)                      throw ApiError.notFound('Squad');
  if (squad.leaderId !== leaderId) throw ApiError.forbidden('Only the squad leader can manage applications');

  const existingApp = await prisma.squadApplication.findUnique({ where: { id: applicationId } });
  if (!existingApp) throw ApiError.notFound('Application');
  if (existingApp.status !== 'PENDING') {
    throw ApiError.badRequest(`Application is already ${existingApp.status.toLowerCase()}`);
  }

  const application = await prisma.squadApplication.update({
    where:   { id: applicationId },
    data:    { status, decidedAt: new Date() },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });

  if (status === 'ACCEPTED') {
    await prisma.squad.update({ where: { id: squadId }, data: { currentMembers: { increment: 1 } } });

    // Fill the specific slot if application was slot-targeted
    if (application.slotId) {
      await prisma.squadSlot.update({
        where: { id: application.slotId },
        data:  { status: 'FILLED', filledBy: application.userId },
      });
    }

    // Auto-close if the squad is now full
    const updated = await prisma.squad.findUnique({ where: { id: squadId } });
    if (updated.currentMembers >= updated.maxMembers) {
      await prisma.squad.update({ where: { id: squadId }, data: { status: 'FULL' } });
    }

    // ── Auto-open chat with accepted member ──────────────────────────────────
    try {
      // Find or create a 1-on-1 conversation between leader and the new member
      let conversation = await prisma.conversation.findFirst({
        where: {
          AND: [
            { participants: { some: { id: leaderId } } },
            { participants: { some: { id: application.userId } } },
          ],
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            participants: {
              connect: [{ id: leaderId }, { id: application.userId }],
            },
          },
        });
      }

      // Seed a welcome message from the leader (system-style content)
      const slotTitle = application.slotId
        ? (await prisma.squadSlot.findUnique({ where: { id: application.slotId }, select: { roleTitle: true } }))?.roleTitle
        : null;

      const welcomeText = slotTitle
        ? `Hey! You've been selected for the "${slotTitle}" role in **${squad.title}**. Welcome to the team — we'll reach out with next steps soon! 🎉`
        : `Hey! You've been selected for **${squad.title}**. Welcome to the team — we'll reach out with next steps soon! 🎉`;

      const welcomeMsg = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId:       leaderId,
          content:        welcomeText,
          isRead:         false,
        },
      });

      // Update conversation updatedAt so it surfaces at the top of chat list
      await prisma.conversation.update({
        where: { id: conversation.id },
        data:  { updatedAt: new Date() },
      });

      // Push the message over socket if the applicant is online
      try {
        const { getIO } = await import('../socket.js');
        getIO().to(application.userId).emit('NEW_MESSAGE', {
          conversationId: conversation.id,
          message: welcomeMsg,
        });
      } catch { /* non-blocking */ }
    } catch (err) {
      logger.warn('Failed to seed welcome chat message', { err: err.message });
    }
  }

  // Log outcome for antifragile learning
  if (application.matchDecisionId) {
    try {
      const minutesSinceApplication = Math.round(
        (Date.now() - application.appliedAt.getTime()) / 60000
      );
      await decisionLogger.logOutcome(application.matchDecisionId, {
        accepted: status === 'ACCEPTED',
        timeToDecision: minutesSinceApplication,
      });
    } catch (err) {
      logger.warn('Failed to log match outcome', { err: err.message });
    }
  }

  // Notify applicant of decision
  try {
    const notif = await prisma.inAppNotification.create({
      data: {
        userId: application.userId,
        type: status === 'ACCEPTED' ? 'APPLICATION_ACCEPTED' : 'APPLICATION_REJECTED',
        title: status === 'ACCEPTED' ? 'Application Accepted!' : 'Application Update',
        message: status === 'ACCEPTED'
          ? `You've been accepted to ${squad.title}!`
          : `Your application to ${squad.title} was not selected.`,
        actionUrl: `/squad/${squadId}`,
      },
    });

    try {
      const { getIO } = await import('../socket.js');
      getIO().to(application.userId).emit('NOTIFICATION', notif);
    } catch { /* non-blocking */ }
  } catch (err) {
    logger.warn('Failed to send decision notification', { err: err.message });
  }

  return application;
}

// ── My squads (led or applied to) ────────────────────────────────────────────
export async function getMySquads(userId) {
  const [led, applied] = await Promise.all([
    prisma.squad.findMany({
      where: { leaderId: userId, status: { not: 'CLOSED' } },
      select: {
        ...SQUAD_SELECT,
        applications: {
          where: { status: 'PENDING' },
          select: { id: true, slotId: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.squadApplication.findMany({
      where: { userId },
      include: {
        squad: { select: SQUAD_SELECT },
        slot: { select: { id: true, roleTitle: true, requiredSkill: true } },
      },
      orderBy: { appliedAt: 'desc' },
    }),
  ]);

  return { led, applications: applied };
}

// ── My applications (dedicated endpoint) ──────────────────────────────────────
export async function getMyApplications(userId) {
  return prisma.squadApplication.findMany({
    where: { userId },
    include: {
      squad: {
        select: {
          id: true, title: true, status: true, event: true,
          leader: { select: { id: true, name: true, avatar: true } },
        },
      },
      slot: { select: { id: true, roleTitle: true, requiredSkill: true } },
    },
    orderBy: { appliedAt: 'desc' },
  });
}

// ── Slot Recommendations (N.E.X.U.S. Skill Compatibility) ─────────────────────
export async function getSlotRecommendations(squadId, slotId, leaderId) {
  const squad = await prisma.squad.findUnique({
    where: { id: squadId },
    select: { leaderId: true },
  });

  if (!squad) throw ApiError.notFound('Squad');
  if (squad.leaderId !== leaderId) throw ApiError.forbidden('Only squad leader can view recommendations');

  const slot = await prisma.squadSlot.findUnique({
    where: { id: slotId },
  });

  if (!slot || slot.squadId !== squadId) throw ApiError.notFound('Slot');

  const applications = await prisma.squadApplication.findMany({
    where: { squadId, slotId, status: 'PENDING' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatar: true,
          college: true,
          headline: true,
        },
      },
    },
  });

  const recommendations = await Promise.all(
    applications.map(async (app) => {
      const profile = await getVerifiedSkillProfile(app.userId);
      const compatibility = calculateCompatibility(
        profile,
        slot.preferredSkills || [],
        slot.requiredSkill
      );

      return {
        applicationId: app.id,
        appliedAt: app.appliedAt,
        message: app.message,
        applicant: app.user,
        compatibilityScore: compatibility.compatibilityScore,
        matchedSkills: compatibility.matchedSkills,
        missingSkills: compatibility.missingSkills,
      };
    })
  );

  recommendations.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  return recommendations;
}
