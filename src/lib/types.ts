export interface RepoInfo {
  owner: string;
  repo: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  topics: string[];
  defaultBranch: string;
}

export interface CommitSummary {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface RepoData {
  info: RepoInfo;
  readme: string | null;
  commits: CommitSummary[];
  fileTree: string[];
  keyFiles: { path: string; content: string }[];
}

export type RoastPhase = 'idle' | 'fetching' | 'roasting' | 'done' | 'error';
