export type MajorityResult = {
  homeScore: number;
  awayScore: number;
  /** Distinct voters (latest vote each) counted toward majority. */
  voterCount: number;
};

/** Latest vote per voter_key; majority (mode) of those scores; tie-break by most recent vote time for that score pair. */
export function majorityFromVotes(
  rows: { voterKey: string; homeScore: number; awayScore: number; createdAt: Date }[]
): MajorityResult | null {
  if (rows.length === 0) return null;
  const latestByVoter = new Map<string, { homeScore: number; awayScore: number; createdAt: Date }>();
  const sorted = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  for (const r of sorted) {
    latestByVoter.set(r.voterKey, {
      homeScore: r.homeScore,
      awayScore: r.awayScore,
      createdAt: r.createdAt,
    });
  }
  const latest = Array.from(latestByVoter.values());
  if (latest.length === 0) return null;
  const counts = new Map<string, { home: number; away: number; count: number; lastAt: number }>();
  for (const v of latest) {
    const key = `${v.homeScore}-${v.awayScore}`;
    const cur = counts.get(key);
    const t = v.createdAt.getTime();
    if (!cur) {
      counts.set(key, { home: v.homeScore, away: v.awayScore, count: 1, lastAt: t });
    } else {
      cur.count += 1;
      cur.lastAt = Math.max(cur.lastAt, t);
    }
  }
  let best: { home: number; away: number; count: number; lastAt: number } | null = null;
  for (const c of Array.from(counts.values())) {
    if (!best) {
      best = c;
      continue;
    }
    if (c.count > best.count) best = c;
    else if (c.count === best.count && c.lastAt > best.lastAt) best = c;
  }
  if (!best) return null;
  return { homeScore: best.home, awayScore: best.away, voterCount: latest.length };
}
