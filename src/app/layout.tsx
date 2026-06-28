import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Design Decision Extractor",
  description:
    "Turn a prose design description into a structured, auditable set of decisions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <a href="/" className="brand">
            Design Decision Extractor
          </a>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
