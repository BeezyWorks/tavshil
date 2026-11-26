#!/usr/bin/env node
/**
 * Wraps raw screenshots in captioned App Store frames.
 *   node scripts/store-frames.mjs <rawDir> <outDir>
 * Reads <rawDir>/{ipad,iphone}-<name>.png (from store-shots.mjs) and writes <outDir>/{ipad-13,iphone-6.9}/NN-name.png.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const [rawDir, outDir] = process.argv.slice(2).map((p) => resolve(p))
const fonts = resolve('node_modules/.pnpm')
const bricolage = `${fonts}/@expo-google-fonts+bricolage-grotesque@0.4.1/node_modules/@expo-google-fonts/bricolage-grotesque/700Bold/BricolageGrotesque_700Bold.ttf`
const instrument = `${fonts}/@expo-google-fonts+instrument-sans@0.4.2/node_modules/@expo-google-fonts/instrument-sans/500Medium/InstrumentSans_500Medium.ttf`

const FRAMES = [
  ['1-meal-plan', 'Plan Shabbat for guests', 'Every meal, every guest, one menu'],
  [
    '2-things-to-fix',
    'Plan around your people',
    'Gluten free, vegetarian, allergies: flagged per dish',
  ],
  ['3-shopping-chalav', 'Customs, on your list', 'Chalav Yisrael and more, sorted as you shop'],
  ['4-cook-timers', 'Cook with timers', 'Step by step, with every timer running'],
  ['5-connect-ai', 'Works with your own AI', 'Connect Claude or any assistant in one paste'],
  ['6-people', 'Every guest, remembered', 'Allergies, customs and favorites in one place'],
]
const DEVICES = {
  ipad: { dir: 'ipad-13', w: 2752, h: 2064, head: 104, sub: 50, pad: 96, shot: 0.9, zoom: 1 },
  iphone: { dir: 'iphone-6.9', w: 1320, h: 2868, head: 80, sub: 42, pad: 120, shot: 0.86, zoom: 1 },
}
for (const [device, c] of Object.entries(DEVICES)) {
  mkdirSync(`${outDir}/${c.dir}`, { recursive: true })
  FRAMES.forEach(([name, title, sub], i) => {
    const html = `<!doctype html><meta charset=utf-8><style>
@font-face{font-family:B;src:url('file://${bricolage}')}
@font-face{font-family:I;src:url('file://${instrument}')}
html,body{margin:0;width:${c.w}px;height:${c.h}px;overflow:hidden}
body{background:linear-gradient(180deg,#2E6A4E 0%,#1F4D37 100%);position:relative}
h1{font:700 ${c.head}px/1.05 B,sans-serif;color:#fff;margin:0;position:absolute;left:0;right:0;top:${c.pad}px;text-align:center;padding:0 ${c.pad * 0.6}px}
p{font:500 ${c.sub}px/1.3 I,sans-serif;color:#CFE6D9;margin:0;position:absolute;left:0;right:0;top:${c.pad + c.head * 1.15 + 30}px;text-align:center}
.card{position:absolute;left:${(c.w * (1 - c.shot)) / 2}px;width:${c.w * c.shot}px;top:${c.pad + c.head * 1.15 + c.sub * 1.3 + 110}px;bottom:-60px;border-radius:${c.w * 0.03}px;overflow:hidden;box-shadow:0 30px 90px rgba(0,0,0,.4);background:#FAF9F6}
.card img{width:${c.zoom * 100}%;margin-left:${-(c.zoom - 1) * 50}%;display:block}
</style><h1>${title}</h1><p>${sub}</p><div class=card><img src="file://${rawDir}/${device}-${name}.png"></div>`
    const f = `${outDir}/.${device}-${i}.html`
    writeFileSync(f, html)
    execFileSync(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      [
        '--headless=new',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        `--window-size=${c.w},${c.h}`,
        '--virtual-time-budget=4000',
        `--screenshot=${outDir}/${c.dir}/${String(i + 1).padStart(2, '0')}-${name.replace(/^\d+-/, '')}.png`,
        `file://${f}`,
      ],
      { stdio: 'ignore' },
    )
  })
}
