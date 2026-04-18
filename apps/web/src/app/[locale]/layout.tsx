import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { ThemeProvider } from "next-themes";
import { TelegramProvider } from "@/lib/telegram";
import { BottomNav } from "@/components/bottom-nav";
import { routing } from "@/i18n/routing";
import { LocaleSchema, type Locale } from "@ithink/types";

export function generateStaticParams() {
	return routing.locales.map((locale) => ({ locale }));
}

interface Props {
	children: ReactNode;
	params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: Props) {
	const { locale: rawLocale } = await params;
	const parsed = LocaleSchema.safeParse(rawLocale);
	if (!parsed.success) notFound();
	const locale: Locale = parsed.data;

	setRequestLocale(locale);
	const messages = await getMessages();

	return (
		<NextIntlClientProvider locale={locale} messages={messages}>
			<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
				<TelegramProvider>
					<div className="relative mx-auto flex min-h-dvh max-w-xl flex-col pb-24">{children}</div>
					<BottomNav />
				</TelegramProvider>
			</ThemeProvider>
		</NextIntlClientProvider>
	);
}
