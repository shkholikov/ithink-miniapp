export async function register() {
	if (process.env.NEXT_RUNTIME !== "nodejs") return;
	if (process.env.NODE_ENV !== "production" || process.env.NEXT_PHASE === "phase-production-build") return;
	// On Vercel, next.config.ts fails the production build instead.
	if (process.env.VERCEL) return;

	const { enforceLeadIntakeEnv } = await import("./lib/leads/startup");
	enforceLeadIntakeEnv();
}
