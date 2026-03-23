// server/repositories/squadRepository.js
import { PrismaClient } from '@prisma/client';
import BaseRepository from './BaseRepository.js';

const prisma = new PrismaClient();

class SquadRepository extends BaseRepository {
  async findByFilters(filters, pagination) {
    return prisma.squad.findMany({
      where: filters,
      ...pagination,
    });
  }

  async findWithSlots(squadId) {
    return prisma.squad.findUnique({
      where: { id: squadId },
      include: { slots: true },
    });
  }

  async createWithSlots(squadData, slots) {
    return prisma.$transaction([
      prisma.squad.create({ data: squadData }),
      ...slots.map((slot) => prisma.slot.create({ data: slot })),
    ]);
  }

  async updateSlot(slotId, updates) {
    return prisma.slot.update({ where: { id: slotId }, data: updates });
  }
}

export default SquadRepository;
