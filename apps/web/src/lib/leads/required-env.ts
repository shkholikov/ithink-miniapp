export const PRODUCTION_REQUIRED_ENV = [
	"AMOCRM_SUBDOMAIN",
	"AMOCRM_ACCESS_TOKEN",
	"AMOCRM_RESPONSIBLE_USER_ID",
	"TELEGRAM_BOT_TOKEN",
	"SALES_FALLBACK_CHAT_ID",
	"TURNSTILE_SECRET_KEY"
] as const;

export function missingProductionEnv(env: Record<string, string | undefined> = process.env): string[] {
	return PRODUCTION_REQUIRED_ENV.filter((key) => !env[key]);
}
