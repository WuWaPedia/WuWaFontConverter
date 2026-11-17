import htmlMinifier from 'astro-html-minifier-next'
import { defineConfig } from 'astro/config'
import { fileURLToPath } from 'node:url'
import { viteSingleFile } from 'vite-plugin-singlefile'

import { fontBase64 } from './scripts/vite-font-base64.mjs'

const target = process.env.BUILD_TARGET === 'wiki' ? 'wiki' : 'site'
const abs = p => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
	outDir: target === 'wiki' ? './dist-wiki' : './dist',
	integrations: [
		htmlMinifier({
			alwaysWriteMinifiedHTML: true,

			collapseBooleanAttributes: true,
			collapseInlineTagWhitespace: true,
			collapseWhitespace: true,
			decodeEntities: true,
			keepClosingSlash: false,
			mergeScripts: true,
			minifyCSS: true,
			minifyJS: true,
			minifySVG: true,
			minifyURLs: true,
			removeAttributeQuotes: true,
			removeComments: true,
			removeOptionalTags: target === 'site',
			removeRedundantAttributes: true,
			removeDefaultTypeAttributes: true,
			useShortDoctype: true
		})
	],
	build: {
		inlineStylesheets: 'always'
	},
	vite: {
		plugins: [fontBase64(), viteSingleFile({ removeViteModuleLoader: true })],
		define: {
			__BUILD_TARGET__: JSON.stringify(target)
		},
		resolve: {
			alias: {
				'@font-provider': abs(
					target === 'wiki' ? './src/scripts/fonts/provider.wiki.ts' : './src/scripts/fonts/provider.embedded.ts'
				)
			}
		},
		build: {
			assetsInlineLimit: Number.MAX_SAFE_INTEGER
		}
	}
})
