const consensusEngine = require('../services/consensusEngine');
const strategyRegistry = require('../services/strategyRegistry');

jest.mock('../services/strategyRegistry', () => ({
  getSystemConfig: jest.fn().mockResolvedValue({
    minConsensusStrategies: 2,
    minRandomnessRate: 0.10,
    maxRandomnessRate: 0.30
  })
}));

describe('ConsensusEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkConsensus', () => {
    it('should achieve consensus when min requirements are met', async () => {
      const activeStrategies = [
        { id: '1', name: 'strat1' },
        { id: '2', name: 'strat2' },
        { id: '3', name: 'strat3' }
      ];

      const strategyVotes = {
        '1': { candidateId: 'userA', normalizedScore: 0.9, isShadow: false, strategyName: 'strat1' },
        '2': { candidateId: 'userA', normalizedScore: 0.8, isShadow: false, strategyName: 'strat2' },
        '3': { candidateId: 'userB', normalizedScore: 0.9, isShadow: false, strategyName: 'strat3' }
      };

      const result = await consensusEngine.checkConsensus(strategyVotes, activeStrategies);
      
      expect(result.hasConsensus).toBe(true);
      expect(result.selectedUserId).toBe('userA');
      expect(result.agreementCount).toBe(2);
      expect(result.agreementStrategies).toContain('1');
      expect(result.agreementStrategies).toContain('2');
    });

    it('should NOT achieve consensus if votes are split below min requirement', async () => {
      const activeStrategies = [
        { id: '1', name: 'strat1' },
        { id: '2', name: 'strat2' },
        { id: '3', name: 'strat3' }
      ];

      const strategyVotes = {
        '1': { candidateId: 'userA', normalizedScore: 0.9, isShadow: false },
        '2': { candidateId: 'userB', normalizedScore: 0.8, isShadow: false },
        '3': { candidateId: 'userC', normalizedScore: 0.9, isShadow: false }
      };

      const result = await consensusEngine.checkConsensus(strategyVotes, activeStrategies);
      
      expect(result.hasConsensus).toBe(false);
      expect(result.selectedUserId).toBeNull();
      expect(result.agreementCount).toBe(1);
    });

    it('should ignore shadow strategies in consensus vote counting', async () => {
      const activeStrategies = [
        { id: '1', name: 'strat1' },
        { id: '2', name: 'strat2' }
      ];

      const strategyVotes = {
        '1': { candidateId: 'userA', normalizedScore: 0.9, isShadow: false },
        '2': { candidateId: 'userB', normalizedScore: 0.8, isShadow: true },
        '3': { candidateId: 'userA', normalizedScore: 0.9, isShadow: true }
      };

      const result = await consensusEngine.checkConsensus(strategyVotes, activeStrategies);
      
      expect(result.hasConsensus).toBe(false); 
    });
  });

  describe('analyzeDisagreement', () => {
    it('should calculate accurate diversity and variance', async () => {
      const strategyVotes = {
        '1': { candidateId: 'userA', normalizedScore: 0.9, isShadow: false },
        '2': { candidateId: 'userB', normalizedScore: 0.2, isShadow: false },
        '3': { candidateId: 'userC', normalizedScore: 0.5, isShadow: false }
      };

      const result = await consensusEngine.analyzeDisagreement(strategyVotes);
      
      expect(result.uniqueCandidates).toBe(3);
      expect(result.totalStrategies).toBe(3);
      expect(result.diversityScore).toBe(1);
      expect(result.scoreVariance).toBeGreaterThan(0.05);
    });
  });
});
