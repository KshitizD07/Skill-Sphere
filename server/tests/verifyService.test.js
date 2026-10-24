import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('@prisma/client');
import { mockPrisma } from '@prisma/client';
import { parseGitHubUrl, checkSkillCooldown } from '../services/verifyService.js';

describe('Verify Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseGitHubUrl', () => {
    it('correctly parses standard GitHub repository URLs', () => {
      const parsed = parseGitHubUrl('https://github.com/facebook/react');
      expect(parsed).toEqual({ owner: 'facebook', repo: 'react' });
    });

    it('handles trailing slashes and .git extensions', () => {
      const parsed = parseGitHubUrl('https://github.com/torvalds/linux.git/');
      expect(parsed).toEqual({ owner: 'torvalds', repo: 'linux' });
    });

    it('handles URLs without protocol scheme', () => {
      const parsed = parseGitHubUrl('github.com/vercel/next.js');
      expect(parsed).toEqual({ owner: 'vercel', repo: 'next.js' });
    });

    it('returns null for non-GitHub domains', () => {
      expect(parseGitHubUrl('https://gitlab.com/owner/repo')).toBeNull();
      expect(parseGitHubUrl('https://bitbucket.org/owner/repo')).toBeNull();
    });

    it('returns null for malformed or incomplete inputs', () => {
      expect(parseGitHubUrl(null)).toBeNull();
      expect(parseGitHubUrl('')).toBeNull();
      expect(parseGitHubUrl('https://github.com/onlyowner')).toBeNull();
    });
  });

  describe('checkSkillCooldown', () => {
    it('returns no cooldown if skill has never been verified', async () => {
      mockPrisma.skill.findFirst.mockResolvedValue(null);

      const result = await checkSkillCooldown({ userId: 'u123', skillName: 'React' });

      expect(result.hasCooldown).toBe(false);
      expect(result.daysRemaining).toBe(0);
      expect(result.lastVerifiedAt).toBeNull();
    });

    it('returns active cooldown when verified within 7 days', async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      mockPrisma.skill.findFirst.mockResolvedValue({
        id: 'sk1',
        name: 'React',
        isVerified: true,
        verifiedAt: twoDaysAgo,
        calculatedScore: 88,
        level: 'ADVANCED',
      });

      const result = await checkSkillCooldown({ userId: 'u123', skillName: 'React' });

      expect(result.hasCooldown).toBe(true);
      expect(result.daysRemaining).toBe(5);
      expect(result.currentScore).toBe(88);
      expect(result.currentLevel).toBe('ADVANCED');
    });

    it('returns no cooldown when verified more than 7 days ago', async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      mockPrisma.skill.findFirst.mockResolvedValue({
        id: 'sk2',
        name: 'Node.js',
        isVerified: true,
        verifiedAt: tenDaysAgo,
        calculatedScore: 75,
        level: 'INTERMEDIATE',
      });

      const result = await checkSkillCooldown({ userId: 'u123', skillName: 'Node.js' });

      expect(result.hasCooldown).toBe(false);
      expect(result.daysRemaining).toBe(0);
      expect(result.currentScore).toBe(75);
    });
  });
});
