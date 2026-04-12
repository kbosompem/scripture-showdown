import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';

export async function GET({ url }) {
	const db = getDb();
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

	// All-time top players (aggregated across sessions)
	const allTime = db
		.prepare(
			`SELECT display_name as name,
				SUM(total_score) as totalScore,
				COUNT(*) as gamesPlayed,
				SUM(CASE WHEN final_rank = 1 THEN 1 ELSE 0 END) as wins,
				MIN(final_rank) as bestRank,
				ROUND(AVG(total_score), 0) as avgScore
			FROM session_players
			GROUP BY display_name
			ORDER BY totalScore DESC
			LIMIT ?`
		)
		.all(limit);

	// Recent sessions
	const recentSessions = db
		.prepare(
			`SELECT gs.id, gs.mode, gs.num_rounds as numRounds, gs.created_at as date,
				vp.name as packName, vp.icon as packIcon,
				(SELECT display_name FROM session_players WHERE session_id = gs.id AND final_rank = 1) as champion,
				(SELECT total_score FROM session_players WHERE session_id = gs.id AND final_rank = 1) as topScore,
				(SELECT COUNT(*) FROM session_players WHERE session_id = gs.id) as playerCount
			FROM game_sessions gs
			LEFT JOIN verse_packs vp ON gs.pack_id = vp.id
			WHERE gs.status = 'finished'
			ORDER BY gs.created_at DESC
			LIMIT ?`
		)
		.all(limit);

	// Per-session leaderboards for recent sessions
	const sessionDetails = recentSessions.map((session: any) => {
		const players = db
			.prepare(
				`SELECT display_name as name, total_score as score, final_rank as rank
				FROM session_players
				WHERE session_id = ?
				ORDER BY final_rank`
			)
			.all(session.id);

		return { ...session, players };
	});

	return json({
		allTime,
		recentSessions: sessionDetails
	});
}
