                                                  
                                                            

import type { CombatSummary, GameState } from '../state/gameState'
import type { PlayerId, ZoneId } from '../state/ids'
import { effectiveMight } from '../state/might'
import { isUnit } from '../state/cardTypes'                                                  

export function summarizeCombat(
  before: GameState,
  after: GameState,
  battlefield: string,
  attacker: PlayerId,
  defender: PlayerId,
  outcome: CombatSummary['outcome'],
  conquered: PlayerId | null,
): CombatSummary {
  const z = before.zones[battlefield as ZoneId]
  const combatants = (z?.contents ?? [])
    .map((oid) => before.objects[oid])
    // ★1413【缺陷 183 · 不影响胜负】原先按 `defId` 前缀近似「是不是单位」—— 只排掉符文,
    //   **贴附装备照进**(§434.4 会把装备挪到顶部卡牌所在的战场)⇒ 战报复盘里多出一行
    //   「装备」当参战单位(实测:host + gear + foe **三条**,gear 还带 side/might/died)。
    // ⚠️ 一墙之隔的 `battle.ts` 的 `unitsOf` 早就用的是共用件真判据,注释还写着「战场区里
    //   还可能有装备…不过滤的话装备会被算进 §465.2.a 的战力之和」—— **同一目录、同一件事、
    //   两把尺子**(★1411/★1412 同族第三处)⇒ 改成与它同一把。
    // ⚠️ 本模块是**非规则态**的 UI 复盘(见模块头)⇒ 后果是战报多一行 / 战力显示错,**不影响胜负**。
    .filter((o): o is NonNullable<typeof o> => isUnit(o))

                                    
                                                      
  const discardCount = (st: GameState, owner: string, defId: string): number =>
    (st.zones[`discard:${owner}` as ZoneId]?.contents ?? [])
      .filter((oid) => st.objects[oid]?.defId === defId).length
  const deadBudget = new Map<string, number>()
  for (const o of combatants) {
    const key = `${o.owner}:${o.defId}`
    if (deadBudget.has(key)) continue
    deadBudget.set(key, discardCount(after, o.owner, o.defId) - discardCount(before, o.owner, o.defId))
  }

  const units = combatants.map((o) => {
    const key = `${o.owner}:${o.defId}`
    const left = deadBudget.get(key) ?? 0
    const died = left > 0
    if (died) deadBudget.set(key, left - 1)                   
    const alive = !died
    return {
      defId: o.defId,
      side: (o.controller === attacker ? 'attacker' : 'defender') as 'attacker' | 'defender',
      might: effectiveMight(o).reference,
      stunned: o.status.stunned === true,
      died: !alive,
    }
  })

  const sum = (side: 'attacker' | 'defender'): number =>
    units.filter((u) => u.side === side && !u.stunned).reduce((a, u) => a + u.might, 0)

  return {
    battlefield, attacker, defender,
    attackerMight: sum('attacker'),
    defenderMight: sum('defender'),
    units, outcome, conquered,
  }
}
