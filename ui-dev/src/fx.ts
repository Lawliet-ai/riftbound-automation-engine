                                                   
                         
  
                      
                                                                       
                                                                         
                               
                                                  
  
                                  
                                                           
                                                                 
                                                  
  
                          
                                                       
                                                                
                                                        
  
                    
                                            
                                                
                                             
  
                           
                                                             
                                                
                     
                                                         
                                       
                                                                        
                                                     
                                                   
                                         
  
                                         
                                                       
                                                     
                                                            
                                            
                         
  
                        
                                                             
                                                      
                                        

import type { ClientView } from '../../engine/src/net/project'
import { cardImg } from './cards'

const DUR = { draw: 260, discard: 300, play: 1080, move: 400 }
const PLAY_SELF = 300                            
const PLAY_HOLD = 520                 
const PLAY_SCALE = 2.1                         
const STAGGER = 70                          
const MAX_CARDS = 4                                                     
const STALE_MS = 2400                                   
                                                    
const DROP_FRESH_MS = 1500
   
                                                                                      
                                              
                                           
                                                     
                          
   
const GHOST = { scale: 1.06, anchorY: 0.56, tilt: 4 }
                                                         
const BASE_W = 62, BASE_H = 87

type FxKind = 'draw' | 'discard' | 'play' | 'move'
interface FxJob {
  readonly kind: FxKind
  readonly from: DOMRect
                                                 
  readonly to: DOMRect
                                                          
  readonly toOid?: string
  readonly defId?: string
                                   
  readonly self: boolean
                                      
  readonly fromDrop: boolean
}

let queue: FxJob[] = []
let plannedAt = 0
let live: HTMLElement[] = []
                                            
let restores: (() => void)[] = []

   
                               
                                                             
                                                  
                                             
                                                            
                                  
   
let lastRelease = { x: 0, y: 0, at: Number.NEGATIVE_INFINITY }
if (typeof window !== 'undefined') {
  window.addEventListener('pointerup', (e: PointerEvent) => {
    lastRelease = { x: e.clientX, y: e.clientY, at: performance.now() }
  }, { capture: true, passive: true })
}

                                     
interface Anchors {
  readonly pile: Map<string, DOMRect>                            
  readonly oid: Map<string, DOMRect>                
  readonly hand: DOMRect | null                   
  readonly oppHand: DOMRect | null                   
  readonly chainLane: DOMRect | null                       
  readonly zone: Map<string, DOMRect>                
                                                         
  readonly handCard: { readonly w: number; readonly h: number } | null
}

function snapshotAnchors(): Anchors {
  const pile = new Map<string, DOMRect>()
  for (const el of Array.from(document.querySelectorAll('[data-pile]'))) {
    const k = el.getAttribute('data-pile')
    if (k && !pile.has(k)) pile.set(k, el.getBoundingClientRect())
  }
  const oid = new Map<string, DOMRect>()
  for (const el of Array.from(document.querySelectorAll('[data-card]'))) {
    const k = el.getAttribute('data-card')
    if (k && !oid.has(k)) oid.set(k, el.getBoundingClientRect())
  }
  const zone = new Map<string, DOMRect>()
  for (const el of Array.from(document.querySelectorAll('[data-zoneanchor]'))) {
    const k = el.getAttribute('data-zoneanchor')
    if (k && !zone.has(k)) zone.set(k, el.getBoundingClientRect())
  }
  const handEl = document.querySelector('.hand-row')
  const oppEl = document.querySelector('.opphand')
  const clEl = document.querySelector('[data-chainslot]')
                                                     
                                                                              
  const hc = document.querySelector('.hand-row > .card')
  return {
    pile, oid, zone,
    hand: handEl ? handEl.getBoundingClientRect() : null,
    oppHand: oppEl ? oppEl.getBoundingClientRect() : null,
    chainLane: clEl ? clEl.getBoundingClientRect() : null,
    handCard: hc instanceof HTMLElement ? { w: hc.offsetWidth, h: hc.offsetHeight } : null,
  }
}

function zoneContents(v: ClientView | null, zone: string): readonly string[] {
  return v?.zones?.[zone]?.contents ?? []
}

                                   
function fallbackRect(): DOMRect {
  return new DOMRect(window.innerWidth / 2 - 30, window.innerHeight / 2 - 42, 60, 84)
}

   
                                             
                                          
   
