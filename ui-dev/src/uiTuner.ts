                                                          
  
                                              
                                            
                                                     
  
                               
                                                                       
                                                        
                                                         
                                                       
                             
                                                 
                                
  
                    
                                                           
                                                     
                                                                     
                    
                                                                 
                                                                
                                                 
  
                                                          
                                                        

import { boardStyles } from './board'

interface Spec {
  readonly key: string                         
  readonly label: string
  readonly min: number
  readonly max: number
  readonly group: string
                                      
  readonly ratioWith?: string
}

                                                             
                                              
const CARD_RATIO = 0.716

                                                    
                                                 
                                   
const SPECS: readonly Spec[] = [
  { key: 'field-w', label: '战场卡 宽', min: 40, max: 130, group: '战场', ratioWith: 'field-h' },
  { key: 'field-h', label: '战场卡 高', min: 56, max: 180, group: '战场' },
  { key: 'hero-w-base', label: '传奇/英雄 宽', min: 44, max: 160, group: '战场', ratioWith: 'hero-h-base' },
  { key: 'hero-h-base', label: '传奇/英雄 高', min: 60, max: 224, group: '战场' },
  { key: 'hand-w', label: '手牌 宽', min: 62, max: 180, group: '手牌带', ratioWith: 'hand-h' },
  { key: 'hand-h', label: '手牌 高', min: 86, max: 250, group: '手牌带' },
  { key: 'hand-sink', label: '手牌沉出屏幕', min: 0, max: 90, group: '手牌带' },
  { key: 'fan-arc', label: '扇形弧高', min: 0, max: 48, group: '手牌带' },
  { key: 'hand-overlap', label: '手牌叠压(负值更紧)', min: -64, max: 0, group: '手牌带' },
  { key: 'rune-w-base', label: '符文卡 宽', min: 28, max: 90, group: '小件' },
  { key: 'rune-h-base', label: '符文卡 高', min: 39, max: 126, group: '小件' },
  { key: 'mini-w', label: '对手牌背 宽', min: 16, max: 46, group: '小件' },
  { key: 'mini-h', label: '对手牌背 高', min: 22, max: 66, group: '小件' },
  { key: 'rail-w', label: '战报栏 宽', min: 180, max: 460, group: '结构' },
]

type Tier = 'base' | 'm900' | 'm760'
type Overrides = Record<Tier, Record<string, number>>

const LS_KEY = 'riftbound.ui.layout.v1'
const STYLE_ID = 'rb-uilayout'

   
                                  
                                           
   
function parseBaseline(): Record<Tier, Record<string, number>> {
  const out: Record<Tier, Record<string, number>> = { base: {}, m900: {}, m760: {} }
  const css = boardStyles
                                                   
  const grab = (chunk: string, into: Record<string, number>): void => {
    for (const m of chunk.matchAll(/--([a-z0-9-]+)\s*:\s*(-?[\d.]+)px/gi)) into[m[1]!] = parseFloat(m[2]!)
    for (const m of chunk.matchAll(/--([a-z0-9-]+)\s*:\s*(-?[\d.]+)\s*[;}]/gi)) {
      if (!(m[1]! in into)) into[m[1]!] = parseFloat(m[2]!)
    }
  }
                                                             
                                                   
                                                             
  const mediaBlock = (q: string): string => {
    const at = css.indexOf(`@media (max-height: ${q})`)
    if (at < 0) return ''
    const open = css.indexOf('{', at)
    let depth = 0
    for (let i = open; i < css.length; i++) {
      if (css[i] === '{') depth++
      else if (css[i] === '}') { depth--; if (depth === 0) return css.slice(open + 1, i) }
    }
    return ''
  }
  const b900 = mediaBlock('900px')
  const b760 = mediaBlock('760px')
  for (const m of b900.matchAll(/\.rb-shell\{([^}]*)\}/g)) grab(m[1]!, out.m900)
  for (const m of b760.matchAll(/\.rb-shell\{([^}]*)\}/g)) grab(m[1]!, out.m760)
  const rest = css.split(b900).join('').split(b760).join('')
  for (const m of rest.matchAll(/\.rb-shell\{([^}]*)\}/g)) grab(m[1]!, out.base)
  return out
}

let baseline = parseBaseline()
let overrides: Overrides = { base: {}, m900: {}, m760: {} }
let panelEl: HTMLElement | null = null

function loadOverrides(): void {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const o = JSON.parse(raw) as Partial<Overrides>
      overrides = { base: o.base ?? {}, m900: o.m900 ?? {}, m760: o.m760 ?? {} }
    }
  } catch { /* 存坏了就当没有,不该因为一份布局偏好把牌桌打不开 */ }
}

