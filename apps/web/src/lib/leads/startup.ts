import { assertLeadIntakeEnv } from ".";

// Next.js keeps serving (with 500s) when register() throws, so exit instead:
// a misconfigured intake must not look healthy and silently drop leads.
export function enforceLeadIntakeEnv(): void {
	try {
		assertLeadIntakeEnv();
	} catch (err) {
		console.error(err instanceof Error ? err.message : err);
		process.exit(1);
	}
}