function dropRect(a: Anchors): DOMRect | null {
  if (performance.now() - lastRelease.at > DROP_FRESH_MS) return null
  const w = (a.handCard?.w ?? 66) * GHOST.scale
  const h = (a.handCard?.h ?? 92) * GHOST.scale
  return new DOMRect(lastRelease.x - w / 2, lastRelease.y - h * GHOST.anchorY, w, h)
}

interface Spec {
  readonly kind: FxKind
  readonly fromKey: string                                                                     
  readonly toKey: string
  readonly toOid?: string
  readonly defId?: string
  readonly self?: boolean
}

   
                                                                
                                   
                                                
   
   
                                     
                                 
                                       
                                                         
   
let stateHits: string[] = []

export function planFx(prev: ClientView | null, next: ClientView, seat: string, hasOverlay: boolean, dragging: boolean): void {
  queue = []
  stateHits = []
  if (!prev) return                                                            
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  if (hasOverlay || dragging) return                                       
                                              

  const opp = next.players.find((p) => p !== seat) ?? ''
  const specs: Spec[] = []

                                                       
  const handBefore = new Set(zoneContents(prev, `hand:${seat}`))
  const handNow = zoneContents(next, `hand:${seat}`)
  const fresh = handNow.filter((oid) => oid !== 'hidden' && !handBefore.has(oid))
  if (fresh.length < 5) {
    for (const oid of fresh) {
                                                      
      specs.push({ kind: 'draw', fromKey: `pile:mainDeck:${seat}`, toKey: 'hand', toOid: oid, defId: next.objects[oid]?.defId, self: true })
    }
  }

                                                   
  const oppDelta = zoneContents(next, `hand:${opp}`).length - zoneContents(prev, `hand:${opp}`).length
  if (oppDelta > 0 && oppDelta < 5) {
    for (let i = 0; i < oppDelta; i++) specs.push({ kind: 'draw', fromKey: `pile:mainDeck:${opp}`, toKey: 'oppHand', self: false })
  }

                                                     
                                       
                                                           
  for (const p of next.players) {
    const was = new Set(zoneContents(prev, `discard:${p}`))
    for (const oid of zoneContents(next, `discard:${p}`)) {
      if (oid === 'hidden' || was.has(oid)) continue
      const defId = next.objects[oid]?.defId
                                                              
      const prevOid = defId
        ? Object.keys(prev.objects).find((o) => prev.objects[o]?.defId === defId && !zoneContents(prev, `discard:${p}`).includes(o))
        : undefined
      specs.push({
        kind: 'discard',
        fromKey: prevOid ? `oid:${prevOid}` : (p === seat ? 'hand' : 'oppHand'),
        toKey: `pile:discard:${p}`,
        self: p === seat,
        ...(defId !== undefined ? { defId } : {}),
      })
    }
  }

                                       
                                                      
  for (const p of next.players) {
    if (zoneContents(next, `hand:${p}`).length >= zoneContents(prev, `hand:${p}`).length) continue
    const mine = p === seat
                                               
    const from = mine ? 'drop' : 'oppHand'
                            
    const chainWas = new Set((prev.chain ?? []).map((it) => it.id))
                                                               
                                                                             
                                                         
                                                    
                                                 
    const fresh = (next.chain ?? []).filter((it) => !chainWas.has(it.id) && it.controller === p && it.defId && it.cardOid)
    for (const it of fresh) {
      specs.push({
        kind: 'play', fromKey: from, toKey: 'chainlane', self: mine,
                                                                     
                                      
        ...(it.cardOid !== undefined ? { toOid: it.cardOid } : {}),
        ...(it.defId !== undefined ? { defId: it.defId } : {}),
      })
    }
    if (fresh.length > 0) continue
                                                    
    for (const zid of Object.keys(next.zones)) {
      if (!zid.startsWith('battlefield') && !zid.startsWith('base:')) continue
      const was = new Set(zoneContents(prev, zid))
      for (const oid of zoneContents(next, zid)) {
        if (oid === 'hidden' || was.has(oid)) continue
        const dz = next.objects[oid]?.defId
        if (!dz || dz.startsWith('rune:')) continue             
        specs.push({ kind: 'play', fromKey: from, toKey: `zone:${zid}`, toOid: oid, defId: dz, self: mine })
      }
    }
  }

                                                     
                                                   
                                                        
                                                     
                                                
  const fieldZoneIds = Object.keys(next.zones).filter((z) => z.startsWith('battlefield') || z.startsWith('base:'))
  const byDef = (v: ClientView | null, zid: string): Map<string, string[]> => {
    const m = new Map<string, string[]>()
    for (const oid of zoneContents(v, zid)) {
      const d = v?.objects[oid]?.defId
      if (oid === 'hidden' || !d || d.startsWith('rune:')) continue
      const l = m.get(d) ?? []
      l.push(oid)
      m.set(d, l)
    }
    return m
  }
  const prevField = new Map(fieldZoneIds.map((z) => [z, byDef(prev, z)] as const))
  const nextField = new Map(fieldZoneIds.map((z) => [z, byDef(next, z)] as const))
  const allDefs = new Set<string>()
  for (const m of prevField.values()) for (const d of m.keys()) allDefs.add(d)
  for (const m of nextField.values()) for (const d of m.keys()) allDefs.add(d)
  for (const d of allDefs) {
    const total = (mm: Map<string, Map<string, string[]>>): number =>
      [...mm.values()].reduce((sum, m) => sum + (m.get(d)?.length ?? 0), 0)
    const before = total(prevField)
    if (before === 0 || before !== total(nextField)) continue                         
    const lost: string[] = []
    const gained: { zid: string; oid: string }[] = []
    for (const z of fieldZoneIds) {
      const a = prevField.get(z)?.get(d) ?? []
      const b = nextField.get(z)?.get(d) ?? []
      if (b.length < a.length) lost.push(...a.slice(0, a.length - b.length))
      if (b.length > a.length) for (const oid of b.slice(0, b.length - a.length)) gained.push({ zid: z, oid })
    }
    for (let i = 0; i < gained.length; i++) {
      const g = gained[i]!
      const src = lost[i]
      specs.push({
        kind: 'move',
        fromKey: src !== undefined ? `oid:${src}` : `zone:${g.zid}`,
        toKey: `zone:${g.zid}`,
        toOid: g.oid,
        defId: d,
        self: next.objects[g.oid]?.controller === seat,
      })
    }
  }

                                                         
  for (const [oid, o] of Object.entries(next.objects)) {
    const b = prev.objects[oid]
    if (!b || o.hidden || b.zone !== o.zone) continue
    if (!o.zone.startsWith('battlefield') && !o.zone.startsWith('base:')) continue
    const changed = b.tapped !== o.tapped || b.dormant !== o.dormant || b.stunned !== o.stunned
      || b.might !== o.might || (b.damage ?? 0) !== (o.damage ?? 0)
    if (changed) stateHits.push(oid)
  }
  if (stateHits.length > 6) stateHits = []                           

  if (specs.length === 0) return
                                                                        
  const a = snapshotAnchors()
  const resolve = (key: string): DOMRect | null => {
    if (key === 'hand' || key === 'drop') return a.hand                         
    if (key === 'oppHand') return a.oppHand
    if (key === 'chainlane') return a.chainLane
    if (key.startsWith('zone:')) return a.zone.get(key.slice(5)) ?? null
    if (key.startsWith('pile:')) return a.pile.get(key.slice(5)) ?? null
    if (key.startsWith('oid:')) return a.oid.get(key.slice(4)) ?? null
    return null
  }
                                         
  const plays = specs.filter((x) => x.kind === 'play')
  const picked = plays.length > 0 ? plays.slice(0, 1) : specs.slice(0, MAX_CARDS)
  queue = picked.map((s) => {
    const drop = s.fromKey === 'drop' ? dropRect(a) : null
    return {
      kind: s.kind,
      from: drop ?? resolve(s.fromKey) ?? fallbackRect(),
      to: resolve(s.toKey) ?? fallbackRect(),
      self: s.self === true,
      fromDrop: drop !== null,
      ...(s.toOid !== undefined ? { toOid: s.toOid } : {}),
      ...(s.defId !== undefined ? { defId: s.defId } : {}),
    }
  })
  plannedAt = performance.now()
}

                                                     
export function runFx(): void {
                                  
  for (const oid of stateHits) {
    const el = liveCard(oid)
    if (!el) continue
    el.classList.remove('fx-changed')
    void el.offsetWidth                        
    el.classList.add('fx-changed')
  }
  stateHits = []
  if (queue.length === 0) return
  if (performance.now() - plannedAt > STALE_MS) { queue = []; return }
  cancelFx()
  const jobs = queue
  queue = []
  jobs.forEach((j, i) => { window.setTimeout(() => fly(j), i * STAGGER) })
}

