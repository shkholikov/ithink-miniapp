const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(token: string, secret: string, remoteIp?: string): Promise<boolean> {
	const body = new URLSearchParams({ secret, response: token });
	if (remoteIp) body.set("remoteip", remoteIp);

	try {
		const res = await fetch(VERIFY_URL, { method: "POST", body });
		if (!res.ok) return false;
		const data = (await res.json()) as { success?: boolean };
		return data.success === true;
	} catch {
		return false;
	}
}
