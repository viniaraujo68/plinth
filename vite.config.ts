import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { sveltekit } from "@sveltejs/kit/vite";
import adapter from "@sveltejs/adapter-static";
import devtoolsJson from "vite-plugin-devtools-json";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // The theme declares every color once through `light-dark()`. Lightning CSS -- which Vite runs
  // to minify CSS -- rewrites that into a pair of inherited `--lightningcss-*` guard variables
  // whenever the target browsers predate native support. The rewrite is not equivalent: a custom
  // property substitutes its own `var()` references on the element that DECLARES it, so the
  // guards are resolved once at `:root` and `[data-theme]` on a nested element can no longer
  // re-theme its subtree. Naming targets that support `light-dark()` natively keeps it intact.
  // A consumer's own build needs the same floor.
  build: { cssTarget: ["chrome123", "edge123", "firefox120", "safari17.5"] },

  plugins: [
    tailwindcss(),
    devtoolsJson(),
    sveltekit({
      compilerOptions: {
        // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
        // The compiler's a11y warnings duplicate eslint-plugin-svelte's a11y rules, which run
        // over the same files with far better context. Keeping both means every violation is
        // reported twice, so the compiler channel is the one that goes quiet.
        warningFilter: (warning) => !warning.code.startsWith("a11y"),
      },

      // The showcase is a static site; the library itself ships through svelte-package.
      // No SPA fallback: every showcase route is prerendered, so a route that stops being
      // prerenderable should break the build instead of silently degrading to client routing.
      adapter: adapter(),

      prerender: {
        handleHttpError: ({ referrer, message }) => {
          // The shell demo renders a fake application's navigation, and navigation means real
          // `<a href>`s -- to routes that exist only inside that demo's own config. The crawler
          // follows them and finds nothing, which is correct and expected. Every broken link
          // anywhere else still fails the build.
          if (referrer === "/shell") return;
          throw new Error(message);
        },
      },
    }),
  ],
  test: {
    expect: { requireAssertions: true },
    projects: [
      {
        extends: "./vite.config.ts",
        test: {
          name: "client",
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium", headless: true }],
          },
          include: ["src/**/*.svelte.{test,spec}.{js,ts}"],
          exclude: ["src/lib/server/**"],
        },
      },

      {
        extends: "./vite.config.ts",
        test: {
          name: "server",
          environment: "node",
          include: ["src/**/*.{test,spec}.{js,ts}"],
          exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"],
        },
      },
    ],
  },
});