export function cancelFx(): void {
  for (const el of live) el.remove()
  live = []
                                     
  const rs = restores
  restores = []
  for (const r of rs) r()
}

                      
function liveCard(oid: string): HTMLElement | null {
  const el = document.querySelector(`[data-card="${CSS.escape(oid)}"]`)
  return el instanceof HTMLElement ? el : null
}

interface Landing {
                  
  readonly rect: DOMRect
                                   
  readonly w: number
  readonly h: number
                          
  readonly tilt: number
}

   
                                                   
                                              
   
function landing(j: FxJob): Landing {
  const fb = (): Landing => ({ rect: j.to, w: j.to.width, h: j.to.height, tilt: 0 })
  if (j.toOid === undefined) return fb()
  const el = liveCard(j.toOid)
  if (!el) return fb()
  const r = el.getBoundingClientRect()
  if (r.width <= 4 || r.height <= 4) return fb()
                                                 
                                                           
                                                         
                                               
                                                                         
                                                        
                                                      
  const tilt = el.classList.contains('is-tapped') || el.classList.contains('is-dormant') ? 90 : 0
  return { rect: r, w: el.offsetWidth, h: el.offsetHeight, tilt }
}
                                               
                                                                  
                                                                                 
                                                         
                                                 
                                  

   
                     
                                                     
                                         
                                                       
   
