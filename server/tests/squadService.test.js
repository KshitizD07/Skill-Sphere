import { jest } from '@jest/globals';
import { createSquad } from '../services/squadService.js';
import { mockPrisma } from '../__mocks__/@prisma/client.js';

// Instruct Jest to use our mock for the PrismaClient package
jest.mock('@prisma/client');

describe('squadService - createSquad', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should throw an error if title is missing', async () => {
    // Attempting to create a squad without a title
    await expect(createSquad({}, 'leader-123')).rejects.toThrow('Title is required');
  });

  test('should throw an error if description is missing', async () => {
    // Attempting to create a squad with a title but no description
    await expect(
      createSquad({ title: 'A valid title' }, 'leader-123')
    ).rejects.toThrow('Description is required');
  });

  test('should successfully create a squad when data is valid', async () => {
    mockPrisma.squad.count.mockResolvedValue(0);

    // Setup mock return value for squad creation
    mockPrisma.squad.create.mockResolvedValue({ 
      id: 'mocked-squad-1', 
      title: 'Hackathon Squad',
      description: 'A squad for the upcoming hackathon event. Needs good developers.',
      status: 'OPEN'
    });

    const result = await createSquad({
      title: 'Hackathon Squad',
      description: 'A squad for the upcoming hackathon event. Needs good developers.',
      event: 'Global Hackathon 2026',
    }, 'leader-123');

    // Ensure the squad was returned
    expect(result).toBeDefined();
    expect(result.id).toBe('mocked-squad-1');
    
    // Ensure prisma.squad.create was called in our mock!
    expect(mockPrisma.squad.create).toHaveBeenCalledTimes(1);
  });
});
