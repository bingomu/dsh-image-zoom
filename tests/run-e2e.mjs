/**
 * End-to-end check for dsh-image-zoom in a real Chrome (CDP).
 *
 * Run:  node tests/run-e2e.mjs
 * Needs a headless Chrome started with --remote-debugging-port=9333
 * (`tests/chrome.sh` starts one). Results are printed as PASS/FAIL lines and the
 * process exits non-zero on the first failure group.
 */
import path from 'node:path'
import fs from 'node:fs'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { openFresh, evaluate, shot, click, drag, wheelMod, doubleClick, keyPress } from './cdp.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SHOTS = path.join(HERE, 'shots')
fs.mkdirSync(SHOTS, { recursive: true })

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok), detail })
  const mark = ok ? 'PASS' : 'FAIL'
  console.log(`${mark}  ${name}${detail ? '  — ' + detail : ''}`)
}

const near = (a, b, tolerance) => Math.abs(a - b) <= tolerance
const close = (a, b, ratio = 0.03) => Math.abs(a - b) <= Math.abs(b) * ratio + 0.002

const c = await openFresh()
await c.send('Page.enable')
await c.send('Runtime.enable')
await c.send('Log.enable')

const consoleErrors = []
c.on(msg => {
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') consoleErrors.push(msg.params.entry.text)
  if (msg.method === 'Runtime.exceptionThrown') consoleErrors.push(msg.params.exceptionDetails.text || 'exception')
})

// Serve the plugin over http://127.0.0.1 so `/api/file?path=` is a same-origin
// route, exactly like the real app. A file:// page cannot exercise that branch.
const ROOT = path.resolve(HERE, '..')
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' }
const staticServer = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1')
  if (url.pathname === '/api/file') { res.writeHead(404); res.end('not found'); return }
  const file = path.resolve(ROOT, '.' + decodeURIComponent(url.pathname))
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end(); return }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); res.end('not found'); return }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' })
    res.end(data)
  })
})
await new Promise(resolve => staticServer.listen(0, '127.0.0.1', resolve))
const harnessPort = staticServer.address().port
const harness = `http://127.0.0.1:${harnessPort}/tests/harness.html`
const downloadsDir = path.join(HERE, 'downloads')
fs.rmSync(downloadsDir, { recursive: true, force: true })
fs.mkdirSync(downloadsDir, { recursive: true })
// Downloads are browser-scoped, so configure them on the browser target. The
// browser connection stays open while downloads run: disconnecting it resets the
// behavior and a headless browser then drops the download silently.
const downloadBrowser = await (async () => {
  const version = await (await fetch('http://127.0.0.1:9333/json/version')).json()
  const ws = new WebSocket(version.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve); ws.addEventListener('error', reject) })
  ws.send(JSON.stringify({ id: 1, method: 'Browser.setDownloadBehavior', params: { behavior: 'allow', downloadPath: downloadsDir, eventsEnabled: true } }))
  await new Promise(resolve => setTimeout(resolve, 250))
  return ws
})()
await c.send('Page.navigate', { url: harness })
await new Promise(resolve => setTimeout(resolve, 900))

const st = () => evaluate(c, `(() => {
  const hooks = window.__DIZ_TEST__
  const v = hooks ? hooks.view : null
  const root = document.querySelector('.diz-root')
  const img = document.querySelector('.diz-img')
  let css = null
  if (img) {
    const m = new DOMMatrix(getComputedStyle(img).transform)
    css = { a: m.a, b: m.b, e: m.e, f: m.f }
  }
  return {
    applied: Boolean(window.__APPLIED__),
    open: hooks ? hooks.isOpen() : false,
    rootInDom: Boolean(root),
    display: root ? getComputedStyle(root).display : null,
    styleInDom: Boolean(document.getElementById('dsh-image-zoom-style')),
    ariaModal: root ? root.getAttribute('aria-modal') : null,
    scale: v ? v.scale : null,
    fit: v ? v.fit : null,
    tx: v ? v.tx : null,
    ty: v ? v.ty : null,
    rot: v ? v.rot : null,
    index: v ? v.index : null,
    gallery: v && v.gallery ? v.gallery.length : 0,
    pct: document.querySelector('.diz-zoom') ? parseInt(document.querySelector('.diz-zoom').value, 10) : null,
    pos: document.querySelector('.diz-pos') ? document.querySelector('.diz-pos').textContent : null,
    deg: document.querySelector('.diz-deg') ? document.querySelector('.diz-deg').textContent : null,
    mode: (() => {
      const active = document.querySelector('.diz-mode-pill.diz-active')
      return active ? active.getAttribute('data-diz-mode') : null
    })(),
    imgSrc: img ? String(img.src).slice(0, 40) : null,
    loadingShown: Boolean(document.querySelector('.diz-loading.diz-show')),
    errorShown: Boolean(document.querySelector('.diz-error.diz-show')),
    loadingExists: Boolean(document.querySelector('.diz-loading')),
    errorRole: document.querySelector('.diz-error') ? document.querySelector('.diz-error').getAttribute('role') : null,
    css,
  }
})()`)

