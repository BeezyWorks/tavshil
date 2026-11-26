#!/usr/bin/env node
/**
 * Captures App Store screenshots of the web build with headless Chrome (DevTools protocol, no dependencies).
 *
 *   node scripts/store-shots.mjs <outDir> <ipad|iphone> <shots.json>
 *
 * Needs the app (default http://localhost:8099) pointed at a seeded worker, and the demo token (default dev-demo3).
 * A shot is { name, path, wait?, js? } where js runs in the page after load (e.g. to tap a button).
 */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const [outDir, device = 'ipad', shotsFile] = process.argv.slice(2)
const APP = process.env.APP_URL ?? 'http://localhost:8099'
const TOKEN = process.env.DEMO_TOKEN ?? 'dev-demo3'
const SIZES = {
  // CSS pixels x2 = 2752x2064 (iPad 13", landscape) and 1320x2868 (iPhone 6.9").
  ipad: { width: 1376, height: 1032, mobile: false },
  iphone: { width: 660, height: 1434, mobile: false },
}
const size = SIZES[device]
// Extra viewport height the frame script crops off, so overlays pinned to the bottom (dev toasts, tab bar) stay out.
const EXTRA = Number(process.env.EXTRA_H ?? (device === 'iphone' ? 260 : 170))
mkdirSync(outDir, { recursive: true })
const shots = JSON.parse(readFileSync(shotsFile, 'utf8'))

const port = 9333
const chrome = spawn(
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${outDir}/.profile`,
    '--hide-scrollbars',
    '--no-first-run',
    'about:blank',
  ],
  { stdio: 'ignore' },
)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let targets
for (let i = 0; i < 50; i++) {
  try {
    targets = await (await fetch(`http://localhost:${port}/json`)).json()
    if (targets.length) break
  } catch {}
  await sleep(200)
}
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (m) => {
  const d = JSON.parse(m.data)
  if (d.id && pending.has(d.id)) {
    pending.get(d.id)(d)
    pending.delete(d.id)
  }
}
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id
    pending.set(i, (d) => (d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result)))
    ws.send(JSON.stringify({ id: i, method, params }))
  })
const evalJs = (expression) =>
  send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })

await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', {
  width: size.width,
  height: size.height + EXTRA,
  deviceScaleFactor: 2,
  mobile: size.mobile,
})
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `try{localStorage.setItem('tavshil.authToken', ${JSON.stringify(TOKEN)})}catch(e){}`,
})

for (const shot of shots) {
  await send('Page.navigate', { url: APP + shot.path })
  await sleep(shot.wait ?? 3500)
  if (shot.js) {
    const r = await evalJs(shot.js)
    if (r.exceptionDetails)
      console.error(shot.name, 'js error', JSON.stringify(r.exceptionDetails).slice(0, 300))
    await sleep(shot.after ?? 1500)
  }
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  const file = `${outDir}/${device}-${shot.name}.png`
  writeFileSync(file, Buffer.from(data, 'base64'))
  console.log('wrote', file)
}
chrome.kill()
process.exit(0)