function hideTillLanded(oid: string, ms: number): () => void {
  const el = liveCard(oid)
  if (!el) return (): void => { /* 没查到就没什么好藏的 */ }
  const before = el.style.visibility
  el.style.visibility = 'hidden'
  let done = false
  const restore = (): void => {
    if (done) return
    done = true
    el.style.visibility = before
  }
  restores.push(restore)
                                              
  window.setTimeout(restore, ms + 300)
  return restore
}

const cx = (r: DOMRect): number => r.left + r.width / 2 - BASE_W / 2
const cy = (r: DOMRect): number => r.top + r.height / 2 - BASE_H / 2
                                           
function fit(w: number, h: number): number {
                                                      
                                
  const short = Math.min(w, h), long = Math.max(w, h)
                                                   
                                                      
                               
  const ratio = short / long
  if (short < 24 || ratio < 0.45 || ratio > 0.95) return 0.92
  return Math.max(0.5, Math.min(2.6, Math.min(short / BASE_W, long / BASE_H)))
}

function fly(j: FxJob): void {
  const lz = landing(j)                                      
  const to = lz.rect
  const endScale = fit(lz.w, lz.h)
  const el = document.createElement('div')
  el.className = `fx-card fx-${j.kind}`
  const src = j.defId ? cardImg(j.defId) : null
  el.innerHTML = src
    ? `<img src="${src}" alt="" onerror="this.remove()">`
    : '<div class="fx-back">❖</div>'
                                                                
                                          
  el.style.cssText = `position:fixed;left:0;top:0;width:${BASE_W}px;height:${BASE_H}px;z-index:300;pointer-events:none;
    border-radius:7px;overflow:hidden;box-shadow:0 10px 28px #000b;will-change:transform,opacity`
  document.body.appendChild(el)
  live.push(el)

                                                              
                                                    
  const fuse = (ms: number, unhide: () => void): void => {
    window.setTimeout(() => { if (live.includes(el)) { unhide(); land(el, to) } }, ms + 400)
  }

  if (j.kind === 'play') {
    const dur = j.self ? PLAY_SELF : DUR.play
    const unhide = j.toOid !== undefined ? hideTillLanded(j.toOid, dur) : (): void => { /* 无真身可藏 */ }
    const anim = j.self ? playSelf(el, j, to, endScale, lz.tilt) : playOpp(el, j, to, endScale, lz.tilt)
    anim.onfinish = (): void => { unhide(); land(el, to) }
    fuse(dur, unhide)
    return
  }
  const dur = DUR[j.kind]
                                                  
                                      
  const unhideMove = j.kind === 'move' && j.toOid !== undefined
    ? hideTillLanded(j.toOid, dur) : (): void => { /* 无真身可藏 */ }
                                                          
  const endS = j.kind === 'draw' || j.kind === 'move' ? endScale : 0.6
                                               
                                                       
  const arc = j.kind === 'move' ? -10 : -26
  const anim = el.animate([
    { transform: `translate(${cx(j.from)}px, ${cy(j.from)}px) scale(${j.kind === 'move' ? endScale : 0.62})`, opacity: j.kind === 'move' ? 1 : 0.15 },
    { transform: `translate(${(cx(j.from) + cx(to)) / 2}px, ${(cy(j.from) + cy(to)) / 2 + arc}px) scale(${j.kind === 'move' ? Math.min(endScale * 1.12, 2.6) : 1})`, opacity: 1, offset: 0.55 },
    { transform: `translate(${cx(to)}px, ${cy(to)}px) scale(${endS})`, opacity: j.kind === 'discard' ? 0.1 : 1 },
  ], { duration: dur, easing: 'cubic-bezier(.32,.72,.36,1)', fill: 'forwards' })
  anim.onfinish = (): void => { unhideMove(); land(el, to) }
  fuse(dur, unhideMove)
}

