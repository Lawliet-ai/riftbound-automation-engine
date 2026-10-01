import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId, type PlayerId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKeywords, cardKind, playSpecFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { STUN_SPELLS, STUN_SPELL_SPECS, stunCandidates } from '../../data/cards/stun-spells'
import { damageVictims } from '../../data/cards/damage-spells'

                                                 
                                      
                                        
                                                       
  
                 
                                                                        
                                                                   
                                                  
                                                       
                                                          
                                                                                         
                                            

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const unit = (
  oid: string, zone: string, who: PlayerId, status: GameObject['status'] = {},
): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who,
  zone: asZoneId(zone), baseMight: 3, baseKeywords: [], baseTypes: ['unit'],
  damage: 0, counters: {}, status,
})

   
                   
                                                                  
                                     
                                             
   
function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  const bfs = zonesByKind(base, 'battlefield').map((z) => z.id as string)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  put(unit('myAtk', bfs[0]!, P1, { attacking: true }))
  put(unit('foeDef', bfs[0]!, P2, { defending: true }))
  put({ ...unit('gear', bfs[0]!, P1), baseTypes: ['equipment'] as never })
  put(unit('plain', bfs[1]!, P2))
  put(unit('homie', `base:${P1}`, P1))
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

const rowOf = (defId: string): (typeof STUN_SPELLS)[number] =>
  STUN_SPELLS.find((r) => r.defId === defId)!

describe('★ 前提:类别 / 费用 / 印刷关键词 / 进表', () => {
                                                     
                                                              
                                                 
                                                  
  test('★★★★★★数量对齐:行表就这几张,多一张少一张都得红', () => {
                                                             
    expect(STUN_SPELLS.map((r) => r.defId).slice().sort()).toEqual(['OGN-050', 'SFD-040', 'UNL-042'])
  })

  test('★★★★★上游印刷费 ↔ 行表 `cost`:pip 枚数与域都对得上(①)', () => {
    expect(CARD_COSTS['OGN-050'], '★1 枚绿 pip').toEqual({ mana: 2, pips: 1, colors: ['green'] })
    expect(rowOf('OGN-050').cost).toEqual({ mana: 2, pips: [['green']] })
    expect(CARD_COSTS['SFD-040'], '★★0 pip ⇒ 行表只写 mana').toEqual({ mana: 2, pips: 0, colors: ['green'] })
    expect(rowOf('SFD-040').cost).toEqual({ mana: 2 })
                            
    expect(CARD_COSTS['UNL-042']).toEqual({ mana: 3, pips: 0, colors: ['green'] })
    expect(rowOf('UNL-042').cost).toEqual({ mana: 3 })
  })

  test('★★★★`energy` 与 `cost.mana` 必须一致(㊶ 两处别岔)', () => {
    for (const r of STUN_SPELLS) expect(r.cost.mana, `${r.defId}`).toBe(r.energy)
  })

  test('★★★★★类别是法术、进了 `PLAY_SPECS`、`legalTargets` 是必填', () => {
    for (const r of STUN_SPELLS) {
      expect(cardKind(r.defId), `${r.defId} 是法术`).toBe('spell')
      const spec = playSpecFor(r.defId)
      expect(spec, `${r.defId} 进了 PLAY_SPECS`).toBeDefined()
      expect(spec!.legalTargets, `${r.defId} legalTargets 必填`).toBeDefined()
    }
  })

  test('★★★★★★印刷关键词只有[迅捷];**[回响2] 不在里面**(§820 走 `echo`)', () => {
    expect(cardKeywords('OGN-050')).toEqual(['迅捷'])
    expect(cardKeywords('SFD-040'), '★★[回响2]是额外费用轴,不是印刷关键词').toEqual(['迅捷'])
    expect(STUN_SPELL_SPECS['SFD-040']!.echo, '★★★它落在 PlaySpec.echo 上').toEqual({ mana: 2 })
    expect(STUN_SPELL_SPECS['OGN-050']!.echo, '★没印[回响]的那张不给这个字段').toBeUndefined()
  })
})

