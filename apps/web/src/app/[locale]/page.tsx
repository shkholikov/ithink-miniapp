import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowRight, LayoutGrid, Send, HelpCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { GroupedCard, GroupedCardRow, SectionLabel } from "@/components/grouped-card";
import { Greeting } from "@/components/greeting";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function HomePage() {
	const t = await getTranslations("home");

	return (
		<>
			<main className="flex flex-col gap-6 px-4 pb-6 pt-4">
				<section className="relative overflow-hidden rounded-3xl bg-card px-5 py-8 text-center">
					<div className="pointer-events-none absolute inset-0 opacity-60">
						<div className="absolute left-[-20%] top-[-30%] h-64 w-64 rounded-full bg-[color:var(--color-brand)]/20 blur-3xl animate-blob" />
						<div className="absolute right-[-20%] bottom-[-30%] h-64 w-64 rounded-full bg-[color:var(--color-accent-yellow)]/10 blur-3xl animate-blob animation-delay-2000" />
					</div>
					<div className="relative flex flex-col items-center gap-4">
						<Image src="/logo.png" alt="ithink" width={64} height={64} priority className="h-12 w-auto" />
						<Greeting />
						<h1 className="text-2xl font-semibold leading-tight text-balance">
							<span className="gradient-text-blue">{t("title")}</span>
						</h1>
						<p className="max-w-sm text-sm text-muted-foreground text-balance">{t("subtitle")}</p>
					</div>

					<dl className="relative mt-6 grid grid-cols-3 gap-2">
						<Stat value="50+" label={t("stats.clients")} />
						<Stat value="72+" label={t("stats.projects")} />
						<Stat value="100%" label={t("stats.satisfaction")} />
					</dl>

					<div className="relative mt-5 flex justify-center">
						<LanguageSwitcher />
					</div>
				</section>

				<Link
					href="/request"
					className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#377dff] via-[#5b96ff] to-[#60a5fa] px-5 py-5 text-white shadow-[0_20px_40px_-20px_rgba(55,125,255,0.6)]"
				>
					<div className="flex items-center justify-between">
						<div>
							<div className="text-lg font-semibold">{t("promo.title")}</div>
							<div className="text-sm text-white/80">{t("promo.subtitle")}</div>
						</div>
						<span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/20 transition-transform group-active:scale-95">
							<ArrowRight size={18} />
						</span>
					</div>
				</Link>

				<section>
					<SectionLabel>{t("entries.services.title")}</SectionLabel>
					<GroupedCard>
						<HomeEntry
							href="/services"
							color="#377dff"
							title={t("entries.services.title")}
							subtitle={t("entries.services.subtitle")}
							iconNode={<LayoutGrid size={16} />}
						/>
						<HomeEntry
							href="/request"
							color="#22c55e"
							title={t("entries.request.title")}
							subtitle={t("entries.request.subtitle")}
							iconNode={<Send size={16} />}
						/>
						<HomeEntry
							href="/faq"
							color="#f59e0b"
							title={t("entries.faq.title")}
							subtitle={t("entries.faq.subtitle")}
							iconNode={<HelpCircle size={16} />}
						/>
					</GroupedCard>
				</section>
			</main>
		</>
	);
}

function Stat({ value, label }: { value: string; label: string }) {
	return (
		<div className="rounded-xl bg-secondary/40 px-2 py-3">
			<dt className="text-lg font-semibold">{value}</dt>
			<dd className="mt-0.5 text-[0.6875rem] text-muted-foreground">{label}</dd>
		</div>
	);
}

function HomeEntry({
	href,
	color,
	title,
	subtitle,
	iconNode
}: {
	href: string;
	color: string;
	title: string;
	subtitle: string;
	iconNode: React.ReactNode;
}) {
	return (
		<Link href={href} className="block">
			<GroupedCardRow
				as="div"
				leading={
					<span className="icon-square" style={{ background: color }}>
						{iconNode}
					</span>
				}
				title={title}
				subtitle={subtitle}
			/>
		</Link>
	);
}
