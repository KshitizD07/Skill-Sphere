import { describe, it, expect } from '@jest/globals';
import { calculateCompatibility } from '../services/skillCompatibility.js';

describe('Skill Compatibility Service', () => {
  it('returns default neutral score of 50 when no skills are required or preferred', () => {
    const applicant = { userId: 'u1', skills: [{ name: 'React', score: 85, sources: ['GITHUB'] }] };
    const result = calculateCompatibility(applicant, [], null);

    expect(result.compatibilityScore).toBe(50);
    expect(result.matchedSkills).toEqual([]);
    expect(result.missingSkills).toEqual([]);
  });

  it('calculates full compatibility for matching skills with high score', () => {
    const applicant = {
      userId: 'u1',
      skills: [
        { name: 'React', score: 100, sources: ['GITHUB'] },
        { name: 'Node.js', score: 100, sources: ['GITHUB'] },
      ],
    };
    const preferred = ['React', 'Node.js'];
    const result = calculateCompatibility(applicant, preferred);

    // 100% matched skills ratio (0.6 * 100 = 60) + 100% proficiency (0.4 * 100 = 40) => 100
    expect(result.compatibilityScore).toBe(100);
    expect(result.matchedSkills).toHaveLength(2);
    expect(result.missingSkills).toHaveLength(0);
  });

  it('handles case-insensitive skill matching and tracks missing skills', () => {
    const applicant = {
      userId: 'u1',
      skills: [
        { name: 'react', score: 80, sources: ['GITHUB'] },
      ],
    };
    const preferred = ['React', 'PostgreSQL', 'Docker'];
    const result = calculateCompatibility(applicant, preferred);

    // matchRatio = 1/3 (~0.333) -> 0.333 * 0.6 = 0.2
    // avgProficiency = 80 -> (80/100) * 0.4 = 0.32
    // raw = 0.52 -> 52
    expect(result.compatibilityScore).toBe(52);
    expect(result.matchedSkills).toEqual([{ name: 'react', score: 80 }]);
    expect(result.missingSkills).toEqual(['PostgreSQL', 'Docker']);
  });

  it('incorporates requiredSkill if provided', () => {
    const applicant = {
      userId: 'u1',
      skills: [
        { name: 'TypeScript', score: 90, sources: ['GITHUB'] },
      ],
    };
    const preferred = ['React'];
    const result = calculateCompatibility(applicant, preferred, 'TypeScript');

    expect(result.matchedSkills.some(s => s.name === 'TypeScript')).toBe(true);
    expect(result.missingSkills).toContain('React');
  });
});
