import type { Metadata } from "next";
import "./globals.css";
import "@/components/arc/foundation.css";

export const metadata: Metadata = {
  title: "Barraca Uno | Inventario y compras",
  description: "Catálogo de materiales y gestión de órdenes de compra de Barraca Uno.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased"><script dangerouslySetInnerHTML={{__html:`(function(){var t='light';try{var s=localStorage.getItem('barraca-uno-theme');if(['light','dark','system'].indexOf(s)>=0)t=s;}catch(e){}var v=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;document.documentElement.dataset.theme=v;document.documentElement.style.colorScheme=v;})();`}}/>{children}</body>
    </html>
  );
}

