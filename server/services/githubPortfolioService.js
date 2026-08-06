import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

// Helper to get GitHub Axios instance
const getGitHubClient = (accessToken) => {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'SkillSphere',
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  } else if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return axios.create({
    baseURL: 'https://api.github.com',
    headers,
  });
};

/**
 * Fetch owned public repositories for a user.
 */
export const fetchOwnedRepos = async (githubUsername, accessToken) => {
  try {
    const github = getGitHubClient(accessToken);
    const res = await github.get(`/users/${githubUsername}/repos`, {
      params: { type: 'owner', sort: 'updated', per_page: 100 },
    });
    
    return res.data
      .filter((repo) => !repo.private)
      .map((repo) => ({
        githubId: repo.id,
        repoName: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        primaryLanguage: repo.language,
        url: repo.html_url,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        repoUpdatedAt: new Date(repo.updated_at),
        repoType: 'OWNED',
        defaultBranch: repo.default_branch,
      }));
  } catch (error) {
    console.error(`Error fetching owned repos for ${githubUsername}:`, error.message);
    return [];
  }
};

/**
 * Fetch contributed repositories for a user using GraphQL.
 */
export const fetchContributedRepos = async (githubUsername, accessToken) => {
  const token = accessToken || process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn('Cannot fetch contributed repos without a GitHub token');
    return [];
  }

  const query = `
    query($login: String!) {
      user(login: $login) {
        repositoriesContributedTo(first: 100, contributionTypes: [COMMIT, PULL_REQUEST], includeUserRepositories: false, privacy: PUBLIC) {
          nodes {
            databaseId
            name
            nameWithOwner
            description
            primaryLanguage {
              name
            }
            url
            stargazerCount
            forkCount
            updatedAt
            defaultBranchRef {
              name
            }
          }
        }
      }
    }
  `;

  try {
    const res = await axios.post(
      'https://api.github.com/graphql',
      { query, variables: { login: githubUsername } },
      { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'SkillSphere' } }
    );

    if (res.data.errors) {
      console.error(`GraphQL errors fetching contributed repos for ${githubUsername}:`, res.data.errors);
      return [];
    }

    const repos = res.data.data.user.repositoriesContributedTo.nodes;
    
    return repos.map((repo) => ({
      githubId: repo.databaseId,
      repoName: repo.name,
      fullName: repo.nameWithOwner,
      description: repo.description,
      primaryLanguage: repo.primaryLanguage?.name || null,
      url: repo.url,
      stars: repo.stargazerCount,
      forks: repo.forkCount,
      repoUpdatedAt: new Date(repo.updatedAt),
      repoType: 'CONTRIBUTED',
      defaultBranch: repo.defaultBranchRef?.name || 'main',
    }));
  } catch (error) {
    console.error(`Error fetching contributed repos for ${githubUsername}:`, error.message);
    return [];
  }
};

/**
 * Detect technologies based on repository file tree.
 */
export const detectTechnologies = async (fullName, branch, accessToken) => {
  try {
    const github = getGitHubClient(accessToken);
    const res = await github.get(`/repos/${fullName}/git/trees/${branch}?recursive=1`);
    
    const tree = res.data.tree;
    const techs = new Set();

    for (const item of tree) {
      if (item.type !== 'blob') continue;
      
      const path = item.path.toLowerCase();
      const fileName = path.split('/').pop();

      // Basic file-based tech detection
      if (fileName === 'package.json') techs.add('Node.js');
      if (fileName === 'package-lock.json' || fileName === 'yarn.lock') techs.add('Node.js');
      if (fileName === 'requirements.txt' || fileName === 'pipfile') techs.add('Python');
      if (fileName === 'pom.xml' || fileName === 'build.gradle') techs.add('Java');
      if (fileName === 'go.mod') techs.add('Go');
      if (fileName === 'cargo.toml') techs.add('Rust');
      if (fileName === 'composer.json') techs.add('PHP');
      if (fileName === 'gemfile') techs.add('Ruby');
      if (fileName === 'dockerfile') techs.add('Docker');
      if (fileName === 'docker-compose.yml' || fileName === 'docker-compose.yaml') techs.add('Docker Compose');
      if (path.startsWith('.github/workflows/')) techs.add('GitHub Actions');
      if (fileName.endsWith('.tf')) techs.add('Terraform');
      if (fileName === 'chart.yaml') techs.add('Helm');
      if (fileName === 'tsconfig.json') techs.add('TypeScript');
      if (fileName === 'webpack.config.js') techs.add('Webpack');
      if (fileName === 'vite.config.js' || fileName === 'vite.config.ts') techs.add('Vite');
      if (fileName === 'tailwind.config.js' || fileName === 'tailwind.config.ts') techs.add('Tailwind CSS');
      if (fileName === 'next.config.js' || fileName === 'next.config.mjs') techs.add('Next.js');
      if (fileName === 'nuxt.config.js' || fileName === 'nuxt.config.ts') techs.add('Nuxt.js');
      if (fileName === 'svelte.config.js') techs.add('Svelte');
      if (fileName === 'prisma.schema') techs.add('Prisma');
    }

    return Array.from(techs);
  } catch (error) {
    console.error(`Error detecting tech for ${fullName}:`, error.message);
    return [];
  }
};

