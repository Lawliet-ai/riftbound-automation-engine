                                         
                                                                       
                                                                      
  
                                                    
                                                                   
                                                                         
                                                 

import { CARD_META, type CardMeta } from './data/cardMeta'
import { CARD_POOL } from './data/cardPool'                                         
import { KEYWORD_META, type KeywordMeta } from './data/keywordMeta'

   
                                             
                                                       
                                   
   
   
      
                                                              
                                      
                                              
                                    
                                         
                                 
                                             
                     
   
export const DOMAIN: Readonly<Record<string, { readonly name: string; readonly abbr: string; readonly color: string }>> = {
  red: { name: '炽烈', abbr: 'R', color: '#a33b32' },
  green: { name: '翠意', abbr: 'G', color: '#4a7346' },
  blue: { name: '灵光', abbr: 'B', color: '#3a6480' },
  orange: { name: '摧破', abbr: 'O', color: '#b06a2c' },
  purple: { name: '混沌', abbr: 'P', color: '#6b4a7a' },
  yellow: { name: '序理', abbr: 'Y', color: '#b9932f' },
}

                               
function syntheticMeta(defId: string): CardMeta | null {
  if (defId.startsWith('rune:')) {
    const d = defId.slice(5)
    return { name: `${DOMAIN[d]?.name ?? d}符文`, sub: '', type: '符文', domains: [d], energy: null, power: null, tag: '', region: '', text: '横置产生1点法力;回收产生1点本域符能。', flavor: '', errata: '' }
  }
  if (defId.startsWith('token:')) {
    const t = TOKEN_META[defId.slice(6)]
    return {
      name: defId.slice(6), sub: '', domains: [], energy: null,
      type: t?.type ?? '指示物', power: t?.power ?? null, tag: t?.tag ?? '', region: '',
      text: t?.text ?? '', flavor: '', errata: '',
    }
  }
  return null
}

   
                                                     
  
                                      
                                             
                                                       
                                        
                                     
  
                                                                
                                                
                                                                  
                                                               
                                        
                                               
                                              
                                     
   
const TOKEN_META: Readonly<Record<string, { type: string; power: number | null; tag: string; text: string }>> = {
                     
  '随从': { type: '指示物单位', power: 1, tag: '随从', text: '' },
                     
  '精灵': { type: '指示物单位', power: 3, tag: '仙灵', text: '{{瞬息}}（在控制者的下个回合开始阶段，结算得分之前将我摧毁。）' },
                                           
  '黄沙士兵': { type: '指示物单位', power: 2, tag: '恕瑞玛', text: '' },
                               
  '机器人': { type: '指示物单位', power: 3, tag: '机械', text: '' },
                                  
  '金币': { type: '指示物装备', power: null, tag: '', text: '{{反应>}} 摧毁此牌，{{横置}}：{{获得}}{{A}}。（获得费用资源的技能无法成为其他法术的反应目标。）' },
                    
  '映像': { type: '指示物单位', power: 0, tag: '', text: '' },
                              
  '战鹰': { type: '指示物单位', power: 1, tag: '鸟类', text: '{{法盾}}（对手必须支付{{A}}才能将我选作法术或技能的目标。）' },
                     
  '草丛': { type: '指示物战场', power: null, tag: '', text: '此处的“鸟类”、“猫科”、“犬形”、“魄罗”属性单位和艾翁单位获得{{S}}+1。\n当你在此处得分时，你可以选择使用被此牌替代的战场来替代此牌。' },
                     
  '男爵巢穴': { type: '指示物战场', power: null, tag: '', text: '（开局时不能使用指示物战场。）\n单位可从任意位置移动到此处。' },
                                              
  '触手': { type: '指示物单位', power: 1, tag: '比尔吉沃特', text: '' },
                      
  '影分身': { type: '指示物单位', power: 0, tag: '', text: '当我进攻时，你可以选择从你的废牌堆中放逐一名单位。若如此做，则给予我在本回合内{{强攻4}}。（如果我是进攻方，则{{S}}+4。）' },
  '影分身-assault': { type: '指示物单位', power: 0, tag: '', text: '当我进攻时，你可以选择从你的废牌堆中放逐一名单位。若如此做，则给予我在本回合内{{强攻4}}。（如果我是进攻方，则{{S}}+4。）' },
}

   
                                         
                                                             
                                             
                                                                  
                                                                           
                                                      
   
function poolAsMeta(defId: string): CardMeta | null {
  const c = CARD_POOL[defId]
  if (!c) return null
  return {
    name: c.name, sub: c.sub, type: c.type, domains: c.domains,
    energy: c.energy, power: c.power, tag: c.tag, region: c.region,
    text: c.text, flavor: '', errata: '',
  }
}

export function cardMeta(defId: string | undefined): CardMeta | null {
  if (!defId) return null
                                       
  return CARD_META[defId] ?? poolAsMeta(defId) ?? syntheticMeta(defId)
}

   
                                              
                                            
   
   
                                  
  
                                                 
                                                                         
                                                 
                                                      
                                             
   
export function nameifyCodes(text: string): string {
  return text.replace(/\b([A-Z]{3}-\d{3})\b/g, (m) => {
    const n = cardName(m)
    return n === m ? m : n
  })
}

export function cardName(defId: string | undefined): string {
  if (!defId) return '?'
  const m = cardMeta(defId)
  if (!m) return defId
  return m.sub ? `${m.name}·${m.sub}` : m.name
}

   
                                         
                                                 
                                                             
                                       
   
