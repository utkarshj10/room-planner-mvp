import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Room Planner",
  description: "Practical room and interior layout planner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
