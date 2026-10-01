import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import type { Trigger } from '../../src/dsl/trigger'
import { CARD_COSTS } from '../../data/cardCosts'
import { CARD_TAGS } from '../../data/cardTags'
import { detectTriggers } from '../../src/dsl/trigger'
import { MULTI_SELECT_DONE } from '../../src/loop/multiSelect'
import { TRIGGER_FACTORIES } from '../../data/registry'
import {
  UNL_104, SFD_130, UNL_104_MAX, DRAGON_TAG, LONGTAIL36_DEFIDS,
  isDragonUnitPlay, tappedRunes, makeUnl104PlayTrigger, makeSfd130MoveTrigger,
} from '../../data/cards/longtail-36'
import { GOLD_TOKEN } from '../../data/cards/gear-triggers'

                                       
                                                    
                                            

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const SELF = asObjId('self0')

function obj(id: string, defId: string, zone: string, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId, owner: P1, controller: P1, zone: asZoneId(zone),
    baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
  }
}
                                              
function rune(id: string, ctrl = P1, tapped = true): GameObject {
  return obj(id, 'RUNE-X', `base:${ctrl}`, {
    owner: ctrl, controller: ctrl, baseTypes: ['rune'] as const, status: tapped ? { tapped: true } : {},
  })
}
function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, objects, zones }
}

                                         
function fired(st: GameState, ev: GameEvent, t: Trigger, actor = P1): boolean {
  return detectTriggers(st, ev, [t], actor).length > 0
}
                                                      
function resolveVia(
  st: GameState, ev: GameEvent, t: Trigger, chosen: Record<string, string> = {}, actor = P1,
): readonly GameEvent[] {
  const [it] = detectTriggers(st, ev, [t], actor)
  expect(it).toBeDefined()
  return it!.resolve(st, chosen, it!)
}
const playEv = (unit: string): GameEvent => ({ kind: 'playUnit', unit, player: P1 } as GameEvent)
const moveEv = (unit: string): GameEvent => ({ kind: 'unitMoved', unit, from: BF1, to: BF0 } as GameEvent)

describe('前提断言(㊶/㉚ 读判据真正读的那张表)', () => {
  test.each([['UNL-104', UNL_104], ['SFD-130', SFD_130]] as const)('%s 的 mana/pip 与费用表一致', (id, card) => {
    const row = CARD_COSTS[id]
    expect(row).toBeDefined()
    expect(card.energy).toBe(row!.mana)
    expect(row!.pips).toBe(0)
  })

                                         
                                              
  test('★宝石龙自己带"龙"标签 —— 所以「我」那半天然被 hasTag 包住', () => {
    expect(CARD_TAGS['UNL-104']).toBe(DRAGON_TAG)
  })

  test('对账清单就是这两张', () => {
    expect([...LONGTAIL36_DEFIDS].sort()).toEqual(['SFD-130', 'UNL-104'])
  })

  test('两张的触发都登记在真 registry 的 TRIGGER_FACTORIES 里', () => {
    for (const id of LONGTAIL36_DEFIDS) expect(TRIGGER_FACTORIES[id]).toBeDefined()
  })
})

