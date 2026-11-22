import type { Metadata } from "next";
import CamClient from "./CamClient";
import { getBreadcrumbJsonLd } from "@/constants/seo";

export const metadata: Metadata = {
  title: "Campus Ambassador | Eclecia'27",
  description:
    "Join Eclecia'27 as a Campus Ambassador. Represent your college, lead the celestial cultural movement, and unlock exclusive rewards, passes, and certificates.",
  alternates: {
    canonical: "/cam",
  },
  openGraph: {
    title: "Campus Ambassador: Eclecia'27 | Heritage Institute of Technology",
    description:
      "Join Eclecia'27 as a Campus Ambassador. Lead your campus and earn exclusive rewards.",
    url: "/cam",
    type: "website",
  },
};

export default function CamPage() {
  const breadcrumbJsonLd = getBreadcrumbJsonLd(
    "/cam",
    process.env.NEXT_PUBLIC_SITE_URL
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <CamClient />
    </>
  );
}
