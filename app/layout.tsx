import type { Metadata } from "next";
import { ToastProvider } from "@/components/ToastProvider";
import { GlobalLoaderProvider } from "@/components/GlobalLoaderProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "tambluu1",
  description: "Multi-tenant platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-50 antialiased">
        <ToastProvider>
          <GlobalLoaderProvider>
            {children}
          </GlobalLoaderProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
