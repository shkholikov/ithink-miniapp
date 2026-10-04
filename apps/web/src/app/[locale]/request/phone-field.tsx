"use client";

import type { InputHTMLAttributes, Ref } from "react";
import { PHONE_COUNTRIES, dialOf, flagOf, type PhoneCountry } from "@/lib/phone";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Props {
	id: string;
	country: PhoneCountry;
	onCountryChange: (country: PhoneCountry) => void;
	countryLabel: string;
	invalid?: boolean;
	inputProps: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> };
}

// Country code and number in one box, like ithink.uz: [flag +998 | 90 123 45 67].
// The caller formats the number.
export function PhoneField({ id, country, onCountryChange, countryLabel, invalid, inputProps }: Props) {
	const placeholder = PHONE_COUNTRIES.find((c) => c.code === country)!.placeholder;

	return (
		<div
			className={cn(
				"flex w-full items-center rounded-2xl bg-card transition-shadow focus-within:ring-2 focus-within:ring-[color:var(--color-brand)]/40",
				invalid && "ring-2 ring-red-500/50"
			)}
		>
			<Select value={country} onValueChange={(value) => value && onCountryChange(value as PhoneCountry)}>
				<SelectTrigger
					aria-label={countryLabel}
					className="h-auto gap-1.5 rounded-l-2xl rounded-r-none border-0 bg-transparent py-3 pl-4 pr-2 text-sm font-medium focus-visible:ring-0 data-[size=default]:h-auto dark:bg-transparent dark:hover:bg-transparent"
				>
					<SelectValue>
						{(value: PhoneCountry) => (
							<span className="flex items-center gap-1.5">
								<span aria-hidden="true">{flagOf(value)}</span>+{dialOf(value)}
							</span>
						)}
					</SelectValue>
				</SelectTrigger>
				<SelectContent alignItemWithTrigger={false} align="start" className="min-w-44 rounded-xl">
					{PHONE_COUNTRIES.map((c) => (
						<SelectItem key={c.code} value={c.code} className="py-2">
							<span aria-hidden="true">{flagOf(c.code)}</span>
							<span>{c.code}</span>
							<span className="text-muted-foreground">+{c.dial}</span>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<span className="h-5 w-px shrink-0 bg-border" aria-hidden="true" />
			<input
				id={id}
				type="tel"
				inputMode="tel"
				autoComplete="tel-national"
				placeholder={placeholder}
				{...inputProps}
				className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
			/>
		</div>
	);
}
