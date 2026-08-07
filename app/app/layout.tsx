import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const serifDisplay = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif-display",
  display: "swap",
});

export const metadata = {
  title: "Mind Map",
  description: "A quiet studio for thinking in connections",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${serifDisplay.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
