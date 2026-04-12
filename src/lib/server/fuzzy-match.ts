/**
 * Fuzzy matching for "Quote It" and "Speed Recall" modes.
 * Combines character-level Levenshtein distance with word-level overlap.
 */

function levenshteinDistance(a: string, b: string): number {
	const m = a.length;
	const n = b.length;
	const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

	for (let i = 0; i <= m; i++) dp[i][0] = i;
	for (let j = 0; j <= n; j++) dp[0][j] = j;

	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
		}
	}

	return dp[m][n];
}

function normalize(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s]/g, '') // strip punctuation
		.replace(/\s+/g, ' ') // collapse whitespace
		.trim();
}

function getWords(text: string): string[] {
	return normalize(text).split(' ').filter(Boolean);
}

function wordOverlap(expected: string[], actual: string[]): number {
	if (expected.length === 0) return 0;
	const expectedSet = new Set(expected);
	let matches = 0;
	for (const word of actual) {
		if (expectedSet.has(word)) {
			matches++;
			expectedSet.delete(word); // each word counts once
		}
	}
	return matches / expected.length;
}

export function fuzzyMatch(expected: string, actual: string): number {
	const normExpected = normalize(expected);
	const normActual = normalize(actual);

	if (normExpected === normActual) return 1.0;
	if (normActual.length === 0) return 0.0;

	// Character-level similarity via Levenshtein
	const maxLen = Math.max(normExpected.length, normActual.length);
	const distance = levenshteinDistance(normExpected, normActual);
	const charSimilarity = 1 - distance / maxLen;

	// Word-level overlap
	const expectedWords = getWords(expected);
	const actualWords = getWords(actual);
	const wordSim = wordOverlap(expectedWords, actualWords);

	// Weighted: 40% char, 60% word
	const accuracy = 0.4 * charSimilarity + 0.6 * wordSim;
	return Math.max(0, Math.min(1, accuracy));
}
