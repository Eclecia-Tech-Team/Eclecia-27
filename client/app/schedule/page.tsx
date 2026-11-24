import type { Metadata } from "next";
import { ScheduleView } from "@/components/schedule/ScheduleView";
import { getBreadcrumbJsonLd, ROUTES } from "@/constants/seo";
import { getSchedule } from "@/lib/schedule";

const route = ROUTES.find((r) => r.path === "/schedule")!;

export const metadata: Metadata = {
  title: route.title,
  description: route.description,
  alternates: {
    canonical: "/schedule",
  },
  openGraph: {
    title: route.title,
    description: route.description,
    url: "/schedule",
    type: "website",
  },
};

export default async function SchedulePage() {
  const data = await getSchedule();
  const breadcrumbJsonLd = getBreadcrumbJsonLd("/schedule", process.env.NEXT_PUBLIC_SITE_URL);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <ScheduleView data={data} nowMs={data.readAt} />
    </>
  );
}
