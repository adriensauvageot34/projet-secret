import "@/styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "projet-secret",
  description: "MVP web mobile-first pour jeu social compétitif en soirée",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