export function cardThumb(defId: string | undefined): string | null {
  if (!defId) return null
  const rune = runeArtCardNo(defId)        
  if (rune) return `/cards/thumb/${rune}.jpg`
  const tok = tokenArtCardNo(defId)        
  if (tok) return `/cards/thumb/${tok}.jpg`
  if (defId.startsWith('rune:') || defId.startsWith('token:')) return null
  return `/cards/thumb/${defId}.jpg`
}

   
                                   
                                               
                                    
                                              
                                           
   
const RUNE_ART: Readonly<Record<string, string>> = {
  red: 'OGN-007', green: 'OGN-042', blue: 'OGN-089',
  orange: 'OGN-126', purple: 'OGN-166', yellow: 'OGN-214',
}

   
                                                     
  
                                                          
                                        
                                         
  
                                  
                                                             
                                      
                                              
                                                
                                          
                                      
   
const TOKEN_ART: Readonly<Record<string, string>> = {
  '随从': 'VEN-T04',
  '精灵': 'OGN-274',
  '金币': 'VEN-T02',
  '机器人': 'VEN-T03',
  '黄沙士兵': 'SFD-T02',
  '男爵巢穴': 'UNL-T01',
  '草丛': 'UNL-T03',
  '影分身': 'VEN-T05',
  '影分身-assault': 'VEN-T05',
  '触手': 'VEN-T06',
}

                                                         
export function tokenArtCardNo(defId: string | undefined): string | undefined {
  if (!defId || !defId.startsWith('token:')) return undefined
  return TOKEN_ART[defId.slice(6)]
}

                                                  
export function runeArtCardNo(defId: string | undefined): string | undefined {
  if (!defId || !defId.startsWith('rune:')) return undefined
  return RUNE_ART[defId.slice(5)]
}

                                                      
export function cardImg(defId: string | undefined): string | null {
  if (!defId) return null
  const rune = runeArtCardNo(defId)                  
  if (rune) return `/cards/${rune}.png`
  const tok = tokenArtCardNo(defId)                    
  if (tok) return `/cards/${tok}.png`
  if (defId.startsWith('rune:') || defId.startsWith('token:')) return null
  return `/cards/${defId}.png`
}

                          
export function cardColor(defId: string | undefined): string {
  const d = cardMeta(defId)?.domains?.[0]
  return (d && DOMAIN[d]?.color) || '#64748b'
}

export function keywordMeta(kw: string): KeywordMeta | null {
                                    
  const base = kw.replace(/[0-9]+$/, '').trim()
  const hit = KEYWORD_META[base]
  if (hit) return hit
                                                  
                                                 
                                                 
                                        
                                              
  const key = Object.keys(KEYWORD_META)
    .filter((k) => k.length >= 2 && kw.startsWith(k))
    .sort((a, b) => b.length - a.length)[0]                      
  return key ? (KEYWORD_META[key] ?? null) : null
}

                                                      
   
                                                        
                                                     
                                                            
                                                        
   
function decodeSymbols(text: string): string {
  return text
    .replace(/\[M\]/g, '战力')
    .replace(/\[S\]/g, '战力')
    .replace(/\[A\]/g, '任意符能')
    .replace(/\[C\]/g, '该卡特性的符能')
    .replace(/\[([0-9]+)\]/g, '$1 法力')
}

export function keywordTip(kw: string): string {
  const m = keywordMeta(kw)
  if (!m) return kw
  const kind = m.kind ? ` ${m.kind}` : ''
  return `${kw}(§${m.sec}${kind})${m.text ? `\n${decodeSymbols(m.text)}` : ''}`
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
}

   
                                                    
                                                         
                                             
  
                                             
                                               
  
                                               
                                                    
                                              
   
const SYMBOL_TEXT: Readonly<Record<string, { readonly cn: string; readonly tip: string }>> = {
  S: { cn: '战力', tip: '战力符号(§135.2.e.3;卡面缩写 [S],官方现行写法为 [M])' },
  M: { cn: '战力', tip: '战力符号(§135.2.e.3;卡面缩写 [M])' },
  A: { cn: '任意符能', tip: '任意特性的符能(§135.2.e.5.a;卡面缩写 [A]——付它时可以用任何颜色的符能)' },
  红色: { cn: '炽烈符能', tip: '炽烈(红)特性的符能' },
  绿色: { cn: '翠意符能', tip: '翠意(绿)特性的符能' },
  蓝色: { cn: '灵光符能', tip: '灵光(蓝)特性的符能' },
  橙色: { cn: '摧破符能', tip: '摧破(橙)特性的符能' },
  紫色: { cn: '混沌符能', tip: '混沌(紫)特性的符能' },
  黄色: { cn: '序理符能', tip: '序理(黄)特性的符能' },
}

   
                                
                                                              
   
export function renderCardText(text: string): string {
  if (!text) return ''
  const out = esc(text).replace(/\{\{([^}]+)\}\}/g, (_, raw: string) => {
    const token = raw.trim()
    const bare = token.replace(/[>]$/, '')
    const meta = keywordMeta(bare)
    if (meta) return `<span class="kw" title="${esc(keywordTip(bare))}">${esc(token)}</span>`
    const sym = SYMBOL_TEXT[bare]
    if (sym) return `<span class="sym" title="${esc(sym.tip)}">${esc(sym.cn)}</span>`
                                            
    if (/^[0-9]+$/.test(bare)) {
      return `<span class="sym" title="${esc(`法力(§131.2;卡面缩写 [${bare}])`)}">${esc(bare)} 法力</span>`
    }
    return `<span class="sym">${esc(token)}</span>`
  })
  return out.replace(/\n/g, '<br/>')
}
