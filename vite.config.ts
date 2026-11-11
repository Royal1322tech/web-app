import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// First hero image per route. `sizes` matches the rendered image, so the browser reuses this request.
const heroes = {
  "/": { src: "/images/home/hero/maldives-ai.png", sizes: "100vw", session: true },
  "/car-rental": { src: "/images/rental/luxury-arrival.webp", sizes: "(max-width: 1320px) 100vw, 1280px", session: true },
  "/contact": { src: "/images/home/cinematic/coastal-resort.png", sizes: "100vw", session: false },
};

/** Starts the hero image download with the HTML instead of after the app's JavaScript has run. */
function preloadHeroImages(): Plugin {
  return {
    name: "preload-hero-images",
    transformIndexHtml() {
      const sources = JSON.parse(readFileSync("src/generated/image-sources.json", "utf8")) as Record<string, string>;
      const routes = Object.fromEntries(Object.entries(heroes).map(([path, hero]) => [path, {
        srcset: sources[hero.src],
        phone: sources[`${hero.src}#phone`].split(" ")[0],
        sizes: hero.sizes,
        session: hero.session,
      }]));
      // Signed-out visitors are redirected away from session routes, and query strings select other layouts.
      const children = `(function(){try{var r=${JSON.stringify(routes)}[location.pathname];if(!r||location.search||(r.session&&sessionStorage.getItem("royal-vacation.demo-auth.v1")!=="active"))return;var l=document.createElement("link");l.rel="preload";l.as="image";l.fetchPriority="high";if(matchMedia("(max-width: 599px)").matches)l.href=r.phone;else{l.imageSrcset=r.srcset;l.imageSizes=r.sizes}document.head.appendChild(l)}catch(e){}})()`;
      return [{ tag: "script", children, injectTo: "head" }];
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), preloadHeroImages()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
