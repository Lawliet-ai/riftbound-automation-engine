                                  
  
                                                    
                                   
  
                                                             
                                                      
                                                                          
  
                                                                
                                              
                                                        
                                            
                                                             
                                                                 
                                                  

import type { ClientView } from '../../engine/src/net/project'
import { validatePayment, type Capacity, type Cost, type PaymentPick } from '../../engine/src/state/runePool'
import { DOMAIN } from './cards'

interface UIAction { kind: string; player?: string; [k: string]: unknown }

                                   
const ANY = '*'
const domName = (d: string): string => (d === ANY ? '任意特性' : DOMAIN[d]?.name ?? d)
const domColor = (d: string): string => (d === ANY ? '#94a3b8' : DOMAIN[d]?.color ?? '#888')

interface RuneCard { readonly oid: string; readonly domain: string; readonly tapped: boolean }
interface Wallet { readonly cap: Capacity; readonly runeCards: readonly RuneCard[] }

   
                                                             
                                                     
   
export function walletOf(view: ClientView, seat: string): Wallet {
  const pool = (view as { pool?: { mana: number; energy: Record<string, number> } }).pool
  const runeCards: RuneCard[] = []
  for (const oid of view.zones[`base:${seat}`]?.contents ?? []) {
    const o = view.objects[oid]
    if (!o || o.hidden || !o.defId?.startsWith('rune:') || o.controller !== seat) continue
    runeCards.push({ oid, domain: o.defId.slice(5), tapped: o.tapped === true })
  }
  const runes: Record<string, number> = {}
  for (const r of runeCards) runes[r.domain] = (runes[r.domain] ?? 0) + 1
  return {
    cap: { mana: pool?.mana ?? 0, energy: { ...(pool?.energy ?? {}) }, runes, activeRunes: runeCards.filter((r) => !r.tapped).length },
    runeCards,
  }
}

type Src = 'pool' | 'rune'
interface Opt { readonly domain: string; readonly src: Src; readonly key: string }

                                                            
function optsFor(pip: readonly string[], w: Wallet): Opt[] {
  const doms = pip.length > 0 ? pip : [...new Set([...Object.keys(w.cap.energy), ...Object.keys(w.cap.runes)])]
  const out: Opt[] = []
  for (const d of doms) {
    if (d === ANY) continue
    if ((w.cap.energy[d] ?? 0) > 0) out.push({ domain: d, src: 'pool', key: `pool:${d}` })
    if ((w.cap.runes[d] ?? 0) > 0) out.push({ domain: d, src: 'rune', key: `rune:${d}` })
  }
  if ((w.cap.energy[ANY] ?? 0) > 0) out.push({ domain: ANY, src: 'pool', key: `pool:${ANY}` })
  return out
}

   
                                       
                             
                                                      
                                                      
   
export function needsPayChoice(due: Cost | undefined, w: Wallet): boolean {
  const pips = due?.pips ?? []
  if (pips.length === 0) return false
  return pips.some((p) => new Set(optsFor(p, w).map((o) => o.domain)).size >= 2)
}

                               
function leftOver(w: Wallet, sel: readonly (Opt | null)[], exceptIdx: number): { energy: Record<string, number>; runes: Record<string, number> } {
  const energy = { ...w.cap.energy }
  const runes = { ...w.cap.runes }
  sel.forEach((o, i) => {
    if (!o || i === exceptIdx) return
    if (o.src === 'pool') energy[o.domain] = (energy[o.domain] ?? 0) - 1
    else runes[o.domain] = (runes[o.domain] ?? 0) - 1
  })
  return { energy, runes }
}

                                                    
function defaultSel(pips: readonly (readonly string[])[], w: Wallet): (Opt | null)[] {
  const sel: (Opt | null)[] = pips.map(() => null)
  pips.forEach((p, i) => {
    const left = leftOver(w, sel, i)
    const opts = optsFor(p, w)
    sel[i] = opts.find((o) => o.src === 'pool' && (left.energy[o.domain] ?? 0) > 0)
      ?? opts.find((o) => (left.runes[o.domain] ?? 0) > 0)
      ?? null
  })
  return sel
}

                                                        
function recycleCards(sel: readonly (Opt | null)[], w: Wallet): RuneCard[] {
  const need: Record<string, number> = {}
  for (const o of sel) if (o && o.src === 'rune') need[o.domain] = (need[o.domain] ?? 0) + 1
  const out: RuneCard[] = []
  for (const [d, n] of Object.entries(need)) {
    out.push(...w.runeCards.filter((r) => r.domain === d)
      .sort((a, b) => Number(b.tapped) - Number(a.tapped)).slice(0, n))
  }
  return out
}

