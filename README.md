# Repo Roast

An AI-powered tool that roasts any public GitHub repository with brutal, specific, and (hopefully) funny commentary. Paste a URL, and the AI analyzes the code, commits, and README — then tears it apart.

## How it works

1. Enter any public GitHub repository URL
2. The app fetches the repo's metadata, README, recent commit history, file tree, and key source files via the GitHub API
3. The content is passed to **Llama 3.3 70B** (via [Groq](https://groq.com)) with a prompt that instructs it to roast the repo across four categories:
   - First impressions / vibe check
   - Commit history hall of shame
   - README autopsy
   - Code crimes
4. The roast streams back in real time and is rendered as markdown

## Tech stack

- [SvelteKit](https://kit.svelte.dev) — frontend framework
- [Tailwind CSS](https://tailwindcss.com) — styling
- [Groq API](https://console.groq.com) — LLM inference (Llama 3.3 70B)
- [GitHub REST API](https://docs.github.com/en/rest) — repo data fetching
- Deployed via [GitHub Pages](https://pages.github.com)

## Setup

1. Clone the repo
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your Groq API key:
   ```
   PUBLIC_GROQ_API_KEY=your_key_here
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```

A free Groq API key is available at [console.groq.com](https://console.groq.com).
