import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { ROUTES } from "@/constants/seo";
import connect from "@/lib/mongoose";
import Event from "@/lib/models/Events";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "")
    : "";
  const lastModified = new Date();
  const url = (path: string) => (baseUrl ? `${baseUrl}${path}` : path || "/");

  const pages: MetadataRoute.Sitemap = ROUTES.map((route) => ({
    url: url(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // One URL per event page. Read per request (not at build time); a database
  // hiccup just leaves them out instead of failing the sitemap.
  await connection();
  try {
    await connect();
    const events = await Event.find().select("slug updatedAt").lean<{ slug: string; updatedAt?: Date }[]>();
    for (const e of events) {
      pages.push({ url: url(`/events/${e.slug}`), lastModified: e.updatedAt ?? lastModified, changeFrequency: "daily", priority: 0.7 });
    }
  } catch (err) {
    console.error("[sitemap] events skipped", err);
  }
  return pages;
}
