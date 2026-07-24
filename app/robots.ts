import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * Личный кабинет закрыт авторизацией, но в индекс попадать не должен и он:
 * иначе поисковик тратит обход на страницы, которые всё равно отдают редирект.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/groups", "/achievements", "/reset-password"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
