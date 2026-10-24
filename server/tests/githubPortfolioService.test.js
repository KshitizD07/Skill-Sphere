import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('@prisma/client');

// Mock axios before importing service
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  defaults: { headers: {} },
  interceptors: {
    response: {
      use: jest.fn(),
    },
  },
};

jest.unstable_mockModule('axios', () => ({
  default: {
    create: jest.fn(() => mockAxiosInstance),
    post: jest.fn(),
  },
}));

const { detectTechnologies, fetchOwnedRepos } = await import('../services/githubPortfolioService.js');

describe('GitHub Portfolio Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectTechnologies', () => {
    it('detects technologies from repository tree items', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          tree: [
            { type: 'blob', path: 'package.json' },
            { type: 'blob', path: 'tsconfig.json' },
            { type: 'blob', path: 'vite.config.ts' },
            { type: 'blob', path: 'Dockerfile' },
            { type: 'blob', path: '.github/workflows/ci.yml' },
            { type: 'tree', path: 'src' }, // directory, should be skipped
          ],
        },
      });

      const techs = await detectTechnologies('user/repo', 'main', 'token-123');

      expect(techs).toContain('Node.js');
      expect(techs).toContain('TypeScript');
      expect(techs).toContain('Vite');
      expect(techs).toContain('Docker');
      expect(techs).toContain('GitHub Actions');
      expect(techs.length).toBe(5);
    });

    it('returns empty array when api request fails', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('GitHub API rate limit exceeded'));

      const techs = await detectTechnologies('user/nonexistent', 'main', 'token-123');

      expect(techs).toEqual([]);
    });
  });

  describe('fetchOwnedRepos', () => {
    it('fetches and maps public repositories', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: [
          {
            id: 101,
            name: 'skillsphere',
            full_name: 'org/skillsphere',
            description: 'AI-driven skill platform',
            language: 'JavaScript',
            html_url: 'https://github.com/org/skillsphere',
            homepage: 'https://skillsphere.dev',
            stargazers_count: 42,
            forks_count: 5,
            updated_at: '2026-08-01T00:00:00Z',
            private: false,
            default_branch: 'master',
          },
          {
            id: 102,
            name: 'private-secret',
            private: true,
          },
        ],
      });

      const repos = await fetchOwnedRepos('org', 'fake-token');

      expect(repos).toHaveLength(1);
      expect(repos[0]).toMatchObject({
        githubId: 101,
        repoName: 'skillsphere',
        fullName: 'org/skillsphere',
        primaryLanguage: 'JavaScript',
        stars: 42,
        forks: 5,
        repoType: 'OWNED',
        defaultBranch: 'master',
      });
    });

    it('handles api error gracefully by returning empty array', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      const repos = await fetchOwnedRepos('org', 'fake-token');

      expect(repos).toEqual([]);
    });
  });
});
