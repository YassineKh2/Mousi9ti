import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "path";
import { defineConfig, Plugin } from "vite";
import { PAGE_ROUTES } from "./src/lib/pageRoutes";
import { getChordRouteDefinitions } from "./src/lib/chordRoutes";
import {
  getScaleRouteDefinitions,
  getScaleShapeRouteDefinitions,
} from "./src/lib/scaleRoutes";

const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, "package.json"), "utf-8"),
);
const siteUrl = "https://mousi9ti.com";

const escapeAttribute = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");

const replaceMeta = (
  html: string,
  attribute: string,
  attributeValue: string,
  value: string,
) =>
  html.replace(
    new RegExp(`<meta\\s+${attribute}="${attributeValue}"[^>]*/>`),
    `<meta ${attribute}="${attributeValue}" content="${escapeAttribute(value)}" />`,
  );

function routeHtmlPlugin(): Plugin {
  return {
    name: "mousi9ti-route-html",
    closeBundle() {
      const indexPath = path.resolve(__dirname, "dist/index.html");
      if (!existsSync(indexPath)) return;
      const template = readFileSync(indexPath, "utf8");

      const writeRouteDocument = (route: {
        path: string;
        canonicalPath?: string;
        title: string;
        description: string;
        indexable?: boolean;
      }) => {
        const canonicalUrl = `${siteUrl}${route.canonicalPath ?? route.path}`;
        let html = template.replace(
          /<title>[\s\S]*?<\/title>/,
          `<title>${escapeAttribute(route.title)}</title>`,
        );
        html = replaceMeta(html, "name", "description", route.description);
        html = replaceMeta(html, "property", "og:title", route.title);
        html = replaceMeta(
          html,
          "property",
          "og:description",
          route.description,
        );
        html = replaceMeta(html, "name", "twitter:title", route.title);
        html = replaceMeta(
          html,
          "name",
          "twitter:description",
          route.description,
        );
        html = html.replace(
          /<link rel="canonical" href="[^"]*"\s*\/>/,
          `<link rel="canonical" href="${canonicalUrl}" />`,
        );
        html = html.replace(
          /<meta property="og:url" content="[^"]*"\s*\/>/,
          `<meta property="og:url" content="${canonicalUrl}" />`,
        );
        if (!route.indexable) {
          html = html.replace(
            /<meta name="robots" content="[^"]*"\s*\/>/,
            '<meta name="robots" content="noindex, follow" />',
          );
        }

        const outputPath = path.resolve(
          __dirname,
          "dist",
          route.path.slice(1),
          "index.html",
        );
        mkdirSync(path.dirname(outputPath), { recursive: true });
        writeFileSync(outputPath, html);
      };

      for (const route of PAGE_ROUTES) {
        if (route.path !== "/") writeRouteDocument(route);
      }

      const chordRoutes = getChordRouteDefinitions();
      chordRoutes.forEach(writeRouteDocument);

      const scaleRoutes = getScaleRouteDefinitions();
      const scaleShapeRoutes = getScaleShapeRouteDefinitions();
      scaleRoutes.forEach(writeRouteDocument);
      scaleShapeRoutes.forEach(writeRouteDocument);

      const minorPentatonicAliases = scaleRoutes
        .filter((route) => route.scaleId === "pentatonic_minor")
        .flatMap((route) => {
          const root = route.path.split("/")[2];
          const aliasPath = `/scale/${root}m/pentatonic`;
          return [
            { ...route, path: aliasPath, canonicalPath: route.path },
            ...scaleShapeRoutes
              .filter(
                (shapeRoute) =>
                  shapeRoute.root === route.root &&
                  shapeRoute.scaleId === route.scaleId,
              )
              .map((shapeRoute) => ({
                ...shapeRoute,
                path: shapeRoute.path.replace(
                  `/scale/${root}/pentatonic`,
                  aliasPath,
                ),
                canonicalPath: shapeRoute.path,
              })),
          ];
        });
      minorPentatonicAliases.forEach(writeRouteDocument);

      [...scaleRoutes, ...scaleShapeRoutes].forEach((route) => {
        const [, , root, ...rest] = route.path.split("/");
        if (!root || root.length < 2) return;
        const capitalizedRoot = `${root[0].toUpperCase()}${root.slice(1)}`;
        if (capitalizedRoot === root) return;
        writeRouteDocument({
          ...route,
          path: `/scale/${capitalizedRoot}/${rest.join("/")}`,
          canonicalPath: route.path,
        });
      });

      const notFoundHtml = template
        .replace(
          /<title>[\s\S]*?<\/title>/,
          "<title>Page Not Found | Mousi9ti</title>",
        )
        .replace(
          /<meta name="robots" content="[^"]*"\s*\/>/,
          '<meta name="robots" content="noindex, follow" />',
        )
        .replace(/\s*<link rel="canonical" href="[^"]*"\s*\/>/, "")
        .replace(/\s*<meta property="og:url" content="[^"]*"\s*\/>/, "");
      writeFileSync(path.resolve(__dirname, "dist/404.html"), notFoundHtml);

      const sitemapEntries = [
        ...PAGE_ROUTES.filter((route) => route.indexable).map(
          (route) => `${siteUrl}${route.path}`,
        ),
        ...chordRoutes
          .filter((route) => route.indexable)
          .map((route) => `${siteUrl}${route.path}`),
        ...scaleRoutes
          .filter((route) => route.indexable)
          .map((route) => `${siteUrl}${route.path}`),
      ]
        .map((url) => `  <url><loc>${url}</loc></url>`)
        .join("\n");
      writeFileSync(
        path.resolve(__dirname, "dist/sitemap.xml"),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`,
      );
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), routeHtmlPlugin()],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              if (id.includes("/src/data/")) return "music-data";
              return undefined;
            }

            if (id.includes("recharts") || id.includes("d3-"))
              return "charts-vendor";
            if (id.includes("soundfont2") || id.includes("smplr"))
              return "audio-vendor";
            if (id.includes("motion")) return "motion-vendor";
            if (id.includes("react") || id.includes("react-dom"))
              return "react-vendor";
            return undefined;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === "true" ? null : {},
    },
  };
});
