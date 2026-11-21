import express, { Request, Response } from 'express';
import { GoogleGenAI, Type, ThinkingLevel, Modality } from '@google/genai';

export const geminiApiRouter = express.Router();

// Primary Gemini 3 models
const DEFAULT_FLASH_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
const FALLBACK_MODELS = ['gemini-3-flash-preview', 'gemini-3.1-pro-preview', 'gemini-2.5-flash'];
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured on the server. Please set a valid GEMINI_API_KEY in your .env file or environment variables.'
    );
  }
  return new GoogleGenAI({ apiKey });
}

const SYSTEM_INSTRUCTION = `You are the "FACHE Exam Architect," an elite AI tutor designed to prepare the user for the American College of Healthcare Executives (ACHE) Board of Governors Exam. Your tone is professional, strategic, and concise.

The user already possesses a strong clinical foundation, active hospital operational experience, and a graduate-level business administration background. Do not waste time teaching basic medical terminology, standard nursing scope of practice, or entry-level management concepts. Focus entirely on executive-level application, complex financial controls, governance theory, labor relations, and enterprise-wide strategic planning.

Formatting Rules for Mobile UX:
* Keep responses scannable. Use bolding for key terms.
* Never output a wall of text. Use short paragraphs and bulleted lists.
* Always end your response by prompting the user for their next action.`;

export interface ChatMessage {
  role: string;
  text: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

function formatHistory(history: ChatMessage[] = [], newMessage: string = '') {
  const contents = (Array.isArray(history) ? history : [])
    .filter((msg) => msg && typeof msg.text === 'string' && msg.text.trim().length > 0)
    .map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

  if (contents.length > 0 && contents[0].role === 'model') {
    contents.unshift({ role: 'user', parts: [{ text: 'Start session.' }] });
  }

  if (newMessage) {
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts[0].text += '\n\n' + newMessage;
    } else {
      contents.push({ role: 'user', parts: [{ text: newMessage }] });
    }
  }

  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: 'Start session.' }] });
  }

  return contents;
}

function resolveThinkingLevel(level?: string): ThinkingLevel | undefined {
  if (!level) return undefined;
  switch (level.toUpperCase()) {
    case 'MINIMAL':
      return ThinkingLevel.MINIMAL;
    case 'LOW':
      return ThinkingLevel.LOW;
    case 'MEDIUM':
      return ThinkingLevel.MEDIUM;
    case 'HIGH':
      return ThinkingLevel.HIGH;
    default:
      return undefined;
  }
}

function getModeSystemInstruction(
  mode: 'diagnostic' | 'simulator' | 'flashcards' | 'deepdive',
  domainFocus?: string
): string {
  const domainNote = domainFocus
    ? `\n* Priority Focus Domain: Focus specifically on "${domainFocus}" within the ACHE Board of Governors Exam blueprint.`
    : '';

  if (mode === 'diagnostic') {
    return (
      SYSTEM_INSTRUCTION +
      `\n\nMODE 1: The Diagnostic Assessment (The 1-5 Scale)
* Action: Administer a rapid-fire assessment based on the ACHE Healthcare Executive Competencies Assessment Tool. Ask scenario-based multiple-choice questions across the 10 exam domains: Healthcare (15%), Management and Leadership (13%), Finance (12%), Human Resources (12%), Laws and Regulations (9%), Quality and Performance Improvement (9%), Business (8%), Healthcare Technology and Information Management (8%), Professionalism and Ethics (8%), Governance and Organizational Structure (6%).${domainNote}
* Output: Ask one question at a time with 4 distinct multiple-choice options formatted on separate lines as "A. ...", "B. ...", "C. ...", and "D. ...". When the user answers, provide a brief executive evaluation and immediately present the next question. After a set, provide a score from 1 (Novice) to 5 (Expert) for that domain and pinpoint exact sub-topics for review.`
    );
  }

  if (mode === 'simulator') {
    return (
      SYSTEM_INSTRUCTION +
      `\n\nMODE 2: Weighted Scenario Simulator (The 200-Question Blueprint)
* Action: Generate highly realistic, multiple-choice BOG exam questions. Distribute the focus strictly according to the official ACHE Board of Governors Exam outline (Healthcare 15%, Management/Leadership 13%, Finance 12%, HR 12%, Laws/Regs 9%, Quality/PI 9%, Business 8%, IT 8%, Professionalism/Ethics 8%, Governance 6%).${domainNote}
* Output: Present the scenario with 4 distinct multiple-choice options formatted on separate lines as "A. ...", "B. ...", "C. ...", and "D. ...", wait for the user's answer, and then provide a detailed rationale explaining why the correct answer is right and the distractors are wrong (referencing specific ACHE governance, financial, regulatory, or operational concepts), followed by the next scenario question.`
    );
  }

  if (mode === 'flashcards') {
    return (
      SYSTEM_INSTRUCTION +
      `\n\nMODE 3: Rapid-Fire Flashcards
* Action: Emulate the official ACHE 415-card flashcard set. Provide a highly specific executive healthcare term, regulatory statute, financial formula, or governance concept.${domainNote}
* Output: You MUST output valid JSON containing the term, the exam domain name, 4 multiple choice options for its definition, the index of the correct option (0-3), and a brief executive explanation. Ignore the user's previous answer correctness, just provide a NEW flashcard every time avoid repeating previous terms in the conversation.`
    );
  }

  return (
    SYSTEM_INSTRUCTION +
    `\n\nMODE 4: The Deep Dive (Study Set Integration)
* Action: Draw upon the principles found in the official ACHE Study Set (Financial Management of Health Care Organizations, The Well-Managed Healthcare Organization, Strategic Management of Human Resources in Health Services Organizations, Information Technology for the Health Professions, and Law of Health Care Organization and Management).${domainNote}
* Output: Provide a structured, mobile-friendly summary using bullet points, real-world hospital operational examples, regulatory/compliance checkpoints, and clear formulas (if finance-related). DO NOT ask the user what they want to do next or if they want a case study. Just provide the information and stop.`
  );
}

