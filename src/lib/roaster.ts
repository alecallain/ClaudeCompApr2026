import type { RepoData } from './types';

const SYSTEM_PROMPT = `You are Roastmaster 3000 — a brutally funny, mercilessly honest AI code critic. Your mission: roast any GitHub repository with surgical precision and zero mercy.

Rules:
- Be SPECIFIC. Reference actual file names, commit messages, code patterns, and README content. Generic roasts are lazy.
- Be FUNNY above all else. Wit > pure meanness. Think a roast comedy show, not a Twitter argument.
- No repo is safe. Clean code? Roast it for being over-engineered or soulless. Messy code? Obvious targets.
- Backhanded compliments are encouraged.
- Commit messages are gold. Mine them.

Structure your roast using EXACTLY these section headers (with emojis):
## 🔥 The Vibe Check
(First impressions — what does this repo say about its creator?)

## 💀 Commit Hall of Shame
(Roast the commit history. Vague messages? "WIP"? "fix"? "asdf"? Go in.)

## 📄 README Autopsy
(Missing? Too short? A 47-section masterwork nobody asked for?)

## 🤮 Code Crimes
(Architecture choices, naming conventions, suspicious patterns, dependencies that raise eyebrows)

## ⚖️ Final Verdict
(Wrap it up. End with a **Roast Score: X/10** — 10 = career-endingly catastrophic, 1 = suspiciously pristine, which is also suspicious.)`;

function buildPrompt(data: RepoData): string {
  const { info, readme, commits, fileTree, keyFiles } = data;
  const parts: string[] = [];

  parts.push(`REPO INFO:
Name: ${info.fullName}
Description: ${info.description ?? '(none — first red flag)'}
Primary language: ${info.language ?? 'unknown (spicy)'}
Stars: ${info.stars} | Forks: ${info.forks}
Topics: ${info.topics.length ? info.topics.join(', ') : '(none tagged — confidence issues?)'}`);

  if (readme) {
    parts.push(`README (up to 1500 chars):\n${readme}`);
  } else {
    parts.push(`README: DOES NOT EXIST. There is no README. This person deployed into the void.`);
  }

  if (commits.length > 0) {
    parts.push(`COMMIT HISTORY (last ${commits.length} commits):
${commits.map((c) => `  [${c.sha}] ${c.author}: "${c.message}"`).join('\n')}`);
  } else {
    parts.push(`COMMIT HISTORY: No commits found. Either it's brand new or deeply private.`);
  }

  parts.push(`FILE TREE (${fileTree.length} total files — sample of first 40):
${fileTree.slice(0, 40).join('\n')}`);

  if (keyFiles.length > 0) {
    const fileSection = keyFiles
      .map((f) => `=== ${f.path} ===\n${f.content}`)
      .join('\n\n');
    parts.push(`KEY SOURCE FILES:\n${fileSection}`);
  }

  return parts.join('\n\n---\n\n');
}

export async function streamRoast(
  apiKey: string,
  data: RepoData,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<void> {
  const userPrompt = `Roast this repository with everything you've got:\n\n${buildPrompt(data)}`;

  const body = {
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    temperature: 1.2,
    max_tokens: 1024,
    stream: true
  };

  let res: Response;
  try {
    res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });
  } catch {
    onError('Network error — check your internet connection and try again.');
    return;
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    if (res.status === 401) {
      onError('Invalid Groq API key. Get a free one at console.groq.com.');
    } else if (res.status === 429) {
      onError(`Rate limited (429): ${errText.slice(0, 300)}`);
    } else {
      onError(`Groq API error ${res.status}: ${errText.slice(0, 200)}`);
    }
    return;
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const text = parsed?.choices?.[0]?.delta?.content;
          if (typeof text === 'string') onChunk(text);
        } catch {
          // skip malformed SSE chunks
        }
      }
    }
  } catch {
    onError('Stream interrupted. Try again.');
    return;
  }

  onDone();
}
