import { jest } from '@jest/globals';

export const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  squad: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  activityLog: {
    create: jest.fn(),
  },
  squadSlot: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $connect: jest.fn().mockResolvedValue(true),
  $disconnect: jest.fn().mockResolvedValue(true),
  $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]),
  $transaction: jest.fn(async (callback) => {
    // If it's an array of promises (Prisma $transaction array syntax), run them
    if (Array.isArray(callback)) {
      return Promise.all(callback);
    }
    // If it's an interactive transaction callback, execute it passing the mock
    return callback(mockPrisma);
  }),
};

export class PrismaClient {
  constructor() {
    return mockPrisma;
  }
}
