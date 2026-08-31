// ── Unified Canonical Skill Name Normalizer ─────────────────────────────────

export const CANONICAL_SKILL_MAP = {
  // Databases
  postgresql: 'PostgreSQL',
  postgres: 'PostgreSQL',
  postgre: 'PostgreSQL',
  psql: 'PostgreSQL',
  pg: 'PostgreSQL',
  mongodb: 'MongoDB',
  mongo: 'MongoDB',
  mysql: 'MySQL',
  sqlite: 'SQLite',
  redis: 'Redis',
  prisma: 'Prisma',
  dynamodb: 'DynamoDB',
  cassandra: 'Cassandra',

  // Languages
  javascript: 'JavaScript',
  js: 'JavaScript',
  ecmascript: 'JavaScript',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  python: 'Python',
  py: 'Python',
  python3: 'Python',
  java: 'Java',
  go: 'Go',
  golang: 'Go',
  rust: 'Rust',
  rs: 'Rust',
  cpp: 'C++',
  'c++': 'C++',
  c: 'C',
  ruby: 'Ruby',
  rb: 'Ruby',
  swift: 'Swift',
  kotlin: 'Kotlin',
  kt: 'Kotlin',
  csharp: 'C#',
  'c#': 'C#',
  php: 'PHP',
  sql: 'SQL',

  // Frontend & Backend Frameworks
  react: 'React',
  reactjs: 'React',
  'react.js': 'React',
  nextjs: 'Next.js',
  next: 'Next.js',
  'next.js': 'Next.js',
  vue: 'Vue.js',
  vuejs: 'Vue.js',
  'vue.js': 'Vue.js',
  angular: 'Angular',
  angularjs: 'Angular',
  svelte: 'Svelte',
  express: 'Express',
  expressjs: 'Express',
  'express.js': 'Express',
  nestjs: 'Nest.js',
  'nest.js': 'Nest.js',
  django: 'Django',
  flask: 'Flask',
  fastapi: 'FastAPI',
  spring: 'Spring Boot',
  springboot: 'Spring Boot',
  'spring boot': 'Spring Boot',

  // DevOps & Cloud
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  k8s: 'Kubernetes',
  aws: 'AWS',
  'amazon web services': 'AWS',
  gcp: 'GCP',
  'google cloud': 'GCP',
  azure: 'Azure',
  git: 'Git',
  github: 'GitHub',
  graphql: 'GraphQL',
  gql: 'GraphQL',
  tailwind: 'Tailwind CSS',
  tailwindcss: 'Tailwind CSS',
  'tailwind css': 'Tailwind CSS',
  html: 'HTML5',
  html5: 'HTML5',
  css: 'CSS3',
  css3: 'CSS3',

  // Core CS Concepts & Algorithmic
  dsa: 'Data Structures & Algorithms',
  'data structures': 'Data Structures & Algorithms',
  algorithms: 'Data Structures & Algorithms',
  'data structures and algorithms': 'Data Structures & Algorithms',
  'system design': 'System Design',
  'rest apis': 'REST APIs',
  'rest api': 'REST APIs',
  rest: 'REST APIs',
};

/**
 * Normalizes any skill alias or typo to its canonical standard title.
 */
export function normalizeSkillCanonical(name) {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (CANONICAL_SKILL_MAP[lower]) {
    return CANONICAL_SKILL_MAP[lower];
  }
  return trimmed;
}

export default normalizeSkillCanonical;
