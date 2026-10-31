export interface ChatHistoryItem {
  role: string;
  text: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export type ThinkingDepth = 'LOW' | 'MEDIUM' | 'HIGH';

export interface TutorRequestOptions {
  thinkingLevel?: ThinkingDepth;
  domainFocus?: string;
}

async function postJson<T>(url: string, body: Record<string, any>): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    let errorMessage = `Server error (${response.status})`;
    try {
      const errData = await response.json();
      if (errData?.error) {
        errorMessage = errData.error;
      }
    } catch {
      // ignore JSON parse error
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

export const getDiagnosticQuestion = async (
  history: ChatHistoryItem[],
  options?: TutorRequestOptions
): Promise<string> => {
  const data = await postJson<{ text: string }>('/api/gemini/diagnostic', {
    history,
    thinkingLevel: options?.thinkingLevel,
    domainFocus: options?.domainFocus
  });
  return data.text;
};

export const getSimulatorQuestion = async (
  history: ChatHistoryItem[],
  options?: TutorRequestOptions
): Promise<string> => {
  const data = await postJson<{ text: string }>('/api/gemini/simulator', {
    history,
    thinkingLevel: options?.thinkingLevel,
    domainFocus: options?.domainFocus
  });
  return data.text;
};

export const getFlashcard = async (
  history: ChatHistoryItem[],
  options?: TutorRequestOptions
): Promise<string> => {
  const data = await postJson<{ text: string }>('/api/gemini/flashcard', {
    history,
    domainFocus: options?.domainFocus
  });
  return data.text;
};

export const evaluateAssessment = async (
  history: ChatHistoryItem[]
): Promise<string> => {
  const data = await postJson<{ text: string }>('/api/gemini/evaluate', {
    history
  });
  return data.text;
};

export const getDeepDiveContent = async (
  query: string,
  history: ChatHistoryItem[],
  options?: TutorRequestOptions
): Promise<string> => {
  const data = await postJson<{ text: string; sources?: GroundingSource[] }>(
    '/api/gemini/deep-dive',
    {
      query,
      history,
      thinkingLevel: options?.thinkingLevel,
      domainFocus: options?.domainFocus
    }
  );
  return data.text;
};

export const getDeepDiveWithSources = async (
  query: string,
  history: ChatHistoryItem[],
  options?: TutorRequestOptions
): Promise<{ text: string; sources: GroundingSource[] }> => {
  const data = await postJson<{ text: string; sources?: GroundingSource[] }>(
    '/api/gemini/deep-dive',
    {
      query,
      history,
      thinkingLevel: options?.thinkingLevel,
      domainFocus: options?.domainFocus
    }
  );
  return {
    text: data.text,
    sources: data.sources || []
  };
};

/**
 * Stream responses from the server via SSE (/api/gemini/stream) with automatic fallback
 * to the standard JSON endpoint if streaming is unavailable.
 */
export const streamTutorResponse = async (
  params: {
    mode: 'diagnostic' | 'simulator' | 'deepdive';
    history: ChatHistoryItem[];
    query?: string;
    thinkingLevel?: ThinkingDepth;
    domainFocus?: string;
  },
  onChunk: (accumulatedText: string) => void
): Promise<{ text: string; sources: GroundingSource[] }> => {
  try {
    const response = await fetch('/api/gemini/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    if (!response.ok || !response.body) {
      throw new Error(`Stream endpoint returned ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulated = '';
    let finalSources: GroundingSource[] = [];

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const evt of events) {
        const line = evt.trim();
        if (!line.startsWith('data:')) continue;
        const jsonStr = line.replace(/^data:\s*/, '');
        try {
          const payload = JSON.parse(jsonStr);
          if (payload.error) {
            throw new Error(payload.error);
          }
          if (typeof payload.chunk === 'string') {
            accumulated += payload.chunk;
            onChunk(accumulated);
          }
          if (payload.done) {
            if (typeof payload.fullText === 'string' && payload.fullText.length > 0) {
              accumulated = payload.fullText;
              onChunk(accumulated);
            }
            if (Array.isArray(payload.sources)) {
              finalSources = payload.sources;
            }
          }
        } catch (err: any) {
          if (err?.message && !err.message.includes('JSON')) {
            throw err;
          }
        }
      }
    }

    if (accumulated.trim().length > 0) {
      return { text: accumulated, sources: finalSources };
    }
    throw new Error('Empty stream response');
  } catch (streamErr) {
    // Fallback to standard non-streaming endpoint
    if (params.mode === 'diagnostic') {
      const text = await getDiagnosticQuestion(params.history, {
        thinkingLevel: params.thinkingLevel,
        domainFocus: params.domainFocus
      });
      onChunk(text);
      return { text, sources: [] };
    }
    if (params.mode === 'simulator') {
      const text = await getSimulatorQuestion(params.history, {
        thinkingLevel: params.thinkingLevel,
        domainFocus: params.domainFocus
      });
      onChunk(text);
      return { text, sources: [] };
    }
    const res = await getDeepDiveWithSources(params.query || '', params.history, {
      thinkingLevel: params.thinkingLevel,
      domainFocus: params.domainFocus
    });
    onChunk(res.text);
    return res;
  }
};

/**
 * Convert base64 raw 16-bit 24kHz mono PCM audio to a playable WAV Blob URL
 */
function pcmBase64ToWavUrl(base64Pcm: string, sampleRate = 24000): string {
  const binaryString = atob(base64Pcm);
  const pcmLength = binaryString.length;
  const wavBuffer = new ArrayBuffer(44 + pcmLength);
  const view = new DataView(wavBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF identifier
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmLength, true);
  writeString(8, 'WAVE');
  // fmt chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format = 1
  view.setUint16(22, 1, true); // Mono = 1 channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate (sampleRate * blockAlign)
  view.setUint16(32, 2, true); // Block align (1 channel * 2 bytes)
  view.setUint16(34, 16, true); // Bits per sample = 16
  // data chunk
  writeString(36, 'data');
  view.setUint32(40, pcmLength, true);

  const uint8 = new Uint8Array(wavBuffer, 44);
  for (let i = 0; i < pcmLength; i++) {
    uint8[i] = binaryString.charCodeAt(i);
  }

  const blob = new Blob([wavBuffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export const synthesizeSpeech = async (
  text: string,
  voiceName: string = 'Kore'
): Promise<string> => {
  const data = await postJson<{ audioBase64: string; mimeType: string }>(
    '/api/gemini/tts',
    { text, voiceName }
  );
  if (data.mimeType?.includes('wav')) {
    return `data:audio/wav;base64,${data.audioBase64}`;
  }
  return pcmBase64ToWavUrl(data.audioBase64, 24000);
};
