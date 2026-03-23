// server/repositories/BaseRepository.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class BaseRepository {
  async findById(id) {
    return prisma[this.model].findUnique({ where: { id } });
  }

  async findMany(where, options) {
    return prisma[this.model].findMany({ where, ...options });
  }

  async create(data) {
    return prisma[this.model].create({ data });
  }

  async update(id, data) {
    return prisma[this.model].update({ where: { id }, data });
  }

  async delete(id) {
    return prisma[this.model].delete({ where: { id } });
  }
}

export default BaseRepository;