/**
 * Sync user repos (fetch from GitHub and update DB).
 */
export const syncUserRepos = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { github: true, githubAccessToken: true },
  });

  if (!user || !user.github) {
    throw new Error('GitHub account not linked');
  }

  const githubUsername = user.github.split('/').pop();
  
  const [ownedRepos, contributedRepos] = await Promise.all([
    fetchOwnedRepos(githubUsername, user.githubAccessToken),
    fetchContributedRepos(githubUsername, user.githubAccessToken),
  ]);

  const allFetchedRepos = [...ownedRepos, ...contributedRepos];

  // Upsert all fetched repos
  for (const repoData of allFetchedRepos) {
    const { defaultBranch, ...repoFields } = repoData;
    
    // Check if repo already exists to preserve `isSelected` and `techStack`
    const existingRepo = await prisma.gitHubRepo.findUnique({
      where: {
        userId_repoName_repoType: {
          userId: userId,
          repoName: repoFields.repoName,
          repoType: repoFields.repoType,
        },
      },
    });

    let techStack = existingRepo?.techStack || [];
    
    // Refresh tech stack if not detected yet or if it's been a while? 
    // For now, let's detect if it's empty, to save API calls.
    if (!existingRepo || existingRepo.techStack.length === 0) {
      techStack = await detectTechnologies(repoFields.fullName, defaultBranch, user.githubAccessToken);
    }

    if (existingRepo) {
      await prisma.gitHubRepo.update({
        where: { id: existingRepo.id },
        data: {
          ...repoFields,
          techStack,
        },
      });
    } else {
      await prisma.gitHubRepo.create({
        data: {
          ...repoFields,
          techStack,
          userId,
        },
      });
    }
  }

  // Delete repos that no longer exist on GitHub or changed visibility
  const fetchedFullNames = allFetchedRepos.map(r => r.fullName);
  await prisma.gitHubRepo.deleteMany({
    where: {
      userId,
      fullName: { notIn: fetchedFullNames },
    },
  });

  return prisma.gitHubRepo.findMany({
    where: { userId },
    orderBy: { stars: 'desc' },
  });
};

/**
 * Update selected repositories for the showcase.
 */
export const updateSelectedRepos = async (userId, selectedRepoIds) => {
  // Validate limits (max 3 owned, max 3 contributed)
  const reposToSelect = await prisma.gitHubRepo.findMany({
    where: {
      id: { in: selectedRepoIds },
      userId,
    },
  });

  const ownedCount = reposToSelect.filter((r) => r.repoType === 'OWNED').length;
  const contributedCount = reposToSelect.filter((r) => r.repoType === 'CONTRIBUTED').length;

  if (ownedCount > 3) throw new Error('Maximum 3 owned repositories allowed');
  if (contributedCount > 3) throw new Error('Maximum 3 contributed repositories allowed');

  // Transaction to update all
  await prisma.$transaction(async (tx) => {
    // Reset all to false
    await tx.gitHubRepo.updateMany({
      where: { userId },
      data: { isSelected: false },
    });

    // Set selected to true
    if (selectedRepoIds.length > 0) {
      await tx.gitHubRepo.updateMany({
        where: { id: { in: selectedRepoIds }, userId },
        data: { isSelected: true },
      });
    }
  });

  return prisma.gitHubRepo.findMany({
    where: { userId, isSelected: true },
  });
};

/**
 * Get showcase repositories for public profile.
 */
export const getShowcaseRepos = async (userId) => {
  return prisma.gitHubRepo.findMany({
    where: { userId, isSelected: true },
    orderBy: { stars: 'desc' },
  });
};
