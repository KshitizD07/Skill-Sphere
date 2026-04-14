const { PrismaClient } = require('@prisma/client');

const prismaMock = {
  squad: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

module.exports = prismaMock;

if (typeof test !== 'undefined') {
  test('dummy', () => { expect(true).toBe(true); });
}
