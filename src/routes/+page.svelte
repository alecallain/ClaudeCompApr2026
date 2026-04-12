<script lang="ts">
	import { marked } from 'marked';
	import { PUBLIC_GROQ_API_KEY } from '$env/static/public';
	import { parseGitHubUrl, fetchRepoData } from '$lib/github';
	import { streamRoast } from '$lib/roaster';
	import type { RoastPhase, RepoInfo } from '$lib/types';

	let repoUrl = $state('');
	let phase = $state<RoastPhase>('idle');
	let progress = $state('');
	let roastText = $state('');
	let errorMsg = $state('');
	let repoInfo = $state<RepoInfo | null>(null);

	let renderedRoast = $derived(roastText ? (marked(roastText) as string) : '');

	async function handleRoast() {
		errorMsg = '';
		roastText = '';
		repoInfo = null;

		const parsed = parseGitHubUrl(repoUrl);
		if (!parsed) {
			errorMsg = 'Invalid GitHub URL. Try: https://github.com/owner/repo';
			return;
		}

		phase = 'fetching';
		progress = 'Preparing the roast pit...';

		let repoData;
		try {
			repoData = await fetchRepoData(parsed.owner, parsed.repo, (msg) => {
				progress = msg;
			});
			repoInfo = repoData.info;
		} catch (e: unknown) {
			phase = 'error';
			errorMsg =
				e instanceof Error ? e.message : 'Failed to fetch repository data.';
			return;
		}

		phase = 'roasting';
		progress = 'AI is loading up the burns...';

		await streamRoast(
			PUBLIC_GROQ_API_KEY,
			repoData,
			(chunk) => {
				roastText += chunk;
			},
			() => {
				phase = 'done';
			},
			(err) => {
				phase = 'error';
				errorMsg = err;
			},
		);
	}

	function reset() {
		phase = 'idle';
		roastText = '';
		errorMsg = '';
		progress = '';
		repoInfo = null;
	}
</script>

