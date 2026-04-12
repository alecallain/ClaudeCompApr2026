import type { RepoInfo, CommitSummary, RepoData } from './types';

const GITHUB_API = 'https://api.github.com';

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const cleaned = url.trim().replace(/\.git$/, '').replace(/\/$/, '');
    const match = cleaned.match(/github\.com[/:]([\w.-]+)\/([\w.-]+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  } catch {
    return null;
  }
}

async function ghFetch(path: string): Promise<Response> {
  return fetch(`${GITHUB_API}${path}`, {
    headers: { Accept: 'application/vnd.github+json' }
  });
}

async function fetchRepoInfo(owner: string, repo: string): Promise<RepoInfo> {
  const res = await ghFetch(`/repos/${owner}/${repo}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Repository not found. Make sure it exists and is public.');
    if (res.status === 403) throw new Error('GitHub rate limit hit. Wait a minute and try again.');
    throw new Error(`GitHub API error: ${res.status}`);
  }
  const data = await res.json();
  return {
    owner,
    repo,
    fullName: data.full_name,
    description: data.description,
    language: data.language,
    stars: data.stargazers_count,
    forks: data.forks_count,
    topics: data.topics ?? [],
    defaultBranch: data.default_branch ?? 'main'
  };
}

async function fetchReadme(owner: string, repo: string): Promise<string | null> {
  const res = await ghFetch(`/repos/${owner}/${repo}/readme`);
  if (!res.ok) return null;
  const data = await res.json();
  try {
    return atob(data.content.replace(/\n/g, '')).slice(0, 1500);
  } catch {
    return null;
  }
}

async function fetchCommits(owner: string, repo: string): Promise<CommitSummary[]> {
  const res = await ghFetch(`/repos/${owner}/${repo}/commits?per_page=10`);
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((c: Record<string, unknown>) => {
    const commit = c.commit as Record<string, unknown>;
    const author = commit.author as Record<string, unknown> | null;
    return {
      sha: (c.sha as string).slice(0, 7),
      message: (commit.message as string).split('\n')[0].slice(0, 120),
      author: (author?.name as string) ?? 'unknown',
      date: (author?.date as string) ?? ''
    };
  });
}

async function fetchFileTree(owner: string, repo: string, branch: string): Promise<string[]> {
  const res = await ghFetch(`/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
  if (!res.ok) return [];
  const data = await res.json();
  const tree = data.tree as Array<{ type: string; path: string }> | undefined;
  return (tree ?? [])
    .filter((f) => f.type === 'blob')
    .map((f) => f.path)
    .slice(0, 150);
}

const SOURCE_EXT = /\.(ts|tsx|js|jsx|svelte|vue|py|go|rs|rb|java|cs|cpp|c|h|swift|kt|php|ex|exs|ml|elm|clj|hs)$/;
const SKIP_DIRS = /^(node_modules|\.git|dist|build|\.next|__pycache__|\.svelte-kit|vendor|\.cache|coverage)\//;
const CONFIG_FILES = /^(package\.json|pyproject\.toml|Cargo\.toml|go\.mod|Gemfile|composer\.json|pom\.xml|setup\.py|requirements\.txt)$/;

function pickKeyFiles(tree: string[]): string[] {
  const configs = tree.filter((p) => CONFIG_FILES.test(p)).slice(0, 1);
  const sources = tree
    .filter((p) => SOURCE_EXT.test(p) && !SKIP_DIRS.test(p))
    .slice(0, 2);
  return [...new Set([...configs, ...sources])].slice(0, 3);
}

async function fetchFileContent(owner: string, repo: string, path: string): Promise<string | null> {
  const res = await ghFetch(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.encoding === 'base64') {
    try {
      return atob(data.content.replace(/\n/g, '')).slice(0, 1000);
    } catch {
      return null;
    }
  }
  return null;
}

export async function fetchRepoData(
  owner: string,
  repo: string,
  onProgress: (msg: string) => void
): Promise<RepoData> {
  onProgress('Fetching repo info...');
  const info = await fetchRepoInfo(owner, repo);

  onProgress('Fetching README, commits & file tree...');
  const [readme, commits, fileTree] = await Promise.all([
    fetchReadme(owner, repo),
    fetchCommits(owner, repo),
    fetchFileTree(owner, repo, info.defaultBranch)
  ]);

  onProgress('Peeking at source files...');
  const toFetch = pickKeyFiles(fileTree);
  const keyFiles: { path: string; content: string }[] = [];
  for (const path of toFetch) {
    const content = await fetchFileContent(owner, repo, path);
    if (content) keyFiles.push({ path, content });
  }

  return { info, readme, commits, fileTree, keyFiles };
}
