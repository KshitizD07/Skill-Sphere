const matchOrchestrator = require('../services/matchOrchestrator');
const consensusEngine = require('../services/consensusEngine');
const strategyRegistry = require('../services/strategyRegistry');
const decisionLogger = require('../services/decisionLogger');

jest.mock('../services/consensusEngine', () => ({
  checkConsensus: jest.fn()
}));

jest.mock('../services/strategyRegistry', () => ({
  getActiveStrategies: jest.fn(),
  getShadowStrategies: jest.fn(),
  getSystemConfig: jest.fn().mockResolvedValue({ minConsensusStrategies: 2 })
}));

jest.mock('../services/decisionLogger', () => ({
  logDecision: jest.fn().mockResolvedValue({ id: 'dec-123' })
}));

jest.mock('@prisma/client', () => {
  const mPrisma = {
    squadRequest: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'sq-123',
        title: 'Mock Squad',
        leader: { id: 'l1', name: 'Leader' },
        slots: [{ id: 'sl-123', role: 'Dev', requiredSkill: 'React' }]
      })
    },
    user: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'c1', skills: [] },
        { id: 'c2', skills: [] }
      ])
    }
  };
  return { PrismaClient: jest.fn(() => mPrisma) };
});

describe('MatchOrchestrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fall back to controlled randomness when no consensus is reached', async () => {
    // Mock strategies
    strategyRegistry.getActiveStrategies.mockResolvedValue([
      { id: 's1', name: 'strat1', config: {} },
      { id: 's2', name: 'strat2', config: {} }
    ]);
    strategyRegistry.getShadowStrategies.mockResolvedValue([]);

    // Mock execution to bypass calling actual strategies
    matchOrchestrator._executeStrategies = jest.fn().mockResolvedValue({
      's1': { candidateId: 'c1', normalizedScore: 0.9, isShadow: false },
      's2': { candidateId: 'c2', normalizedScore: 0.8, isShadow: false }
    });

    // Say no consensus was reached
    consensusEngine.checkConsensus.mockResolvedValue({
      hasConsensus: false,
      selectedUserId: null,
      agreementCount: 1
    });

    const result = await matchOrchestrator.matchCandidatesForSlot('sq-123', 'sl-123', ['c1', 'c2']);

    expect(result.decisionId).toBe('dec-123');
    expect(result.explanation.method).toBe('exploration'); // random fallback
    expect(['c1', 'c2']).toContain(result.recommendedUserId);
  });
});
