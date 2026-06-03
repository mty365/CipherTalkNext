// 主线程卡顿检测：监控掉帧 / 长任务，并关联最近发生的业务事件，
// 帮助定位"到底是哪一步卡了"——例如拉历史、整列表重渲染、还是图片解码。
//
// 开启方式：
//   - 开发模式（vite dev）自动开启
//   - 任意环境：控制台执行 localStorage.setItem('ct_jank','1') 后刷新（Ctrl+R）即可开启
// 关闭：localStorage.removeItem('ct_jank') 后刷新

const SLOW_FRAME_MS = 50           // 相邻两帧间隔 >50ms（约掉 2 帧以上）即明显卡顿
const BREADCRUMB_WINDOW_MS = 800   // 卡顿前这段时间内的业务事件，作为嫌疑来源
const MAX_BREADCRUMBS = 40

type Breadcrumb = { label: string; at: number }
const breadcrumbs: Breadcrumb[] = []
let installed = false
let rafId = 0

function enabled(): boolean {
  try {
    if (Boolean((import.meta as any)?.env?.DEV)) return true
    return localStorage.getItem('ct_jank') === '1'
  } catch {
    return false
  }
}

/** 记录一个业务事件断点（如"开始拉历史"/"历史渲染"），供卡顿溯源使用。 */
export function jankMark(label: string): void {
  if (!installed) return
  breadcrumbs.push({ label, at: performance.now() })
  if (breadcrumbs.length > MAX_BREADCRUMBS) breadcrumbs.shift()
}

/** 测量一段同步代码耗时，超阈值直接告警（用于框定具体函数）。返回原函数结果。 */
export function jankSpan<T>(label: string, fn: () => T): T {
  if (!installed) return fn()
  const start = performance.now()
  try {
    return fn()
  } finally {
    const dur = performance.now() - start
    jankMark(`${label} (${Math.round(dur)}ms)`)
    if (dur >= SLOW_FRAME_MS) {
      console.warn(`[Jank] 同步耗时 ${Math.round(dur)}ms @ ${label}`)
    }
  }
}

/** 上报一段已测好的耗时（如异步 IPC 往返）：记入断点，超阈值时告警。 */
export function jankReport(label: string, durationMs: number, warnThresholdMs = 200): void {
  if (!installed) return
  jankMark(`${label} (${Math.round(durationMs)}ms)`)
  if (durationMs >= warnThresholdMs) {
    console.warn(`[Jank] ${label} 耗时 ${Math.round(durationMs)}ms`)
  }
}

function reportBlock(durationMs: number, endAt: number, kind: string): void {
  const startAt = endAt - durationMs
  const suspects = breadcrumbs
    .filter((b) => b.at >= startAt - BREADCRUMB_WINDOW_MS && b.at <= endAt)
    .map((b) => b.label)
  console.warn(
    `[Jank] ${kind} ${Math.round(durationMs)}ms`,
    suspects.length
      ? `← 可疑来源: ${suspects.join(' → ')}`
      : '（前后无业务断点，多半是图片解码/列表绘制）'
  )
}

function startLongTaskObserver(): boolean {
  if (typeof PerformanceObserver === 'undefined') return false
  try {
    const supported = (PerformanceObserver as any).supportedEntryTypes as string[] | undefined
    if (supported && !supported.includes('longtask')) return false
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration < SLOW_FRAME_MS) continue
        reportBlock(entry.duration, entry.startTime + entry.duration, '长任务阻塞')
      }
    })
    observer.observe({ entryTypes: ['longtask'] })
    return true
  } catch {
    return false
  }
}

function startFrameMonitor(): void {
  let last = performance.now()
  const tick = () => {
    const now = performance.now()
    const delta = now - last
    last = now
    // 跳过首帧/页面切到后台后的超长间隔（>1s 视为非卡顿，是 tab 挂起）
    if (delta >= SLOW_FRAME_MS && delta < 1000) {
      reportBlock(delta, now, '掉帧')
    }
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
}

/** 安装卡顿监控，幂等。未开启时打印一次开启指引。 */
export function installJankMonitor(): void {
  if (installed) return
  if (!enabled()) {
    console.log('[Jank] 卡顿检测未开启。控制台执行 localStorage.setItem("ct_jank","1") 后刷新(Ctrl+R)即可开启。')
    return
  }
  installed = true
  const longTaskOk = startLongTaskObserver()
  startFrameMonitor()
  console.log(`[Jank] 卡顿检测已开启：帧监控✓ longtask=${longTaskOk ? '✓' : '✗'}，阈值 ${SLOW_FRAME_MS}ms。滚动卡顿时这里会打印来源。`)
}

/** 停止监控（一般不需要手动调用）。 */
export function uninstallJankMonitor(): void {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
  installed = false
}
