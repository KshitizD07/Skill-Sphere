const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ApiError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

let genAI = null;

function getClient() {
  if (!genAI) {
    if (!process.env.GOOGLE_API_KEY) throw ApiError.internal('AI service not configured (missing GOOGLE_API_KEY)');
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  }
  return genAI;
}

async function generateRoadmap({ skill, role, currentScore }) {
  if (!skill?.trim() || !role?.trim()) throw ApiError.badRequest('Skill and role are required');

  const model = getClient().getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

  let proficiencyInstruction = "";
  if (currentScore === 0) {
    proficiencyInstruction = "(SCORE: 0/10) The user is an absolute beginner who just started an empty repository. Start from the absolute foundational basics of this technology.";
  } else if (currentScore <= 4) {
    proficiencyInstruction = `(SCORE: ${currentScore}/10) The user is a beginner. Cover core structural deficiencies and solidify fundamental syntax and principles.`;
  } else if (currentScore <= 7) {
    proficiencyInstruction = `(SCORE: ${currentScore}/10) The user is intermediate. Pivot heavily into advanced systemic integrations, common design patterns, and testing.`;
  } else {
    proficiencyInstruction = `(SCORE: ${currentScore}/10) The user is advanced. Focus implicitly on system scaling, security, architecture optimization, and high-performance paradigms.`;
  }

  const prompt = `You are a senior technical mentor. Create a focused, actionable learning roadmap tailored to the user's explicit skill level.

Target skill: ${skill}
Target role: ${role}

CRITICAL PERSONALIZATION: 
${proficiencyInstruction}
Tailor ALL output content exclusively picking up from their specified proficiency!

Format your response as markdown with these exact sections:

# ${skill} Mastery Roadmap for ${role}

## Overview
One paragraph: what this roadmap covers and expected timeline.

## Week 1–2: Foundations
Bullet list of 4-6 specific topics/tasks to start with.

## Week 3–4: Core Skills  
Bullet list of 4-6 intermediate concepts to tackle.

## Week 5–8: Applied Practice
Bullet list of 4-6 projects or exercises to cement understanding.

## Key Resources
3-5 specific courses, docs, or tools (with URLs where possible).

## Milestone Check
How the learner knows they're ready for the ${role} role.

Keep it practical, specific, and encouraging. No filler — every bullet should be actionable.`;

  try {
    const result = await model.generateContent(prompt);
    const text   = result.response.text();

    if (!text?.trim()) throw ApiError.internal('AI returned empty response');

    logger.info('Roadmap generated', { skill, role, chars: text.length });
    return { roadmap: text };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error('Gemini error', { err: err.message });
    throw ApiError.internal('AI generation failed — try again shortly');
  }
}

module.exports = { generateRoadmap };