function buildPick(sel: readonly (Opt | null)[], w: Wallet): PaymentPick {
  const energyUsed: Record<string, number> = {}
  const runesRecycled: Record<string, number> = {}
  for (const o of sel) {
    if (!o) continue
    if (o.src === 'pool') energyUsed[o.domain] = (energyUsed[o.domain] ?? 0) + 1
    else runesRecycled[o.domain] = (runesRecycled[o.domain] ?? 0) + 1
  }
  const oids = recycleCards(sel, w).map((r) => r.oid)
  return { energyUsed, runesRecycled, ...(oids.length > 0 ? { recycleOids: oids } : {}) }
}

let styled = false
function ensureStyles(): void {
  if (styled) return
  styled = true
  const st = document.createElement('style')
  st.id = 'rb-pay-style'
  st.textContent = `
  #rb-payask{position:fixed;inset:0;z-index:400;display:flex;align-items:center;justify-content:center;background:#020617b3}
  #rb-payask .pk-box{width:min(560px,94vw);max-height:88vh;overflow:auto;background:#0f172af7;border:1px solid #334155;
    border-radius:14px;padding:16px 18px;box-shadow:0 22px 60px #000c;color:#e2e8f0;font-size:13px}
  #rb-payask h4{margin:0 0 2px;font-size:15px;font-weight:600}
  #rb-payask .pk-sub{color:#94a3b8;font-size:11.5px;line-height:1.6;margin-bottom:12px}
  #rb-payask .pk-row{border-top:1px solid #1e293b;padding:10px 0 4px}
  #rb-payask .pk-lab{color:#cbd5e1;font-size:12px;margin-bottom:7px}
  #rb-payask .pk-lab i{font-style:normal;color:#64748b}
  #rb-payask .pk-opts{display:flex;flex-wrap:wrap;gap:7px}
  #rb-payask .pk-opt{display:flex;flex-direction:column;gap:2px;align-items:flex-start;cursor:pointer;
    border:1px solid #334155;background:#1e293b66;border-radius:9px;padding:7px 11px;color:#e2e8f0;font-size:12.5px;line-height:1.25}
  #rb-payask .pk-opt small{color:#94a3b8;font-size:10.5px}
  #rb-payask .pk-opt:hover:not(:disabled){border-color:#64748b;background:#1e293bcc}
  #rb-payask .pk-opt:disabled{opacity:.35;cursor:not-allowed}
  #rb-payask .pk-opt.on{border-color:var(--pc);background:color-mix(in srgb, var(--pc) 22%, #0f172a);box-shadow:0 0 0 1px var(--pc) inset}
  #rb-payask .pk-dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--pc);margin-right:6px;vertical-align:1px}
  #rb-payask .pk-warn{margin-top:12px;border:1px solid #7c2d12;background:#7c2d1233;border-radius:9px;padding:9px 11px;
    color:#fdba74;font-size:11.5px;line-height:1.65}
  #rb-payask .pk-keep{margin-top:8px;color:#94a3b8;font-size:11.5px;line-height:1.6}
  #rb-payask .pk-btns{display:flex;gap:10px;margin-top:15px}
  #rb-payask .pk-go{flex:1;padding:11px;border-radius:10px;border:1px solid #15803d;background:#166534;color:#dcfce7;
    font-size:14px;font-weight:600;cursor:pointer}
  #rb-payask .pk-go:hover{background:#15803d}
  #rb-payask .pk-no{padding:11px 16px;border-radius:10px;border:1px solid #334155;background:#1e293b;color:#94a3b8;cursor:pointer}
  `
  document.head.appendChild(st)
}

                                             
let closeCurrent: (() => void) | null = null

   
                                                     
                                    
   
