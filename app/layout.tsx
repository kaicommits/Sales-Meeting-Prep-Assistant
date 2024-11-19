import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VDR Handoff Assistant",
  description: "Opportunity Handoff Assistant for Vercel VDRs",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div suppressHydrationWarning>
          {children}
        </div>
      </body>
    </html>
  );
}


