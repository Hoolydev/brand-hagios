import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: "Hagios Culture Engine",
  description: "Estúdio editorial para pesquisar, roteirizar e criar carrosséis culturais de Instagram.",
  icons: {
    icon: "/brand/hagios-mark-transparent.png",
  },
  openGraph: {
    title: "Hagios Culture Engine",
    description: "Carrosséis que começam na cultura, não no template.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Hagios Culture Engine" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hagios Culture Engine",
    description: "Pesquisa. Tese. Imagem.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}