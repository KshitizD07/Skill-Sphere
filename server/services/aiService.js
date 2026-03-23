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

async function generateRoadmap({ skill, role }) {
  if (!skill?.trim() || !role?.trim()) throw ApiError.badRequest('Skill and role are required');

  const model = getClient().getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

  const prompt = `You are a senior technical mentor. Create a focused, actionable learning roadmap.

Target skill: ${skill}
Target role: ${role}

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