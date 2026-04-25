import { json } from '@sveltejs/kit';
import { sessions } from '$lib/server/socket-handler.js';

export async function GET() {
	const rows = [];
	for (const [sessionId, engine] of sessions) {
		const active = engine.getActivePlayers();
		if (engine.phase === 'IDLE' && active.length === 0) continue;
		rows.push({
			sessionId,
			phase: engine.phase,
			playerCount: active.length,
			mode: engine.mode,
			packName: engine.packName,
			currentRound: engine.currentRound,
			totalRounds: engine.totalRounds
		});
	}
	rows.sort((a, b) => b.playerCount - a.playerCount);
	return json(rows);
}