function extractGroundingSources(response: any): GroundingSource[] {
  const sources: GroundingSource[] = [];
  const seen = new Set<string>();
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (Array.isArray(chunks)) {
    for (const chunk of chunks) {
      const uri = chunk?.web?.uri;
      const title = chunk?.web?.title || uri;
      if (uri && !seen.has(uri)) {
        seen.add(uri);
        sources.push({ title, uri });
      }
    }
  }
  return sources;
}

async function generateWithFallback(
  ai: GoogleGenAI,
  params: {
    model?: string;
    contents: any;
    config?: any;
  }
) {
  const modelsToTry = params.model
    ? [params.model, ...FALLBACK_MODELS.filter((m) => m !== params.model)]
    : FALLBACK_MODELS;

  let lastError: any = null;
  for (const modelName of modelsToTry) {
    try {
      const config = { ...params.config };
      // Only Gemini 3 models support ThinkingLevel enum directly; strip thinkingLevel if falling back to 2.5
      if (!modelName.startsWith('gemini-3') && config?.thinkingConfig?.thinkingLevel) {
        const { thinkingLevel, ...restThinking } = config.thinkingConfig;
        config.thinkingConfig = Object.keys(restThinking).length > 0 ? restThinking : undefined;
      }
      return await ai.models.generateContent({
        model: modelName,
        contents: params.contents,
        config
      });
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code;
      // Retry on 404 (model not found in region/tier) or 503/429
      if (status === 404 || status === 503 || String(err?.message || '').includes('not found')) {
        continue;
      }
      break;
    }
  }
  throw lastError;
}

// Health check
geminiApiRouter.get('/health', (_req: Request, res: Response) => {
  const configured = Boolean(
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
  );
  res.json({
    status: 'ok',
    configured,
    defaultModel: DEFAULT_FLASH_MODEL
  });
});

// MODE 1: Diagnostic Question
geminiApiRouter.post('/diagnostic', async (req: Request, res: Response) => {
  try {
    const ai = getAiClient();
    const { history = [], thinkingLevel, domainFocus } = req.body || {};
    const resolvedThinking = resolveThinkingLevel(thinkingLevel);

    const response = await generateWithFallback(ai, {
      model: DEFAULT_FLASH_MODEL,
      contents: formatHistory(history, 'Please provide the next question or evaluation.'),
      config: {
        systemInstruction: getModeSystemInstruction('diagnostic', domainFocus),
        ...(resolvedThinking ? { thinkingConfig: { thinkingLevel: resolvedThinking } } : {})
      }
    });

    res.json({ text: response.text || '' });
  } catch (error: any) {
    console.error('Error in /api/gemini/diagnostic:', error);
    res.status(error?.status || 500).json({
      error: error?.message || 'Failed to generate diagnostic question.'
    });
  }
});

