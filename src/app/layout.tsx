import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AuthNav } from "@/app/auth/auth-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeutschOS",
  description: "A focused German learning system for the A1 curriculum.",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="global-auth-bar">
          <AuthNav />
        </div>
        {children}
      </body>
    </html>
  );
}
