import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/styles/admin.css";

export const metadata: Metadata = {
  title: "Control room · Eclecia'27",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <div className="adm">{children}</div>;
}
