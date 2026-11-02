# Changelog

## 0.2.0 — 2026-11-01 · 鼠标滚轮缩放修复

- **滚轮判定改成手势状态机**：不再用「delta 大 = 鼠标、delta 小 = 触控板」一刀切。
  - 孤立的一次滚轮（停顿超过 150ms 后的第一下）→ **缩放**，无论 delta 是 100/120 的档位，
    还是平滑滚动鼠标/精密鼠标发出的几个像素（先等 75ms 确认没有后续事件）。
  - 一次连续滚轮流（事件间隔很短）→ **平移**，保留触控板双指滚动的自然手感。
  - 画面没有可平移空间（图像完整可见）时，平移手势回退为缩放，不会「滚了没反应」。
  - 捏合（Ctrl/⌘/Alt+滚轮）始终缩放；Shift+滚轮始终横向平移。
- **滚轮口径改成三档可见按钮**：底部 `自动 | 缩放 | 平移`，点一下就切换并记住。
  原先是一个循环按钮，鼠标用户不容易发现。
- **语言在打开查看器时判定**：DSH 页面启动初期的 `lang` 可能还没落定，之前会在中文界面里
  显示英文标签；现在打开时按页面 `lang` + 浏览器语言重新取字典。
- 测试扩到 **51 项**：新增 Windows 档位（deltaY=100/120 立即缩放）、精密鼠标小 delta 孤立事件、
  触控板连续流（平移且不改缩放）、适应窗口时的平移→缩放回退、三档口径切换。

## 0.1.0 — 2026-11-01 · 首版

- 接管内容图片点击：自绘弹层，缩放/平移/图集/旋转/下载/复制/新标签打开。
- 鼠标滚轮以指针为中心缩放；触控板捏合缩放；双指滚动双轴平移；拖动平移；键盘与快捷键。
- 纯客户端 UI 插件，Host 半侧为空；捕获阶段接管，不改消息内容与页面结构。

## 0.2.1 — 2026-11-01 · 下载命名规则 + 顶栏动作说清楚

- **下载自动命名**：统一 `<说明>-<YYYYMMDD-HHmmss>.<扩展名>`。说明优先取图片 alt，其次有意义的源文件名，
  兜底「图片」/「image」；扩展名按真实识别格式（PNG/JPG/WEBP/SVG…）；时间戳保证不重名、可排序。
  已处理 Windows 禁用字符与 `CON/PRN/AUX/NUL/COM1…` 保留名，超长说明截断到 48 字符。
  下载按钮 tooltip 预告本次文件名，macOS 保存对话框打开即带好名字。
- **顶栏动作明确化**：`↗` 标注为「打开原图（新窗口 / 系统浏览器）」，不是分享；新增 `🔗 复制图片链接`
  （仅外链 http(s) 图片显示）作为分享入口；新窗口被拦截时外链图复制链接、本地图直接下载。
- 测试扩到 **66 项**：命名规则 8 项、真实下载落盘文件名、按钮 tooltip、分享入口显隐、打开原图文案。

## 1.0.0 — 2026-11-01 · 发布检查整备

**发布前综合体检（UX / 功能 / 流程 / 交互 / 代码干净度）后的改动：**

- **键盘隔离**：查看器打开时 `Space` / `PageUp` / `PageDown` / `Home` / `End` 不再滚动背后页面；
  焦点在按钮上时 `Space` 仍保留原生按钮激活。关闭后按键恢复透传。
- **加载与失败状态**：超过约 160ms 未就绪显示 spinner（避免大图打开像空白）；加载失败显示内联错误
  （`role="alert"`）与原因提示，不再只有 toast。
- **无固有尺寸的图兜底**：只有 `viewBox` 的 SVG 等 `naturalWidth/Height = 0` 的图，改用页面预留尺寸，
  不再渲染成 0×0。
- **横向手势不再误触缩放**：适应窗口时只有纵向滚动回退为缩放，横向滑动什么都不做。
- **被拦截的新窗口不再静默下载**：外链图复制链接，本地图提示改用下载/复制。
- **细节**：滚轮口径切换的 toast 改为短标签；非 base64 的 data URL 也显示体积；
  toast 增加 `role="status"` / `aria-live="polite"`；首屏提示文案补「双击 1:1」。
- **代码整洁**：移除未使用的 i18n 键；`clampPan` 复用 `panRoom`；头部动作容器改用 CSS 类；
  更新过期的模块注释。
- **测试**：66 → **78** 项（新增键盘隔离、横向手势、被拦截窗口、加载/失败态、无固有尺寸兜底、
  模式 toast、错误 `role` 等）。
- **发布材料**：`RELEASE.md`（验证矩阵 / 已知边界 / 手动验收清单 / 校验和）、`LICENSE`、
  `tests/README.md`（含「一个 Chrome 只跑一个测试套件」的说明）。

> 说明：本轮体检前的 0.2.1 已可用；1.0.0 是稳定性、可访问性与发布材料的整备，不改变既有手势口径。

## 1.0.1 — 2026-11-01 · first public release

- Published as **dsh-image-zoom** (previously a local link package). `dsh.bundle.patch` + `dsh.client` are unchanged in shape; the ModuleLoader id now matches the public package name.
- Marketplace packaging: 4 storefront screenshots + `screenshots.json`, 180/512 icons, 1600×560 banner, bilingual README, SECURITY / SUPPORT / CONTRIBUTING, issue and PR templates, CI workflow.
- Identity and release policy: `docs/identity-and-release.md`; marketplace submission and launch checklist under `docs/marketplace/`.
- Verification stays at **88 / 88** interaction checks, plus a tarball-install boot check in a scratch DSH profile.

## 1.0.1 — 2026-11-01 · 「打开原图」走桌面端 Host

- **修掉红框问题**：桌面壳会拦截 `window.open`（本地图片 URL 还带会话 cookie），点 ↗ 只会得到
  「新窗口被拦截」的提示。现在本地工作区图片（`/api/file?path=…`、`file:`）改走 Host 的
  `remote.session.openWorkspacePath`，用**系统默认应用**打开；按钮 tooltip 显示「用系统默认应用打开原图」。
- 外链 http(s) 图片仍走新窗口 / 系统浏览器；被拦截时复制链接。
- `blob:` / `data:` 附件没有本地路径：提示「可下载原图或复制图片」，不会静默下载。
- Host 不支持（web profile）时提示改用下载，不报错。
- 没有本地路径的附件，↗ 的 tooltip 直接解释「可下载或复制」，不再写成「新窗口」。
- 测试 88 项：新增本地路径解析（`/api/file?path=`、`file:`、Windows 盘符、blob/data/remote）、
  Host 桥接调用参数、不可用提示、无路径提示、tooltip 文案；测试改为每次新开页面隔离。
- 真机验证：安装态按钮文案正确；Host 桥接对不存在路径返回拒绝（toast「无法打开原图」），
  证明 `openWorkspacePath` 通道已通；路径解析与调用参数用注入实例 + stub 验证。