// MODE 2: Simulator Question
geminiApiRouter.post('/simulator', async (req: Request, res: Response) => {
  try {
    const ai = getAiClient();
    const { history = [], thinkingLevel, domainFocus } = req.body || {};
    const resolvedThinking = resolveThinkingLevel(thinkingLevel);

    const response = await generateWithFallback(ai, {
      model: DEFAULT_FLASH_MODEL,
      contents: formatHistory(history, 'Please provide the next question or evaluation.'),
      config: {
        systemInstruction: getModeSystemInstruction('simulator', domainFocus),
        ...(resolvedThinking ? { thinkingConfig: { thinkingLevel: resolvedThinking } } : {})
      }
    });

    res.json({ text: response.text || '' });
  } catch (error: any) {
    console.error('Error in /api/gemini/simulator:', error);
    res.status(error?.status || 500).json({
      error: error?.message || 'Failed to generate simulator question.'
    });
  }
});

// MODE 3: Rapid-Fire Flashcard (Structured JSON)
geminiApiRouter.post('/flashcard', async (req: Request, res: Response) => {
  try {
    const ai = getAiClient();
    const { history = [], domainFocus } = req.body || {};
    const promptMsg = domainFocus
      ? `Please provide the next flashcard specifically focused on the "${domainFocus}" exam domain.`
      : 'Please provide the next flashcard.';

    const response = await generateWithFallback(ai, {
      model: DEFAULT_FLASH_MODEL,
      contents: formatHistory(history, promptMsg),
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING, description: 'The term or concept to define' },
            domain: {
              type: Type.STRING,
              description: 'The ACHE exam domain this concept belongs to (e.g. Finance, Governance, Healthcare)'
            },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '4 multiple choice options for the definition'
            },
            correctOptionIndex: {
              type: Type.INTEGER,
              description: 'The index (0-3) of the correct option'
            },
            explanation: {
              type: Type.STRING,
              description: 'Brief executive-level explanation of the correct answer and why distractors fail'
            }
          },
          required: ['term', 'options', 'correctOptionIndex', 'explanation']
        },
        systemInstruction: getModeSystemInstruction('flashcards', domainFocus),
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });

    res.json({ text: response.text || '{}' });
  } catch (error: any) {
    console.error('Error in /api/gemini/flashcard:', error);
    res.status(error?.status || 500).json({
      error: error?.message || 'Failed to generate flashcard.'
    });
  }
});

// Assessment Evaluation (Structured JSON)
geminiApiRouter.post('/evaluate', async (req: Request, res: Response) => {
  try {
    const ai = getAiClient();
    const { history = [] } = req.body || {};

    const response = await generateWithFallback(ai, {
      model: DEFAULT_FLASH_MODEL,
      contents: formatHistory(
        history,
        'The user has completed the assessment. Please evaluate their performance based on the chat history. Provide an overall score out of 5, and a score out of 5 for each of the 10 domains (Healthcare, Management and Leadership, Finance, Human Resources, Laws and Regulations, Quality and Performance Improvement, Business, Healthcare Technology, Professionalism and Ethics, Governance). Also provide a brief summary of their strengths and weaknesses.'
      ),
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER, description: 'Overall score from 1 to 5' },
            domainScores: {
              type: Type.OBJECT,
              properties: {
                Healthcare: { type: Type.NUMBER },
                ManagementAndLeadership: { type: Type.NUMBER },
                Finance: { type: Type.NUMBER },
                HumanResources: { type: Type.NUMBER },
                LawsAndRegulations: { type: Type.NUMBER },
                QualityAndPerformance: { type: Type.NUMBER },
                Business: { type: Type.NUMBER },
                HealthcareTechnology: { type: Type.NUMBER },
                ProfessionalismAndEthics: { type: Type.NUMBER },
                Governance: { type: Type.NUMBER }
              },
              required: [
                'Healthcare',
                'ManagementAndLeadership',
                'Finance',
                'HumanResources',
                'LawsAndRegulations',
                'QualityAndPerformance',
                'Business',
                'HealthcareTechnology',
                'ProfessionalismAndEthics',
                'Governance'
              ]
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of 2-3 specific executive strengths demonstrated'
            },
            weaknesses: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of 2-3 specific areas for remediation'
            }
          },
          required: ['overallScore', 'domainScores', 'strengths', 'weaknesses']
        },
        systemInstruction:
          "You are evaluating a user's performance on a diagnostic assessment for the ACHE Board of Governors Exam. Analyze their answers and provide accurate scores from 1 to 5 across all 10 domains.",
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM }
      }
    });

    res.json({ text: response.text || '{}' });
  } catch (error: any) {
    console.error('Error in /api/gemini/evaluate:', error);
    res.status(error?.status || 500).json({
      error: error?.message || 'Failed to evaluate assessment.'
    });
  }
});

