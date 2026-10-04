const MAX_REQUESTS_PER_SECOND = 7;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 500;

export class AmoApiError extends Error {
	constructor(
		readonly status: number,
		readonly method: string,
		readonly path: string,
		readonly body?: string
	) {
		super(`amoCRM ${method} ${path} failed with ${status}`);
		this.name = "AmoApiError";
	}
}

export interface HttpDeps {
	fetch?: typeof fetch;
	sleep?: (ms: number) => Promise<void>;
	now?: () => number;
}

export interface AmoHttp {
	request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T | null>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createAmoHttp(subdomain: string, accessToken: string, deps: HttpDeps = {}): AmoHttp {
	const doFetch = deps.fetch ?? fetch;
	const sleep = deps.sleep ?? defaultSleep;
	const now = deps.now ?? Date.now;
	const baseUrl = `https://${subdomain}.amocrm.ru`;
	const recent: number[] = [];

	async function throttle() {
		for (;;) {
			const t = now();
			while (recent.length && t - recent[0]! >= 1000) recent.shift();
			if (recent.length < MAX_REQUESTS_PER_SECOND) {
				recent.push(t);
				return;
			}
			await sleep(1000 - (t - recent[0]!));
		}
	}

	async function request<T>(method: "GET" | "POST", path: string, body?: unknown) {
		// The query string can carry a phone number, so errors only name the path.
		const safePath = path.split("?")[0]!;
		let lastError: unknown;

		for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
			if (attempt > 0) await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1));
			await throttle();

			let res: Response;
			try {
				res = await doFetch(`${baseUrl}${path}`, {
					method,
					headers: {
						Authorization: `Bearer ${accessToken}`,
						"Content-Type": "application/json"
					},
					body: body === undefined ? undefined : JSON.stringify(body)
				});
			} catch (err) {
				lastError = err;
				continue;
			}

			if (res.status === 204) return null;
			if (res.ok) return (await res.json()) as T;

			lastError = new AmoApiError(res.status, method, safePath, await res.text().catch(() => ""));
			if (res.status !== 429 && res.status < 500) break;
		}

		throw lastError;
	}

	return { request };
}
