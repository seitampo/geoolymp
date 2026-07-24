import type { MetadataRoute } from "next";
import { publicRoutes, siteUrl } from "@/lib/site";

/** Только публичные страницы: содержимое групп доступно после входа. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();

  return publicRoutes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.5,
  }));
}
