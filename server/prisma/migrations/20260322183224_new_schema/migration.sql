-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'ALUMNI', 'ADMIN');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'CAMPUS_ONLY', 'STEALTH');

-- CreateEnum
CREATE TYPE "SquadStatus" AS ENUM ('OPEN', 'FULL', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('OPEN', 'FILLED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "StrategyState" AS ENUM ('ACTIVE', 'SHADOW', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "InfluenceLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "college" TEXT,
    "headline" TEXT,
    "bio" TEXT,
    "avatar" TEXT,
    "github" TEXT,
    "linkedin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'Beginner',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "calculatedScore" INTEGER,
    "showLevel" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRole" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "JobRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRoleSkill" (
    "id" TEXT NOT NULL,
    "jobRoleId" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "importance" TEXT NOT NULL DEFAULT 'Required',

    CONSTRAINT "JobRoleSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Squad" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" TEXT NOT NULL,
    "event" VARCHAR(100),
    "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
    "maxMembers" INTEGER NOT NULL DEFAULT 4,
    "currentMembers" INTEGER NOT NULL DEFAULT 1,
    "status" "SquadStatus" NOT NULL DEFAULT 'OPEN',
    "leaderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Squad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SquadSlot" (
    "id" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "roleTitle" VARCHAR(80) NOT NULL,
    "requiredSkill" VARCHAR(60),
    "minScore" INTEGER NOT NULL DEFAULT 0,
    "requireVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "SlotStatus" NOT NULL DEFAULT 'OPEN',
    "filledBy" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SquadSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SquadApplication" (
    "id" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" VARCHAR(200),
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "matchScore" INTEGER,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "SquadApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchStrategy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "state" "StrategyState" NOT NULL DEFAULT 'SHADOW',
    "influenceLevel" "InfluenceLevel" NOT NULL DEFAULT 'MEDIUM',
    "totalDecisions" INTEGER NOT NULL DEFAULT 0,
    "consensusWins" INTEGER NOT NULL DEFAULT 0,
    "soloWins" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "lastPromotedAt" TIMESTAMP(3),
    "lastDemotedAt" TIMESTAMP(3),
    "deprecatedAt" TIMESTAMP(3),

    CONSTRAINT "MatchStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchDecision" (
    "id" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "slotId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selectedUserId" TEXT NOT NULL,
    "alternativesShown" TEXT[],
    "wasConsensus" BOOLEAN NOT NULL DEFAULT false,
    "wasRandom" BOOLEAN NOT NULL DEFAULT false,
    "consensusCount" INTEGER NOT NULL DEFAULT 0,
    "strategyVotes" JSONB NOT NULL,
    "activeStrategies" JSONB NOT NULL,

    CONSTRAINT "MatchDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchOutcome" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "timeToDecision" INTEGER,
    "memberJoinedAt" TIMESTAMP(3),
    "memberLeftAt" TIMESTAMP(3),
    "retention30d" BOOLEAN,
    "retention60d" BOOLEAN,
    "squadCompleted" BOOLEAN,
    "leaderRating" INTEGER,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyPerformance" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "totalVotes" INTEGER NOT NULL DEFAULT 0,
    "acceptedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "acceptanceRate" DOUBLE PRECISION,
    "retention30dRate" DOUBLE PRECISION,
    "rankInWindow" INTEGER,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategyPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyPromotion" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "fromState" "StrategyState" NOT NULL,
    "toState" "StrategyState" NOT NULL,
    "fromInfluence" "InfluenceLevel",
    "toInfluence" "InfluenceLevel",
    "reason" TEXT NOT NULL,
    "metrics" JSONB,
    "triggeredBy" TEXT,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategyPromotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "maxActiveStrategies" INTEGER NOT NULL DEFAULT 5,
    "maxShadowStrategies" INTEGER NOT NULL DEFAULT 3,
    "minRandomnessRate" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "maxRandomnessRate" DOUBLE PRECISION NOT NULL DEFAULT 0.30,
    "minConsensusStrategies" INTEGER NOT NULL DEFAULT 2,
    "influenceDecayDays" INTEGER NOT NULL DEFAULT 30,
    "performanceWindowDays" INTEGER NOT NULL DEFAULT 7,
    "promotionWindowCount" INTEGER NOT NULL DEFAULT 3,
    "demotionWindowCount" INTEGER NOT NULL DEFAULT 3,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_StrategyDecisions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_college_idx" ON "User"("college");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Skill_userId_idx" ON "Skill"("userId");

-- CreateIndex
CREATE INDEX "Skill_name_idx" ON "Skill"("name");

-- CreateIndex
CREATE INDEX "Skill_isVerified_idx" ON "Skill"("isVerified");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_userId_name_key" ON "Skill"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "JobRole_title_key" ON "JobRole"("title");

-- CreateIndex
CREATE INDEX "JobRoleSkill_jobRoleId_idx" ON "JobRoleSkill"("jobRoleId");

-- CreateIndex
CREATE INDEX "Post_userId_idx" ON "Post"("userId");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Like_postId_idx" ON "Like"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "Like_postId_userId_key" ON "Like"("postId", "userId");

-- CreateIndex
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Squad_status_createdAt_idx" ON "Squad"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Squad_leaderId_idx" ON "Squad"("leaderId");

-- CreateIndex
CREATE INDEX "Squad_event_idx" ON "Squad"("event");

-- CreateIndex
CREATE INDEX "SquadSlot_squadId_status_idx" ON "SquadSlot"("squadId", "status");

-- CreateIndex
CREATE INDEX "SquadSlot_requiredSkill_idx" ON "SquadSlot"("requiredSkill");

-- CreateIndex
CREATE INDEX "SquadApplication_userId_status_idx" ON "SquadApplication"("userId", "status");

-- CreateIndex
CREATE INDEX "SquadApplication_squadId_status_idx" ON "SquadApplication"("squadId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SquadApplication_squadId_userId_key" ON "SquadApplication"("squadId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchStrategy_name_key" ON "MatchStrategy"("name");

-- CreateIndex
CREATE INDEX "MatchStrategy_state_idx" ON "MatchStrategy"("state");

-- CreateIndex
CREATE INDEX "MatchDecision_squadId_idx" ON "MatchDecision"("squadId");

-- CreateIndex
CREATE INDEX "MatchDecision_selectedUserId_idx" ON "MatchDecision"("selectedUserId");

-- CreateIndex
CREATE INDEX "MatchDecision_timestamp_idx" ON "MatchDecision"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MatchOutcome_decisionId_key" ON "MatchOutcome"("decisionId");

-- CreateIndex
CREATE INDEX "MatchOutcome_accepted_idx" ON "MatchOutcome"("accepted");

-- CreateIndex
CREATE INDEX "StrategyPerformance_strategyId_windowStart_idx" ON "StrategyPerformance"("strategyId", "windowStart");

-- CreateIndex
CREATE INDEX "StrategyPromotion_strategyId_idx" ON "StrategyPromotion"("strategyId");

-- CreateIndex
CREATE UNIQUE INDEX "_StrategyDecisions_AB_unique" ON "_StrategyDecisions"("A", "B");

-- CreateIndex
CREATE INDEX "_StrategyDecisions_B_index" ON "_StrategyDecisions"("B");

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRoleSkill" ADD CONSTRAINT "JobRoleSkill_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Squad" ADD CONSTRAINT "Squad_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadSlot" ADD CONSTRAINT "SquadSlot_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadApplication" ADD CONSTRAINT "SquadApplication_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadApplication" ADD CONSTRAINT "SquadApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchDecision" ADD CONSTRAINT "MatchDecision_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchDecision" ADD CONSTRAINT "MatchDecision_selectedUserId_fkey" FOREIGN KEY ("selectedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchOutcome" ADD CONSTRAINT "MatchOutcome_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "MatchDecision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyPerformance" ADD CONSTRAINT "StrategyPerformance_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "MatchStrategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyPromotion" ADD CONSTRAINT "StrategyPromotion_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "MatchStrategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StrategyDecisions" ADD CONSTRAINT "_StrategyDecisions_A_fkey" FOREIGN KEY ("A") REFERENCES "MatchDecision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StrategyDecisions" ADD CONSTRAINT "_StrategyDecisions_B_fkey" FOREIGN KEY ("B") REFERENCES "MatchStrategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
