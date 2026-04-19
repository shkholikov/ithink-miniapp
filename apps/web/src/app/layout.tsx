import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
	subsets: ["latin", "cyrillic"],
	display: "swap",
	variable: "--font-inter"
});

export const metadata: Metadata = {
	title: "ithink",
	description: "ithink Telegram Mini App",
	icons: { icon: "/logo.png" }
};

export const viewport: Viewport = {
	themeColor: "#0d0d14",
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="ru" className={inter.variable} suppressHydrationWarning>
			<head>
				<Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
			</head>
			<body>{children}</body>
		</html>
	);
}
