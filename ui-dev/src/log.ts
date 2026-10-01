                                        
                                                     
  
                  
                                    
                        
                             
                                         

import { cardName } from './cards'

export interface LogEntry {
  readonly seq: number
  readonly turn: number
  readonly kind: string
  readonly player?: string
  readonly oid?: string
  readonly defId?: string
  readonly targetOid?: string
  readonly targetDefId?: string
  readonly amount?: number
  readonly zoneFrom?: string
  readonly zoneTo?: string
  readonly battlefield?: string
  readonly outcome?: 'attackerWins' | 'defenderWins' | 'noResult'
  readonly conquered?: string
  readonly attackerMight?: number
  readonly defenderMight?: number
                           
  readonly result?: string
                                                         
  readonly note?: string
}

export interface LogLine {
  readonly seq: number
  readonly turn: number
                                          
  readonly tone: 'banner' | 'me' | 'foe' | 'sys'
  readonly text: string
                                                       
  readonly oids?: readonly string[]
                             
  readonly battlefield?: string
}

export interface LogContext {
  readonly seat: string
                                  
  readonly zoneName: (zoneId: string | undefined) => string
}

function who(player: string | undefined, seat: string): string {
  if (!player) return ''
  return player === seat ? '你' : '对手'
}

function card(defId: string | undefined): string {
  return defId ? `〈${cardName(defId)}〉` : '一张牌'
}

                                        
export function logLine(e: LogEntry, ctx: LogContext): LogLine | null {
  const seat = ctx.seat
  const me = e.player === seat
  const tone: LogLine['tone'] = e.player ? (me ? 'me' : 'foe') : 'sys'
  const s = who(e.player, seat)
                                                       
  const oids = [e.oid, e.targetOid].filter((x): x is string => typeof x === 'string')
  const mk = (text: string, t: LogLine['tone'] = tone): LogLine =>
    ({ seq: e.seq, turn: e.turn, tone: t, text, ...(oids.length ? { oids } : {}), ...(e.battlefield ? { battlefield: e.battlefield } : {}) })

  switch (e.kind) {
    case 'clientNote':
      return e.note ? mk(e.note, 'sys') : null
    case 'startPhase':
      return mk(`第 ${e.turn} 回合 · ${me ? '你的回合' : '对手的回合'}`, 'banner')
    case 'summonRune':
                                                 
      return mk(`${s}召出 ${e.amount ?? 2} 枚符文${(e.amount ?? 2) === 3 ? '(§485.7 后手首次召出额外 +1)' : ''}`)
    case 'draw':
                                                    
      return mk(`${s}抽了 ${e.amount ?? 1} 张牌`)
    case 'zoneChange': {
      if (e.zoneTo?.startsWith('hand:')) {
        return e.defId ? mk(`${s}抽到了${card(e.defId)}`) : null                   
      }
      if (e.zoneTo?.startsWith('discard')) return mk(`${card(e.defId)}进入废牌堆`)
      if (e.zoneTo?.startsWith('exile')) return mk(`${card(e.defId)}被放逐`)
      if (e.zoneTo?.startsWith('battlefield') || e.zoneTo?.startsWith('base:')) {
        return mk(`${card(e.defId)}进入${ctx.zoneName(e.zoneTo)}`)
      }
      return null
    }
                                                                   
                                      
    case 'unitMoved':
      return mk(`${s}将${card(e.defId)}从${ctx.zoneName(e.zoneFrom)}移动到${ctx.zoneName(e.zoneTo)}`)
    case 'playUnit':
      return mk(`${s}打出${card(e.defId)} → ${ctx.zoneName(e.zoneTo)}`)
    case 'playSpell':
      return mk(`${s}施放${card(e.defId)}`)
    case 'damage':
                                              
      return e.defId
        ? mk(`${card(e.defId)}对${card(e.targetDefId)}造成 ${e.amount ?? 0} 点伤害`)
        : mk(`${card(e.targetDefId)}受到 ${e.amount ?? 0} 点伤害`)
    case 'destroy':
      return mk(`${card(e.defId)}被摧毁`)
    case 'stun':
      return mk(`${card(e.targetDefId)}被眩晕`)
    case 'gainPoint':
      return mk(`${s}得 ${e.amount ?? 1} 分`)
    case 'hold':
      return mk(`${s}据守${ctx.zoneName(e.battlefield)},+1 分`)
    case 'duelStart':
      return mk(`⚔ ${ctx.zoneName(e.battlefield)}开战`, 'sys')
    case 'combatEnd': {
      const bf = ctx.zoneName(e.battlefield)
      const atkMe = e.player === seat                 
      const verdict = e.outcome === 'noResult' ? '未分胜负'
        : (e.outcome === 'attackerWins') === atkMe ? '你赢下这场战斗' : '对手赢下这场战斗'
      const conq = e.conquered ? `,${e.conquered === seat ? '你' : '对手'}征服了${bf}(+1 分)` : ''
                                                          
      const cn = e.note ? `,${e.note}` : ''
      return mk(`⚔ ${bf} 战斗结束:进攻 ${e.attackerMight ?? 0} vs 防守 ${e.defenderMight ?? 0} — ${verdict}${conq}${cn}`, 'sys')
    }
    case 'duelEnd': {
                                              
      const bf = ctx.zoneName(e.battlefield)
      const w = who(e.player, seat)
      if (e.result === 'scored') return mk(`⚑ ${w}征服了${bf}(+1 分)`)
      if (e.result === 'alreadyScored') return mk(`⚑ ${w}进驻${bf}:本回合已在此计分,不重复得分(§470)`)
      if (e.result === 'drawInstead') return mk(`⚑ ${w}征服${bf}:末分锁生效不计分,改抽一张牌(§471.1.b.1)`)
      return mk(`⚑ ${w}进驻${bf}`)
    }
    case 'defend':
      return mk(`${card(e.defId)}成为防守方`)
                                    
                                                     
                                               
                                                     
                          
    case 'undo':
      return mk(`${s}撤回了上一步`, 'sys')
                                                      
                                                                    
                                                                
                                            
                                                                                  
                                                                   
                                                  
    case 'negate':
      return mk(e.defId ? `${card(e.defId)}被无效化` : `结算链上的项目被无效化`, 'sys')
    case 'insight':
      return mk(`${s}进行洞察(看牌堆顶 ${e.amount ?? 1} 张)`)
                                                                             
                                                        
    case 'seize':
      return mk(`${s}夺取了${e.defId ? card(e.defId) : '结算链项目'}的控制权`)
                                                     
                                                                          
                                                                                
                                                                                                   
                                                                    
                                                                                    
                                                          
                                                          
                                                                         
                                                                              
                                                    
                                           
                                                                              
                                                          
                                                                           
                                         
    case 'spawnToken':
      return mk(`${s}打出指示物${card(e.defId)} → ${ctx.zoneName(e.zoneTo)}`)
    case 'recycle':
      return mk(`${s}回收 ${e.amount ?? 1} 张牌到牌堆底`)
    case 'burn':
      return mk(`${s}燃烧 ${e.amount ?? 1} 张牌（主牌堆顶入废牌堆）`)
    case 'banish':
      return mk(`${card(e.defId)}被放逐`)
    case 'playFree':
      return mk(`${s}免费打出了${card(e.defId)}`)
    case 'changeController':
      return mk(`${s}获得了${card(e.defId)}的控制权`)
    case 'recall':
      return mk(`${card(e.defId)}被召回基地`)
    case 'freeStandby':
      return mk(`${s}本回合可无视费用布置待命`)
                                                                              
                                                                                        
                                                                              
                                                                            
                                                           
                                                      
                                                                
    case 'attach':
      return mk(`${s}将${card(e.defId)}贴附到${card(e.targetDefId)}`)
    case 'detach':
      return mk(`${card(e.defId)}被卸下`)
                                                                               
                                                            
                                                          
    case 'standbyPlaced':
      return mk(`${s}在${ctx.zoneName(e.battlefield)}布置了${e.defId ? card(e.defId) : '一张待命牌'}`)
                                                          
    case 'empower':
      return mk(`${card(e.targetDefId)}被强化`)
    case 'disempower':
      return mk(`${card(e.targetDefId)}的强化被移除`)
    case 'extraTurn':
      return mk(`${s}获得一个额外回合`, 'sys')
                                                                        
                                                                    
                                                             
    case 'statusChange': {
      const t = card(e.targetDefId)
      if (e.note === 'dormant=true') return mk(`${t}进入休眠`)
      if (e.note === 'dormant=false') return mk(`${t}变为活跃`)
      if (e.note === 'tapped=true') return mk(`${t}被横置`)
      if (e.note === 'tapped=false') return mk(`${t}被唤醒`)
      return mk(`${t}的状态变化(${e.note ?? '?'})`)
    }
                                                           
                                                              
                                                                
    case 'addBattlefieldZone':
      return mk(`${s}添置了新的战场${card(e.defId)}`, 'sys')
    case 'replaceBattlefieldCard':
      return mk(`${s}将一处战场替换为${card(e.defId)}`, 'sys')
    case 'winGame':
      return mk(`🏆 ${s}赢得对局`, 'banner')
    case 'gainResource':
    case 'spend':
      return null                                
    default:
      return null
  }
}

   
                         
                          
                                                
                                                                
   
export function renderLog(entries: readonly LogEntry[], ctx: LogContext): readonly LogLine[] {
  const out: LogLine[] = []
  const kinds: string[] = []
  for (const e of entries) {
    const line = logLine(e, ctx)
    if (!line) continue
    const prev = out[out.length - 1]
    if (prev && prev.text === line.text && line.tone !== 'banner') continue
    const eatsPrevPoint = e.kind === 'hold' || ((e.kind === 'combatEnd' || e.kind === 'duelEnd') && e.conquered !== undefined)
    if (eatsPrevPoint && kinds[kinds.length - 1] === 'gainPoint') {
      out.pop()                             
      kinds.pop()
    }
    out.push(line)
    kinds.push(e.kind)
  }
  return out
}