function ask(due: Cost, w: Wallet, title: string): Promise<PaymentPick | null | 'auto'> {
  ensureStyles()
  closeCurrent?.()
  return new Promise<PaymentPick | null | 'auto'>((resolve) => {
    const pips = (due.pips ?? []).map((p) => [...p])
    const sel = defaultSel(pips, w)
    const back = document.createElement('div')
    back.id = 'rb-payask'
    const box = document.createElement('div')
    box.className = 'pk-box'
    back.appendChild(box)
    const done = (v: PaymentPick | null | 'auto'): void => { back.remove(); closeCurrent = null; resolve(v) }
    closeCurrent = () => done(null)

    const draw = (): void => {
      box.textContent = ''
      const h = document.createElement('h4')
      h.textContent = `这次付费:${title}`
      const sub = document.createElement('div')
      sub.className = 'pk-sub'
      const manaNeed = due.mana ?? 0
      const tapCount = Math.max(0, manaNeed - w.cap.mana)
      sub.innerHTML = `要付 ${manaNeed > 0 ? `法力 <b>${manaNeed}</b> + ` : ''}符能 <b>${pips.length}</b> 点。`
        + '每一点符能都由你决定用什么颜色、从哪儿出(§444.2 支付时由你选择移除哪些资源)。'
        + (tapCount > 0 ? `<br>法力这部分:池里 ${w.cap.mana} 点,差的 ${tapCount} 点会横置 ${tapCount} 枚符文来产(符文留在场上,下回合唤醒)。` : '')
      box.append(h, sub)

      pips.forEach((p, i) => {
        const row = document.createElement('div')
        row.className = 'pk-row'
        const lab = document.createElement('div')
        lab.className = 'pk-lab'
        lab.innerHTML = `第 ${i + 1} 点符能 <i>· ${p.length === 0 ? '任意颜色的符能都可以付' : `只能用 ${p.map(domName).join(' 或 ')} 付`}</i>`
        const opts = document.createElement('div')
        opts.className = 'pk-opts'
        const left = leftOver(w, sel, i)
        for (const o of optsFor(p, w)) {
          const b = document.createElement('button')
          const enough = o.src === 'pool' ? (left.energy[o.domain] ?? 0) > 0 : (left.runes[o.domain] ?? 0) > 0
          b.className = `pk-opt${sel[i]?.key === o.key ? ' on' : ''}`
          b.style.setProperty('--pc', domColor(o.domain))
          b.disabled = !enough
          const n = o.src === 'pool' ? w.cap.energy[o.domain] ?? 0 : w.cap.runes[o.domain] ?? 0
          b.innerHTML = o.src === 'pool'
            ? `<span><i class="pk-dot"></i>已产出的 ${domName(o.domain)}符能</span><small>池里有 ${n} 点 · 不花掉这回合结束就蒸发</small>`
            : `<span><i class="pk-dot"></i>回收一枚 ${domName(o.domain)}符文</span><small>场上有 ${n} 枚 · 回收=送回符文牌堆底</small>`
          b.onclick = () => { sel[i] = o; draw() }
          opts.appendChild(b)
        }
        row.append(lab, opts)
        box.appendChild(row)
      })

                                             
      const rec = recycleCards(sel, w)
      const warn = document.createElement('div')
      warn.className = rec.length > 0 ? 'pk-warn' : 'pk-keep'
      warn.innerHTML = rec.length > 0
        ? `⚠️ 这次会<b>回收掉</b>:${rec.map((r) => `${domName(r.domain)}符文${r.tapped ? '(已横置那枚)' : ''}`).join('、')}`
          + '<br>回收的符文会<b>送回符文牌堆底</b>,这一局不会再回来(§164.2.b / §416.1.b);'
          + '横置只是躺下产 1 点法力,下回合会自己唤醒 —— 这是两件完全不同的事。'
        : '这次不会回收任何符文:全部用池里已经产出来的符能支付,场上的符文一枚都不动。'
      box.appendChild(warn)

      const btns = document.createElement('div')
      btns.className = 'pk-btns'
      const go = document.createElement('button')
      go.className = 'pk-go'
      go.textContent = '就这样支付'
      go.disabled = sel.some((x) => x === null)
      go.onclick = () => {
        const pick = buildPick(sel, w)
                                       
                                                              
                                   
        const ok = validatePayment(w.cap, { pips: due.pips ?? [] }, pick) !== null
        done(ok ? pick : 'auto')
      }
      const no = document.createElement('button')
      no.className = 'pk-no'
      no.textContent = '算了'
      no.onclick = () => done(null)
      btns.append(go, no)
      box.appendChild(btns)
    }
    draw()
    back.onclick = (e) => { if (e.target === back) done(null) }
    document.body.appendChild(back)
  })
}

                                                   
function titleOf(a: UIAction): string {
  switch (String(a.kind)) {
    case 'PLACE_STANDBY': return '盖着放上去(布置待命)'
    case 'PLAY_UNIT': return '打出这张牌'
    case 'PLAY_CARD': return '施放这个法术'
    case 'ACTIVATE': return '使用这个技能'
    default: return '这个动作'
  }
}

   
                               
                                                         
   
export async function withPayChoice(a: UIAction, view: ClientView, seat: string): Promise<UIAction | null> {
  if (a.payWith !== undefined) return a                    
  const due = a.due as Cost | undefined
  if (!due) return a                             
  const w = walletOf(view, seat)
  if (!needsPayChoice(due, w)) return a
  const pick = await ask(due, w, titleOf(a))
  if (pick === 'auto') return a                                      
  return pick === null ? null : { ...a, payWith: pick }
}
