// server/services/userService.js
const BaseService = require('./BaseService');

class UserService extends BaseService {
  async getUserProfile(userId) {
    try {
      // Get user data
      const userData = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          role: true,
          email: true,
          headline: true,
          bio: true,
          avatar: true,
          github: true,
          linkedin: true,
          college: true,
          createdAt: true
        }
      });

      if (!userData) {
        throw new Error('User not found');
      }

      // Get user's skills
      const skills = await prisma.skill.findMany({
        where: { userId },
        orderBy: [
          { isVerified: 'desc' },
          { calculatedScore: 'desc' },
          { name: 'asc' }
        ]
      });

      // Format skills for frontend
      const formattedSkills = skills.map(skill => ({
        id: skill.id,
        skillId: skill.id,
        skill: {
          id: skill.id,
          name: skill.name
        },
        level: skill.level,
        isVerified: skill.isVerified,
        verificationUrl: skill.verificationUrl,
        calculatedScore: skill.calculatedScore,
        showLevel: skill.showLevel
      }));

      // Return user profile with skills
      return {...userData, skills: formattedSkills };
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(userId, updates) {
    try {
      // Update user data
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updates
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId,
          action: 'PROFILE_UPDATED',
          details: 'Updated profile information'
        }
      });

      return updatedUser;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  async getUserActivity(userId, pagination) {
    try {
      // Get activity logs
      const activityLogs = await prisma.activityLog.findMany({
        where: { userId },
        take: pagination.limit,
        skip: (pagination.page - 1) * pagination.limit
      });

      return activityLogs;
    } catch (error) {
      console.error('Error getting user activity:', error);
      throw error;
    }
  }
}
