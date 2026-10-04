"use client";

import { useEffect, useId, useState } from "react";
import { Controller, useForm, useWatch, type Control, type FieldErrors, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { z } from "zod";
import { Building2, CheckCircle2, Layers, Loader2, Phone, Plus, User, type LucideIcon } from "lucide-react";
import { COMPANY_SIZES, CompanySizeSchema, SERVICE_SLUGS, parseStartParam, type LeadResponse, type Locale, type ServiceSlug } from "@ithink/types";
import { getWebApp, hapticError, hapticImpact, hapticSuccess } from "@/lib/telegram";
import { DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES, formatPhone, toE164, type PhoneCountry } from "@/lib/phone";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PhoneField } from "./phone-field";

export interface ServiceOption {
	slug: ServiceSlug;
	title: string;
	icon: string;
	color: string;
}

// Messages are leadForm.errors keys, so the same codes work for client and server errors.
const FormSchema = z.object({
	service: z.enum(SERVICE_SLUGS, { errorMap: () => ({ message: "service" }) }),
	name: z.string().trim().min(2, "name").max(80, "name"),
	phone_country: z.string(),
	phone: z.string(),
	company_size: z.union([CompanySizeSchema, z.literal("")], { errorMap: () => ({ message: "company_size" }) }),
	description: z.string().trim().max(2000, "description")
});

type FormValues = z.infer<typeof FormSchema>;

const FIELDS = ["service", "name", "phone", "company_size", "description"] as const;
type Field = (typeof FIELDS)[number];

const schemaResolver = zodResolver(FormSchema);

// The phone check needs the country, and an object-level refine would be skipped
// whenever another field fails, so it runs here alongside the schema.
const resolver: Resolver<FormValues> = async (values, context, options) => {
	const result = await schemaResolver(values, context, options);
	if (toE164(values.phone, values.phone_country as PhoneCountry)) return result;
	const errors = { ...result.errors, phone: { type: "validate", message: "phone" } } as FieldErrors<FormValues>;
	return { values: {}, errors };
};

const LABEL_CLASS = "px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground";
const INPUT_CLASS =
	"w-full rounded-2xl bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand)]/40 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-500/50";
const ICON_CLASS = "pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground";

type ServerError = "noTelegram" | "unavailable" | "generic";

// Picks the country whose dial code starts the shared number, preferring the
// current one (+7 is both KZ and RU).
function countryOfNumber(digits: string, current: PhoneCountry): PhoneCountry {
	const currentDial = PHONE_COUNTRIES.find((c) => c.code === current)!.dial;
	if (digits.startsWith(currentDial)) return current;
	return PHONE_COUNTRIES.find((c) => digits.startsWith(c.dial))?.code ?? current;
}

interface Props {
	options: ServiceOption[];
	preselected?: string;
}