describe('★★★★★★★ 「眩晕一名单位」:不分敌我、【含基地】', () => {
  test('★★★★★★★双方的、基地里的,统统能选', () => {
    const s = scene()
    const c = stunCandidates('anyUnit', s)
    expect(c, '★我自己的').toContain('myAtk')
    expect(c, '★★对手的').toContain('foeDef')
    expect(c, '★★★【基地】里的 —— 卡文没有位置词').toContain('homie')
    expect(c).toContain('plain')
  })

  test('★★★★★装备不是单位,选不了', () => {
    expect(stunCandidates('anyUnit', scene()), '★装备被 `fieldedUnits` 挡在外面').not.toContain('gear')
  })
})

describe('★★★★★★★ 「一名【进攻方】单位」= §323.2 身份,不是阵营', () => {
  test('★★★★★★★只有【进攻中】的那名 —— 防守方、无身份的都不算', () => {
    const c = stunCandidates('attacker', scene())
    expect(c, '★进攻中').toEqual(['myAtk'])
  })

  test('★★★★★★★㉓ 分辨【身份】与【阵营】:我自己的进攻方选得到,对手无身份的选不到', () => {
                                                               
    const s = scene()
    expect(s.objects['myAtk' as ObjId]!.controller, '前提自证:进攻的那名是【我的】').toBe(P1)
    expect(stunCandidates('attacker', s), '★★身份说了算 ⇒ 我自己的也能被眩晕').toContain('myAtk')
    expect(s.objects['plain' as ObjId]!.controller, '前提自证:这名是【对手的】').toBe(P2)
    expect(stunCandidates('attacker', s), '★★★但它没有进攻身份 ⇒ 选不到').not.toContain('plain')
  })

  test('★★★★★★【防守】身份不是【进攻】身份', () => {
    const s = scene()
    expect(s.objects['foeDef' as ObjId]!.status.defending, '前提自证:它在防守').toBe(true)
    expect(stunCandidates('attacker', s), '★防守方不吃这张').not.toContain('foeDef')
  })
})

describe('★★★★★★★ 结算:发 `stun`,并且【再验一次】范围', () => {
  const resolveOf = (defId: string, target: string, s: GameState): readonly unknown[] =>
    STUN_SPELL_SPECS[defId]!.makeResolve!({
      movedCardOid: asObjId('card'), controller: P1, target,
    } as never)(s, {})

  test('★★★★★★★选中谁就眩晕谁(事件只有 `target`,没有 amount/source)', () => {
    const s = scene()
    expect(resolveOf('OGN-050', 'foeDef', s)).toEqual([{ kind: 'stun', target: 'foeDef' }])
  })

  test('★★★★★★★结算时那名已经【不再是进攻方】⇒ 一条都不发', () => {
                                         
    const s0 = scene()
    expect(resolveOf('SFD-040', 'myAtk', s0), '前提自证:身份还在时是发的').toHaveLength(1)
    const cleared = {
      ...s0,
      objects: { ...s0.objects, myAtk: { ...s0.objects['myAtk' as ObjId]!, status: {} } },
    } as GameState
    expect(stunCandidates('attacker', cleared), '前提自证:身份没了').toEqual([])
    expect(resolveOf('SFD-040', 'myAtk', cleared), '★结算侧再验一次 ⇒ 不发').toEqual([])
  })

  test('★★★★没选目标 ⇒ 不发', () => {
    expect(STUN_SPELL_SPECS['OGN-050']!.makeResolve!({
      movedCardOid: asObjId('card'), controller: P1,
    } as never)(scene(), {})).toEqual([])
  })
})

describe('★★★★★★ 分辨断言:这一族与「造成伤害」那一族【口径真的不同】', () => {
  test('★★★★★★★同一个盘面:眩晕族**含基地**,伤害族**不含**', () => {
                                             
    const s = scene()
    expect(stunCandidates('anyUnit', s), '★眩晕:卡文没位置词 ⇒ 含基地').toContain('homie')
    expect(damageVictims('oneOnBattlefield', s, P1), '★★伤害:卡文写了「战场上的」⇒ 不含基地')
      .not.toContain('homie')
  })
})
