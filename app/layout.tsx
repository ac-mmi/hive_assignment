import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { AppHeader } from "@/components/AppHeader";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hive Inspect — Spectora importer",
  description: "Import Spectora inspection templates into a structured, editable Hive Inspect template.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${sourceSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppHeader />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