export function RequestForm({ options, preselected }: Props) {
	const t = useTranslations("leadForm");
	const locale = useLocale() as Locale;
	const uid = useId();
	const id = (field: string) => `${uid}-${field}`;

	const [knownService, setKnownService] = useState(options.find((o) => o.slug === preselected)?.slug);
	const [showComment, setShowComment] = useState(false);
	const [canShareContact, setCanShareContact] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [serverError, setServerError] = useState<ServerError | null>(null);
	const [leadId, setLeadId] = useState<number | null>(null);
	const [done, setDone] = useState(false);

	const {
		control,
		register,
		handleSubmit,
		setValue,
		getValues,
		setError,
		formState: { errors }
	} = useForm<FormValues>({
		resolver,
		// "" leaves a select on its placeholder; the schema rejects an empty service on submit.
		defaultValues: {
			service: knownService ?? ("" as ServiceSlug),
			name: "",
			phone_country: DEFAULT_PHONE_COUNTRY,
			phone: "",
			company_size: "",
			description: ""
		}
	});

	const phoneCountry = useWatch({ control, name: "phone_country" }) as PhoneCountry;

	useEffect(() => {
		const webApp = getWebApp();
		setCanShareContact(Boolean(webApp?.requestContact && webApp.isVersionAtLeast("6.9")));

		if (knownService) return;
		const fromStartParam = parseStartParam(webApp?.initDataUnsafe.start_param)?.service;
		if (fromStartParam && options.some((o) => o.slug === fromStartParam)) {
			setValue("service", fromStartParam);
			setKnownService(fromStartParam);
		}
	}, [knownService, options, setValue]);

	const shareContact = () => {
		hapticImpact("light");
		getWebApp()?.requestContact?.((shared, result) => {
			const contact = result?.responseUnsafe?.contact;
			if (!shared || !contact?.phone_number) return;
			const digits = contact.phone_number.replace(/\D/g, "");
			const country = countryOfNumber(digits, getValues("phone_country") as PhoneCountry);
			setValue("phone_country", country);
			setValue("phone", formatPhone(`+${digits}`, country), { shouldValidate: true });
			if (!getValues("name")) {
				const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
				if (name) setValue("name", name, { shouldValidate: true });
			}
		});
	};

	const onSubmit = handleSubmit(
		async (values) => {
			const initData = getWebApp()?.initData;
			if (!initData) {
				setServerError("noTelegram");
				hapticError();
				return;
			}

			setSubmitting(true);
			setServerError(null);

			let res: Response;
			try {
				res = await fetch("/api/lead", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						service: values.service,
						name: values.name.trim(),
						phone: toE164(values.phone, values.phone_country as PhoneCountry),
						company_size: values.company_size || undefined,
						description: values.description.trim() || undefined,
						// Tapping the button is the consent; the note under it says so.
						consent: true,
						locale,
						initData
					})
				});
			} catch {
				setSubmitting(false);
				setServerError("unavailable");
				hapticError();
				return;
			}

			setSubmitting(false);
			if (res.ok) {
				const body = (await res.json().catch(() => null)) as LeadResponse | null;
				setLeadId(body?.leadId ?? null);
				hapticSuccess();
				setDone(true);
				return;
			}

			hapticError();
			if (res.status === 400) {
				const data = (await res.json().catch(() => null)) as {
					issues?: { fieldErrors?: Record<string, string[] | undefined> };
				} | null;
				const fieldErrors = data?.issues?.fieldErrors ?? {};
				const failed = FIELDS.filter((field) => fieldErrors[field]?.length);
				failed.forEach((field) => setError(field, { message: field }));
				if (!failed.length) setServerError("generic");
			} else {
				setServerError("unavailable");
			}
		},
		() => hapticError()
	);

	if (done) {
		return (
			<div className="flex flex-col items-center gap-4 rounded-3xl bg-card px-6 py-10 text-center">
				<CheckCircle2 size={48} className="text-[color:var(--color-brand)]" />
				<h2 className="text-lg font-semibold">{t("successTitle")}</h2>
				{leadId ? <p className="text-sm font-medium">{t("successNumber", { id: leadId })}</p> : null}
				<p className="text-sm text-muted-foreground">{t("successBody")}</p>
				<button
					type="button"
					onClick={() => getWebApp()?.close()}
					className="mt-2 rounded-full bg-[color:var(--color-brand)] px-6 py-3 text-sm font-semibold text-white"
				>
					{t("close")}
				</button>
			</div>
		);
	}

	const fieldError = (name: Field) => {
		const message = errors[name]?.message;
		return message ? (
			<span id={id(`${name}-error`)} className="px-1 text-xs text-red-400">
				{t(`errors.${message}`)}
			</span>
		) : null;
	};

	const a11y = (name: Field) => ({
		"aria-invalid": errors[name] ? true : undefined,
		"aria-describedby": errors[name] ? id(`${name}-error`) : undefined
	});

	const optional = <span className="normal-case tracking-normal"> ({t("optional")})</span>;
	const phone = register("phone");
	const privacyUrl = `https://ithink.uz/${locale}/privacy`;
	const knownTitle = options.find((o) => o.slug === knownService)?.title;

	return (
		<form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
			{knownTitle ? <span className="self-start rounded-full bg-card px-3 py-1 text-xs font-medium text-muted-foreground">{knownTitle}</span> : null}

			{canShareContact ? (
				<button
					type="button"
					onClick={shareContact}
					className="flex items-center justify-center gap-2 rounded-full bg-card px-6 py-3 text-sm font-semibold text-[color:var(--color-brand)]"
				>
					<Phone size={16} />
					<span>{t("shareContact")}</span>
				</button>
			) : null}

			<div className="flex flex-col gap-2">
				<label htmlFor={id("name")} className={LABEL_CLASS}>
					{t("nameLabel")}
				</label>
				<div className="relative">
					<User className={ICON_CLASS} aria-hidden="true" />
					<input
						id={id("name")}
						type="text"
						autoComplete="name"
						placeholder={t("namePlaceholder")}
						{...register("name")}
						{...a11y("name")}
						className={cn(INPUT_CLASS, "pl-11")}
					/>
				</div>
				{fieldError("name")}
			</div>

			<div className="flex flex-col gap-2">
				<label htmlFor={id("phone")} className={LABEL_CLASS}>
					{t("phoneLabel")}
				</label>
				<PhoneField
					id={id("phone")}
					country={phoneCountry}
					countryLabel={t("countryLabel")}
					onCountryChange={(country) => {
						setValue("phone_country", country);
						setValue("phone", formatPhone(getValues("phone"), country));
					}}
					invalid={!!errors.phone}
					inputProps={{
						...phone,
						...a11y("phone"),
						onChange: (e) => {
							e.target.value = formatPhone(e.target.value, phoneCountry);
							return phone.onChange(e);
						}
					}}
				/>
				{fieldError("phone")}
			</div>

			{!knownService ? (
				<div className="flex flex-col gap-2">
					<label htmlFor={id("service")} className={LABEL_CLASS}>
						{t("serviceLabel")}
					</label>
					<FormSelect
						control={control}
						name="service"
						id={id("service")}
						icon={Layers}
						placeholder={t("selectPlaceholder")}
						items={options.map((o) => ({ value: o.slug, label: o.title }))}
						{...a11y("service")}
					/>
					{fieldError("service")}
				</div>
			) : null}

			<div className="flex flex-col gap-2">
				<label htmlFor={id("company_size")} className={LABEL_CLASS}>
					{t("companySizeLabel")}
					{optional}
				</label>
				<FormSelect
					control={control}
					name="company_size"
					id={id("company_size")}
					icon={Building2}
					placeholder={t("selectPlaceholder")}
					items={COMPANY_SIZES.map((size) => ({ value: size, label: t(`companySizes.${size}`) }))}
				/>
			</div>

			{showComment ? (
				<div className="flex flex-col gap-2">
					<label htmlFor={id("description")} className={LABEL_CLASS}>
						{t("commentLabel")}
						{optional}
					</label>
					<textarea
						id={id("description")}
						rows={3}
						autoFocus
						placeholder={t("commentPlaceholder")}
						{...register("description")}
						{...a11y("description")}
						className={cn(INPUT_CLASS, "resize-none")}
					/>
					{fieldError("description")}
				</div>
			) : (
				<button
					type="button"
					onClick={() => {
						hapticImpact("light");
						setShowComment(true);
					}}
					className="flex items-center gap-1.5 self-start px-1 text-sm font-medium text-[color:var(--color-brand)]"
				>
					<Plus size={16} />
					{t("addComment")}
				</button>
			)}

			{serverError ? (
				<p role="alert" className="px-1 text-sm text-red-400">
					{t(`errors.${serverError}`)}
				</p>
			) : null}

			<button
				type="submit"
				disabled={submitting}
				className="mt-2 flex items-center justify-center gap-2 rounded-full bg-[color:var(--color-brand)] px-6 py-3 text-sm font-semibold text-white disabled:opacity-70"
			>
				{submitting ? <Loader2 size={16} className="animate-spin" /> : null}
				<span>{submitting ? t("sending") : t("submit")}</span>
			</button>

			<p className="px-1 text-center text-xs text-muted-foreground">
				{t.rich("consentNote", {
					link: (chunks) => (
						<a
							href={privacyUrl}
							onClick={(event) => {
								const webApp = getWebApp();
								if (!webApp) return;
								event.preventDefault();
								webApp.openLink(privacyUrl);
							}}
							className="text-[color:var(--color-brand)] underline"
						>
							{chunks}
						</a>
					)
				})}
			</p>
		</form>
	);
}