describe('温驯的宝石龙 UNL-104:打出"龙"属性单位 → 最多两枚符文变活跃', () => {
  test('打出的是龙 → 认', () => {
    expect(isDragonUnitPlay(scene([obj('u0', 'UNL-104', BF0)]), 'u0')).toBe(true)
  })

  test('★打出的不是龙 → 不认(⑫ 否定对照)', () => {
    const s = scene([obj('u0', 'OGN-012', BF0)])                  
    expect(CARD_TAGS['OGN-012']).not.toBe(DRAGON_TAG)                 
    expect(isDragonUnitPlay(s, 'u0')).toBe(false)
  })

  test('★「其他」龙也算,不只是我自己', () => {
    const s = scene([obj('other', 'SFD-094', BF0)])             
    expect(CARD_TAGS['SFD-094']).toBe(DRAGON_TAG)
    expect(isDragonUnitPlay(s, 'other')).toBe(true)
  })

  test('候选是【横置的】符文,已经活跃的不占名额', () => {
    expect(tappedRunes(scene([rune('r0'), rune('r1', P1, false), rune('r2')]))).toEqual(['r0', 'r2'])
  })

  test('★不分敌我:对手的横置符文照样能挑(卡文没写「友方」)', () => {
    expect(tappedRunes(scene([rune('r0', P1), rune('r2', P2)]))).toEqual(['r0', 'r2'])
  })

  test('★单位不是符文,不进候选(㉔ 类型分得开)', () => {
    expect(tappedRunes(scene([obj('u0', 'UNL-104', BF0, { status: { tapped: true } })]))).toEqual([])
  })

                                                     
  const askScene = (): GameState => scene([
    obj('self0', 'UNL-104', BF0), rune('r0'), rune('r1'), rune('r2'),
  ])
  const trig = (): Trigger => makeUnl104PlayTrigger(SELF, P1)

  test('第一问弹出来了,候选含三枚符文 + 一个"够了"出口', () => {
    const q = trig().nextChoice?.(askScene(), playEv('self0'), {})
    expect(q).not.toBeNull()
    expect(q!.candidates.map((c) => c.id)).toEqual(['r0', 'r1', 'r2', MULTI_SELECT_DONE])
    expect(q!.controller).toBe(P1)
  })

                                                   
                                                           
                                               
  test('★不分敌我(落在【真候选】上):对手的横置符文出现在 ChoiceRequest 里', () => {
    const s = scene([obj('self0', 'UNL-104', BF0), rune('mine', P1), rune('theirs', P2)])
    const q = trig().nextChoice?.(s, playEv('self0'), {})
    expect(q!.candidates.map((c) => c.id)).toEqual(['mine', 'theirs', MULTI_SELECT_DONE])
  })

  test('★封顶:选满两枚之后【不再追问】(⑰)', () => {
    expect(UNL_104_MAX).toBe(2)
    expect(trig().nextChoice?.(askScene(), playEv('self0'), { gemDragonRune0: 'r0', gemDragonRune1: 'r1' })).toBeNull()
  })

  test('★零个:第一问就答"够了" → 不再追问、且一个事件都不发', () => {
    const s = askScene()
    expect(trig().nextChoice?.(s, playEv('self0'), { gemDragonRune0: MULTI_SELECT_DONE })).toBeNull()
    expect(resolveVia(s, playEv('self0'), trig(), { gemDragonRune0: MULTI_SELECT_DONE })).toEqual([])
  })

  test('选两枚 → 发两条 tapped:false(符文走 tapped 轴,不是 dormant)', () => {
    const evs = resolveVia(askScene(), playEv('self0'), trig(), { gemDragonRune0: 'r0', gemDragonRune1: 'r2' })
    expect(evs).toEqual([
      { kind: 'statusChange', target: 'r0', key: 'tapped', value: false },
      { kind: 'statusChange', target: 'r2', key: 'tapped', value: false },
    ])
  })

  test('★选超了也只兑现两枚(⑥ 候选侧与执行侧各有各的用例)', () => {
    const evs = resolveVia(askScene(), playEv('self0'), trig(),
      { gemDragonRune0: 'r0', gemDragonRune1: 'r1', gemDragonRune2: 'r2' })
    expect(evs).toHaveLength(UNL_104_MAX)
  })

  test('★已经活跃的符文即使被选中也不发事件(activateEvent 分派把它挡掉)', () => {
    const s = scene([obj('self0', 'UNL-104', BF0), rune('r0', P1, false)])
    expect(resolveVia(s, playEv('self0'), trig(), { gemDragonRune0: 'r0' })).toEqual([])
  })

  test('★不许串味 vs 黑暗之女 OGS-017:那张【两枚】强制,这张【最多两枚】必须先问', () => {
    expect(trig().nextChoice?.(askScene(), playEv('self0'), {})).not.toBeNull()      
                                           
    expect(resolveVia(askScene(), playEv('self0'), trig(), {})).toEqual([])
  })

  test('真 registry 造出来的那条触发,在 playUnit 上收得到', () => {
    const t = TRIGGER_FACTORIES['UNL-104']!(SELF, P1)[0]!
    expect(fired(askScene(), playEv('self0'), t)).toBe(true)
  })

  test('★打出非龙单位时,连触发都不产生(铁律111)', () => {
    const s = scene([obj('self0', 'UNL-104', BF0), obj('u1', 'OGN-012', BF0), rune('r0')])
    expect(fired(s, playEv('u1'), trig())).toBe(false)
  })

  test('★对手打出龙不给我响(「当【你】打出」⇒ by:you)', () => {
    const s = scene([obj('self0', 'UNL-104', BF0), obj('u1', 'SFD-094', BF0), rune('r0')])
    expect(fired(s, playEv('u1'), trig(), P2)).toBe(false)
  })
})

describe('寻宝猎人 SFD-130:我移动 → 打出一个休眠的金币装备指示物', () => {
  const s = (): GameState => scene([obj('self0', 'SFD-130', BF0)])
  const trig = (): Trigger => makeSfd130MoveTrigger(SELF, P1)

  test('我移动 → 发一条 spawnToken:金币规格、落我的基地、休眠', () => {
    const evs = resolveVia(s(), moveEv('self0'), trig())
    expect(evs).toHaveLength(1)
    expect(evs[0]).toMatchObject({
      kind: 'spawnToken', spec: GOLD_TOKEN, zone: `base:${P1}`, dormant: true,
    })
  })

  test('★金币是【装备】指示物 —— 规格里声明着,不然会被当单位算进战斗(㉔)', () => {
    expect(GOLD_TOKEN.baseTypes).toContain('equipment')
  })

  test('★强制、不追问(与 SFD-063 那张「你可以选择」+ 休眠自己作费用 正相反)', () => {
    expect(trig().mayChoose).not.toBe(true)
    expect(trig().nextChoice?.(s(), moveEv('self0'), {}) ?? null).toBeNull()
  })

  test('真 registry 造出来的那条触发,在 unitMoved 上收得到', () => {
    const t = TRIGGER_FACTORIES['SFD-130']!(SELF, P1)[0]!
    expect(fired(s(), moveEv('self0'), t)).toBe(true)
  })

  test('★别人移动【不】触发(subjectIsSelf;与后巷酒吧那种"谁动都算"正相反)', () => {
    const st = scene([obj('self0', 'SFD-130', BF0), obj('u1', 'OGN-012', BF0)])
    expect(fired(st, moveEv('u1'), trig())).toBe(false)
  })

  test('★对手推着我移动也算(by:any;判「是不是我」不判「谁推的」)', () => {
    expect(fired(s(), moveEv('self0'), trig(), P2)).toBe(true)
  })
})
