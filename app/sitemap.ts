import type { MetadataRoute } from "next";
import { BLOG_ARTICLES } from "@/lib/blog-content";
import { getPlaceSeoItems } from "@/lib/como-llegar";
import { getRouteSeoItems } from "@/lib/route-seo";
import { DATA_LAST_UPDATED_ISO, SITE_CONTENT_LAST_UPDATED_ISO } from "@/lib/mobility-config";
import { SITE_URL } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const CONTENT_LAST_MODIFIED = new Date(`${SITE_CONTENT_LAST_UPDATED_ISO}T12:00:00-06:00`);
  const ROUTES_LAST_MODIFIED = new Date(`${DATA_LAST_UPDATED_ISO}T12:00:00-06:00`);
  const STATIC_LAST_MODIFIED = new Date("2026-01-01");

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: CONTENT_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${SITE_URL}/mapa`,
      lastModified: CONTENT_LAST_MODIFIED,
      changeFrequency: "daily",
      priority: 0.9
    },
    {
      url: `${SITE_URL}/privacidad`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.3
    },
    {
      url: `${SITE_URL}/teleferico-uruapan-horario`,
      lastModified: CONTENT_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.95
    },
    {
      url: `${SITE_URL}/rutas`,
      lastModified: ROUTES_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.85
    },
    {
      url: `${SITE_URL}/horarios`,
      lastModified: ROUTES_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.9
    },
    {
      url: `${SITE_URL}/como-llegar`,
      lastModified: ROUTES_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.85
    },
    {
      url: `${SITE_URL}/guia`,
      lastModified: CONTENT_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.85
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: CONTENT_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.8
    },
    {
      url: `${SITE_URL}/acerca-de`,
      lastModified: CONTENT_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.7
    },
    {
      url: `${SITE_URL}/datos-api`,
      lastModified: CONTENT_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.5
    },
    {
      url: `${SITE_URL}/apoyar`,
      lastModified: CONTENT_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.5
    }
  ];

  const routeUrls: MetadataRoute.Sitemap = getRouteSeoItems()
    // El teleférico se publica en /teleferico-uruapan-horario; /ruta/teleferico-uruapan redirige allí.
    .filter((route) => route.slug !== "teleferico-uruapan")
    .map((route) => ({
    url: `${SITE_URL}/ruta/${route.slug}`,
    lastModified: ROUTES_LAST_MODIFIED,
    changeFrequency: "monthly",
    priority: 0.7
  }));

  const blogUrls: MetadataRoute.Sitemap = BLOG_ARTICLES.map((article) => ({
    url: `${SITE_URL}/blog/${article.slug}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: "monthly",
    priority: 0.75
  }));

  const placeUrls: MetadataRoute.Sitemap = getPlaceSeoItems().map((place) => ({
    url: `${SITE_URL}/como-llegar/${place.slug}`,
    lastModified: ROUTES_LAST_MODIFIED,
    changeFrequency: "monthly",
    priority: 0.8
  }));

  return [...staticUrls, ...routeUrls, ...blogUrls, ...placeUrls];
}
