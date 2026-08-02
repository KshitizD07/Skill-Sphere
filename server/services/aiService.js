import { GoogleGenerativeAI } from '@google/generative-ai';
import { ApiError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

let genAI = null;

// Lazy-init client — avoids crashing at startup when key is missing
function getClient() {
  if (!genAI) {
    if (!process.env.GOOGLE_API_KEY) throw ApiError.internal('AI service not configured (missing GOOGLE_API_KEY)');
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  }
  return genAI;
}

export async function generateRoadmap({ skill, role, currentScore, existingSkills = [] }) {
  if (!skill?.trim() || !role?.trim()) throw ApiError.badRequest('Skill and role are required');

  const model = getClient().getGenerativeModel({ model: 'gemini-2.5-flash' });

  // 1. Establish progression based on score
  let proficiencyInstruction;
  if (currentScore === 0) {
    proficiencyInstruction = `(SCORE: 0/10) The user is an absolute beginner. Start from the absolute foundational basics of ${skill}.`;
  } else if (currentScore <= 4) {
    proficiencyInstruction = `(SCORE: ${currentScore}/10) The user is a beginner. Cover core structural deficiencies and solidify fundamental syntax and principles.`;
  } else if (currentScore <= 7) {
    proficiencyInstruction = `(SCORE: ${currentScore}/10) The user is Intermediate. 
CRITICAL PROGRESSION STANDARDS:
- Since their score is ${currentScore}/10, they ALREADY know the foundations (basic syntax, core structures, simple debugging). DO NOT cover these.
- List the foundational topics they bypassed under a "✅ Bypassed Foundational Skills" section.
- Start the roadmap directly at intermediate concepts (design patterns, API integrations, testing frameworks).`;
  } else {
    proficiencyInstruction = `(SCORE: ${currentScore}/10) The user is Advanced.
CRITICAL PROGRESSION STANDARDS:
- Since their score is ${currentScore}/10, they ALREADY know all core implementation details. DO NOT cover basic or intermediate concepts.
- List the intermediate/foundational topics they bypassed under a "✅ Bypassed Foundational & Intermediate Skills" section.
- Focus entirely on system scaling, security auditing, and high-performance execution.`;
  }

  const contextSkills = existingSkills.filter(s => s.name.toLowerCase() !== skill.toLowerCase());
  let contextInstruction = '';
  if (contextSkills.length > 0) {
    const skillList = contextSkills.map(s => `${s.name} (Score: ${s.calculatedScore || 0}/10)`).join(', ');
    contextInstruction = `\n\nCONTEXT - THE USER ALREADY KNOWS:\nThe user has verified experience with: ${skillList}. \nCRITICAL: Leverage this existing knowledge! Use analogies to their existing skills (e.g., if they know React, relate target concepts to React paradigms where applicable). Fast-track the roadmap by skipping basics they already possess.`;
  }

  const prompt = `You are a senior technical mentor. Create a learning roadmap for the skill "${skill}" tailored specifically for the target role "${role}".

The user's current verified score for ${skill} is ${currentScore}/10.

CRITICAL PERSONALIZATION:
${proficiencyInstruction}${contextInstruction}

ROLE-CONTEXTUALIZATION:
- Make all learning milestones and exercises explicitly relevant to a "${role}".
- Do not teach generic "${skill}". Teach how a "${role}" uses "${skill}" in production environments. (e.g. if Backend Engineer, focus on database connections and API design using "${skill}").

Format your response as markdown with these exact sections:

# ${skill} Mastery Roadmap for ${role}

## Overview
One paragraph: what this roadmap covers and expected timeline.

## ✅ Bypassed Foundational Skills (Only if Score >= 5)
List 3-5 basic topics they already know based on their score.

## Week 1–2: [Your Title Here]
Bullet list of 4-6 specific topics/tasks to start with.

## Week 3–4: [Your Title Here]
Bullet list of 4-6 concepts to tackle.

## Week 5–8: Applied Practice
Bullet list of 4-6 projects or exercises to cement understanding, specifically tailored to the "${role}".

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

export async function generateRoleRequirements(roleTitle) {
  if (!roleTitle?.trim()) throw ApiError.badRequest('Role title is required');
  
  const model = getClient().getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  const prompt = `You are an expert technical recruiter and engineering manager.
Define the standard industry requirements for the role of "${roleTitle}".

Respond ONLY with a valid JSON in exactly this format, with no markdown wrapping and no extra text.
Do not use markdown code blocks like \`\`\`json. Just output the raw JSON object.

{
  "title": "${roleTitle}",
  "description": "A 1-2 sentence description of this role.",
  "skills": [
    { "name": "Skill Name (e.g., Python)", "importance": "Required" },
    { "name": "Another Skill", "importance": "Required" },
    { "name": "Optional Skill", "importance": "Nice to have" }
  ]
}

Provide 5-8 highly relevant skills. Ensure 'importance' is exactly "Required" or "Nice to have".`;

  try {
    const result = await model.generateContent(prompt);
    let aiText = result.response.text().trim();
    if (aiText.startsWith('```json')) aiText = aiText.slice(7, -3).trim();
    if (aiText.startsWith('```')) aiText = aiText.slice(3, -3).trim();
    
    return JSON.parse(aiText);
  } catch (err) {
    logger.error('Gemini role generation error', { err: err.message });
    throw ApiError.internal('AI role generation failed.');
  }
}

export async function generateDiagnosticReport({ role, currentScore, missingSkills, verifiedSkills }) {
  const model = getClient().getGenerativeModel({ model: 'gemini-2.5-flash' });

  const verifiedList = verifiedSkills.length > 0 ? verifiedSkills.map(s => `${s.name} (${s.calculatedScore}/10)`).join(', ') : 'None';
  const missingList = missingSkills.length > 0 ? missingSkills.map(s => s.name).join(', ') : 'None';

  const prompt = `Act as a technical career advisor. Write a short, encouraging 3-bullet diagnostic report for a user targeting the "${role}" role.
Their competency match score is ${currentScore}%.
Verified Skills (1-10): ${verifiedList}
Missing Core Skills: ${missingList}

Output format (Markdown):
- **Strengths:** [Highlight what they do well based on verified skills]
- **Vulnerability:** [Highlight the critical gap from missing skills]
- **Immediate Action:** [Give exactly 1 concrete next step, e.g. "We recommend verifying a repository with X"]

Keep it under 80 words total.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    logger.error('Gemini diagnostic report error', { err: err.message });
    return '- **Strengths:** Your profile is building up.\n- **Vulnerability:** You are missing some core skills.\n- **Immediate Action:** Start verifying your missing skills.';
  }
}