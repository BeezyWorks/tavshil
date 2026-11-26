#!/usr/bin/env node
/**
 * Renders the App Store "Header" and "Search Results" creative assets with headless Chrome.
 *   node scripts/store-header.mjs <rawDir> <outDir>
 * Uses assets/brand/icon.png and <rawDir>/ipad-2-things-to-fix.png (from store-shots.mjs).
 * Writes <outDir>/{header,search}-{5244x2950,3840x1646}.png
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const [rawDir, outDir] = process.argv.slice(2).map((p) => resolve(p))
const fonts = resolve('node_modules/.pnpm')
const bricolage = `${fonts}/@expo-google-fonts+bricolage-grotesque@0.4.1/node_modules/@expo-google-fonts/bricolage-grotesque/700Bold/BricolageGrotesque_700Bold.ttf`
const instrument = `${fonts}/@expo-google-fonts+instrument-sans@0.4.2/node_modules/@expo-google-fonts/instrument-sans/500Medium/InstrumentSans_500Medium.ttf`
const icon = resolve('assets/brand/icon.png')
mkdirSync(outDir, { recursive: true })

const SIZES = [
  [5244, 2950],
  [3840, 1646],
]

// u = 1% of the height, so the artwork scales with either aspect ratio.
const header = (W, H) => `
<div class=wrap>
  <div class=text>
    <img class=icon src="file://${icon}">
    <h1>Plan Shabbat<br>for guests</h1>
    <p>Recipes, menus and shopping for kosher families. Works with your own AI.</p>
  </div>
  <div class=card><img src="file://${rawDir}/ipad-2-things-to-fix.png"></div>
</div>
<style>
.wrap{position:absolute;inset:0}
.text{position:absolute;left:${W * 0.075}px;top:50%;transform:translateY(-50%);width:${H * 0.78}px}
.icon{width:${H * 0.17}px;height:${H * 0.17}px;border-radius:${H * 0.038}px;box-shadow:0 ${H * 0.012}px ${H * 0.04}px rgba(0,0,0,.35);margin-bottom:${H * 0.05}px}
h1{font:700 ${H * 0.105}px/1.04 B,sans-serif;color:#fff;margin:0 0 ${H * 0.035}px}
p{font:500 ${H * 0.037}px/1.3 I,sans-serif;color:#CFE6D9;margin:0}
.card{position:absolute;right:${W * 0.06}px;top:50%;transform:translateY(-50%) rotate(-3deg);width:${H * 0.92}px;height:${H * 0.64}px;border-radius:${H * 0.03}px;overflow:hidden;background:#FAF9F6;box-shadow:0 ${H * 0.03}px ${H * 0.09}px rgba(0,0,0,.45)}
.card img{width:100%;display:block}
</style>`

// Search results crop the asset tighter and centre it, so keep everything in the middle.
const search = (W, H) => `
<div class=c>
  <img class=icon src="file://${icon}">
  <h1>Plan Shabbat for guests</h1>
  <p>Kosher meal planning, checked for every guest</p>
</div>
<style>
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.icon{width:${H * 0.22}px;height:${H * 0.22}px;border-radius:${H * 0.05}px;box-shadow:0 ${H * 0.014}px ${H * 0.05}px rgba(0,0,0,.35);margin-bottom:${H * 0.05}px}
h1{font:700 ${H * 0.115}px/1.05 B,sans-serif;color:#fff;margin:0 0 ${H * 0.03}px}
p{font:500 ${H * 0.042}px/1.3 I,sans-serif;color:#CFE6D9;margin:0}
</style>`

for (const [W, H] of SIZES) {
  for (const [name, body] of [
    ['header', header(W, H)],
    ['search', search(W, H)],
  ]) {
    const html = `<!doctype html><meta charset=utf-8><style>
@font-face{font-family:B;src:url('file://${bricolage}')}
@font-face{font-family:I;src:url('file://${instrument}')}
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden}
body{position:relative;background:radial-gradient(120% 140% at 70% 30%,#357A58 0%,#2E6A4E 40%,#1B4331 100%)}
</style>${body}`
    const f = `${outDir}/.${name}-${W}.html`
    writeFileSync(f, html)
    execFileSync(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      [
        '--headless=new',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        `--window-size=${W},${H}`,
        '--virtual-time-budget=4000',
        `--screenshot=${outDir}/${name}-${W}x${H}.png`,
        `file://${f}`,
      ],
      { stdio: 'ignore' },
    )
    console.log('wrote', `${name}-${W}x${H}.png`)
  }
}
