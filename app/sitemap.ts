import type { MetadataRoute } from "next";
const paths = ["/", "/menu", "/experience", "/spaces", "/gallery", "/events", "/about", "/visit"];
export default function sitemap(): MetadataRoute.Sitemap { const base = process.env.NEXT_PUBLIC_APP_URL; if (!base) return []; return paths.map((path) => ({ url: new URL(path, base).toString(), lastModified: new Date() })); }
