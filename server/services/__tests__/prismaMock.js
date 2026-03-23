import { PrismaClient } from '@prisma/client';

const prismaMock = {
  squad: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

export default prismaMock;
