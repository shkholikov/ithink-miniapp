// "+998 (90) 123-45-67" -> "998901234567"; a bare 9-digit local number gets the 998 prefix.
export function normalizePhone(raw: string): string {
	const digits = raw.replace(/\D/g, "");
	return digits.length === 9 ? `998${digits}` : digits;
}
