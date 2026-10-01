                                                  
  
                           
                                                             
                                                            
                                              
                      
  
                                            
                                                   

import type { ClientView, ProjectedObject } from '../../engine/src/net/project'

   
                                     
                                                                                 
                                                  
   
export const EQUIP_ABILITY_PREFIX = 'equip:'

                       
export function isEquipAction(a: { kind: string; ability?: unknown }): boolean {
  return a.kind === 'ACTIVATE' && typeof a.ability === 'string' && a.ability.startsWith(EQUIP_ABILITY_PREFIX)
}

   
                        
                                                        
                                               
                                       
   
export function equipButtonText(label: string | undefined, ability: string): string {
  const raw = label ?? ability
                                
                                       
                                               
                                                    
                                                                            
  const tail = /^(.*?)[:：]?\s*(?:将此牌)?贴附到[^:：]{0,12}单位(?:上)?\s*$/.exec(raw)
  let body = (tail ? tail[1]! : raw).trim()
  const bracket = /^\[(.+)\]$/.exec(body)               
  if (bracket) body = bracket[1]!.trim()
  return body.replace(/[:：,,]\s*$/, '').trim() || raw
}

                                                      
export interface AttachIndex {
                              
  readonly hostOf: ReadonlyMap<string, string>
                                        
  readonly onHost: ReadonlyMap<string, readonly string[]>
}

export function attachIndex(view: ClientView): AttachIndex {
  const hostOf = new Map<string, string>()
  const onHost = new Map<string, string[]>()
  for (const [oid, o] of Object.entries(view.objects)) {
    const host = (o as ProjectedObject).attachedTo
    if (!host) continue
    hostOf.set(oid, host)
    const list = onHost.get(host) ?? []
    list.push(oid)
    onHost.set(host, list)
  }
  return { hostOf, onHost }
}

   
                                               
                                       
                            
                                                        
                         
   
export function gearStackZ(i: number, total: number): string {
  return `z-index:${total - i}`
}

                                                     
export function gearStackHtml(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? ''
  return `<span class="gearstack" title="§818.3 配装:下面压着的是贴附在它身上的武装">${parts.join('')}</span>`
}

                                                                  
export const gearStyles = `
  /* ── §818 配装叠放 ───────────────────────────────────────────────
     宿主与武装排成一行,武装向左收半张 ⇒ 被左邻居压住左半边,只露右半边。
     ⚠️ .card 本身已经是 position:relative,z-index 直接生效(inline 给的)。 */
  .gearstack{display:inline-flex;align-items:center;flex-shrink:0}
  .gearstack > .card{flex-shrink:0}
  .gearstack > .card + .card{margin-left:calc(var(--cw) * -.5)}
  /* ⚠️ 横置/休眠的卡是【躺倒】的(width 换成 --ch,见 boardStyles 里那条 :not(.sz-choice) 规则),
     负边距要跟着换成 --ch 的一半,否则躺倒的武装会露多或露少。 */
  .gearstack > .card + .card.is-tapped:not(.sz-choice),
  .gearstack > .card + .card.is-dormant:not(.sz-choice){margin-left:calc(var(--ch) * -.5)}
  /* 露出来的那半边给一道暖色描边,一眼看出"这张是挂在它身上的武装"而不是旁边另一张牌 */
  .gearstack > .card + .card{box-shadow:-3px 0 0 0 #fbbf24aa}

  /* ── 两步装配的第二步:选单位 ───────────────────────────────────── */
  .eqpick-hint{color:#fbbf24 !important;font-size:12px}
  .eqpick-gear{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:6px;
    font-size:13px;color:#cbd5e1}
  .eqpick-gear b{color:#fbbf24}
  .eqpick-back{margin-top:6px}
  /* 装配变体(同一个目标还要再选一次牺牲/减费)的第三步:朴素按钮就够 */
  .eqvar{display:flex;flex-direction:column;gap:8px;max-height:40vh;overflow:auto}

  /* ── 检视面板同时显示两张(单位 + 它身上的武装) ───────────────────
     ⚠️ 【别】给 .card-detail 加 min-width:0 —— 它自带 min-width:420px,
     而 .ins-card 是 flex:1;min-width:0,一旦把地板拆了,卡面会被压成两百来像素、
     卡名竖着断行(实测过一次)。这里只负责竖排两张,尺寸交给 cardDetail 自己的样式。 */
  .ins-pair{display:flex;flex-direction:column;gap:10px}
  .ins-pair-sep{font-size:12px;color:#fbbf24;border-top:1px dashed #334155;padding-top:8px}
`

   
                         
                                                       
                                       
   
export function ensureGearStyles(): void {
  if (typeof document === 'undefined') return
  let st = document.getElementById('gear-css')
  if (!st) {
    st = document.createElement('style')
    st.id = 'gear-css'
    document.head.appendChild(st)
  }
  if (st.textContent !== gearStyles) st.textContent = gearStyles
}
