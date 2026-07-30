export default {
  testEnvironment: 'node',
  transform: {}, // No transform needed as we use native ES modules
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // Handle ES module imports in tests
    '^@prisma/client$': '<rootDir>/__mocks__/@prisma/client.js',
  },
  clearMocks: true,
};