// MODE 4: Deep Dive Content with Google Search Grounding
geminiApiRouter.post('/deep-dive', async (req: Request, res: Response) => {
  try {
    const ai = getAiClient();
    const { query = '', history = [], thinkingLevel, domainFocus } = req.body || {};
    const resolvedThinking = resolveThinkingLevel(thinkingLevel);

    const response = await generateWithFallback(ai, {
      model: DEFAULT_FLASH_MODEL,
      contents: formatHistory(history, query),
      config: {
        systemInstruction: getModeSystemInstruction('deepdive', domainFocus),
        tools: [{ googleSearch: {} }],
        ...(resolvedThinking ? { thinkingConfig: { thinkingLevel: resolvedThinking } } : {})
      }
    });

    const sources = extractGroundingSources(response);
    res.json({
      text: response.text || '',
      sources
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/deep-dive:', error);
    res.status(error?.status || 500).json({
      error: error?.message || 'Failed to generate deep dive content.'
    });
  }
});

// Unified Streaming Endpoint (SSE) for Diagnostic, Simulator, and Deep Dive
geminiApiRouter.post('/stream', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const ai = getAiClient();
    const {
      mode = 'diagnostic',
      history = [],
      query,
      thinkingLevel,
      domainFocus
    } = req.body || {};

    const resolvedThinking = resolveThinkingLevel(thinkingLevel);
    const promptMessage =
      mode === 'deepdive'
        ? query || 'Please provide a comprehensive deep dive.'
        : 'Please provide the next question or evaluation.';

    const config: any = {
      systemInstruction: getModeSystemInstruction(mode, domainFocus),
      ...(resolvedThinking ? { thinkingConfig: { thinkingLevel: resolvedThinking } } : {})
    };

    if (mode === 'deepdive') {
      config.tools = [{ googleSearch: {} }];
    }

    const stream = await ai.models.generateContentStream({
      model: DEFAULT_FLASH_MODEL,
      contents: formatHistory(history, promptMessage),
      config
    });

    let fullText = '';
    let latestSources: GroundingSource[] = [];

    for await (const chunk of stream) {
      const chunkText = chunk.text || '';
      if (chunkText) {
        fullText += chunkText;
        res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
      }
      const chunkSources = extractGroundingSources(chunk);
      if (chunkSources.length > 0) {
        latestSources = chunkSources;
      }
    }

    res.write(
      `data: ${JSON.stringify({
        done: true,
        fullText,
        sources: latestSources
      })}\n\n`
    );
    res.end();
  } catch (error: any) {
    console.error('Error in /api/gemini/stream:', error);
    res.write(
      `data: ${JSON.stringify({
        error: error?.message || 'Streaming generation failed.'
      })}\n\n`
    );
    res.end();
  }
});

// Server-side Text-to-Speech (TTS) audio generation
geminiApiRouter.post('/tts', async (req: Request, res: Response) => {
  try {
    const ai = getAiClient();
    const { text = '', voiceName = 'Kore' } = req.body || {};
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text is required for speech synthesis.' });
      return;
    }

    // Truncate overly long text for rapid TTS synthesis
    const cleanText = text.replace(/[#*_`~>-]/g, ' ').slice(0, 1800);

    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ role: 'user', parts: [{ text: `Read this healthcare executive study material clearly: ${cleanText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName
            }
          }
        }
      }
    });

    const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData?.data) {
      res.status(500).json({ error: 'No audio data returned from model.' });
      return;
    }

    res.json({
      audioBase64: inlineData.data,
      mimeType: inlineData.mimeType || 'audio/L16;rate=24000'
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/tts:', error);
    res.status(error?.status || 500).json({
      error: error?.message || 'Failed to synthesize speech.'
    });
  }
});