function land(el: HTMLElement, to: DOMRect): void {
  el.remove()
  live = live.filter((e) => e !== el)
  pulse(to)                       
}

   
                           
                                                  
                                             
   
function playSelf(el: HTMLElement, j: FxJob, to: DOMRect, endScale: number, endTilt: number): Animation {
  const tilt = j.fromDrop ? GHOST.tilt : 0
  return el.animate([
    { transform: `translate(${cx(j.from)}px, ${cy(j.from)}px) scale(${fit(j.from.width, j.from.height)}) rotate(${tilt}deg)`, opacity: 1, offset: 0 },
    { transform: `translate(${cx(to)}px, ${cy(to)}px) scale(${endScale}) rotate(${endTilt}deg)`, opacity: 1, offset: 1 },
  ], { duration: PLAY_SELF, easing: 'cubic-bezier(.22,.72,.28,1)', fill: 'forwards' })
}

   
                                       
                                                 
   
function playOpp(el: HTMLElement, j: FxJob, to: DOMRect, endScale: number, endTilt: number): Animation {
  const midX = window.innerWidth / 2 - BASE_W / 2
  const midY = window.innerHeight / 2 - BASE_H / 2
  const total = DUR.play
  const inT = 260 / total
  const holdT = (260 + PLAY_HOLD) / total
  const center = `translate(${midX}px, ${midY}px) scale(${PLAY_SCALE})`
  return el.animate([
    { transform: `translate(${cx(j.from)}px, ${cy(j.from)}px) scale(.7)`, opacity: 0.2, offset: 0 },
    { transform: center, opacity: 1, offset: inT },
    { transform: center, opacity: 1, offset: holdT },
    { transform: `translate(${cx(to)}px, ${cy(to)}px) scale(${endScale}) rotate(${endTilt}deg)`, opacity: 1, offset: 1 },
  ], { duration: total, easing: 'cubic-bezier(.32,.72,.36,1)', fill: 'forwards' })
}

                                               
function pulse(r: DOMRect): void {
  const p = document.createElement('div')
  p.className = 'fx-pulse'
  p.style.cssText = `position:fixed;left:${r.left - 4}px;top:${r.top - 4}px;
    width:${r.width + 8}px;height:${r.height + 8}px;z-index:299;pointer-events:none;border-radius:10px`
  document.body.appendChild(p)
  live.push(p)
  const a = p.animate([
    { boxShadow: '0 0 0 0 #7dd3fc00', opacity: 0 },
    { boxShadow: '0 0 0 3px #7dd3fcdd, 0 0 18px #7dd3fc88', opacity: 1, offset: 0.35 },
    { boxShadow: '0 0 0 6px #7dd3fc00', opacity: 0 },
  ], { duration: 420, easing: 'ease-out' })
  a.onfinish = (): void => { p.remove(); live = live.filter((e) => e !== p) }
}

export const fxStyles = `
.fx-card img{width:100%;height:100%;object-fit:cover;display:block}
/* ★777 状态变化脉冲:挂在【牌桌上那张真牌】上,不是飞卡的子元素 —— 写成 .fx-card .fx-changed
   就永远命中不了(第一版正是这么错的)。 */
.fx-changed{animation:fxchg .5s ease}
@keyframes fxchg{
  0%{filter:brightness(1)}
  22%{filter:brightness(1.55) drop-shadow(0 0 9px #e0b040cc)}
  100%{filter:brightness(1)}}
.fx-back{width:100%;height:100%;display:flex;align-items:center;justify-content:center;
  font-size:22px;color:#93c5fd99;
  background:repeating-linear-gradient(135deg,#1e2f5c,#1e2f5c 4px,#2a3f74 4px,#2a3f74 8px);
  border:1px solid #4a6299;border-radius:7px}
`
