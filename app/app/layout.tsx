import { Caveat, DM_Sans } from "next/font/google";
import { SketchFilters } from "@/components/ui/SketchFilters";
import "./globals.css";

const hand = Caveat({
  subsets: ["latin"],
  variable: "--font-hand",
  display: "swap",
});

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
  display: "swap",
});

export const metadata = {
  title: "Mind Map",
  description: "A quiet studio for thinking in connections",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${hand.variable} ${sans.variable}`}>
      <body className="font-sans antialiased">
        <SketchFilters />
        {children}
      </body>
    </html>
  );
}
