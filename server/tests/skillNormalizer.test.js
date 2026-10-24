import { normalizeSkillCanonical, CANONICAL_SKILL_MAP } from '../utils/skillNormalizer.js';

describe('skillNormalizer utility', () => {
  test('should normalize common database aliases correctly', () => {
    expect(normalizeSkillCanonical('postgres')).toBe('PostgreSQL');
    expect(normalizeSkillCanonical('postgresql')).toBe('PostgreSQL');
    expect(normalizeSkillCanonical('psql')).toBe('PostgreSQL');
    expect(normalizeSkillCanonical('mongo')).toBe('MongoDB');
    expect(normalizeSkillCanonical('mongodb')).toBe('MongoDB');
  });

  test('should normalize language aliases correctly', () => {
    expect(normalizeSkillCanonical('js')).toBe('JavaScript');
    expect(normalizeSkillCanonical('javascript')).toBe('JavaScript');
    expect(normalizeSkillCanonical('py')).toBe('Python');
    expect(normalizeSkillCanonical('python3')).toBe('Python');
    expect(normalizeSkillCanonical('golang')).toBe('Go');
    expect(normalizeSkillCanonical('ts')).toBe('TypeScript');
  });

  test('should normalize framework and library aliases correctly', () => {
    expect(normalizeSkillCanonical('reactjs')).toBe('React');
    expect(normalizeSkillCanonical('nextjs')).toBe('Next.js');
    expect(normalizeSkillCanonical('tailwind')).toBe('Tailwind CSS');
    expect(normalizeSkillCanonical('k8s')).toBe('Kubernetes');
  });

  test('should return original trimmed string if skill is unknown or canonical', () => {
    expect(normalizeSkillCanonical('UnknownSkillXYZ')).toBe('UnknownSkillXYZ');
    expect(normalizeSkillCanonical('  Custom Tool  ')).toBe('Custom Tool');
    expect(normalizeSkillCanonical('')).toBe('');
    expect(normalizeSkillCanonical(null)).toBe('');
  });
});
