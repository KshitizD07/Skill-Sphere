# Gemini Quota Exhaustion & Hybrid Provider Solution

## Issue Summary

During testing of the **Skill‑Sphere** application the endpoint `POST /api/ai/generate-roadmap` started failing with the following log entries:

```
06:20:58 error: Gemini error {"service":"skillsphere-api","err":"[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: [429 ] You exceeded your current quota, please check your plan and billing details..."}
06:20:58 error: Request error AI generation failed — try again shortly {"service":"skillsphere-api","method":"POST","path":"/api/ai/generate-roadmap","status":500,"code":"INTERNAL_ERROR"}
```

The Gemini free‑tier imposes **only 20 `generate_content` requests per day** for the `gemini‑2.5‑flash` model. Once this limit is reached the API returns **HTTP 429** (Too Many Requests) with a retry‑after hint. The backend simply propagates the error, resulting in a generic *"generation failed – try again later"* message on the UI.

### Why it matters
- **Testing**: Even a handful of manual tests can consume the entire quota.
- **Multiple testers**: Every developer or QA engineer hitting the endpoint will see the same error.
- **Production impact**: If the roadmap feature is the only Gemini‑powered call, the rest of the app (chat, summarisation, etc.) would still work, but the roadmap becomes unusable.

## Proposed Solution: Hybrid Provider for Roadmap Generation

Instead of using Gemini for **all** AI calls, we keep Gemini for the existing features (chat, summarisation, etc.) and switch **only** the roadmap generation to a different LLM that offers a much larger free quota (e.g., OpenAI GPT‑3.5‑Turbo, Claude, Cohere, or HuggingFace inference). This isolates the limited Gemini quota to the parts of the app that truly need it, while giving the roadmap endpoint a practically unlimited daily capacity.

### Architectural Overview
```
+----------------------+      +--------------------------+
|  Front‑end (React)   | --> |  /api/ai/generate-roadmap|  <--+---+ 
+----------------------+      +--------------------------+      |
                                                            |
                                                            v
+----------------------------+   +--------------------------+
|   Roadmap dispatcher       |   |   Gemini dispatcher      |
| (selects provider)        |   | (all other /ai routes)   |
+----------------------------+   +--------------------------+
        |   ^                               |
        |   |                               |
        v   |                               v
+-------------------+      +--------------------------+
| OpenAI client     |      | Gemini client (default)  |
+-------------------+      +--------------------------+
```

1. **Dispatcher** – a thin wrapper around the existing route that decides which provider to call.
2. **OpenAI client** – handles the actual request to `gpt‑3.5‑turbo` (or another chosen model).
3. **Gemini client** – remains untouched for every other API endpoint.
4. **Fallback** – optional logic to fall back to Gemini if the secondary provider also hits a quota.

### Concrete Steps
1. **Add a second LLM client** (e.g., `src/ai/openaiClient.js`).
2. **Update the roadmap route** (`src/routes/ai.js`) to call the new client.
3. **Expose environment variables**:
   ```
   GEMINI_API_KEY=your-gemini-key
   OPENAI_API_KEY=your-openai-free-key   # free tier, no cost up to ~500 generations/month
   ```
4. **Normalize the response** so the front‑end sees the same JSON shape regardless of provider.
5. (Optional) **Implement fallback** – if OpenAI returns a 429, retry with Gemini or a deterministic mock.
6. **Cache identical prompts** (hash‑based) to further reduce consumption.

### Benefits
| Benefit | Explanation |
|--------|-------------|
| **Quota isolation** | Only the roadmap endpoint uses the larger‑quota provider, preserving Gemini’s 20‑call limit for the rest of the app. |
| **No UI changes** | The front‑end still calls the same endpoint and receives the same JSON format. |
| **Scalable dev testing** | Free‑tier OpenAI gives ~~500‑800 roadmap generations/month, far exceeding daily needs. |
| **Graceful degradation** | If both providers exhaust, a mock generator can still return a placeholder roadmap. |
| **Future‑proof** | When you obtain a paid Gemini key, you can simply switch the dispatcher back to Gemini without touching other code. |

### Potential Pitfalls & Mitigations
- **Response format differences** – normalize in `generateRoadmapOpenAI` before returning.
- **Token‑based limits** – OpenAI’s free tier is token‑based; a typical roadmap (≈ 1 KB) costs ~30 tokens, so you get **hundreds** of generations per month.
- **Rate‑limit handling** – catch `429` from the secondary provider and fallback to Gemini or a mock.
- **Secret management** – keep both keys in environment variables, never commit them.
- **Testing** – mock both clients in unit tests to avoid spending quota.

## Quick Implementation Sketch (Node/Express)
```js
// src/ai/openaiClient.js
import { Configuration, OpenAIApi } from "openai";
const cfg = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(cfg);
export async function generateRoadmapOpenAI(prompt) {
  const resp = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });
  const content = resp.data.choices[0].message.content;
  return { roadmap: content };
}
```
```js
// src/routes/ai.js (excerpt)
router.post("/generate-roadmap", async (req, res) => {
  const { prompt } = req.body;
  try {
    const result = await generateRoadmapOpenAI(prompt); // primary provider
    res.json({ success: true, data: result });
  } catch (e) {
    // optional fallback to Gemini
    if (e.response?.status === 429) {
      const gemRes = await generateRoadmapGemini(prompt);
      return res.json({ success: true, data: gemRes });
    }
    console.error(e);
    res.status(500).json({ success: false, error: "Roadmap generation failed – try again later." });
  }
});
```

## Summary
- The **root cause** is Gemini’s 20‑request free‑tier quota. 
- By **routing only the roadmap generation** to a higher‑quota LLM (OpenAI, Claude, etc.) we eliminate the daily bottleneck while keeping Gemini for the rest of the system. 
- The solution involves a tiny dispatcher wrapper, a new client module, environment configuration, and optional fallback/caching. 
- This approach is low‑impact, cost‑free for development, and easily reversible once a paid Gemini key is available.

---

*Document created on 2026‑08‑11 for the Skill‑Sphere codebase.*
