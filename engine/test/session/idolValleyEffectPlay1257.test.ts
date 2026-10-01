import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { makeGameDeps } from '../../data/gameDeps'
import { CARD_COSTS } from '../../data/cardCosts'
import { UNL_139_BF_KEY, UNL_139_PICK_KEY } from '../../data/cards/UNL-139'
import { SFD_111_PICK, SFD_111_DEST } from '../../data/cards/SFD-111'
import { UNL_218_COST_MANA } from '../../data/cards/battlefields-extra'
import { UNL_189_BASE_MANA } from '../../data/cards/UNL-189'

                                                                                
                                                                                            
                                                                                   
                                                                                
                                                                          

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BASE1 = `base:${P1}`
const DEPS = makeGameDeps(1)

const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
const spell = (oid: string, defId: string, who: PlayerId, zone: string): GameObject => obj(oid, defId, who, zone, { baseTypes: ['spell'] as never })
const rune = (i: number, color: string, who: PlayerId = P1): GameObject => ({
  oid: asObjId(`rune_${who}_${color}${i}`), defId: `rune:${color}`, owner: who, controller: who, zone: asZoneId(`base:${who}`),
  baseMight: 0, baseKeywords: [], baseTypes: ['rune'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
                                                                   
function scene(objs: readonly GameObject[], mana: { P1?: number; P2?: number } = {}): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (!z) throw new Error(`★造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  for (const o of objs) put(o)
  for (const p of [P1, P2]) for (let k = 0; k < 4; k++) put(obj(`deck_${p}_${k}`, 'BLK', p, `mainDeck:${p}`))
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones,
    runePools: { ...s.runePools, [P1]: { mana: mana.P1 ?? 0, runes: {} }, [P2]: { mana: mana.P2 ?? 0, runes: {} } },
    battlefieldCards: { [BF0]: { defId: 'UNL-218', owner: P2 } } } as unknown as GameState
  return s
}
type Req = { key: string; controller: PlayerId; candidates: readonly { id: string }[] }
function drain(g: InteractiveGame, action: unknown, answer: (req: Req) => string): { asked: string[]; askedBy: Record<string, string> } {
  const asked: string[] = []; const askedBy: Record<string, string> = {}
  g.apply(action as never)
  for (let i = 0; i < 60; i++) {
    const p = g.pending()
    if (p.mode === 'choice') {
      const req = (p as unknown as { request: Req }).request
      asked.push(req.key); askedBy[req.key] = String(req.controller)
      g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer: answer(req) } as never)
    } else if (p.mode === 'window') {
      g.apply({ kind: 'PASS', player: (p as { player: PlayerId }).player } as never)
    } else break
  }
  return { asked, askedBy }
}
const idolAsk = (k: string) => k.startsWith('__mayChoose__') && k.includes('UNL-218')
                                                               
const roseAsk = (k: string) => k.startsWith('__mayChoose__') && k.includes('UNL-109')
const findDef = (g: InteractiveGame, defId: string) => Object.values(g.state.objects).find((o) => o.defId === defId)
const mana = (g: InteractiveGame, p: PlayerId) => g.state.runePools[p]?.mana ?? -1

describe('★★★★★★ ★1257 偶像谷 UNL-218 对【效果打出】的单位也响(缺陷 159 同族 E2E)', () => {
  test('★前提:透骨尖钉 2 费 1 紫 pip;前来相助 2 费 1 橙 pip;鲛人 2 费 0 pip;偶像谷「支付{1}」= 1 法力', () => {
    expect(CARD_COSTS['UNL-139']).toMatchObject({ mana: 2, pips: 1, colors: ['purple'] })
    expect(CARD_COSTS['SFD-111']).toMatchObject({ mana: 2, pips: 1, colors: ['orange'] })
    expect(CARD_COSTS['UNL-003']).toMatchObject({ mana: 2, pips: 0 })
    expect(UNL_218_COST_MANA).toBe(1)
  })

  test('🔴★★★★★★④playFree 路:透骨尖钉让对手把手牌单位打到偶像谷所在的 BF0 ⇒ 对手那份偶像谷问【对手】、对手付 1 法力、该单位得增益', () => {
    const g = new InteractiveGame(scene([
      spell('spike', 'UNL-139', P1, `hand:${P1}`), obj('fu', 'UNL-003', P2, `hand:${P2}`), // ⚠️foeHandUnits 按 CARD_CATEGORIES 判单位 ⇒ 要真卡号
      rune(0, 'purple'), rune(1, 'purple'),
    ], { P1: 5, P2: 3 }), DEPS)
    const play = g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD' && (a as { cardOid?: string }).cardOid === 'spike')
    expect(play, '★前提:透骨尖钉打得出').toBeDefined()
    const { asked, askedBy } = drain(g, play, (req) => {
      if (req.key === UNL_139_BF_KEY) return BF0
      if (req.key === UNL_139_PICK_KEY) return req.candidates.find((c) => c.id === 'fu')?.id ?? req.candidates[0]!.id
      if (idolAsk(req.key)) return 'yes'
      return req.candidates[0]!.id
    })
    const ask = asked.find(idolAsk)
    expect(ask, '★★★偶像谷问出来了(修前 playFree 派生无 at ⇒ 永不问)').toBeDefined()
    expect(askedBy[ask!], '★「该玩家」= 打出者 = 对手 P2 那份触发').toBe(String(P2))
    const fu = findDef(g, 'UNL-003')
    expect(String(fu?.zone), '★对手单位真落到 BF0').toBe(BF0)
    expect(fu?.counters?.buff ?? 0, '★★★该单位得增益').toBeGreaterThanOrEqual(1)
    expect(mana(g, P2), '★对手付了 1 法力(3 → 2)').toBe(2)
    expect(mana(g, P1), '★我只付了透骨尖钉的 2 法力(5 → 3)').toBe(3)
  })

  test('🔴★★★★★★⑤playUnit{play} 路:前来相助从手牌把鲛人打到我控的偶像谷 BF0 ⇒ 我那份偶像谷问【我】、付 1 法力、鲛人得增益', () => {
    const g = new InteractiveGame(scene([
      spell('assist', 'SFD-111', P1, `hand:${P1}`), obj('mu', 'UNL-003', P1, `hand:${P1}`), obj('g', 'U-guard', P1, BF0),
      rune(0, 'orange'), rune(1, 'orange'),
    ], { P1: 6 }), DEPS)
    const play = g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD' && (a as { cardOid?: string }).cardOid === 'assist')
    expect(play, '★前提:前来相助打得出').toBeDefined()
    const { asked, askedBy } = drain(g, play, (req) => {
      if (req.key === SFD_111_PICK) return req.candidates.find((c) => c.id === 'mu')?.id ?? req.candidates[0]!.id
      if (req.key === SFD_111_DEST) return req.candidates.find((c) => c.id === BF0)?.id ?? req.candidates[0]!.id
      if (idolAsk(req.key)) return 'yes'
      return req.candidates[0]!.id
    })
    expect(asked, '★前来相助两问').toContain(SFD_111_PICK)
    expect(asked).toContain(SFD_111_DEST)
    const ask = asked.find(idolAsk)
    expect(ask, '★★★偶像谷问出来了(修前 §419.3 重写无 at ⇒ 永不问)').toBeDefined()
    expect(askedBy[ask!], '★打出者 = 我').toBe(String(P1))
    const mu = findDef(g, 'UNL-003')
    expect(String(mu?.zone), '★鲛人真落到 BF0').toBe(BF0)
    expect(mu?.counters?.buff ?? 0, '★★★鲛人得增益').toBeGreaterThanOrEqual(1)
    expect(mana(g, P1), '★付了前来相助 2 + 偶像谷 1;鲛人 2 费减 3 = 0(6 → 3)').toBe(3)
    expect(BASE1).toBe(`base:${P1}`)
  })

  test('🔴★★★★★★⑥指示物路:含羞蓓蕾 UNL-189 激活造一枚精灵到偶像谷所在的 BF0 ⇒ 偶像谷问我、付 1 法力、精灵得增益', () => {
                                                                                   
                                                                                              
                                                                                     
    const g = new InteractiveGame(scene([
      obj('bloom', 'UNL-189', P1, `legend:${P1}`, { baseTypes: ['legend'] as never, baseMight: 0 }),
      obj('g', 'U-guard', P1, BF0), // 我控 BF0(那里只有我的单位)
    ], { P1: 9 }), DEPS)
    const act = g.legalActions(P1).find((a) => a.kind === 'ACTIVATE'
      && (a as { ability?: string }).ability === 'UNL-189:sprite'
      && (a as { target?: string }).target === BF0)
    expect(act, '★前提:含羞蓓蕾的造精灵技能能打到 BF0(落点候选 = 基地 + 我控战场)').toBeDefined()
                                                                
                                                                            
    expect(UNL_189_BASE_MANA, '★前提:技能基础费 4(§206.1 印刷值)').toBe(4)
    const { asked, askedBy } = drain(g, act, (req) => (idolAsk(req.key) ? 'yes' : req.candidates[0]!.id))
    const ask = asked.find(idolAsk)
    expect(ask, '★★★偶像谷对【指示物】也响(判据是产地派生那条的 at === 此处)').toBeDefined()
                                                                 
                                                  
                                                                       
                                                                
                                                                
                                                             
                                                                       
                                   
                                                                  
                                                                                                        
                                                                  
    expect(asked.filter(idolAsk), '★★★一枚指示物只问一次(双发时这里会是 2)').toHaveLength(1)
    expect(askedBy[ask!], '★「该玩家」= 造它的人').toBe(String(P1))
    const sprites = Object.values(g.state.objects).filter((o) => String(o.defId).startsWith('token:') && String(o.zone) === BF0)
    expect(sprites, '★★★恰造出一枚精灵落在 BF0(原来用 find,造两枚也取第一枚、照样绿)').toHaveLength(1)
    const sprite = sprites[0]
    expect(sprite?.counters?.buff ?? 0, '★★★精灵拿到偶像谷的增益').toBeGreaterThanOrEqual(1)
    expect(sprite?.status?.dormant, '★卡文「处于活跃状态的」⇒ 不休眠').not.toBe(true)
    expect(mana(g, P1), '★技能 4 + 偶像谷 1 ⇒ 9 → 4').toBe(4)
  })

                                        
                                                                             
                                                                           
                                                               
                                                        
                                                                                           
                                                                
                                                                            
                                                                                               
                                 
  test('🔴★★★★★★⑦【不读 at 的听众】同一枚精灵,猩红玫瑰 UNL-109 也只问一次 —— 这条才对【卡侧手写补发】有判别力', () => {
    const g = new InteractiveGame(scene([
      obj('bloom', 'UNL-189', P1, `legend:${P1}`, { baseTypes: ['legend'] as never, baseMight: 0 }),
      obj('rose', 'UNL-109', P1, BF0, { baseTypes: ['equipment'] as never, baseMight: 0 }),
      obj('g', 'U-guard', P1, BF0), // 我控 BF0(那里只有我的单位)
    ], { P1: 9 }), DEPS)
    const act = g.legalActions(P1).find((a) => a.kind === 'ACTIVATE'
      && (a as { ability?: string }).ability === 'UNL-189:sprite'
      && (a as { target?: string }).target === BF0)
    expect(act, '★前提:含羞蓓蕾的造精灵技能能打到 BF0').toBeDefined()
                                                                   
    const { asked } = drain(g, act, (req) => (idolAsk(req.key) || roseAsk(req.key) ? 'yes' : req.candidates[0]!.id))
    expect(asked.filter(roseAsk),
      '★★★一枚指示物 = 一条打出信号 ⇒ 不读 at 的听众也只该被问一次(★1258 缺陷 160;卡侧手写补发时这里会是 2)').toHaveLength(1)
                                         
    expect(asked.filter(idolAsk), '★对照:偶像谷那条老断言同时仍成立(两个听众数出同一个 1)').toHaveLength(1)
    const sprite = Object.values(g.state.objects).find((o) => String(o.defId) === 'token:精灵' && String(o.zone) === BF0)
    expect(sprite, '★前提:精灵真落在 BF0 —— 没落地的话两个听众都是 0,上面的 1 就无从谈起').toBeDefined()
    expect(mana(g, P1), '★技能 4 + 偶像谷 1 + 猩红玫瑰 1 ⇒ 9 → 3').toBe(3)
  })
})
