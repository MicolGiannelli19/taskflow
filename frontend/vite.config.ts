import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { buildPageCsp, cspHeaderName } from './csp'

/**
 * Ship the page's Content-Security-Policy in the built HTML.
 *
 * A production build is served by a static host that knows nothing about this
 * repo, so without this the deployed app would have no policy at all. A `<meta>`
 * tag is not a complete substitute for the header — `frame-ancestors` is
 * ignored in meta form, so the host must still send the header for clickjacking
 * protection (see `backend/docs/auth.md`) — but it covers script and connect
 * sources, which is what stands behind the markdown renderer.
 */
function cspMetaTag(policy: string): Plugin {
  // Immediately after the charset declaration: a <meta> CSP only governs
  // markup that follows it, and the charset must stay inside the first 1024
  // bytes of the document.
  const anchor = '<meta charset="UTF-8" />'

  return {
    name: 'taskflow-csp-meta',
    apply: 'build',
    transformIndexHtml(html) {
      if (!html.includes(anchor)) {
        throw new Error(
          `[taskflow-csp-meta] could not find ${anchor} in index.html — the ` +
            'CSP meta tag has nowhere safe to go. Update the anchor in vite.config.ts.',
        )
      }
      const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}" />`
      return html.replace(anchor, `${anchor}\n    ${meta}`)
    },
  }
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const dev = command === 'serve'

  if (!env.VITE_CLERK_PUBLISHABLE_KEY) {
    // Without the key the policy cannot name Clerk's instance host, and the
    // app cannot start either (see src/main.tsx). Say so once, clearly.
    console.warn(
      '[taskflow] VITE_CLERK_PUBLISHABLE_KEY is not set: the Content-Security-Policy ' +
        'will not name your Clerk Frontend API host. Run `npx clerk@latest env pull`.',
    )
  }

  const policy = buildPageCsp({
    dev,
    publishableKey: env.VITE_CLERK_PUBLISHABLE_KEY,
    apiUrl: env.VITE_API_URL ?? 'http://localhost:8000',
  })

  return {
    plugins: [
      tailwindcss(),
      react(),
      cspMetaTag(
        // The built app never needs Vite's dev-only allowances.
        buildPageCsp({
          dev: false,
          publishableKey: env.VITE_CLERK_PUBLISHABLE_KEY,
          apiUrl: env.VITE_API_URL,
        }),
      ),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      // Report-only by default: a wrong directive reports instead of breaking
      // sign-in. Set VITE_CSP_MODE=enforce once the console is clean.
      headers: {
        [cspHeaderName(env.VITE_CSP_MODE)]: policy,
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    },
  }
})
