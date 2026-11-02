/**
 * dsh-image-zoom · browser half
 *
 * 聊天/产物里的图片，点开是一个能真正「看」的查看器：
 *
 *   · 缩放：鼠标滚轮以指针为中心缩放；触控板双指捏合（ctrl+wheel）缩放；
 *           底部 − / 百分比 / + ；键盘 + - 0 1；双击切换适应窗口/原始大小。
 *   · 平移：已经放大时，双指滚动直接左右/上下平移（屏幕滑动的自然方向）；
 *           Shift+滚轮横向平移；按住拖动平移；方向键（Shift+方向键）平移。
 *   · 看图：多图 ←/→ 或两侧圆钮切换；旋转 90°；下载原图（自动命名）、复制图片、
 *     复制外链、在新窗口打开原图。
 *   · 滚轮口径三档：底部 自动 / 缩放 / 平移，点选即切，记在 localStorage。
 *
 * 接管方式是捕获阶段的文档级 click：不侵入 DSH 的消息渲染，也不依赖官方 slot 契约。
 * 图片自身的布局与页面内容一律不改，关闭弹层后页面恢复原样。
 *
 * @module dsh-image-zoom
 */

window.__ModuleLoader__.load({
  id: 'dsh-image-zoom',
  factory() {
    'use strict'

    /**
     * The DSH page starts with its server-side `lang` and the client locale may
     * settle a moment later, while a client plugin can materialise at boot. So
     * pick the dictionary when the viewer is built, not at module load: the html
     * `lang` wins once the app has set it, the browser language is the fallback.
     */
    function resolveLang() {
      const html = String(document.documentElement?.lang || '').toLowerCase()
      if (html.startsWith('zh')) return 'zh'
      const nav = String(navigator.languages?.[0] || navigator.language || '').toLowerCase()
      if (nav.startsWith('zh')) return 'zh'
      return 'en'
    }

    const TEXTS = {
      zh: {
        dialog: '图片查看器',
        close: '关闭（Esc）',
        zoomIn: '放大（+）',
        zoomOut: '缩小（−）',
        fit: '适应窗口（0）',
        fitShort: '适应',
        actual: '原始大小（1）',
        rotateCw: '顺时针旋转 90°（R）',
        rotateCcw: '逆时针旋转 90°（Shift+R）',
        download: '下载原图',
        copy: '复制图片',
        openTab: '打开原图（新窗口 / 系统浏览器）',
        openLocalLabel: '用系统默认应用打开原图',
        openedLocal: '已用默认应用打开原图',
        openUnavailable: '当前环境不支持用默认应用打开本地图片',
        openNoPath: '这类图片没有本地路径：可下载原图或复制图片',
        openFailed: '无法打开原图',
        link: '复制图片链接',
        linkCopied: '已复制图片链接',
        openedTab: '已在新窗口打开原图',
        prev: '上一张（←）',
        next: '下一张（→）',
        zoomInput: '缩放比例：输入百分比后回车',
        modeAuto: '自动',
        modeZoom: '缩放',
        modePan: '平移',
        modeGroup: '滚轮口径',
        modeAutoHint: '自动：孤立的一次滚轮 = 缩放（鼠标），连续滚动 = 平移（触控板）；没有可平移空间时回退为缩放；捏合始终缩放，Shift 横移',
        modeZoomHint: '滚轮总是缩放（鼠标、触控板通用）；Shift+滚轮横移；拖动平移',
        modePanHint: '滚轮总是平移；Ctrl/⌘ 或触控板捏合缩放；Shift 横移',
        hint: '滚轮缩放 · 双指滚动平移 · 捏合缩放 · 双击 1:1 · ←/→ 换图 · Esc 关闭',
        image: '图片',
        loading: '读取中…',
        failed: '图片无法加载',
        failedHint: '图片地址可能失效，或当前会话没有访问权限',
        copied: '已复制图片',
        copyFailed: '复制失败',
        downloaded: '已开始下载',
        downloadFailed: '下载失败',
      },
      en: {
        dialog: 'Image viewer',
        close: 'Close (Esc)',
        zoomIn: 'Zoom in (+)',
        zoomOut: 'Zoom out (−)',
        fit: 'Fit to window (0)',
        fitShort: 'Fit',
        actual: 'Actual size (1)',
        rotateCw: 'Rotate 90° clockwise (R)',
        rotateCcw: 'Rotate 90° counterclockwise (Shift+R)',
        download: 'Download original',
        copy: 'Copy image',
        openTab: 'Open original (new window / system browser)',
        openLocalLabel: 'Open the original in the default app',
        openedLocal: 'Opened the original in the default app',
        openUnavailable: 'This environment cannot open local files in the default app',
        openNoPath: 'This image has no local path — download it or copy it instead',
        openFailed: 'Could not open the original',
        link: 'Copy image link',
        linkCopied: 'Image link copied',
        openedTab: 'Opened the original in a new window',
        prev: 'Previous (←)',
        next: 'Next (→)',
        zoomInput: 'Zoom percentage — type a value and press Enter',
        modeAuto: 'Auto',
        modeZoom: 'Zoom',
        modePan: 'Pan',
        modeGroup: 'Wheel gesture',
        modeAutoHint: 'Auto: an isolated wheel event zooms (mouse wheel), a continuous scroll stream pans (trackpad); falls back to zoom when there is nothing to pan; pinch always zooms, Shift pans sideways',
        modeZoomHint: 'Wheel always zooms (mouse and trackpad); Shift+wheel pans sideways; drag to pan',
        modePanHint: 'Wheel always pans; Ctrl/⌘ or trackpad pinch zooms; Shift pans sideways',
        hint: 'Wheel or pinch to zoom · two-finger scroll and drag to pan · double-click 1:1 · ←/→ switch · Esc closes',
        image: 'image',
        loading: 'Reading…',
        failed: 'Image failed to load',
        failedHint: 'The address may be stale, or the session may not have access to it',
        copied: 'Image copied',
        copyFailed: 'Copy failed',
        downloaded: 'Download started',
        downloadFailed: 'Download failed',
      },
    }

    let T = TEXTS[resolveLang()]

    // ---------------------------------------------------------------- constants

    const STYLE_ID = 'dsh-image-zoom-style'
    const ROOT_CLASS = 'diz'
    const MIN_SCALE = 0.05
    const MAX_SCALE = 40
    const FIT_PAD = 26
    const MIN_CONTENT_EDGE = 48
    const MODE_KEY = 'dsh.image-zoom.wheel-mode'
    const MODES = ['auto', 'zoom', 'pan']
    const ARROW_PAN = 72
    const ROTATIONS = [0, 90, 180, 270]

    const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

    // ------------------------------------------------------------------ helpers

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

    function el(tag, className, attrs) {
      const node = document.createElement(tag)
      if (className) node.className = className
      if (attrs) {
        for (const [key, value] of Object.entries(attrs)) {
          if (key === 'text') node.textContent = value
          else node.setAttribute(key, value)
        }
      }
      return node
    }

    function svgIcon(paths, viewBox = '0 0 16 16') {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('viewBox', viewBox)
      svg.setAttribute('width', '15')
      svg.setAttribute('height', '15')
      svg.setAttribute('aria-hidden', 'true')
      svg.setAttribute('focusable', 'false')
      for (const d of paths) {
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        p.setAttribute('d', d)
        p.setAttribute('fill', 'none')
        p.setAttribute('stroke', 'currentColor')
        p.setAttribute('stroke-width', '1.5')
        p.setAttribute('stroke-linecap', 'round')
        p.setAttribute('stroke-linejoin', 'round')
        svg.appendChild(p)
      }
      return svg
    }

    const ICONS = {
      close: ['M3.5 3.5l9 9', 'M12.5 3.5l-9 9'],
      download: ['M8 2.6v7.2', 'M5.1 7.1L8 10l2.9-2.9', 'M2.8 11.4v1.3a1 1 0 0 0 1 1h8.4a1 1 0 0 0 1-1v-1.3'],
      copy: ['M5.6 5.6h6.2a1 1 0 0 1 1 1v6.2a1 1 0 0 1-1 1H5.6a1 1 0 0 1-1-1V6.6a1 1 0 0 1 1-1Z', 'M3.4 10.2V3.8a1 1 0 0 1 1-1h6.4'],
      open: ['M9.6 2.8h3.6v3.6', 'M13.2 2.8L7.4 8.6', 'M6.2 3.6H3.4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2.8'],
      link: [
        'M6.7 9.3a2.7 2.7 0 0 0 3.8 0l2.3-2.3a2.7 2.7 0 0 0-3.8-3.8l-1 1',
        'M9.3 6.7a2.7 2.7 0 0 0-3.8 0L3.2 9a2.7 2.7 0 0 0 3.8 3.8l1-1',
      ],
      chevronLeft: ['M10 3.2L5.2 8l4.8 4.8'],
      chevronRight: ['M6 3.2L10.8 8 6 12.8'],
    }

    function iconFor(name) {
      return svgIcon(ICONS[name])
    }

    function fileNameOf(src) {
      const text = String(src || '')
      if (!text || text.startsWith('blob:') || text.startsWith('data:')) return ''
      try {
        const url = new URL(text, window.location.href)
        const target = url.searchParams.get('path')
        const candidate = target !== null && target !== '' ? target : url.pathname
        const base = candidate.split(/[\\/]/).filter(Boolean).pop() || ''
        try {
          return decodeURIComponent(base)
        } catch {
          return base
        }
      } catch {
        const base = text.split(/[?#]/)[0].split(/[\\/]/).filter(Boolean).pop()
        return base === undefined ? '' : base
      }
    }

    const CONTENT_TYPE_FORMATS = {
      'image/jpeg': 'JPG',
      'image/jpg': 'JPG',
      'image/pjpeg': 'JPG',
      'image/svg+xml': 'SVG',
      'image/x-icon': 'ICO',
      'image/vnd.microsoft.icon': 'ICO',
      'image/x-ms-bmp': 'BMP',
      'image/x-bmp': 'BMP',
    }

    const EXTENSION_FORMATS = {
      jpg: 'JPG', jpeg: 'JPG', jfif: 'JPG', png: 'PNG', apng: 'APNG', gif: 'GIF',
      webp: 'WEBP', svg: 'SVG', bmp: 'BMP', avif: 'AVIF', ico: 'ICO',
      tif: 'TIFF', tiff: 'TIFF', heic: 'HEIC', heif: 'HEIF',
    }

    function formatOf(src, contentType) {
      const type = String(contentType || '').split(';')[0].trim().toLowerCase()
      if (type.startsWith('image/')) {
        if (CONTENT_TYPE_FORMATS[type] !== undefined) return CONTENT_TYPE_FORMATS[type]
        const subtype = type.slice('image/'.length).split('+')[0].trim()
        if (subtype !== '') return subtype.toUpperCase()
      }
      const text = String(src || '')
      const data = /^data:image\/([a-z0-9.+-]+)[;,]/i.exec(text)
      if (data !== null) {
        const subtype = data[1].toLowerCase().split('+')[0]
        if (subtype !== '') return subtype.toUpperCase()
      }
      try {
        const url = new URL(text, 'http://localhost/')
        const target = url.searchParams.get('path') ?? url.pathname
        const base = target.split(/[\\/]/).filter(Boolean).pop() ?? ''
        const dot = base.lastIndexOf('.')
        const extension = dot === -1 ? '' : base.slice(dot + 1).toLowerCase()
        if (EXTENSION_FORMATS[extension] !== undefined) return EXTENSION_FORMATS[extension]
      } catch {
        /* malformed source has no extension to read */
      }
      return ''
    }

    function formatBytes(bytes) {
      if (!Number.isFinite(bytes) || bytes < 0) return ''
      if (bytes < 1024) return `${Math.round(bytes)} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    function percentOf(scale) {
      return `${Math.round(scale * 100)}%`
    }

    // --------------------------------------------------------------------- CSS

    const CSS = [
      '.diz-root{position:fixed;left:0;right:0;top:var(--dsh-frame-chrome-top,0px);bottom:0;z-index:2147483000;display:none;align-items:center;justify-content:center;font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;color:var(--dsw-alias-label-primary,#1a1917);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}',
      '.diz-root.diz-open{display:flex}',
      '.diz-backdrop{position:absolute;inset:0;background:rgba(22,20,18,.46);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);animation:diz-fade .16s ease}',
      '.diz-panel{position:relative;display:flex;flex-direction:column;width:min(1500px,94vw);height:min(1000px,90vh);max-height:calc(100vh - var(--dsh-frame-chrome-top,0px) - 40px);background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l2,rgba(26,25,23,.14));border-radius:16px;box-shadow:0 28px 90px rgba(0,0,0,.4),0 2px 10px rgba(0,0,0,.14);overflow:hidden;outline:none;animation:diz-pop .17s cubic-bezier(.22,.68,.32,1)}',
      '.diz-head{display:flex;align-items:center;gap:10px;padding:9px 10px 9px 16px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(26,25,23,.09));flex:none;background:var(--dsw-alias-bg-layer-1,#fff)}',
      '.diz-head-actions{display:flex;align-items:center;gap:2px;flex:none}',
      '.diz-titles{display:flex;align-items:baseline;gap:10px;min-width:0;flex:1}',
      '.diz-title{font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:52ch}',
      '.diz-meta{font-size:11.5px;color:var(--dsw-alias-label-secondary,#6b6660);white-space:nowrap;font-variant-numeric:tabular-nums;flex:none}',
      '.diz-btn{appearance:none;display:inline-grid;place-items:center;width:28px;height:28px;padding:0;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,#4a453f);cursor:pointer;transition:background .12s ease,color .12s ease;flex:none}',
      '.diz-btn:hover{background:var(--dsw-alias-bg-layer-2,#f1efea);color:var(--dsw-alias-label-primary,#1a1917)}',
      '.diz-btn:active{transform:translateY(.5px)}',
      '.diz-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4d6bfe);outline-offset:1px}',
      '.diz-btn[disabled]{opacity:.32;cursor:default;background:transparent}',
      '.diz-btn.diz-glyph{font-size:16px;line-height:1;font-weight:500;color:var(--dsw-alias-label-primary,#1a1917)}',
      '.diz-stage{position:relative;flex:1;min-height:0;overflow:hidden;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none;background-color:var(--dsw-alias-bg-layer-2,#f4f2ed);background-image:linear-gradient(45deg,rgba(120,110,96,.055) 25%,transparent 25%,transparent 75%,rgba(120,110,96,.055) 75%),linear-gradient(45deg,rgba(120,110,96,.055) 25%,transparent 25%,transparent 75%,rgba(120,110,96,.055) 75%);background-size:18px 18px;background-position:0 0,9px 9px}',
      '.diz-stage.diz-grabbing{cursor:grabbing}',
      '.diz-img{position:absolute;left:50%;top:50%;max-width:none;max-height:none;transform-origin:50% 50%;pointer-events:none;will-change:transform;user-select:none;-webkit-user-drag:none;image-rendering:auto;box-shadow:0 1px 3px rgba(0,0,0,.18)}',
      '.diz-img.diz-anim{transition:transform .18s cubic-bezier(.22,.68,.32,1)}',
      '.diz-nav{position:absolute;top:50%;margin-top:-30px;width:38px;height:60px;display:grid;place-items:center;padding:0;border:1px solid var(--dsw-alias-border-l2,rgba(26,25,23,.12));border-radius:12px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fff) 82%,transparent);color:var(--dsw-alias-label-secondary,#4a453f);cursor:pointer;opacity:.72;transition:opacity .15s ease,background .15s ease;backdrop-filter:blur(8px)}',
      '.diz-nav:hover{opacity:1;background:var(--dsw-alias-bg-layer-1,#fff)}',
      '.diz-nav:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4d6bfe);outline-offset:1px}',
      '.diz-nav[disabled]{display:none}',
      '.diz-nav.diz-prev{left:14px}',
      '.diz-nav.diz-next{right:14px}',
      '.diz-bar{display:flex;align-items:center;gap:8px;padding:7px 12px;border-top:1px solid var(--dsw-alias-border-l1,rgba(26,25,23,.09));flex:none;background:var(--dsw-alias-bg-layer-1,#fff)}',
      '.diz-bar-left{flex:1;display:flex;align-items:center;gap:8px;min-width:0;font-size:11.5px;color:var(--dsw-alias-label-secondary,#6b6660);font-variant-numeric:tabular-nums}',
      '.diz-bar-center{display:flex;align-items:center;gap:2px;flex:none}',
      '.diz-bar-right{flex:1;display:flex;align-items:center;justify-content:flex-end;gap:4px;min-width:0}',
      '.diz-zoom{width:62px;height:26px;padding:0 2px;border:1px solid var(--dsw-alias-border-l2,rgba(26,25,23,.14));border-radius:7px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#1a1917);text-align:center;font:inherit;font-size:12px;font-variant-numeric:tabular-nums}',
      '.diz-zoom:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4d6bfe);outline-offset:1px}',
      '.diz-sep{width:1px;height:16px;background:var(--dsw-alias-border-l2,rgba(26,25,23,.14));margin:0 5px;flex:none}',
      '.diz-pill{appearance:none;height:26px;padding:0 10px;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary,#4a453f);font:inherit;font-size:12px;cursor:pointer;flex:none;transition:background .12s ease,color .12s ease}',
      '.diz-pill:hover{background:var(--dsw-alias-bg-layer-2,#f1efea);color:var(--dsw-alias-label-primary,#1a1917)}',
      '.diz-pill:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4d6bfe);outline-offset:1px}',
      '.diz-pill.diz-active{background:var(--dsw-alias-interactive-bg-hover-accent,rgba(77,107,254,.12));color:var(--dsw-alias-label-primary,#1a1917);font-weight:600}',
      '.diz-modes{display:flex;align-items:center;gap:2px;padding:2px;border:1px solid var(--dsw-alias-border-l2,rgba(26,25,23,.14));border-radius:8px;background:var(--dsw-alias-bg-layer-2,#f1efea);flex:none}',
      '.diz-mode-pill{appearance:none;height:22px;padding:0 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#6b6660);font:inherit;font-size:11.5px;line-height:1;cursor:pointer;transition:background .12s ease,color .12s ease,box-shadow .12s ease}',
      '.diz-mode-pill:hover{color:var(--dsw-alias-label-primary,#1a1917)}',
      '.diz-mode-pill.diz-active{background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#1a1917);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.14)}',
      '.diz-mode-pill:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4d6bfe);outline-offset:1px}',
      '.diz-deg{min-width:36px;text-align:center;font-size:12px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#6b6660)}',
      '.diz-pos{flex:none;font-variant-numeric:tabular-nums}',
      '.diz-toast{position:absolute;left:50%;bottom:16px;transform:translate(-50%,8px);opacity:0;pointer-events:none;max-width:80%;padding:7px 14px;border-radius:999px;background:rgba(24,22,20,.88);color:#fff;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:opacity .18s ease,transform .18s ease}',
      '.diz-toast.diz-show{opacity:1;transform:translate(-50%,0)}',
      '.diz-hint{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);max-width:calc(100% - 32px);padding:6px 13px;border-radius:999px;background:rgba(24,22,20,.72);color:rgba(255,255,255,.92);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:0;transition:opacity .3s ease;pointer-events:none}',
      '.diz-hint.diz-show{opacity:1}',
      '.diz-loading{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:none;align-items:center;gap:9px;padding:9px 15px;border-radius:999px;background:rgba(24,22,20,.66);color:rgba(255,255,255,.94);font-size:12.5px;pointer-events:none;backdrop-filter:blur(6px)}',
      '.diz-loading.diz-show{display:flex}',
      '.diz-spinner{width:15px;height:15px;flex:none;border-radius:50%;border:2px solid rgba(255,255,255,.32);border-top-color:rgba(255,255,255,.95);animation:diz-spin .8s linear infinite}',
      '.diz-error{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:none;flex-direction:column;align-items:center;gap:6px;max-width:80%;padding:14px 18px;border-radius:12px;background:rgba(24,22,20,.7);color:rgba(255,255,255,.95);font-size:13px;text-align:center;pointer-events:none;backdrop-filter:blur(6px)}',
      '.diz-error.diz-show{display:flex}',
      '.diz-error-sub{font-size:11.5px;opacity:.72}',
      '@keyframes diz-spin{to{transform:rotate(360deg)}}',
      '@keyframes diz-fade{from{opacity:0}to{opacity:1}}',
      '@keyframes diz-pop{from{opacity:0;transform:scale(.985)}to{opacity:1;transform:scale(1)}}',
      '@media (prefers-reduced-motion:reduce){.diz-backdrop,.diz-panel{animation:none}.diz-img.diz-anim{transition:none}.diz-toast,.diz-hint{transition:none}.diz-spinner{animation:none}}',
      '@media (max-width:640px){.diz-panel{width:100vw;height:100%;max-height:none;border-radius:0;border:0}.diz-head{padding-left:12px}.diz-bar{flex-wrap:wrap;gap:4px}.diz-bar-left{display:none}.diz-modes{display:none}}',
    ].join('')

    // -------------------------------------------------------------- state model

    /**
     * Everything the viewer needs to paint one image. `scale`/`tx`/`ty` describe
     * the CSS transform; `fit` is the scale currently considered "fit to window";
     * `rot` is in degrees, restricted to the ROTATIONS list.
     */
    const view = {
      iw: 0,
      ih: 0,
      scale: 1,
      fit: 1,
      tx: 0,
      ty: 0,
      rot: 0,
      index: 0,
      gallery: [],
      alt: '',
      format: '',
      mode: readMode(),
    }

    let shell = null
    let open = false
    let installed = false
    let previousFocus = null
    let remoteCtx = null
    let metaToken = 0
    let animateTimer = 0
    let toastTimer = 0
    let hintTimer = 0
    let loadingTimer = 0
    let hintShown = false
    let resizeObserver = null

    // gesture state
    const pointers = new Map()
    let drag = null
    let pinch = null

    function readMode() {
      try {
        const saved = localStorage.getItem(MODE_KEY)
        if (MODES.includes(saved)) return saved
      } catch {
        /* storage may be unavailable */
      }
      return 'auto'
    }

    function saveMode(mode) {
      try {
        localStorage.setItem(MODE_KEY, mode)
      } catch {
        /* ignore */
      }
    }

    // ------------------------------------------------------------ DOM building

    function buildShell() {
      if (shell !== null) return shell
      T = TEXTS[resolveLang()]

      const root = el('div', `${ROOT_CLASS}-root`)
      root.setAttribute('role', 'dialog')
      root.setAttribute('aria-modal', 'true')
      root.setAttribute('aria-label', T.dialog)

      const backdrop = el('div', `${ROOT_CLASS}-backdrop`)

      const panel = el('div', `${ROOT_CLASS}-panel`)
      panel.setAttribute('tabindex', '-1')

      // ---- header
      const head = el('div', `${ROOT_CLASS}-head`)
      const titles = el('div', `${ROOT_CLASS}-titles`)
      const title = el('span', `${ROOT_CLASS}-title`, { id: 'diz-title' })
      const meta = el('span', `${ROOT_CLASS}-meta`)
      titles.append(title, meta)
      panel.setAttribute('aria-labelledby', 'diz-title')

      const headActions = el('div', `${ROOT_CLASS}-head-actions`)
      const btnDownload = el('button', `${ROOT_CLASS}-btn`, { type: 'button', title: T.download, 'aria-label': T.download, 'data-diz-act': 'download' })
      btnDownload.append(iconFor('download'))
      const btnCopy = el('button', `${ROOT_CLASS}-btn`, { type: 'button', title: T.copy, 'aria-label': T.copy, 'data-diz-act': 'copy' })
      btnCopy.append(iconFor('copy'))
      const btnLink = el('button', `${ROOT_CLASS}-btn`, { type: 'button', title: T.link, 'aria-label': T.link, 'data-diz-act': 'link' })
      btnLink.append(iconFor('link'))
      btnLink.hidden = true
      const btnOpen = el('button', `${ROOT_CLASS}-btn`, { type: 'button', title: T.openTab, 'aria-label': T.openTab, 'data-diz-act': 'open' })
      btnOpen.append(iconFor('open'))
      const btnClose = el('button', `${ROOT_CLASS}-btn`, { type: 'button', title: T.close, 'aria-label': T.close, 'data-diz-act': 'close' })
      btnClose.append(iconFor('close'))
      headActions.append(btnDownload, btnCopy, btnLink, btnOpen, btnClose)
      head.append(titles, headActions)

      // ---- stage
      const stage = el('div', `${ROOT_CLASS}-stage`)
      const img = el('img', `${ROOT_CLASS}-img`, { alt: '', draggable: 'false' })
      const navPrev = el('button', `${ROOT_CLASS}-nav ${ROOT_CLASS}-prev`, { type: 'button', title: T.prev, 'aria-label': T.prev })
      navPrev.append(iconFor('chevronLeft'))
      const navNext = el('button', `${ROOT_CLASS}-nav ${ROOT_CLASS}-next`, { type: 'button', title: T.next, 'aria-label': T.next })
      navNext.append(iconFor('chevronRight'))
      const hint = el('div', `${ROOT_CLASS}-hint`, { text: T.hint })
      const loading = el('div', `${ROOT_CLASS}-loading`)
      loading.append(el('span', `${ROOT_CLASS}-spinner`), el('span', { text: T.loading }))
      const error = el('div', `${ROOT_CLASS}-error`, { role: 'alert' })
      error.append(el('div', { text: T.failed }), el('div', `${ROOT_CLASS}-error-sub`, { text: T.failedHint }))
      stage.append(img, navPrev, navNext, hint, loading, error)

      // ---- footer
      const bar = el('div', `${ROOT_CLASS}-bar`)
      const barLeft = el('div', `${ROOT_CLASS}-bar-left`)
      const pos = el('span', `${ROOT_CLASS}-pos`)
      barLeft.append(pos)

      const barCenter = el('div', `${ROOT_CLASS}-bar-center`)
      const btnZoomOut = el('button', `${ROOT_CLASS}-btn ${ROOT_CLASS}-glyph`, { type: 'button', title: T.zoomOut, 'aria-label': T.zoomOut, text: '−' })
      const percent = el('input', `${ROOT_CLASS}-zoom`, { type: 'text', inputmode: 'numeric', title: T.zoomInput, 'aria-label': T.zoomInput })
      const btnZoomIn = el('button', `${ROOT_CLASS}-btn ${ROOT_CLASS}-glyph`, { type: 'button', title: T.zoomIn, 'aria-label': T.zoomIn, text: '+' })
      const sep1 = el('span', `${ROOT_CLASS}-sep`)
      const btnFit = el('button', `${ROOT_CLASS}-pill`, { type: 'button', title: T.fit, text: T.fitShort })
      const btnActual = el('button', `${ROOT_CLASS}-pill`, { type: 'button', title: T.actual, text: '1:1' })
      const sep2 = el('span', `${ROOT_CLASS}-sep`)
      const btnRotCcw = el('button', `${ROOT_CLASS}-btn ${ROOT_CLASS}-glyph`, { type: 'button', title: T.rotateCcw, 'aria-label': T.rotateCcw, text: '↺' })
      const deg = el('span', `${ROOT_CLASS}-deg`, { text: '0°' })
      const btnRotCw = el('button', `${ROOT_CLASS}-btn ${ROOT_CLASS}-glyph`, { type: 'button', title: T.rotateCw, 'aria-label': T.rotateCw, text: '↻' })
      barCenter.append(btnZoomOut, percent, btnZoomIn, sep1, btnFit, btnActual, sep2, btnRotCcw, deg, btnRotCw)

      const barRight = el('div', `${ROOT_CLASS}-bar-right`)
      const modeGroup = el('div', `${ROOT_CLASS}-modes`, { role: 'group', 'aria-label': T.modeGroup })
      const modeBtns = {}
      for (const mode of MODES) {
        const button = el('button', `${ROOT_CLASS}-mode-pill`, {
          type: 'button',
          'data-diz-mode': mode,
          text: T[mode === 'auto' ? 'modeAuto' : mode === 'zoom' ? 'modeZoom' : 'modePan'],
        })
        button.addEventListener('click', () => setMode(mode))
        modeBtns[mode] = button
        modeGroup.append(button)
      }
      barRight.append(modeGroup)
      bar.append(barLeft, barCenter, barRight)

      const toast = el('div', `${ROOT_CLASS}-toast`, { role: 'status', 'aria-live': 'polite' })
      root.append(backdrop, panel, toast)
      panel.append(head, stage, bar)
      document.body.append(root)

      shell = {
        root, backdrop, panel, stage, img,
        title, meta, pos, percent, deg, toast, hint, loading, error,
        btnClose, btnDownload, btnCopy, btnLink, btnOpen,
        btnZoomIn, btnZoomOut, btnFit, btnActual,
        btnRotCcw, btnRotCw, modeGroup, modeBtns, navPrev, navNext,
      }

      wireEvents(shell)
      if (typeof ResizeObserver === 'function') {
        resizeObserver = new ResizeObserver(() => {
          if (!open) return
          const wasFit = Math.abs(view.scale - view.fit) < 0.005
          view.fit = fitScale()
          if (wasFit) {
            view.scale = view.fit
            view.tx = 0
            view.ty = 0
          }
          clampPan()
          applyTransform(false)
        })
        resizeObserver.observe(stage)
      }
      updateModeButton()
      return shell
    }

    // ------------------------------------------------------ download naming

    const MAX_NAME_STEM = 48
    const GENERIC_STEMS = new Set([
      'image', 'img', 'photo', 'picture', 'pic', 'blob', 'download', 'attachment',
      'untitled', 'screenshot', 'screen', 'capture', 'file', 'clipboard', 'preview',
      'thumb', 'thumbnail', 'canvas', 'output', 'result',
    ])
    const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i
    const EXT_BY_FORMAT = {
      PNG: 'png', JPG: 'jpg', JPEG: 'jpg', JPG2: 'jpg', SVG: 'svg', GIF: 'gif',
      WEBP: 'webp', AVIF: 'avif', BMP: 'bmp', ICO: 'ico', TIFF: 'tif', TIF: 'tif',
      HEIC: 'heic', HEIF: 'heif', APNG: 'apng',
    }
    const IMAGE_EXTENSIONS = new Set(Object.values(EXT_BY_FORMAT))

    /** Local, sortable stamp used in every generated file name. */
    function stampOf(date) {
      const value = date instanceof Date ? date : new Date()
      const pad = number => String(number).padStart(2, '0')
      return (
        `${value.getFullYear()}${pad(value.getMonth() + 1)}${pad(value.getDate())}` +
        `-${pad(value.getHours())}${pad(value.getMinutes())}${pad(value.getSeconds())}`
      )
    }

    /**
     * Make one filename-safe segment: keep letters/numbers (CJK included),
     * `-` and `_`; anything Windows forbids becomes a dash; collapse runs and
     * trim. Reserved Windows device names get a trailing underscore.
     */
    function cleanFileStem(text) {
      let out = String(text || '')
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .replace(/[^\p{L}\p{N}_-]+/gu, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^[-_.]+|[-_.]+$/g, '')
      if (out.length > MAX_NAME_STEM) {
        out = Array.from(out).slice(0, MAX_NAME_STEM).join('').replace(/[-_.]+$/, '')
      }
      if (WINDOWS_RESERVED.test(out)) out = `${out}_`
      return out
    }

    /** A meaningful source stem, or '' when the source name is just "image". */
    function sourceStem(src) {
      const base = fileNameOf(src)
      if (!base) return ''
      const dot = base.lastIndexOf('.')
      const stem = dot > 0 ? base.slice(0, dot) : base
      const cleaned = cleanFileStem(stem)
      if (cleaned.length < 3) return ''
      if (GENERIC_STEMS.has(cleaned.toLowerCase())) return ''
      if (/^(img|image|dsc|pxl|screenshot|snipaste|cleanshot|wx)[-_]?\d+$/i.test(cleaned)) return ''
      if (/^[0-9a-f]{12,}$/i.test(cleaned)) return ''
      return cleaned
    }

    /** Extension for the download: detected image format first, then the URL. */
    function extensionFor(src, format) {
      const byFormat = EXT_BY_FORMAT[String(format || '').toUpperCase()]
      if (byFormat) return byFormat
      const base = fileNameOf(src)
      const dot = base.lastIndexOf('.')
      const fromUrl = dot > 0 ? base.slice(dot + 1).toLowerCase() : ''
      if (IMAGE_EXTENSIONS.has(fromUrl)) return fromUrl === 'jpeg' ? 'jpg' : fromUrl === 'tiff' ? 'tif' : fromUrl
      return 'png'
    }

    /**
     * The one naming rule for downloaded originals:
     *
     *   <说明>-<YYYYMMDD-HHmmss>.<ext>
     *
     * 说明 = alt 文本（读者看到的那句话）→ 有意义的源文件名 → 「图片」/「image」。
     * 时间戳保证唯一、可排序，下载后不用再改名；扩展名按识别到的真实格式给，
     * blob/data 图不会落成 .bin。Windows 禁用字符和保留设备名在这里就处理掉。
     */
    function fileNameForDownload(src, alt, format, date) {
      const descriptor = cleanFileStem(alt) || sourceStem(src) || cleanFileStem(T.image) || 'image'
      return `${descriptor}-${stampOf(date)}.${extensionFor(src, format)}`
    }

    /**
     * The filesystem path behind an image source, when the page knows one:
     * same-origin `/api/file?path=…` routes (how DSH serves workspace images) and
     * `file:` URLs. `blob:` / `data:` attachments have no path — they can only be
     * downloaded or copied.
     */
    function localPathOf(src) {
      if (!src) return undefined
      try {
        const url = new URL(src, window.location.href)
        if (url.protocol === 'file:') {
          let path = decodeURIComponent(url.pathname)
          // Windows file URLs look like /C:/dir/file.png
          if (/^\/[A-Za-z]:\//.test(path)) path = path.slice(1)
          return path === '' ? undefined : path
        }
        if (url.origin !== window.location.origin) return undefined
        if (!url.pathname.endsWith('/api/file')) return undefined
        const path = url.searchParams.get('path')
        return path === null || path === '' ? undefined : path
      } catch {
        return undefined
      }
    }

    /** An image link is shareable only when it is an absolute http(s) URL off-origin. */
    function isShareableSource(src) {
      if (!src) return false
      try {
        const url = new URL(src, window.location.href)
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
        return url.origin !== window.location.origin
      } catch {
        return false
      }
    }

    // ------------------------------------------------------------- geometry

    function rotatedDims() {
      const rot90 = Math.abs(view.rot) % 180 === 90
      return rot90 ? { w: view.ih, h: view.iw } : { w: view.iw, h: view.ih }
    }

    function fitScale() {
      if (!shell || !view.iw || !view.ih) return 1
      const { w, h } = rotatedDims()
      const sw = shell.stage.clientWidth - FIT_PAD * 2
      const sh = shell.stage.clientHeight - FIT_PAD * 2
      if (sw <= 0 || sh <= 0) return 1
      return clamp(Math.min(sw / w, sh / h, 1), MIN_SCALE, MAX_SCALE)
    }

    /**
     * Keep the image discoverable: when its scaled size exceeds the stage, its
     * edges may travel to the stage edges; when it is smaller, it stays centred.
     */
    function clampPan() {
      if (!shell) return
      const room = panRoom()
      view.tx = clamp(view.tx, -room.mx, room.mx)
      view.ty = clamp(view.ty, -room.my, room.my)
    }

    function applyTransform(animate) {
      if (!shell) return
      if (animate && !reduceMotion) {
        shell.img.classList.add(`${ROOT_CLASS}-anim`)
        clearTimeout(animateTimer)
        animateTimer = window.setTimeout(() => {
          if (shell) shell.img.classList.remove(`${ROOT_CLASS}-anim`)
        }, 220)
      } else {
        shell.img.classList.remove(`${ROOT_CLASS}-anim`)
      }
      shell.img.style.transform =
        `translate(${view.tx.toFixed(2)}px, ${view.ty.toFixed(2)}px) ` +
        `scale(${view.scale.toFixed(5)}) rotate(${view.rot}deg)`
      updateReadout()
    }

    function updateReadout() {
      if (!shell) return
      shell.percent.value = percentOf(view.scale)
      shell.deg.textContent = `${view.rot}°`
      const total = view.gallery.length
      shell.pos.textContent = total > 1 ? `${view.index + 1} / ${total}` : ''
      shell.navPrev.disabled = total <= 1
      shell.navNext.disabled = total <= 1
    }

    /**
     * Zoom around a viewport point. Without a point the stage centre is used, so
     * button and keyboard zoom feel anchored to what the reader is looking at.
     */
    function setScaleAt(nextScale, clientX, clientY) {
      if (!shell) return
      const target = clamp(nextScale, MIN_SCALE, MAX_SCALE)
      if (!Number.isFinite(target)) return
      const rect = shell.stage.getBoundingClientRect()
      const px = (typeof clientX === 'number' ? clientX : rect.left + rect.width / 2) - rect.left - rect.width / 2
      const py = (typeof clientY === 'number' ? clientY : rect.top + rect.height / 2) - rect.top - rect.height / 2
      const ratio = target / view.scale
      view.tx = px - (px - view.tx) * ratio
      view.ty = py - (py - view.ty) * ratio
      view.scale = target
      clampPan()
      applyTransform(false)
    }

    function zoomBy(factor, clientX, clientY) {
      setScaleAt(view.scale * factor, clientX, clientY)
    }

    function panBy(dx, dy) {
      view.tx += dx
      view.ty += dy
      clampPan()
      applyTransform(false)
    }

    function fitView(animate) {
      view.fit = fitScale()
      view.scale = view.fit
      view.tx = 0
      view.ty = 0
      applyTransform(Boolean(animate))
    }

    function actualSize(animate) {
      view.scale = 1
      clampPan()
      applyTransform(Boolean(animate))
    }

    function rotateBy(delta) {
      const idx = ROTATIONS.indexOf(view.rot)
      view.rot = ROTATIONS[(idx + (delta > 0 ? 1 : 3)) % ROTATIONS.length]
      view.fit = fitScale()
      if (Math.abs(view.scale - fitScale()) < 0.005) view.scale = view.fit
      clampPan()
      applyTransform(true)
    }

    // -------------------------------------------------------------- candidate

    /** Should the viewer take over this `<img>`? */
    function isCandidate(node) {
      if (!(node instanceof HTMLImageElement)) return false
      if (node.closest(`.${ROOT_CLASS}-root`) !== null) return false
      const src = node.currentSrc || node.src || ''
      if (src === '') return false
      const width = node.naturalWidth || node.width || 0
      const height = node.naturalHeight || node.height || 0
      if (Math.max(width, height) < MIN_CONTENT_EDGE) return false
      const rect = node.getBoundingClientRect()
      return rect.width >= MIN_CONTENT_EDGE || rect.height >= MIN_CONTENT_EDGE
    }

    /** Every viewer-eligible image in the same conversation, for ←/→ browsing. */
    function galleryOf(node) {
      const scope = node.closest('[data-conversation-scroll]') || document.body
      const list = []
      for (const candidate of scope.querySelectorAll('img')) {
        if (!(candidate instanceof HTMLImageElement)) continue
        if (candidate.closest(`.${ROOT_CLASS}-root`) !== null) continue
        const src = candidate.currentSrc || candidate.src || ''
        if (src === '') continue
        const width = candidate.naturalWidth || candidate.width || 0
        const height = candidate.naturalHeight || candidate.height || 0
        if (Math.max(width, height) < MIN_CONTENT_EDGE) continue
        const rect = candidate.getBoundingClientRect()
        if (rect.width < MIN_CONTENT_EDGE && rect.height < MIN_CONTENT_EDGE) continue
        if (rect.width === 0 && rect.height === 0) continue
        list.push(candidate)
      }
      if (list.length === 0) list.push(node)
      return list
    }

    // ------------------------------------------------------------ open / close

    function showLoading(show) {
      if (!shell) return clearTimeout(loadingTimer)
      clearTimeout(loadingTimer)
      if (show) {
        loadingTimer = window.setTimeout(() => {
          if (open && shell) shell.loading.classList.add(`${ROOT_CLASS}-show`)
        }, 160)
      } else {
        shell.loading.classList.remove(`${ROOT_CLASS}-show`)
      }
    }

    function showError(show) {
      if (!shell) return
      shell.error.classList.toggle(`${ROOT_CLASS}-show`, Boolean(show))
    }

    function openImage(node) {
      const gallery = galleryOf(node)
      const index = gallery.indexOf(node)
      view.gallery = gallery
      view.index = index >= 0 ? index : 0
      buildShell()
      previousFocus = document.activeElement
      open = true
      shell.root.classList.add(`${ROOT_CLASS}-open`)
      shell.root.setAttribute('aria-hidden', 'false')
      showAt(view.index)
      try {
        shell.panel.focus({ preventScroll: true })
      } catch {
        /* focus is best effort */
      }
      if (!hintShown) {
        hintShown = true
        clearTimeout(hintTimer)
        shell.hint.classList.add(`${ROOT_CLASS}-show`)
        hintTimer = window.setTimeout(() => {
          if (shell) shell.hint.classList.remove(`${ROOT_CLASS}-show`)
        }, 3200)
      }
    }

    function showAt(index) {
      if (!open || !shell) return
      const total = view.gallery.length
      if (total === 0) return
      view.index = ((index % total) + total) % total
      const node = view.gallery[view.index]
      if (!(node instanceof HTMLImageElement)) return

      const src = node.currentSrc || node.src || ''
      const alt = (node.alt || '').trim()
      view.alt = alt
      view.format = formatOf(src)
      shell.title.textContent = alt || fileNameOf(src) || T.image
      refreshActionLabels()
      shell.meta.textContent = T.loading
      showError(false)
      showLoading(true)
      shell.img.classList.remove(`${ROOT_CLASS}-anim`)
      shell.img.style.width = '0px'
      shell.img.style.height = '0px'
      shell.img.style.marginLeft = '0px'
      shell.img.style.marginTop = '0px'
      shell.img.style.transform = 'translate(0px, 0px) scale(1) rotate(0deg)'
      view.rot = 0
      view.scale = 1
      view.tx = 0
      view.ty = 0
      view.iw = node.naturalWidth || node.width || 0
      view.ih = node.naturalHeight || node.height || 0
      updateReadout()

      const token = ++metaToken
      shell.img.onload = () => {
        if (token !== metaToken || !open) return
        const naturalWidth = shell.img.naturalWidth
        const naturalHeight = shell.img.naturalHeight
        if (naturalWidth > 0 && naturalHeight > 0) {
          view.iw = naturalWidth
          view.ih = naturalHeight
        } else {
          // An SVG without intrinsic dimensions reports 0×0; fall back to the size
          // the page reserved for it so the image still gets drawn and fitted.
          const box = node.getBoundingClientRect()
          view.iw = Math.max(1, Math.round(box.width) || Math.round(view.iw) || 1)
          view.ih = Math.max(1, Math.round(box.height) || Math.round(view.ih) || 1)
        }
        showLoading(false)
        showError(false)
        shell.img.style.width = `${view.iw}px`
        shell.img.style.height = `${view.ih}px`
        shell.img.style.marginLeft = `${-view.iw / 2}px`
        shell.img.style.marginTop = `${-view.ih / 2}px`
        view.fit = fitScale()
        view.scale = view.fit
        view.tx = 0
        view.ty = 0
        applyTransform(false)
        updateMeta(src, token)
      }
      shell.img.onerror = () => {
        if (token !== metaToken || !open) return
        showLoading(false)
        showError(true)
        shell.meta.textContent = T.failed
        toast(T.failed)
      }
      shell.img.src = src
      shell.img.alt = alt

      // Preload neighbours so ←/→ swaps without a white flash.
      for (const offset of [-1, 1]) {
        const neighbour = view.gallery[(view.index + offset + total) % total]
        const neighbourSrc = neighbour ? neighbour.currentSrc || neighbour.src : ''
        if (neighbourSrc) {
          const preload = new Image()
          preload.src = neighbourSrc
        }
      }
      updateReadout()
    }

    function updateMeta(src, token) {
      const dims = `${view.iw || '?'} × ${view.ih || '?'}`
      const known = { format: formatOf(src), bytes: undefined }
      shell.meta.textContent = [dims, known.format].filter(Boolean).join(' · ')
      void (async () => {
        try {
          if (src.startsWith('data:')) {
            const comma = src.indexOf(',')
            const head = src.slice(0, comma)
            const m = /^data:([^;,]+)/i.exec(head)
            if (m) known.format = formatOf(src, m[1])
            if (head.includes('base64')) {
              known.bytes = Math.floor(((src.length - comma - 1) * 3) / 4)
            } else {
              try {
                known.bytes = decodeURIComponent(src.slice(comma + 1)).length
              } catch {
                known.bytes = src.length - comma - 1
              }
            }
          } else if (src.startsWith('blob:')) {
            const response = await fetch(src)
            const blob = await response.blob()
            known.bytes = blob.size
            if (blob.type) known.format = formatOf(src, blob.type)
          } else {
            const controller = new AbortController()
            const timer = window.setTimeout(() => controller.abort(), 6000)
            try {
              const response = await fetch(src, { method: 'HEAD', signal: controller.signal })
              if (response.ok) {
                known.format = formatOf(src, response.headers.get('content-type')) || known.format
                const declared = Number(response.headers.get('content-length'))
                if (Number.isFinite(declared) && declared > 0) known.bytes = declared
              }
            } finally {
              clearTimeout(timer)
            }
          }
        } catch {
          /* metadata is a nicety; the picture still works */
        }
        if (token !== metaToken || !open || !shell) return
        if (known.format) view.format = known.format
        refreshActionLabels()
        shell.meta.textContent = [dims, known.format, formatBytes(known.bytes)].filter(Boolean).join(' · ')
      })()
    }

    function close() {
      if (!open) return
      open = false
      metaToken++
      cancelWheelPending()
      wheelGesture = null
      pointers.clear()
      drag = null
      pinch = null
      if (shell) {
        shell.root.classList.remove(`${ROOT_CLASS}-open`)
        shell.root.setAttribute('aria-hidden', 'true')
        shell.img.onload = null
        shell.img.onerror = null
        shell.img.removeAttribute('src')
        shell.img.style.transform = ''
        shell.img.style.width = '0px'
        shell.img.style.height = '0px'
        shell.stage.classList.remove(`${ROOT_CLASS}-grabbing`)
        shell.hint.classList.remove(`${ROOT_CLASS}-show`)
        shell.loading.classList.remove(`${ROOT_CLASS}-show`)
        shell.error.classList.remove(`${ROOT_CLASS}-show`)
      }
      view.gallery = []
      view.index = 0
      const target = previousFocus
      previousFocus = null
      if (target && typeof target.focus === 'function') {
        try {
          target.focus({ preventScroll: true })
        } catch {
          target.focus()
        }
      }
    }

    // ------------------------------------------------------------------ toast

    function toast(text) {
      if (!shell || !text) return
      clearTimeout(toastTimer)
      shell.toast.textContent = text
      shell.toast.classList.add(`${ROOT_CLASS}-show`)
      toastTimer = window.setTimeout(() => {
        if (shell) shell.toast.classList.remove(`${ROOT_CLASS}-show`)
      }, 1600)
    }

    // ------------------------------------------------------------ mode button

    function hintForMode(mode) {
      if (mode === 'zoom') return T.modeZoomHint
      if (mode === 'pan') return T.modePanHint
      return T.modeAutoHint
    }

    function updateModeButton() {
      if (!shell) return
      for (const mode of MODES) {
        const button = shell.modeBtns[mode]
        if (!button) continue
        const active = view.mode === mode
        button.classList.toggle(`${ROOT_CLASS}-active`, active)
        button.setAttribute('aria-pressed', String(active))
        button.title = hintForMode(mode)
      }
    }

    function modeLabel(mode) {
      if (mode === 'zoom') return T.modeZoom
      if (mode === 'pan') return T.modePan
      return T.modeAuto
    }

    function setMode(mode) {
      if (!MODES.includes(mode) || view.mode === mode) return
      view.mode = mode
      saveMode(mode)
      updateModeButton()
      toast(`${T.modeGroup.replace(/[：:]\s*$/, '')}：${modeLabel(mode)}`)
    }

    // ---------------------------------------------------------------- gestures

    /**
     * 滚轮手势状态机。
     *
     * 同一个 `wheel` 事件既可能来自鼠标滚轮，也可能来自触控板双指滚动，浏览器不给
     * 设备信息 —— 但这两种输入的时间形态不同：
     *
     *   · 鼠标滚轮：一档一次事件（Windows/Chrome 的 deltaY 是 100/120 的整数倍；
     *     开了平滑滚动或触控鼠标时 delta 可能很小或带小数），两次事件之间通常有间隔。
     *   · 触控板：一次滑动是一串高频事件（十几毫秒一个），停下后还有一段惯性。
     *
     * 所以自动模式对「新出现的一次滚轮」先等 WHEEL_DEFER 毫秒：等到了下一帧事件就按
     * 连续滚动处理（平移），没等到就按孤立滚轮处理（缩放）。一旦判定，本次手势
     * 内不再改判；停顿超过 WHEEL_GESTURE_GAP 才算下一次手势。这样：
     *
     *   · 普通鼠标（大 delta）、平滑滚动鼠标、触控鼠标（小 delta）—— 孤立事件 → 缩放；
     *   · 触控板双指滚动（连续流）—— 平移；
     *   · 快速连续拨轮（大 delta 连发）—— 第一档就按鼠标档位判成缩放，后面继续缩放；
     *   · 捏合（ctrl+wheel）/ Alt / ⌘ —— 永远缩放；Shift —— 横向平移；
     *   · 画面已经完整可见（没有可平移空间）时，平移手势回退为缩放，不会出现「滚了没反应」。
     *
     * 底部「自动 / 缩放 / 平移」三档可以覆盖这套判断，选择记在 localStorage。
     */
    const WHEEL_ZOOM_RATE = 0.0016
    const WHEEL_GESTURE_GAP = 150
    const WHEEL_DEFER = 75
    /** deltaY 达到这个量级、且是 10 的整数倍时，基本可断定是鼠标档位（100/120）。 */
    const WHEEL_NOTCH_MIN = 40

    let wheelGesture = null
    let wheelLastTs = 0
    let wheelPending = null

    function panRoom() {
      if (!shell) return { mx: 0, my: 0 }
      const { w, h } = rotatedDims()
      return {
        mx: Math.max(0, (w * view.scale - shell.stage.clientWidth) / 2),
        my: Math.max(0, (h * view.scale - shell.stage.clientHeight) / 2),
      }
    }

    function cancelWheelPending() {
      if (wheelPending === null) return
      clearTimeout(wheelPending.timer)
      wheelPending = null
    }

    function zoomFromWheel(dy, anchor) {
      zoomBy(Math.exp(-dy * WHEEL_ZOOM_RATE), anchor.clientX, anchor.clientY)
    }

    function panFromWheel(dx, dy) {
      // Natural two-finger scroll: the content follows the gesture.
      panBy(-dx, -dy)
    }

    function onWheel(event) {
      if (!open || !shell) return
      // The overlay owns the gesture: never scroll or pinch-zoom the page behind.
      event.preventDefault()
      event.stopPropagation()
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1
      const dx = event.deltaX * unit
      const dy = event.deltaY * unit
      if (dx === 0 && dy === 0) return

      const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
      const gap = now - wheelLastTs
      wheelLastTs = now
      if (gap > WHEEL_GESTURE_GAP) wheelGesture = null

      // Explicit gestures win over the heuristic and over the forced mode.
      if (event.ctrlKey || event.metaKey || event.altKey) {
        cancelWheelPending()
        wheelGesture = 'zoom'
        zoomFromWheel(dy, event)
        return
      }
      if (event.shiftKey) {
        cancelWheelPending()
        wheelGesture = 'hpan'
        panBy(-dy, 0)
        return
      }

      // Forced modes.
      if (view.mode === 'zoom') {
        cancelWheelPending()
        wheelGesture = 'zoom'
        zoomFromWheel(dy, event)
        return
      }
      if (view.mode === 'pan') {
        cancelWheelPending()
        wheelGesture = 'pan'
        panFromWheel(dx, dy)
        return
      }

      // A gesture already classified keeps its meaning.
      if (wheelGesture === 'zoom') {
        zoomFromWheel(dy, event)
        return
      }
      if (wheelGesture === 'hpan') {
        panBy(-dy, 0)
        return
      }
      if (wheelGesture === 'pan') {
        panFromWheel(dx, dy)
        return
      }

      // A brand-new gesture: classify it.
      const adx = Math.abs(dx)
      const ady = Math.abs(dy)
      const notchLike = ady >= WHEEL_NOTCH_MIN && Math.abs(ady % 10) < 0.01 && adx < 1
      if (notchLike) {
        cancelWheelPending()
        wheelGesture = 'zoom'
        zoomFromWheel(dy, event)
        return
      }
      if (adx >= 1.5 && adx >= ady * 0.5) {
        cancelWheelPending()
        const room = panRoom()
        if (room.mx === 0 && room.my === 0 && ady >= adx) {
          wheelGesture = 'zoom'
          zoomFromWheel(dy, event)
        } else {
          wheelGesture = 'pan'
          panFromWheel(dx, dy)
        }
        return
      }
      if (wheelPending !== null) {
        // A follow-up arrived inside the defer window: this is a scroll stream.
        const pending = wheelPending
        cancelWheelPending()
        const room = panRoom()
        if (room.mx === 0 && room.my === 0 && ady >= adx) {
          wheelGesture = 'zoom'
          zoomFromWheel(pending.dy + dy, event)
        } else {
          wheelGesture = 'pan'
          panFromWheel(pending.dx, pending.dy)
          panFromWheel(dx, dy)
        }
        return
      }
      // One lonely small event: wait once for a sibling before calling it a mouse notch.
      wheelPending = {
        dx,
        dy,
        x: event.clientX,
        y: event.clientY,
        timer: window.setTimeout(() => {
          const pending = wheelPending
          wheelPending = null
          if (pending === null || !open || !shell) return
          wheelGesture = 'zoom'
          zoomFromWheel(pending.dy, pending)
        }, WHEEL_DEFER),
      }
    }

    function onPointerDown(event) {
      if (!open || !shell) return
      if (event.pointerType === 'mouse' && event.button !== 0) return
      if (event.target instanceof Element && event.target.closest('button, input')) return
      event.preventDefault()
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      try {
        shell.stage.setPointerCapture(event.pointerId)
      } catch {
        /* pointer capture is best effort */
      }
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        const rect = shell.stage.getBoundingClientRect()
        const cx = (a.x + b.x) / 2
        const cy = (a.y + b.y) / 2
        pinch = {
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          scale: view.scale,
          tx: view.tx,
          ty: view.ty,
          mx: cx - rect.left - rect.width / 2,
          my: cy - rect.top - rect.height / 2,
          rect,
        }
        drag = null
      } else if (pointers.size === 1) {
        drag = { id: event.pointerId, x: event.clientX, y: event.clientY, tx: view.tx, ty: view.ty }
        shell.stage.classList.add(`${ROOT_CLASS}-grabbing`)
      }
    }

    function onPointerMove(event) {
      if (!open || !shell || !pointers.has(event.pointerId)) return
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pinch !== null && pointers.size >= 2) {
        const [a, b] = [...pointers.values()]
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinch.dist <= 0 || dist <= 0) return
        const cx = (a.x + b.x) / 2
        const cy = (a.y + b.y) / 2
        const target = clamp(pinch.scale * (dist / pinch.dist), MIN_SCALE, MAX_SCALE)
        const ratio = target / pinch.scale
        const mx = cx - pinch.rect.left - pinch.rect.width / 2
        const my = cy - pinch.rect.top - pinch.rect.height / 2
        view.scale = target
        view.tx = mx - (pinch.mx - pinch.tx) * ratio
        view.ty = my - (pinch.my - pinch.ty) * ratio
        clampPan()
        applyTransform(false)
        return
      }
      if (drag === null || drag.id !== event.pointerId) return
      view.tx = drag.tx + (event.clientX - drag.x)
      view.ty = drag.ty + (event.clientY - drag.y)
      clampPan()
      applyTransform(false)
    }

    function onPointerUp(event) {
      if (!shell) return
      pointers.delete(event.pointerId)
      if (pointers.size < 2) pinch = null
      if (pointers.size === 0) {
        drag = null
        shell.stage.classList.remove(`${ROOT_CLASS}-grabbing`)
      }
      try {
        shell.stage.releasePointerCapture(event.pointerId)
      } catch {
        /* capture may already be released */
      }
    }

    function onDoubleClick(event) {
      if (!open || !shell) return
      if (event.target instanceof Element && event.target.closest('button, input')) return
      event.preventDefault()
      event.stopPropagation()
      const atFit = Math.abs(view.scale - view.fit) < 0.005
      if (atFit) actualSize(true)
      else fitView(true)
    }

    function focusables() {
      if (!shell) return []
      return [...shell.panel.querySelectorAll('button, input')].filter(
        node => !node.disabled && node.offsetParent !== null,
      )
    }

    function onKeyDown(event) {
      if (!open || !shell) return
      const target = event.target
      const typing =
        target instanceof Element && target.closest('input, textarea, [contenteditable]') !== null

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        if (typing) {
          shell.percent.blur()
          updateReadout()
        } else {
          close()
        }
        return
      }
      if (event.key === 'Tab') {
        const list = focusables()
        if (list.length === 0) return
        const first = list[0]
        const last = list[list.length - 1]
        if (!shell.panel.contains(document.activeElement)) {
          event.preventDefault()
          ;(event.shiftKey ? last : first).focus()
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
        return
      }
      if (typing) return

      const key = event.key
      // Keep the page behind the overlay still: Space / Page keys would scroll it
      // because focus sits on the panel. Buttons keep their native Space activation.
      const onControl =
        target instanceof Element && target.closest('button, input, a, [role="button"]') !== null
      const pageKey = key === 'PageUp' || key === 'PageDown' || key === 'Home' || key === 'End'
      // Page keys never activate a control, so they are always swallowed; Space is
      // left to a focused button so Space can still press it.
      if (pageKey || (key === ' ' && !onControl)) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      const step = 1.25
      let handled = true
      if (key === '+' || key === '=') zoomBy(step)
      else if (key === '-' || key === '_') zoomBy(1 / step)
      else if (key === '0') fitView(true)
      else if (key === '1') actualSize(true)
      else if (key === 'ArrowLeft' && event.shiftKey) panBy(ARROW_PAN, 0)
      else if (key === 'ArrowRight' && event.shiftKey) panBy(-ARROW_PAN, 0)
      else if (key === 'ArrowUp') panBy(0, ARROW_PAN)
      else if (key === 'ArrowDown') panBy(0, -ARROW_PAN)
      else if (key === 'ArrowLeft') go(-1)
      else if (key === 'ArrowRight') go(1)
      else if (key === 'r') rotateBy(90)
      else if (key === 'R') rotateBy(-90)
      else handled = false
      if (handled) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    function go(delta) {
      if (view.gallery.length <= 1) return
      showAt(view.index + delta)
    }

    // ---------------------------------------------------------- click capture

    function onClickCapture(event) {
      if (open) return
      if (event.defaultPrevented) return
      if (typeof event.button === 'number' && event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = event.target
      if (!(target instanceof Element)) return
      const img = target.closest('img')
      if (img === null || !isCandidate(img)) return
      // A Markdown link may wrap an image; navigation keeps its meaning.
      if (img.closest('a[href]') !== null) return
      event.preventDefault()
      event.stopPropagation()
      openImage(img)
    }

    // --------------------------------------------------------------- actions

    function currentSource() {
      const node = view.gallery[view.index]
      if (node instanceof HTMLImageElement) return node.currentSrc || node.src || ''
      return ''
    }

    async function downloadImage() {
      const src = currentSource()
      if (!src) return
      const name = fileNameForDownload(src, view.alt, view.format)
      try {
        const response = await fetch(src)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = name
        anchor.rel = 'noopener'
        document.body.append(anchor)
        anchor.click()
        anchor.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 4000)
        toast(`${T.downloaded} · ${name}`)
      } catch {
        const opened = openSource(src)
        if (opened) toast(`${T.downloaded} · ${name}`)
        else toast(T.downloadFailed)
      }
    }

    async function copyImage() {
      const src = currentSource()
      if (!src) return
      try {
        const response = await fetch(src)
        let blob = await response.blob()
        let type = blob.type || 'image/png'
        if (type !== 'image/png' && type !== 'image/jpeg') {
          blob = await toPng(blob, src)
          type = 'image/png'
        }
        if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) throw new Error('clipboard unavailable')
        await navigator.clipboard.write([new ClipboardItem({ [type]: blob })])
        toast(T.copied)
      } catch {
        toast(T.copyFailed)
      }
    }

    function toPng(blob, src) {
      return new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => {
          try {
            const limit = 4096
            const ratio = Math.min(1, limit / Math.max(image.naturalWidth, image.naturalHeight))
            const canvas = document.createElement('canvas')
            canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio))
            canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio))
            const context = canvas.getContext('2d')
            if (context === null) throw new Error('no 2d context')
            context.drawImage(image, 0, 0, canvas.width, canvas.height)
            canvas.toBlob(png => (png ? resolve(png) : reject(new Error('encode failed'))), 'image/png')
          } catch (error) {
            reject(error)
          }
        }
        image.onerror = reject
        image.src = src
      })
    }

    function openSource(src) {
      try {
        return window.open(src, '_blank', 'noopener')
      } catch {
        return null
      }
    }

    /** The Host's session service (desktop bridge), when the Host provides one. */
    function hostSession() {
      try {
        return remoteCtx?.remote?.session
      } catch {
        return undefined
      }
    }

    /**
     * Open the original outside the viewer.
     *
     * · A local workspace file (`/api/file?path=…` or `file:`) goes through the
     *   Host's path opener, which launches the OS default app. The page cannot
     *   hand that URL to a browser: the route needs this session's cookie.
     * · An off-origin http(s) image opens in a new window / the system browser.
     * · `blob:` / `data:` attachments have no path and no URL worth opening, so
     *   the viewer explains the download/copy route instead of silently doing it.
     */
    async function openExternal() {
      const src = currentSource()
      if (!src) return
      const path = localPathOf(src)
      if (path !== undefined) {
        const session = hostSession()
        if (typeof session?.openWorkspacePath === 'function') {
          try {
            const available = await session.canOpenWorkspacePath?.()
            if (available?.ok === true && available.value === false) {
              toast(T.openUnavailable)
              return
            }
            const result = await session.openWorkspacePath({ path })
            if (result?.ok === true) {
              toast(T.openedLocal)
              return
            }
            console.warn('[dsh-image-zoom] host refused to open path', path, result?.error)
          } catch (error) {
            console.warn('[dsh-image-zoom] openWorkspacePath failed', error)
          }
          toast(T.openFailed)
          return
        }
        // No desktop bridge (web profile): the file route still needs a session
        // cookie, so a plain tab cannot show it — point at download instead.
        toast(T.openUnavailable)
        return
      }
      if (isShareableSource(src)) {
        const opened = openSource(src)
        if (opened) {
          toast(T.openedTab)
          return
        }
        void copyLink()
        return
      }
      toast(T.openNoPath)
    }

    async function copyLink() {
      const src = currentSource()
      if (!src) return
      try {
        await navigator.clipboard.writeText(new URL(src, window.location.href).href)
        toast(T.linkCopied)
      } catch {
        toast(T.copyFailed)
      }
    }

    /** Keep the header buttons' tooltips honest about what they act on. */
    function refreshActionLabels() {
      if (!shell) return
      const src = currentSource()
      const shareable = isShareableSource(src)
      shell.btnLink.hidden = !shareable
      const name = fileNameForDownload(src, view.alt, view.format)
      const downloadLabel = `${T.download}（${name}）`
      shell.btnDownload.title = downloadLabel
      shell.btnDownload.setAttribute('aria-label', downloadLabel)
      const local = localPathOf(src) !== undefined
      shell.btnOpen.title = local ? T.openLocalLabel : shareable ? T.openTab : T.openNoPath
    }

    // -------------------------------------------------------------- wiring

    function wireEvents(s) {
      s.backdrop.addEventListener('click', close)
      s.btnClose.addEventListener('click', close)
      s.btnDownload.addEventListener('click', () => void downloadImage())
      s.btnCopy.addEventListener('click', () => void copyImage())
      s.btnLink.addEventListener('click', () => void copyLink())
      s.btnOpen.addEventListener('click', () => void openExternal())
      s.btnZoomIn.addEventListener('click', () => zoomBy(1.25))
      s.btnZoomOut.addEventListener('click', () => zoomBy(1 / 1.25))
      s.btnFit.addEventListener('click', () => fitView(true))
      s.btnActual.addEventListener('click', () => actualSize(true))
      s.btnRotCcw.addEventListener('click', () => rotateBy(-90))
      s.btnRotCw.addEventListener('click', () => rotateBy(90))
      s.navPrev.addEventListener('click', () => go(-1))
      s.navNext.addEventListener('click', () => go(1))

      s.root.addEventListener('wheel', onWheel, { passive: false })
      s.stage.addEventListener('pointerdown', onPointerDown)
      s.stage.addEventListener('pointermove', onPointerMove)
      s.stage.addEventListener('pointerup', onPointerUp)
      s.stage.addEventListener('pointercancel', onPointerUp)
      s.stage.addEventListener('dblclick', onDoubleClick)
      s.stage.addEventListener('contextmenu', event => {
        // Right-click inside the viewer never opens the app's own context menu.
        event.preventDefault()
      })

      const commitPercent = () => {
        const raw = String(s.percent.value).replace(/[^\d.]/g, '')
        const value = Number.parseFloat(raw)
        if (Number.isFinite(value) && value > 0) {
          setScaleAt(clamp(value / 100, MIN_SCALE, MAX_SCALE))
        }
        updateReadout()
      }
      s.percent.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          event.preventDefault()
          commitPercent()
          s.percent.blur()
        }
      })
      s.percent.addEventListener('blur', commitPercent)
      s.percent.addEventListener('focus', () => s.percent.select())
    }

    // --------------------------------------------------------- lifecycle

    function installStyle() {
      if (document.getElementById(STYLE_ID) !== null) return
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = CSS
      document.head.append(style)
    }

    function removeStyle() {
      document.getElementById(STYLE_ID)?.remove()
    }

    function install() {
      if (installed) return
      installed = true
      installStyle()
      document.addEventListener('click', onClickCapture, true)
      document.addEventListener('keydown', onKeyDown, true)
    }

    function uninstall() {
      if (!installed && shell === null) return
      installed = false
      remoteCtx = null
      document.removeEventListener('click', onClickCapture, true)
      document.removeEventListener('keydown', onKeyDown, true)
      close()
      if (resizeObserver) {
        resizeObserver.disconnect()
        resizeObserver = null
      }
      shell?.root.remove()
      shell = null
      removeStyle()
    }

    // ------------------------------------------------------------- test hook

    if (window.__DIZ_TEST_HOOKS__) {
      window.__DIZ_TEST__ = {
        view,
        isOpen: () => open,
        openImage,
        close,
        showAt,
        shell: () => shell,
        candidate: isCandidate,
        fileNameForDownload,
        cleanFileStem,
        isShareableSource,
        localPathOf,
        openExternal,
        hostSession,
        setRemoteSession: session => {
          remoteCtx = session === null || session === undefined ? null : { remote: { session } }
        },
        stampOf,
      }
    }

    return {
      apply(ctx) {
        install()
        // Desktop bridge for opening local files with the OS default app. The
        // viewer still works without it (web profile falls back to download).
        if (ctx && typeof ctx.inject === 'function') {
          try {
            ctx.inject(['remote', 'remote.session'], scoped => {
              remoteCtx = scoped
              return () => {
                if (remoteCtx === scoped) remoteCtx = null
              }
            })
          } catch (error) {
            console.warn('[dsh-image-zoom] remote session unavailable', error)
          }
        }
        if (ctx && typeof ctx.effect === 'function') {
          ctx.effect(() => () => uninstall())
        }
      },
    }
  },
})
