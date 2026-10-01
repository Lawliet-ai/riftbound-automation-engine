                                                 
                                        
  
        
                                             
                                                      

import { cardImg, cardMeta, cardName, cardColor, DOMAIN, keywordTip, renderCardText } from './cards'
import type { CardMeta } from './data/cardMeta'

export interface CardDetailLive {
                               
  readonly might?: number
  readonly damage?: number
                          
  readonly keywords?: readonly string[]
                                            
  readonly costText?: string
                           
  readonly marks?: readonly string[]
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
}

function domainChips(domains: readonly string[]): string {
  return domains.map((d) => {
    const info = DOMAIN[d]
    if (!info) return ''
    return `<span class="cd-domain" style="--dc:${info.color}" title="${info.name}(缩写 [${info.abbr}])">${info.name}</span>`
  }).join('')
}

function keywordChips(keywords: readonly string[]): string {
  if (keywords.length === 0) return ''
  return `<div class="cd-kws">${keywords.map((k) => `<span class="cd-kw" title="${esc(keywordTip(k))}">${esc(k)}</span>`).join('')}</div>`
}

   
                                           
  
                                            
                                                   
                                              
                                             
                                                         
   
export function cardDetailHtml(
  defId: string | undefined,
  live: CardDetailLive = {},
  fallbackMeta?: CardMeta | null,
): string {
  if (!defId) {
    return `<div class="card-detail unknown"><div class="cd-body"><h3>看不到这张牌</h3>
      <p class="cd-hint">对手的手牌、牌堆里的牌、以及面朝下的待命牌,规则上都不属于公开信息。</p></div></div>`
  }
  const m = cardMeta(defId) ?? fallbackMeta ?? null
  const img = cardImg(defId)
                                                      
                                                                  
  const name = m ? (m.sub ? `${m.name}·${m.sub}` : m.name) : cardName(defId)
  const printedKw: string[] = []
  const live_kw = live.keywords ?? []
  const text = m?.errata || m?.text || ''
  const stats: string[] = []
  if (live.costText) stats.push(`<span class="cd-stat">费用 <b>${esc(live.costText)}</b></span>`)
  else if (m?.energy !== null && m?.energy !== undefined) stats.push(`<span class="cd-stat">费用 <b>${m.energy}</b></span>`)
                               
                                                          
                                     
                                                              
                                                        
                                         
  const might = live.might ?? m?.power ?? null
  const printed = m?.power ?? null
                                                                 
                                                              
  const isGear = (m?.type ?? '').includes('装备')
  if (might !== null && isGear) {
    stats.push(`<span class="cd-stat">战力加成 <b>+${might}</b></span>`)
  } else if (might !== null) {
    const delta = printed !== null ? might - printed : 0
    const origin = delta !== 0 && printed !== null
      ? `<i class="cd-origin">(原${printed} ${delta > 0 ? '+' : '−'}${Math.abs(delta)})</i>` : ''
    stats.push(`<span class="cd-stat">战力 <b class="${delta !== 0 ? 'cd-changed' : ''}">${might}</b>${origin}</span>`)
    const hp = might - (live.damage ?? 0)
    const hurt = (live.damage ?? 0) > 0
    stats.push(`<span class="cd-stat">生命值 <b class="${hurt ? 'cd-hurt' : ''}">${hp}</b>`
      + `<i class="cd-origin">/ ${might}${hurt ? ` (已受伤 ${live.damage})` : ''}</i></span>`)
  }

  return `<div class="card-detail" style="--cc:${cardColor(defId)}">
    <div class="cd-art">${img
      ? `<img src="${img}" alt="${esc(name)}" onerror="this.closest('.cd-art').classList.add('noimg')" draggable="false"/><div class="cd-artfallback">${esc(name)}</div>`
      : `<div class="cd-artfallback">${esc(name)}</div>`}</div>
    <div class="cd-body">
      <h3>${esc(name)}</h3>
      <div class="cd-meta">
        <span class="cd-type">${esc(m?.type ?? '未知类型')}</span>
        ${domainChips(m?.domains ?? [])}
        ${m?.tag ? `<span class="cd-tag">${esc(m.tag)}</span>` : ''}
      </div>
      <div class="cd-stats">${stats.join('')}</div>
      ${keywordChips([...printedKw, ...live_kw])}
      ${text ? `<div class="cd-text">${renderCardText(text)}</div>` : '<div class="cd-text cd-none">(此牌无规则文本)</div>'}
      ${m?.errata ? `<div class="cd-errata">⚠ 此牌有官方勘误,上方显示的是**勘误后**的文本</div>` : ''}
      ${live.marks?.length ? `<div class="cd-marks">${live.marks.map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
      ${m?.flavor ? `<div class="cd-flavor">${esc(m.flavor)}</div>` : ''}
    </div>
  </div>`
}

export const cardDetailStyles = `
  .card-detail{display:flex;gap:14px;align-items:flex-start;width:min(620px,100%);min-width:420px;text-align:left}
  .cd-art{width:180px;flex-shrink:0;aspect-ratio:5/7;border-radius:10px;overflow:hidden;position:relative;
    background:linear-gradient(160deg,var(--cc,#475569)44,#0f172a);box-shadow:0 6px 20px #000a}
  .cd-art img{width:100%;height:100%;object-fit:cover;display:block;position:relative;z-index:1}
  .cd-art.noimg img{display:none}
  .cd-artfallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
    padding:10px;text-align:center;font-weight:700;color:#e2e8f0}
  .cd-body{flex:1;min-width:0}
  .cd-body h3{margin:0 0 6px;font-size:19px;color:#f1f5f9}
  .cd-meta{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
  .cd-type{font-size:12px;color:#94a3b8;border:1px solid #334155;border-radius:99px;padding:1px 8px}
  .cd-domain{font-size:12px;padding:1px 8px;border-radius:99px;color:var(--dc);border:1px solid var(--dc);background:color-mix(in srgb, var(--dc) 14%, transparent)}
  .cd-tag{font-size:12px;color:#fbbf24}
  .cd-stats{display:flex;gap:14px;margin-bottom:8px}
  .cd-stat{font-size:13px;color:#94a3b8}.cd-stat b{color:#e2e8f0;font-size:16px}
  .cd-dmg{color:#f87171;font-style:normal;font-size:12px;margin-left:2px}
  /* ★810 战力被效果改过 ⇒ 亮色(委托人:「更新后的攻击力要用亮色的字体表示」) */
  .cd-changed{color:#fbbf24;text-shadow:0 0 8px #fbbf2455}
  .cd-hurt{color:#f87171}
  .cd-origin{color:var(--tx-dim,#94a3b8);font-style:normal;font-size:11px;margin-left:3px;opacity:.85}
  .cd-kws{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px}
  .cd-kw{font-size:12px;background:#1e3a5f;color:#93c5fd;border-radius:6px;padding:1px 8px;cursor:help}
  .cd-text{font-size:13px;line-height:1.7;color:#cbd5e1;white-space:normal}
  .cd-text .kw{color:#93c5fd;font-weight:600;cursor:help;border-bottom:1px dotted #93c5fd66}
  .cd-text .sym{color:#fbbf24;font-weight:600}
  .cd-none{opacity:.5}
  .cd-errata{margin-top:8px;font-size:12px;color:#fbbf24;background:#78350f33;border-radius:6px;padding:4px 8px}
  .cd-marks{display:flex;gap:6px;margin-top:8px;font-size:12px;color:#a78bfa}
  .cd-flavor{margin-top:10px;font-size:12px;color:#64748b;font-style:italic;border-top:1px solid #1e293b;padding-top:8px}
`