<main class="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
	<!-- Header -->
	<header
		class="border-b border-gray-800/60 bg-gray-900/40 backdrop-blur-sm sticky top-0 z-10"
	>
		<div class="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-black tracking-tight">
					<span class="text-orange-500">Repo</span><span class="text-white"
						>Roast</span
					>
					<span class="ml-1 text-xl">🔥</span>
				</h1>
				<p class="text-gray-500 text-xs mt-0.5">No repository is safe.</p>
			</div>
			{#if phase === 'roasting' || phase === 'done'}
				<button
					onclick={reset}
					class="text-xs text-gray-500 hover:text-orange-400 transition-colors border border-gray-700 hover:border-orange-700 rounded-lg px-3 py-1.5"
				>
					← New roast
				</button>
			{/if}
		</div>
	</header>

	<div class="max-w-2xl mx-auto px-4 py-8 w-full flex-1">
		<!-- IDLE / ERROR: Input Form -->
		{#if phase === 'idle' || phase === 'error'}
			<div class="space-y-6">
				<!-- Hero -->
				<div class="text-center py-6">
					<div class="text-6xl mb-3 animate-flicker">🔥</div>
					<h2 class="text-2xl font-bold text-white mb-1">
						Submit a repo. Get destroyed.
					</h2>
					<p class="text-gray-400 text-sm">
						Paste any public GitHub URL. The AI will analyze the code, commits,
						and README — then absolutely rip into it.
					</p>
				</div>

				<!-- Form Card -->
				<div
					class="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl"
				>
					<div class="space-y-4">
						<div>
							<label
								for="repo-url"
								class="block text-sm font-medium text-gray-300 mb-1.5"
							>
								GitHub Repository URL
							</label>
							<input
								id="repo-url"
								type="text"
								bind:value={repoUrl}
								placeholder="https://github.com/owner/repo"
								autocomplete="off"
								spellcheck="false"
								class="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition font-mono text-sm"
								onkeydown={(e) => e.key === 'Enter' && handleRoast()}
							/>
						</div>

						{#if errorMsg}
							<div
								class="bg-red-950/40 border border-red-800/60 rounded-xl px-4 py-3 text-red-300 text-sm flex items-start gap-2"
							>
								<span class="mt-0.5 shrink-0">⚠️</span>
								<span>{errorMsg}</span>
							</div>
						{/if}

						<button
							onclick={handleRoast}
							class="w-full bg-orange-600 hover:bg-orange-500 active:scale-[0.98] text-white font-bold py-3 px-6 rounded-xl transition-all text-base shadow-lg shadow-orange-900/30"
						>
							🔥 Roast This Repo
						</button>
					</div>
				</div>

				<!-- How it works -->
				<div class="grid grid-cols-3 gap-3 text-center text-xs text-gray-500">
					<div class="bg-gray-900/50 border border-gray-800/50 rounded-xl p-3">
						<div class="text-xl mb-1">🔗</div>
						<p>Paste any public GitHub URL</p>
					</div>
					<div class="bg-gray-900/50 border border-gray-800/50 rounded-xl p-3">
						<div class="text-xl mb-1">🤖</div>
						<p>AI reads code, commits & README</p>
					</div>
					<div class="bg-gray-900/50 border border-gray-800/50 rounded-xl p-3">
						<div class="text-xl mb-1">💀</div>
						<p>Receive surgical burns. No mercy.</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- FETCHING: Loading -->
		{#if phase === 'fetching'}
			<div class="text-center py-20">
				<div class="text-5xl mb-5 animate-pulse">🔍</div>
				<p class="text-gray-200 text-lg font-semibold mb-1">{progress}</p>
				<p class="text-gray-500 text-sm">Collecting the evidence...</p>
				<div class="mt-6 flex justify-center gap-1">
					{#each [0, 1, 2] as i}
						<div
							class="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
							style="animation-delay: {i * 150}ms"
						></div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- ROASTING / DONE: Output -->
		{#if phase === 'roasting' || phase === 'done'}
			<!-- Repo badge -->
			{#if repoInfo}
				<div
					class="flex items-center gap-3 bg-gray-900/60 border border-gray-800/60 rounded-xl px-4 py-3 mb-4 text-sm"
				>
					<span class="text-xl">📦</span>
					<div class="flex-1 min-w-0">
						<span class="font-semibold text-gray-200 truncate block"
							>{repoInfo.fullName}</span
						>
						{#if repoInfo.description}
							<span class="text-gray-500 text-xs truncate block"
								>{repoInfo.description}</span
							>
						{/if}
					</div>
					<div class="flex items-center gap-3 text-gray-500 text-xs shrink-0">
						{#if repoInfo.language}
							<span class="bg-gray-800 px-2 py-0.5 rounded-full"
								>{repoInfo.language}</span
							>
						{/if}
						<span>⭐ {repoInfo.stars.toLocaleString()}</span>
					</div>
				</div>
			{/if}

			<!-- Status bar -->
			<div class="flex items-center justify-between mb-3">
				<div class="flex items-center gap-2 text-sm">
					{#if phase === 'roasting'}
						<div class="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
						<span class="text-orange-400 font-medium"
							>Roasting in progress...</span
						>
					{:else}
						<div class="w-2 h-2 bg-green-500 rounded-full"></div>
						<span class="text-green-400 font-medium">Roast complete</span>
					{/if}
				</div>
			</div>

			<!-- Roast card -->
			<div
				class="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
			>
				<!-- Subtle fire gradient top -->
				<div
					class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-600/50 to-transparent"
				></div>

				{#if roastText}
					<div class="roast-output">
						{@html renderedRoast}
					</div>
				{:else}
					<div class="text-gray-600 text-sm italic animate-pulse">
						Warming up the insults...
					</div>
				{/if}

				<!-- Streaming cursor -->
				{#if phase === 'roasting'}
					<span
						class="inline-block w-0.5 h-5 bg-orange-500 animate-pulse ml-0.5 align-middle"
					></span>
				{/if}
			</div>

			{#if phase === 'done'}
				<div class="mt-5 text-center">
					<button
						onclick={reset}
						class="bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2.5 px-6 rounded-xl transition-colors text-sm"
					>
						🔥 Roast Another Repo
					</button>
				</div>
			{/if}
		{/if}
	</div>

	<footer
		class="text-center text-gray-700 text-xs py-6 border-t border-gray-900"
	>
		Powered by Llama 3.3 70B via Groq + GitHub API · Built with SvelteKit
	</footer>
</main>
