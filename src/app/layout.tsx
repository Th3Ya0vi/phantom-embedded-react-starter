import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Phantom Embedded Wallet",
  description: "Phantom Embedded Wallet React Starter",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
