// Minimal Chrome DevTools Protocol driver (global WebSocket in Node >= 22).
import fs from 'node:fs'

const PORT = Number(process.env.CDP_PORT || 9333)
const HOST = '127.0.0.1'

async function pageTarget() {
  const res = await fetch(`http://${HOST}:${PORT}/json/list`)
  const list = await res.json()
  const pages = list.filter(t => t.type === 'page' && !t.url.startsWith('devtools://') && !t.url.startsWith('chrome://'))
  const page = pages.find(t => /harness\.html|127\.0\.0\.1:\d+/.test(t.url)) || pages[pages.length - 1]
  if (!page) throw new Error('no page target: ' + JSON.stringify(list.map(t => [t.type, t.url])))
  return page
}

export function connect(target) {
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  const events = []
  const listeners = new Set()
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve)
    ws.addEventListener('error', reject)
  })
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id)
      if (msg.error) reject(new Error(msg.method + ': ' + JSON.stringify(msg.error))); else resolve(msg.result)
    } else if (msg.method) {
      events.push(msg)
      for (const fn of listeners) fn(msg)
    }
  })
  return {
    ready,
    events,
    on(fn) { listeners.add(fn); return () => listeners.delete(fn) },
    send(method, params = {}) {
      const mid = ++id
      ws.send(JSON.stringify({ id: mid, method, params }))
      return new Promise((resolve, reject) => pending.set(mid, { resolve, reject }))
    },
    close() { ws.close() },
  }
}

export async function open() {
  const target = await pageTarget()
  const c = connect(target)
  c.targetId = target.id
  await c.ready
  return c
}

/**
 * Open a fresh top-level page for one test run. Reusing whatever page happens to
 * be open makes runs depend on leftover tabs (and a stray chrome:// page can make
 * a CDP session behave oddly), so the suite isolates itself this way.
 */
export async function openFresh() {
  let target
  try {
    const res = await fetch(`http://${HOST}:${PORT}/json/new?about:blank`, { method: 'PUT' })
    target = await res.json()
  } catch {
    target = await pageTarget()
  }
  const c = connect(target)
  c.targetId = target.id
  await c.ready
  return c
}

export async function evaluate(c, expression, awaitPromise = true) {
  const r = await c.send('Runtime.evaluate', {
    expression, awaitPromise, returnByValue: true, userGesture: true,
  })
  if (r.exceptionDetails) throw new Error('eval failed: ' + JSON.stringify(r.exceptionDetails).slice(0, 800))
  return r.result.value
}

export async function shot(c, path) {
  const r = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  fs.writeFileSync(path, Buffer.from(r.data, 'base64'))
  return path
}

export async function click(c, x, y) {
  for (const type of ['mousePressed', 'mouseReleased']) {
    await c.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 })
  }
}

export async function wheel(c, x, y, deltaX, deltaY, ctrlKey = false) {
  await c.send('Input.dispatchMouseEvent', {
    type: 'mouseWheel', x, y, deltaX, deltaY, ctrlKey,
  })
}

export async function drag(c, x1, y1, x2, y2, steps = 12) {
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x1, y: y1, button: 'left', clickCount: 1 })
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    await c.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t, button: 'left', buttons: 1,
    })
  }
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x2, y: y2, button: 'left', clickCount: 1 })
}

export async function key(c, key, code, keyCode, modifiers = 0) {
  await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, modifiers })
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, modifiers })
}

export async function wheelMod(c, x, y, deltaX, deltaY, modifiers = 0) {
  await c.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX, deltaY, modifiers })
}

export async function doubleClick(c, x, y) {
  for (const count of [1, 2]) {
    await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: count })
    await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: count })
  }
}

export async function keyPress(c, key, code, keyCode, modifiers = 0) {
  await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, modifiers })
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, modifiers })
}

export async function waitFor(fn, { timeout = 5000, interval = 60 } = {}) {
  const started = Date.now()
  let last
  while (Date.now() - started < timeout) {
    try { last = await fn(); if (last) return last } catch (error) { last = error.message }
    await new Promise(r => setTimeout(r, interval))
  }
  throw new Error('waitFor timeout; last=' + JSON.stringify(last))
}
