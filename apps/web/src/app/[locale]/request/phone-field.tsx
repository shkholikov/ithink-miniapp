"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

const COUNTRIES = [
	{ code: "UZ", dial: "998" },
	{ code: "KZ", dial: "7" },
	{ code: "TJ", dial: "992" },
	{ code: "KG", dial: "996" },
	{ code: "TM", dial: "993" },
	{ code: "RU", dial: "7" },
	{ code: "TR", dial: "90" },
	{ code: "AE", dial: "971" }
] as const;

const OTHER = "OTHER";
type CountryCode = (typeof COUNTRIES)[number]["code"] | typeof OTHER;

function dialOf(country: CountryCode): string {
	return COUNTRIES.find((c) => c.code === country)?.dial ?? "";
}

function compose(country: CountryCode, national: string): string {
	const digits = national.replace(/\D/g, "");
	return digits ? `+${dialOf(country)}${digits}` : "";
}

// Splits a full number (e.g. from requestContact) back into country + national
// part, keeping the current country when its code matches (+7 is KZ and RU).
function split(value: string, current: CountryCode): { country: CountryCode; national: string } {
	const digits = value.replace(/\D/g, "");
	const currentDial = dialOf(current);
	if (currentDial && digits.startsWith(currentDial)) {
		return { country: current, national: digits.slice(currentDial.length) };
	}
	const match = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((c) => digits.startsWith(c.dial));
	return match ? { country: match.code, national: digits.slice(match.dial.length) } : { country: OTHER, national: digits };
}

interface Props {
	label: string;
	countryLabel: string;
	otherLabel: string;
	value: string;
	error?: string;
	onChange: (value: string) => void;
	onBlur: () => void;
}

export function PhoneField({ label, countryLabel, otherLabel, value, error, onChange, onBlur }: Props) {
	const [country, setCountry] = useState<CountryCode>("UZ");
	const [national, setNational] = useState("");

	useEffect(() => {
		if (value === compose(country, national)) return;
		const next = split(value, country);
		setCountry(next.country);
		setNational(next.national);
	}, [value, country, national]);

	const update = (nextCountry: CountryCode, nextNational: string) => {
		setCountry(nextCountry);
		setNational(nextNational);
		onChange(compose(nextCountry, nextNational));
	};

	return (
		<label className="flex flex-col gap-2">
			<span className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
			<div className="flex gap-2">
				<div className="relative shrink-0">
					<select
						aria-label={countryLabel}
						value={country}
						onChange={(e) => update(e.target.value as CountryCode, national)}
						className="h-full appearance-none rounded-2xl bg-card py-3 pl-4 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand)]/40"
					>
						{COUNTRIES.map((c) => (
							<option key={c.code} value={c.code}>
								{c.code} +{c.dial}
							</option>
						))}
						<option value={OTHER}>{otherLabel}</option>
					</select>
					<ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
				</div>
				<input
					type="tel"
					inputMode="tel"
					aria-label={label}
					autoComplete={country === OTHER ? "tel" : "tel-national"}
					placeholder={country === OTHER ? "+" : undefined}
					value={national}
					onChange={(e) => update(country, e.target.value)}
					onBlur={onBlur}
					className="min-w-0 flex-1 rounded-2xl bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand)]/40"
				/>
			</div>
			{error ? <span className="px-1 text-xs text-red-400">{error}</span> : null}
		</label>
	);
}