function saveOverrides(): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(overrides)) } catch { /* 隐私模式等 */ }
}

                                    
function currentTier(): Tier {
  if (window.matchMedia('(max-height: 760px)').matches) return 'm760'
  if (window.matchMedia('(max-height: 900px)').matches) return 'm900'
  return 'base'
}

                                                
function baseValue(tier: Tier, key: string): number | undefined {
  if (tier === 'm760' && baseline.m760[key] !== undefined) return baseline.m760[key]
  if ((tier === 'm760' || tier === 'm900') && baseline.m900[key] !== undefined) return baseline.m900[key]
  return baseline.base[key]
}

function effective(tier: Tier, key: string): number | undefined {
  return overrides[tier][key] ?? baseValue(tier, key)
}

   
                                  
                                           
   
function applyOverrides(): void {
  const tier = currentTier()
  const decls = Object.entries(overrides[tier])
    .map(([k, v]) => `--${k}:${v}${k === 'hand-overlap' ? 'px' : 'px'}`)
    .join(';')
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ID
    document.head.appendChild(el)
  }
                                                 
  el.textContent = decls ? `html .rb-shell{${decls}}` : ''
}

                                            
   
                                        
                                                                                
                                             
   
function measureVar(shell: Element, name: string): number {
  const probe = document.createElement('div')
  probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;width:0;height:var(${name})`
  shell.appendChild(probe)
  const h = probe.offsetHeight
  probe.remove()
  return h
}

function derived(): string {
  const shell = document.querySelector('.rb-shell')
  if (!shell) return '牌桌未打开(到对局里才有这些值)'
  const peek = measureVar(shell, '--hand-peek')
  const band = measureVar(shell, '--bottom-band')
  const lane = measureVar(shell, '--lane-h')
  return [
    `手牌露出 ${peek}px`,
    `底部占用 ${band}px`,
    `车道高 ${lane}px`,
    `战场保底 ${lane * 2 + 34}px`,
  ].join(' · ')
}

function fmtExport(): string {
  const lines: string[] = ['/* ★760 布局面板导出 · 替换 board.ts 里对应的 .rb-shell 声明块 */']
  const tierName: Record<Tier, string> = { base: '基线', m900: '@media (max-height: 900px)', m760: '@media (max-height: 760px)' }
  for (const tier of ['base', 'm900', 'm760'] as Tier[]) {
    const keys = Object.keys(overrides[tier])
    if (keys.length === 0) continue
    lines.push(`/* ${tierName[tier]} */`)
    lines.push(keys.map((k) => `--${k}:${overrides[tier][k]}px;`).join(''))
  }
  return lines.length > 1 ? lines.join('\n') : '(还没有任何改动)'
}

function row(spec: Spec, tier: Tier): string {
  const base = baseValue(tier, spec.key)
  if (base === undefined) {
    return `<div class="tn-row tn-unknown"><span class="tn-lab">${spec.label}</span><i>未知变量 --${spec.key}</i></div>`
  }
  const val = effective(tier, spec.key) ?? base
  const changed = overrides[tier][spec.key] !== undefined
  return `<div class="tn-row${changed ? ' changed' : ''}" data-key="${spec.key}">
    <span class="tn-lab">${spec.label}</span>
    <input class="tn-range" type="range" min="${spec.min}" max="${spec.max}" step="1" value="${val}" data-key="${spec.key}">
    <input class="tn-num" type="number" min="${spec.min}" max="${spec.max}" value="${val}" data-key="${spec.key}">
    <button class="tn-reset" data-reset="${spec.key}" title="复位成源码里的默认值 ${base}px">↺</button>
  </div>`
}

function panelHtml(): string {
  const tier = currentTier()
  const tierLab: Record<Tier, string> = { base: '基线档(高 > 900px)', m900: '≤900px 档', m760: '≤760px 档' }
  const groups = [...new Set(SPECS.map((s) => s.group))]
  const body = groups.map((g) => `<div class="tn-group"><b>${g}</b>${
    SPECS.filter((s) => s.group === g).map((s) => row(s, tier)).join('')}</div>`).join('')
  const nChanged = Object.keys(overrides[tier]).length
  return `<div class="tn-head">
      <b>⚙ 布局调节</b>
      <button class="tn-x" data-tn-close="1">✕</button>
    </div>
    <div class="tn-status">${tierLab[tier]} · 视口 ${window.innerWidth}×${window.innerHeight}${nChanged ? ` · 本档已改 ${nChanged} 项` : ''}</div>
    <div class="tn-derived">${derived()}</div>
    <label class="tn-lock"><input type="checkbox" id="tn-ratio" ${lockRatio ? 'checked' : ''}> 锁定卡片宽高比(改宽自动配高)</label>
    <div class="tn-body">${body}</div>
    <div class="tn-foot">
      <button class="btn" data-tn-export="1">复制 CSS</button>
      <button class="btn ghost" data-tn-spread="1" title="把本档的改动按比例推给另外两档">同步到另两档</button>
      <button class="btn ghost" data-tn-reset-all="1">全部复位</button>
    </div>
    <div class="tn-msg" id="tn-msg"></div>`
}

let lockRatio = true

function setVal(key: string, v: number, tier: Tier): void {
  const spec = SPECS.find((s) => s.key === key)
  if (!spec) return
  const clamped = Math.max(spec.min, Math.min(spec.max, Math.round(v)))
  overrides[tier][key] = clamped
                              
  if (lockRatio && spec.ratioWith) {
    const partner = SPECS.find((s) => s.key === spec.ratioWith)
    if (partner) {
      const h = Math.round(clamped / CARD_RATIO)
      overrides[tier][partner.key] = Math.max(partner.min, Math.min(partner.max, h))
    }
  } else if (lockRatio) {
    const owner = SPECS.find((s) => s.ratioWith === key)
    if (owner) {
      const w = Math.round(clamped * CARD_RATIO)
      overrides[tier][owner.key] = Math.max(owner.min, Math.min(owner.max, w))
    }
  }
  saveOverrides()
  applyOverrides()
}

function refresh(): void {
  if (!panelEl || panelEl.classList.contains('folded')) return
  panelEl.innerHTML = panelHtml()
}

function msg(text: string): void {
  const el = document.getElementById('tn-msg')
  if (!el) return
  el.textContent = text
  window.setTimeout(() => { if (el.textContent === text) el.textContent = '' }, 2400)
}

                                                
export function mountUiTuner(): void {
  if (document.getElementById('rb-uituner')) return
  loadOverrides()
  applyOverrides()

  const style = document.createElement('style')
  style.textContent = TUNER_CSS
  document.head.appendChild(style)

  const pill = document.createElement('button')
  pill.id = 'rb-tunerpill'
  pill.textContent = '⚙ 布局'
  pill.title = '调整牌桌各部分的大小(拖滑块实时生效,调好可导出成 CSS)'
  document.body.appendChild(pill)

  const panel = document.createElement('div')
  panel.id = 'rb-uituner'
  panel.className = 'folded'
  document.body.appendChild(panel)
  panelEl = panel

  pill.onclick = (): void => {
    panel.classList.toggle('folded')
    if (!panel.classList.contains('folded')) refresh()
  }

  panel.addEventListener('input', (ev) => {
    const t = ev.target as HTMLInputElement
    const key = t.getAttribute('data-key')
    if (!key) return
    setVal(key, Number(t.value), currentTier())
                                       
    const rowEl = t.closest('.tn-row')
    rowEl?.classList.add('changed')
    rowEl?.querySelectorAll<HTMLInputElement>('input').forEach((i) => { if (i !== t) i.value = t.value })
                          
    const spec = SPECS.find((s) => s.key === key)
    const partnerKey = spec?.ratioWith ?? SPECS.find((s) => s.ratioWith === key)?.key
    if (lockRatio && partnerKey) {
      const pv = overrides[currentTier()][partnerKey]
      if (pv !== undefined) {
        const pRow = panel.querySelector(`.tn-row[data-key="${partnerKey}"]`)
        pRow?.classList.add('changed')
        pRow?.querySelectorAll<HTMLInputElement>('input').forEach((i) => { i.value = String(pv) })
      }
    }
    const d = panel.querySelector('.tn-derived')
    if (d) d.textContent = derived()
  })

  panel.addEventListener('change', (ev) => {
    const t = ev.target as HTMLInputElement
    if (t.id === 'tn-ratio') { lockRatio = t.checked }
  })

  panel.addEventListener('click', (ev) => {
    const el = (ev.target as HTMLElement).closest('[data-tn-close],[data-tn-export],[data-tn-reset-all],[data-tn-spread],[data-reset]')
    if (!el) return
    const tier = currentTier()
    if (el.hasAttribute('data-tn-close')) { panel.classList.add('folded'); return }
    if (el.hasAttribute('data-reset')) {
      const k = el.getAttribute('data-reset')!
      delete overrides[tier][k]
      const spec = SPECS.find((s) => s.key === k)
      const partner = spec?.ratioWith ?? SPECS.find((s) => s.ratioWith === k)?.key
      if (lockRatio && partner) delete overrides[tier][partner]
      saveOverrides(); applyOverrides(); refresh(); return
    }
    if (el.hasAttribute('data-tn-reset-all')) {
      overrides = { base: {}, m900: {}, m760: {} }
      saveOverrides(); applyOverrides(); refresh(); msg('已全部复位成源码默认值'); return
    }
    if (el.hasAttribute('data-tn-spread')) {
      const src = overrides[tier]
      for (const other of (['base', 'm900', 'm760'] as Tier[])) {
        if (other === tier) continue
        for (const [k, v] of Object.entries(src)) {
          const from = baseValue(tier, k); const to = baseValue(other, k)
          if (from === undefined || to === undefined || from === 0) continue
          overrides[other][k] = Math.round(v * (to / from))            
        }
      }
      saveOverrides(); applyOverrides(); msg('已按比例同步到另外两档'); return
    }
    if (el.hasAttribute('data-tn-export')) {
      const css = fmtExport()
      void navigator.clipboard?.writeText(css).then(() => msg('CSS 已复制到剪贴板')).catch(() => {
        msg('复制失败,已打印到控制台'); console.log(css)
      })
    }
  })

                        
  for (const q of ['(max-height: 760px)', '(max-height: 900px)']) {
    window.matchMedia(q).addEventListener('change', () => { applyOverrides(); refresh() })
  }
  window.addEventListener('resize', () => {
    const st = panel.querySelector('.tn-status')
    if (st && !panel.classList.contains('folded')) refresh()
  })
}

                                         
export function reparseTunerBaseline(): void {
  baseline = parseBaseline()
  applyOverrides()
  refresh()
}

const TUNER_CSS = `
#rb-tunerpill{position:fixed;right:10px;top:10px;z-index:400;cursor:pointer;
  font-size:11px;padding:4px 10px;border-radius:99px;color:#cbd5e1;
  background:#0f172ae6;border:1px solid #334155;box-shadow:0 4px 14px #0008}
#rb-tunerpill:hover{background:#1e293b;color:#fff}
#rb-uituner{position:fixed;right:10px;top:40px;z-index:400;width:320px;max-height:82vh;overflow-y:auto;
  display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-radius:12px;
  background:#0b1120f7;border:1px solid #334155;box-shadow:0 20px 60px #000c;
  color:#e2e8f0;font-size:12px}
#rb-uituner.folded{display:none}
#rb-uituner .tn-head{display:flex;align-items:center;justify-content:space-between}
#rb-uituner .tn-head b{font-size:13px;color:#facc15}
#rb-uituner .tn-x{background:none;border:0;color:#94a3b8;cursor:pointer;font-size:14px;padding:0 4px}
#rb-uituner .tn-status{font-size:10.5px;color:#7dd3fc}
#rb-uituner .tn-derived{font-size:10px;color:#94a3b8;line-height:1.5;
  padding:5px 7px;border-radius:7px;background:#00000040;border:1px solid #1e293b}
#rb-uituner .tn-lock{display:flex;align-items:center;gap:6px;font-size:10.5px;color:#cbd5e1;cursor:pointer}
#rb-uituner .tn-group{display:flex;flex-direction:column;gap:3px;padding-top:4px}
#rb-uituner .tn-group > b{font-size:10px;letter-spacing:.1em;color:#facc15aa}
#rb-uituner .tn-row{display:grid;grid-template-columns:1fr 96px 46px 20px;gap:5px;align-items:center}
#rb-uituner .tn-lab{font-size:10.5px;color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#rb-uituner .tn-row.changed .tn-lab{color:#fde047}
#rb-uituner .tn-range{width:100%;accent-color:#6366f1}
#rb-uituner .tn-num{width:100%;font-size:10.5px;padding:2px 4px;border-radius:5px;
  background:#0f172a;border:1px solid #334155;color:#e2e8f0}
#rb-uituner .tn-reset{background:none;border:0;color:#33415500;cursor:pointer;font-size:11px;padding:0}
#rb-uituner .tn-row.changed .tn-reset{color:#94a3b8}
#rb-uituner .tn-row.changed .tn-reset:hover{color:#fff}
#rb-uituner .tn-unknown i{font-size:10px;color:#f87171;font-style:normal}
#rb-uituner .tn-foot{display:flex;gap:6px;flex-wrap:wrap;padding-top:6px;border-top:1px solid #1e293b}
#rb-uituner .tn-foot .btn{font-size:10.5px;padding:4px 8px}
#rb-uituner .tn-msg{font-size:10px;color:#86efac;min-height:12px}
`
