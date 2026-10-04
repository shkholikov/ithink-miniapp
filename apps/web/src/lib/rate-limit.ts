// In-memory sliding window. On Vercel each function instance keeps its own
// counts, so this only slows bursts; Turnstile is the real spam gate.
export function createRateLimiter(limit: number, windowMs: number) {
	const hits = new Map<string, number[]>();

	return function allow(key: string, now = Date.now()): boolean {
		const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
		if (recent.length >= limit) {
			hits.set(key, recent);
			return false;
		}
		recent.push(now);
		hits.set(key, recent);

		if (hits.size > 10_000) {
			for (const [k, times] of hits) {
				if (times.every((t) => now - t >= windowMs)) hits.delete(k);
			}
		}
		return true;
	};
}

export function clientIp(request: Request): string {
	const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
	return forwarded || request.headers.get("x-real-ip") || "unknown";
}
