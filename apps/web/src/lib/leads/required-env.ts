export const PRODUCTION_REQUIRED_ENV = ["AMOCRM_SUBDOMAIN", "AMOCRM_ACCESS_TOKEN", "TELEGRAM_BOT_TOKEN"] as const;

// Each of these degrades one feature instead of breaking intake:
// no responsible user -> amoCRM assigns the integration owner;
// no fallback chat -> a lead is lost if amoCRM is down;
// no Turnstile key -> /api/site-lead stays closed.
export const PRODUCTION_RECOMMENDED_ENV = ["AMOCRM_RESPONSIBLE_USER_ID", "SALES_FALLBACK_CHAT_ID", "TURNSTILE_SECRET_KEY"] as const;

type Env = Record<string, string | undefined>;

export function missingProductionEnv(env: Env = process.env): string[] {
	return PRODUCTION_REQUIRED_ENV.filter((key) => !env[key]);
}

export function missingRecommendedEnv(env: Env = process.env): string[] {
	return PRODUCTION_RECOMMENDED_ENV.filter((key) => !env[key]);
}
