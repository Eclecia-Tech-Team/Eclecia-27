import type { Metadata } from "next";
import { EventsAtlas } from "@/components/events/EventsAtlas";
import { getBreadcrumbJsonLd, ROUTES } from "@/constants/seo";

const route = ROUTES.find((r) => r.path === "/events")!;

export const metadata: Metadata = {
  title: route.title,
  description: route.description,
  alternates: {
    canonical: "/events",
  },
  openGraph: {
    title: route.title,
    description: route.description,
    url: "/events",
    type: "website",
  },
};

export default function EventsPage() {
  const breadcrumbJsonLd = getBreadcrumbJsonLd(
    "/events",
    process.env.NEXT_PUBLIC_SITE_URL,
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <EventsAtlas />
    </>
  );
}