interface FormSelectProps {
	control: Control<FormValues>;
	name: "service" | "company_size";
	id: string;
	icon: LucideIcon;
	placeholder: string;
	items: { value: string; label: string }[];
	"aria-invalid"?: boolean;
	"aria-describedby"?: string;
}

function FormSelect({ control, name, id, icon: Icon, placeholder, items, ...aria }: FormSelectProps) {
	return (
		<Controller
			control={control}
			name={name}
			render={({ field }) => (
				<Select
					value={field.value || null}
					onValueChange={(value) => field.onChange(value ?? "")}
					items={Object.fromEntries(items.map((item) => [item.value, item.label]))}
				>
					<SelectTrigger
						id={id}
						ref={field.ref}
						onBlur={field.onBlur}
						{...aria}
						className="h-auto w-full gap-3 rounded-2xl border-0 bg-card px-4 py-3 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/40 aria-invalid:ring-2 aria-invalid:ring-red-500/50 data-[size=default]:h-auto dark:bg-card dark:hover:bg-card"
					>
						<Icon className="size-4 text-muted-foreground" aria-hidden="true" />
						<SelectValue placeholder={placeholder} />
					</SelectTrigger>
					<SelectContent alignItemWithTrigger={false} className="rounded-xl">
						{items.map((item) => (
							<SelectItem key={item.value} value={item.value} className="py-2">
								{item.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}
		/>
	);
}
