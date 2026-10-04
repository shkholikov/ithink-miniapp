import { AsYouType, parsePhoneNumberFromString } from "libphonenumber-js/min";

/**
 * Countries offered in the lead form's phone field. Placeholders are each
 * country's example mobile number, without the dial code.
 */
export const PHONE_COUNTRIES = [
	{ code: "UZ", dial: "998", placeholder: "90 123 45 67" },
	{ code: "KZ", dial: "7", placeholder: "701 123 4567" },
	{ code: "TJ", dial: "992", placeholder: "91 712 3456" },
	{ code: "KG", dial: "996", placeholder: "700 123 456" },
	{ code: "TM", dial: "993", placeholder: "66 123456" },
	{ code: "RU", dial: "7", placeholder: "912 345 67 89" },
	{ code: "TR", dial: "90", placeholder: "501 234 56 78" },
	{ code: "AE", dial: "971", placeholder: "50 123 4567" }
] as const;

export type PhoneCountry = (typeof PHONE_COUNTRIES)[number]["code"];

export const DEFAULT_PHONE_COUNTRY: PhoneCountry = "UZ";

/**
 * Flag emoji from the ISO code (regional indicator letters). Windows does not
 * draw flag emoji and shows the two letters instead, which still reads fine.
 */
export function flagOf(country: PhoneCountry) {
	return String.fromCodePoint(...[...country].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function dialOf(country: PhoneCountry) {
	return PHONE_COUNTRIES.find((c) => c.code === country)!.dial;
}

/**
 * The national digits the visitor meant, without a pasted dial code or the
 * domestic trunk prefix people type out of habit (0 in TR/AE, 8 in KZ/RU).
 */
export function nationalDigits(value: string, country: PhoneCountry) {
	const dial = dialOf(country);
	let digits = value.replace(/\D/g, "");
	if (value.trim().startsWith("+") && digits.startsWith(dial)) digits = digits.slice(dial.length);
	if (digits.startsWith("0")) digits = digits.slice(1);
	if (dial === "7" && digits.length === 11 && digits.startsWith("8")) digits = digits.slice(1);
	return digits.slice(0, 12);
}

/** Groups the digits the way the country writes them, as the visitor types. */
export function formatPhone(value: string, country: PhoneCountry) {
	const dial = dialOf(country);
	const digits = nationalDigits(value, country);
	if (!digits) return "";
	return new AsYouType().input(`+${dial}${digits}`).replace(`+${dial}`, "").trim();
}

/** E.164 (`+998901234567`) when the number is valid for the country, else null. */
export function toE164(value: string, country: PhoneCountry) {
	const parsed = parsePhoneNumberFromString(`+${dialOf(country)}${nationalDigits(value, country)}`);
	return parsed?.isValid() ? parsed.number : null;
}