async function rectOf(selector) {
  const raw = await evaluate(c, `(() => {
    const node = document.querySelector(${JSON.stringify(selector)})
    if (!node) return null
    const r = node.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, left: r.left, top: r.top, width: r.width, height: r.height }
  })()`)
  return raw
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// ---------------------------------------------------------------- 1. install
let s = await st()
check('plugin applied and viewer closed', s.applied && !s.open && !s.rootInDom)
check('style injected', s.styleInDom)

// ------------------------------------------------------------ 2. click image
const wide = await rectOf('#wide')
await click(c, wide.x, wide.y)
await sleep(250)
s = await st()
check('click a content image opens the viewer', s.open && s.rootInDom)
check('dialog is modal and labelled', s.ariaModal === 'true' && s.pos !== null)
check('gallery collected content images only', s.gallery === 5, `gallery=${s.gallery}`)
check('opens on the clicked image (first)', s.index === 0 && s.pos === `1 / ${s.gallery}`, `pos=${s.pos}`)
check('opens fitted and centred', close(s.scale, s.fit) && s.tx === 0 && s.ty === 0, `scale=${s.scale} fit=${s.fit}`)
check('percent readout matches scale', s.pct === Math.round(s.scale * 100))
check('CSS transform matches state (matrix)', s.css && near(s.css.a, s.scale, 0.01) && near(s.css.e, s.tx, 0.6) && near(s.css.f, s.ty, 0.6))
await shot(c, path.join(SHOTS, 'e2e-01-opened.png'))

// ------------------------------------------------- 2b. download naming rule
const naming = JSON.parse(await evaluate(c, `(() => {
  const h = window.__DIZ_TEST__
  const stamp = new Date(2026, 10, 1, 19, 42, 7)
  return JSON.stringify({
    alt: h.fileNameForDownload('blob:http://example/abc', '星港 · 个人知识库架构图', 'PNG', stamp),
    illegal: h.fileNameForDownload('blob:http://example/abc', 'a/b:c*"<>|?  spaces', 'PNG', stamp),
    reserved: h.fileNameForDownload('blob:http://example/abc', 'CON', 'PNG', stamp),
    long: h.fileNameForDownload('blob:http://example/abc', '这是一个非常非常长的图片说明文字'.repeat(6), 'PNG', stamp),
    blob: h.fileNameForDownload('blob:http://example/abc', '', 'WEBP', stamp),
    file: h.fileNameForDownload('http://127.0.0.1:1/api/file?path=/tmp/starport-architecture.png', '', '', stamp),
    generic: h.fileNameForDownload('http://127.0.0.1:1/api/file?path=/tmp/image.png', '', '', stamp),
    jpg: h.fileNameForDownload('http://example.com/photo.jpeg', '', 'JPG', stamp),
    svg: h.fileNameForDownload('http://example.com/icon.svg', '', 'SVG', stamp),
    shareable: h.isShareableSource('https://example.com/a.png'),
    blobShareable: h.isShareableSource('blob:http://example.com/abc'),
    dataShareable: h.isShareableSource('data:image/png;base64,AAA'),
    localShareable: h.isShareableSource('http://127.0.0.1:1/api/file?path=/tmp/a.png'),
  })
})()`))
check('download name = alt + timestamp + format extension', naming.alt === '星港-个人知识库架构图-20261101-194207.png', naming.alt)
check('download name strips characters Windows forbids', !/[\\/:*?"<>|]/.test(naming.illegal) && naming.illegal.startsWith('a-b-c'), naming.illegal)
check('download name protects Windows reserved names', naming.reserved.startsWith('CON_'), naming.reserved)
check('download name truncates very long descriptions', naming.long.split('-2026')[0].length <= 48, naming.long)
check('blob image without alt falls back to localized name', naming.blob.startsWith('图片-') && naming.blob.endsWith('.webp'), naming.blob)
check('meaningful source filename is kept', naming.file.startsWith('starport-architecture-') && naming.file.endsWith('.png'), naming.file)
check('generic source filename is replaced', naming.generic.startsWith('图片-'), naming.generic)
check('extension follows detected format', naming.jpg.endsWith('.jpg') && naming.svg.endsWith('.svg'), `${naming.jpg} | ${naming.svg}`)
check('link is shareable only for absolute http(s), not blob/data', naming.shareable && !naming.blobShareable && !naming.dataShareable, JSON.stringify({ shareable: naming.shareable, blob: naming.blobShareable, data: naming.dataShareable }))

const pathProbe = JSON.parse(await evaluate(c, `(() => {
  const h = window.__DIZ_TEST__
  const base = location.origin
  return JSON.stringify({
    api: h.localPathOf(base + '/api/file?path=' + encodeURIComponent('/tmp/starport-architecture.png')),
    file: h.localPathOf('file:///tmp/a%20b.png'),
    win: h.localPathOf('file:///C:/images/a.png'),
    blob: h.localPathOf('blob:' + base + '/abc'),
    data: h.localPathOf('data:image/png;base64,AAA'),
    remote: h.localPathOf('https://example.com/a.png'),
  })
})()`))
check('local path is read from the workspace file route', pathProbe.api === '/tmp/starport-architecture.png', String(pathProbe.api))
check('file: URLs keep their path (including Windows drive letters)', pathProbe.file === '/tmp/a b.png' && pathProbe.win === 'C:/images/a.png', JSON.stringify(pathProbe))
check('blob/data/remote sources have no local path', pathProbe.blob === undefined && pathProbe.data === undefined && pathProbe.remote === undefined)

const actions = JSON.parse(await evaluate(c, `JSON.stringify({
  acts: [...document.querySelectorAll('.diz-head [data-diz-act]')].map(node => node.getAttribute('data-diz-act')),
  linkHidden: document.querySelector('[data-diz-act="link"]').hidden,
  downloadTitle: document.querySelector('[data-diz-act="download"]').title,
  openTitle: document.querySelector('[data-diz-act="open"]').title,
})`))
check('header exposes download / copy / link / open / close', ['download', 'copy', 'link', 'open', 'close'].every(act => actions.acts.includes(act)), JSON.stringify(actions.acts))
check('copy-link is hidden for a blob/data image', actions.linkHidden === true)
check('open tooltip explains a path-less attachment', /本地路径/.test(actions.openTitle), actions.openTitle)
check('download tooltip previews the generated filename', /WIDE-test-image-\d{8}-\d{6}\.svg/.test(actions.downloadTitle), actions.downloadTitle)

// Click download and verify the browser really receives that filename.
const downloadButton = await rectOf('[data-diz-act="download"]')
await click(c, downloadButton.x, downloadButton.y)
let downloaded = []
for (let attempt = 0; attempt < 30; attempt += 1) {
  await sleep(120)
  // Chrome writes a .crdownload sibling until the transfer completes; wait for the real file.
  downloaded = fs.existsSync(downloadsDir) ? fs.readdirSync(downloadsDir).filter(name => !name.endsWith('.crdownload')) : []
  if (downloaded.length > 0) break
}
check('download lands with the generated filename', downloaded.length === 1 && /^WIDE-test-image-\d{8}-\d{6}\.svg$/.test(downloaded[0]), downloaded.join(', '))
downloadBrowser.close()

const stage = await rectOf('.diz-stage')
const zoomAt = { x: stage.x, y: stage.y }

// ------------------------------------------------------- 3. wheel zoom (mouse)
const scaleBefore = s.scale
await wheelMod(c, zoomAt.x, zoomAt.y, 0, -120, 0)
await sleep(120)
s = await st()
check('mouse wheel zooms in', s.scale > scaleBefore * 1.15, `${scaleBefore.toFixed(3)} → ${s.scale.toFixed(3)}`)

const scaleSecond = s.scale
await wheelMod(c, zoomAt.x, zoomAt.y, 0, -120, 0)
await sleep(80)
s = await st()
check('each mouse notch keeps zooming (no pan switch)', s.scale > scaleSecond * 1.15, `${scaleSecond.toFixed(3)} → ${s.scale.toFixed(3)}`)
await wheelMod(c, zoomAt.x, zoomAt.y, 0, -120, 0)
await wheelMod(c, zoomAt.x, zoomAt.y, 0, -120, 0)
await sleep(120)
s = await st()
check('a wheel burst keeps zooming', s.scale > scaleSecond * 1.4, `→ ${s.scale.toFixed(3)}`)

// Set a comfortable zoom through the input, so panning has room to move.
await evaluate(c, `(() => { const i = document.querySelector('.diz-zoom'); i.focus(); i.select(); i.value = '200' })()`)
await keyPress(c, 'Enter', 'Enter', 13)
await sleep(360)
s = await st()
check('typed percentage zooms to 200%', s.pct === 200 && near(s.scale, 2, 0.001), `pct=${s.pct} scale=${s.scale}`)

// ------------------------------------------------- 4. trackpad two-finger pan
const beforePan = s
for (let i = 0; i < 4; i += 1) await wheelMod(c, zoomAt.x, zoomAt.y, 0, 18, 0)
await sleep(240)
s = await st()
check('two-finger vertical scroll pans vertically', near(s.ty, beforePan.ty - 72, 22), `ty ${beforePan.ty.toFixed(1)} → ${s.ty.toFixed(1)}`)

const beforeH = s
await wheelMod(c, zoomAt.x, zoomAt.y, 24, 0, 0)
await sleep(120)
s = await st()
check('two-finger horizontal scroll pans horizontally', near(s.tx, beforeH.tx - 24, 2), `tx ${beforeH.tx.toFixed(1)} → ${s.tx.toFixed(1)}`)

const beforeMixed = s
await wheelMod(c, zoomAt.x, zoomAt.y, 7, 11, 0)
await sleep(120)
s = await st()
check('diagonal two-finger scroll pans both axes', near(s.tx, beforeMixed.tx - 7, 2) && near(s.ty, beforeMixed.ty - 11, 2), `Δtx=${(s.tx - beforeMixed.tx).toFixed(1)} Δty=${(s.ty - beforeMixed.ty).toFixed(1)}`)

const beforeShift = s
await wheelMod(c, zoomAt.x, zoomAt.y, 0, 120, 8)
await sleep(120)
s = await st()
check('Shift+wheel pans sideways', near(s.tx, beforeShift.tx - 120, 4), `tx ${beforeShift.tx.toFixed(1)} → ${s.tx.toFixed(1)}`)

// ------------------------------------------------------ 5. trackpad pinch zoom
const beforePinch = s
for (let i = 0; i < 5; i += 1) await wheelMod(c, zoomAt.x, zoomAt.y, 0, -10, 2)
await sleep(140)
s = await st()
check('ctrl+wheel (trackpad pinch) zooms in', s.scale > beforePinch.scale * 1.04, `${beforePinch.scale.toFixed(3)} → ${s.scale.toFixed(3)}`)

// --------------------------------------------------------------- 6. drag pan
const beforeDrag = s
await drag(c, stage.x, stage.y, stage.x + 110, stage.y + 90)
await sleep(120)
s = await st()
check('drag pans both axes', near(s.tx, beforeDrag.tx + 110, 6) && near(s.ty, beforeDrag.ty + 90, 6), `Δtx=${(s.tx - beforeDrag.tx).toFixed(1)} Δty=${(s.ty - beforeDrag.ty).toFixed(1)}`)
await shot(c, path.join(SHOTS, 'e2e-02-zoomed-panned.png'))

// ------------------------------------------------------------- 7. fit / 1:1
await keyPress(c, '0', 'Digit0', 48)
await sleep(320)
s = await st()
check('key 0 fits to window', close(s.scale, s.fit) && s.tx === 0 && s.ty === 0, `scale=${s.scale.toFixed(3)} fit=${s.fit.toFixed(3)}`)
check('CSS matrix follows fit', s.css && near(s.css.a, s.scale, 0.01))

await keyPress(c, '1', 'Digit1', 49)
await sleep(320)
s = await st()
check('key 1 goes to actual size', near(s.scale, 1, 0.001), `scale=${s.scale}`)

await keyPress(c, '+', 'Equal', 187)
await sleep(320)
s = await st()
check('key + zooms (25%)', near(s.scale, 1.25, 0.002), `scale=${s.scale}`)
await keyPress(c, '-', 'Minus', 189)
await sleep(320)
s = await st()
check('key - zooms out (25%)', near(s.scale, 1, 0.002), `scale=${s.scale}`)

// ----------------------------------------------------------- 8. gallery keys
s = await st()
const firstIndex = s.index
await keyPress(c, 'ArrowRight', 'ArrowRight', 39)
await sleep(220)
s = await st()
check('arrow right moves to next image', s.index === firstIndex + 1, `index=${s.index}`)
check('neighbour is preloaded and shown', s.imgSrc !== null && s.pct !== null)
await keyPress(c, 'ArrowLeft', 'ArrowLeft', 37)
await sleep(220)
s = await st()
check('arrow left moves back', s.index === firstIndex, `index=${s.index}`)

// ------------------------------------------------------------- 9. rotation
await keyPress(c, 'r', 'KeyR', 82)
await sleep(320)
s = await st()
check('key r rotates 90° clockwise', s.rot === 90 && s.deg === '90°', `rot=${s.rot} deg=${s.deg}`)
check('rotation reaches the CSS matrix', s.css && near(s.css.a, 0, 0.02) && near(Math.abs(s.css.b), s.scale, 0.02), `a=${s.css?.a.toFixed(3)} b=${s.css?.b.toFixed(3)}`)
await shot(c, path.join(SHOTS, 'e2e-03-rotated.png'))
await keyPress(c, 'R', 'KeyR', 82, 8)
await sleep(320)
s = await st()
check('Shift+R rotates back', s.rot === 0, `rot=${s.rot}`)

// ------------------------------------------------------------- 10. dblclick
await keyPress(c, '0', 'Digit0', 48)
await sleep(300)
await doubleClick(c, stage.x, stage.y)
await sleep(340)
s = await st()
check('double-click toggles fit → actual', near(s.scale, 1, 0.001), `scale=${s.scale}`)
await doubleClick(c, stage.x, stage.y)
await sleep(340)
s = await st()
check('double-click toggles actual → fit', close(s.scale, s.fit), `scale=${s.scale} fit=${s.fit}`)

// ------------------------------------------------------- 11. zoom input clamp
await evaluate(c, `(() => { const i = document.querySelector('.diz-zoom'); i.focus(); i.select(); i.value = '5000' })()`)
await keyPress(c, 'Enter', 'Enter', 13)
await sleep(340)
s = await st()
check('typed percentage clamps to 4000%', s.pct === 4000 && near(s.scale, 40, 0.01), `pct=${s.pct} scale=${s.scale}`)

// ---------------------------------------------------------- 12. wheel mode
const autoRect = await rectOf('[data-diz-mode="auto"]')
check('wheel mode exposes three explicit options', Boolean(autoRect) && /自动/.test(await evaluate(c, `document.querySelector('[data-diz-mode="auto"]').textContent`)))
const zoomRect = await rectOf('[data-diz-mode="zoom"]')
await click(c, zoomRect.x, zoomRect.y)
await sleep(200)
s = await st()
check('choosing 缩放 forces wheel zoom', s.mode === 'zoom' && (await evaluate(c, `localStorage.getItem('dsh.image-zoom.wheel-mode')`)) === 'zoom', `mode=${s.mode}`)
const panRect = await rectOf('[data-diz-mode="pan"]')
await click(c, panRect.x, panRect.y)
await sleep(200)
s = await st()
check('choosing 平移 forces wheel pan', s.mode === 'pan', `mode=${s.mode}`)
await click(c, autoRect.x, autoRect.y)
await sleep(200)
s = await st()
check('choosing 自动 restores the heuristic', s.mode === 'auto', `mode=${s.mode}`)

// -------------------------------------- 12c. keyboard must not scroll the page behind
await keyPress(c, '0', 'Digit0', 48)
await sleep(360)
// The viewer's capture listener stops the event from reaching bubble listeners, so
// probe with a capture listener on document registered *after* the plugin's (same
// node, later in registration order → still runs and sees defaultPrevented).
await evaluate(c, `(() => {
  window.__KEYS__ = []
  document.addEventListener('keydown', event => {
    window.__KEYS__.push({ key: event.key, prevented: event.defaultPrevented, target: event.target?.className || '' })
  }, true)
  document.querySelector('.diz-panel').focus()
})()`)
await keyPress(c, ' ', 'Space', 32)
await sleep(80)
let keys = JSON.parse(await evaluate(c, `JSON.stringify(window.__KEYS__)`))
let lastKey = keys[keys.length - 1]
check('Space is swallowed while the viewer is open', lastKey && lastKey.key === ' ' && lastKey.prevented === true, JSON.stringify(lastKey))
await keyPress(c, 'PageDown', 'PageDown', 34)
await sleep(80)
keys = JSON.parse(await evaluate(c, `JSON.stringify(window.__KEYS__)`))
lastKey = keys[keys.length - 1]
check('PageDown is swallowed while the viewer is open', lastKey && lastKey.key === 'PageDown' && lastKey.prevented === true, JSON.stringify(lastKey))

// ------------------------------------- 12d. horizontal swipe at fit does nothing
await sleep(400)
let beforeHorizontal = await st()
await wheelMod(c, zoomAt.x, zoomAt.y, 30, 2, 0)
await sleep(220)
s = await st()
check('horizontal-only wheel at fit does not zoom', near(s.scale, beforeHorizontal.scale, 0.001) && s.tx === beforeHorizontal.tx, `scale ${beforeHorizontal.scale.toFixed(3)}→${s.scale.toFixed(3)}`)
beforeHorizontal = s
await wheelMod(c, zoomAt.x, zoomAt.y, 0, -12, 0)
await sleep(240)
s = await st()
check('vertical wheel after that still zooms', s.scale > beforeHorizontal.scale * 1.01, `${beforeHorizontal.scale.toFixed(3)}→${s.scale.toFixed(3)}`)

// ------------------------------------- 12e. opening the original: local path → Host bridge
const openButton = await rectOf('[data-diz-act="open"]')
await evaluate(c, `window.__DIZ_TEST__.openImage(document.getElementById('localimg'))`)
await sleep(500)
const localPath = await evaluate(c, `window.__DIZ_TEST__.localPathOf(document.getElementById('localimg').src)`)
check('the workspace file route exposes its filesystem path', localPath === '/tmp/starport-architecture.png', String(localPath))
await evaluate(c, `(() => {
  window.__OPENED__ = null
  window.__DIZ_TEST__.setRemoteSession({
    canOpenWorkspacePath: async () => ({ ok: true, value: true }),
    openWorkspacePath: async args => { window.__OPENED__ = args.path; return { ok: true } },
  })
})()`)
await evaluate(c, `window.__DIZ_TEST__.openExternal()`)
await sleep(300)
const openedPath = await evaluate(c, `window.__OPENED__`)
let openToast = await evaluate(c, `document.querySelector('.diz-toast')?.textContent || ''`)
check('open-original hands the local path to the Host default-app opener', openedPath === '/tmp/starport-architecture.png', String(openedPath))
check('open-original confirms with a toast', /默认应用打开|default app/.test(openToast), openToast)
check('open-original tooltip names the default app', /默认应用/.test(await evaluate(c, `document.querySelector('[data-diz-act="open"]').title`)), await evaluate(c, `document.querySelector('[data-diz-act="open"]').title`))

// Host says local opening is unavailable (web-only profile): explain, do not download.
const downloadCountBeforeUnavailable = fs.readdirSync(downloadsDir).length
await evaluate(c, `(() => {
  window.__OPENED__ = null
  window.__DIZ_TEST__.setRemoteSession({
    canOpenWorkspacePath: async () => ({ ok: true, value: false }),
    openWorkspacePath: async args => { window.__OPENED__ = args.path; return { ok: true } },
  })
  window.__DIZ_TEST__.openExternal()
})()`)
await sleep(250)
openToast = await evaluate(c, `document.querySelector('.diz-toast')?.textContent || ''`)
check('unavailable default-app opener explains instead of downloading', /不支持/.test(openToast), openToast)
check('no host call and no download when the opener is unavailable', (await evaluate(c, `window.__OPENED__`)) === null && fs.readdirSync(downloadsDir).length === downloadCountBeforeUnavailable)

// A blob/data attachment has no path: explain the download/copy route, never download silently.
await evaluate(c, `window.__DIZ_TEST__.setRemoteSession(null)`)
await evaluate(c, `window.__DIZ_TEST__.openImage(document.getElementById('wide'))`)
await sleep(500)
const downloadCountBeforeNoPath = fs.readdirSync(downloadsDir).length
const openButton2 = await rectOf('[data-diz-act="open"]')
await click(c, openButton2.x, openButton2.y)
await sleep(400)
openToast = await evaluate(c, `document.querySelector('.diz-toast')?.textContent || ''`)
check('an attachment without a path explains the alternative', /本地路径|local path/.test(openToast), openToast)
check('no silent download for a path-less attachment', fs.readdirSync(downloadsDir).length === downloadCountBeforeNoPath)

// ------------------------------------- 12f. wheel-mode toast is short, not the long hint
await click(c, (await rectOf('[data-diz-mode="pan"]')).x, (await rectOf('[data-diz-mode="pan"]')).y)
await sleep(250)
const modeToast = await evaluate(c, `document.querySelector('.diz-toast')?.textContent || ''`)
check('mode switch toast stays short', /平移/.test(modeToast) && modeToast.length <= 14, modeToast)
await click(c, (await rectOf('[data-diz-mode="auto"]')).x, (await rectOf('[data-diz-mode="auto"]')).y)
await sleep(150)

// ---------------------------------------------- 12b. mouse wheel across devices
// Leave the viewer fitted, then wait out the current gesture window.
await keyPress(c, '0', 'Digit0', 48)
await sleep(400)

// A classic Windows/Chrome notch (deltaY = 100) zooms immediately.
const notchStart = (await st()).scale
await wheelMod(c, zoomAt.x, zoomAt.y, 0, -100, 0)
await sleep(80)
s = await st()
check('Windows notch (deltaY=100) zooms at once', s.scale > notchStart * 1.1, `${notchStart.toFixed(3)} → ${s.scale.toFixed(3)}`)

await keyPress(c, '0', 'Digit0', 48)
await sleep(400)
const notchStart120 = (await st()).scale
await wheelMod(c, zoomAt.x, zoomAt.y, 0, -120, 0)
await sleep(80)
s = await st()
check('Chrome notch (deltaY=120) zooms at once', s.scale > notchStart120 * 1.1, `${notchStart120.toFixed(3)} → ${s.scale.toFixed(3)}`)

// A low-resolution / precise mouse (small isolated delta) must zoom too — this is
// the Mac mouse case: smooth scrolling reports a few pixels, not a 120 notch.
await keyPress(c, '0', 'Digit0', 48)
await sleep(400)
const smallStart = (await st()).scale
await wheelMod(c, zoomAt.x, zoomAt.y, 0, -12, 0)
await sleep(260)
s = await st()
check('precise mouse (small isolated delta) zooms after the 75ms defer', s.scale > smallStart * 1.012, `${smallStart.toFixed(3)} → ${s.scale.toFixed(3)}`)

// Two-finger scroll arrives as a stream: it pans and must not change scale.
await evaluate(c, `(() => { const i = document.querySelector('.diz-zoom'); i.focus(); i.select(); i.value = '200' })()`)
await keyPress(c, 'Enter', 'Enter', 13)
await sleep(400)
const streamBefore = await st()
for (let i = 0; i < 6; i += 1) await wheelMod(c, zoomAt.x, zoomAt.y, 0, 16, 0)
await sleep(220)
s = await st()
check('trackpad stream pans without zooming', Math.abs(s.scale - streamBefore.scale) < 0.002 && s.ty < streamBefore.ty - 60, `scale ${streamBefore.scale.toFixed(3)}→${s.scale.toFixed(3)}, ty ${streamBefore.ty.toFixed(1)}→${s.ty.toFixed(1)}`)

// At fit there is nothing to pan, so the same stream falls back to zoom.
await keyPress(c, '0', 'Digit0', 48)
await sleep(400)
const fitStart = (await st()).scale
for (let i = 0; i < 5; i += 1) await wheelMod(c, zoomAt.x, zoomAt.y, 0, -16, 0)
await sleep(240)
s = await st()
check('scroll stream at fit falls back to zoom', s.scale > fitStart * 1.03, `${fitStart.toFixed(3)} → ${s.scale.toFixed(3)}`)

// --------------------------------------------------------------- 13. actions
const actionTitles = await evaluate(c, `JSON.stringify(
  [...document.querySelectorAll('.diz-head button, .diz-bar button')].map(node => node.getAttribute('title')).filter(Boolean),
)`)
check('download / copy / open / close actions present', /下载|Download/.test(actionTitles) && /复制|Copy/.test(actionTitles) && /新窗口|new window|本地路径|local path/.test(actionTitles))

// ------------------------------------- 14. remote image offers copy-link
await evaluate(c, `window.__DIZ_TEST__.openImage(document.getElementById('remote'))`)
await sleep(320)
const remoteState = JSON.parse(await evaluate(c, `JSON.stringify({
  open: window.__DIZ_TEST__.isOpen(),
  linkHidden: document.querySelector('[data-diz-act="link"]').hidden,
  openTitle: document.querySelector('[data-diz-act="open"]').title,
})`))
check('off-origin http(s) image shows the copy-link action', remoteState.open && remoteState.linkHidden === false, JSON.stringify(remoteState))
check('open-original button says it opens a new window', /新窗口|new window/i.test(remoteState.openTitle), remoteState.openTitle)

await keyPress(c, 'Escape', 'Escape', 27)
await sleep(220)
s = await st()
check('Esc closes the viewer', !s.open && s.display === 'none')

// -------------------------------------------------- 15. small + linked images
const icon = await rectOf('#icon')
await click(c, icon.x, icon.y)
await sleep(200)
s = await st()
check('icon-sized image is left alone', !s.open)

const linked = await rectOf('#linkedimg')
await click(c, linked.x, linked.y)
await sleep(200)
s = await st()
check('image inside a link keeps navigation', !s.open && (await evaluate(c, 'location.hash')) === '#linked')

// ------------------------------------------------------- 16. backdrop close
await click(c, wide.x, wide.y)
await sleep(220)
check('re-open works', (await st()).open)
const panel = await rectOf('.diz-panel')
await click(c, 8, 8)
await sleep(220)
s = await st()
check('clicking the backdrop closes', !s.open && s.display === 'none')

// ------------------------------------- 16b. loading + failure states
await evaluate(c, `window.__DIZ_TEST__.openImage(document.getElementById('broken'))`)
await sleep(600)
s = await st()
check('a broken image shows the inline error state', s.open && s.errorShown && s.errorRole === 'alert', JSON.stringify({ open: s.open, error: s.errorShown }))
check('the loading bubble is hidden after an error', s.loadingExists && s.loadingShown === false)
check('metadata names the failure', /无法加载|failed/i.test(await evaluate(c, `document.querySelector('.diz-meta')?.textContent || ''`)))
await keyPress(c, 'Escape', 'Escape', 27)
await sleep(220)

// ------------------------------------- 16c. zero intrinsic size still fits
await evaluate(c, `window.__DIZ_TEST__.openImage(document.getElementById('nosize'))`)
await sleep(700)
const noSize = JSON.parse(await evaluate(c, `(() => {
  const img = document.querySelector('.diz-img')
  return JSON.stringify({
    open: window.__DIZ_TEST__.isOpen(),
    width: img ? img.style.width : null,
    height: img ? img.style.height : null,
    pct: document.querySelector('.diz-zoom') ? parseInt(document.querySelector('.diz-zoom').value, 10) : null,
    error: Boolean(document.querySelector('.diz-error.diz-show')),
  })
})()`))
check('an SVG without intrinsic size still gets a usable box', noSize.open && parseFloat(noSize.width) > 0 && parseFloat(noSize.height) > 0 && noSize.pct > 0 && !noSize.error, JSON.stringify(noSize))
await keyPress(c, 'Escape', 'Escape', 27)
await sleep(220)

// ----------------------------------------------------------- 17. uninstall
const cleaned = await evaluate(c, `(() => {
  if (typeof window.__CLEANUP__ === 'function') window.__CLEANUP__()
  return {
    root: Boolean(document.querySelector('.diz-root')),
    style: Boolean(document.getElementById('dsh-image-zoom-style')),
  }
})()`)
check('uninstall removes overlay and style', !cleaned.root && !cleaned.style, JSON.stringify(cleaned))
await click(c, wide.x, wide.y)
await sleep(200)
check('after uninstall clicks are no longer captured', !(await st()).open)
await keyPress(c, ' ', 'Space', 32)
await sleep(80)
const keyAfterClose = JSON.parse(await evaluate(c, `JSON.stringify(window.__LAST_KEY__)`))
check('Space passes through when the viewer is closed', keyAfterClose && keyAfterClose.prevented === false, JSON.stringify(keyAfterClose))

// ------------------------------------------------------------------ summary
const realErrors = consoleErrors.filter(text => !/example\.invalid|ERR_CONNECTION_CLOSED|ERR_NAME_NOT_RESOLVED|\/api\/file|404/.test(String(text)))
check('no console errors during the run', realErrors.length === 0, realErrors.slice(0, 3).join(' | '))

const failed = results.filter(item => !item.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length > 0) {
  console.log('\nFAILURES:')
  for (const item of failed) console.log(` - ${item.name}  ${item.detail}`)
}
c.close()
staticServer.close()
process.exit(failed.length === 0 ? 0 : 1)
