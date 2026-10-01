                                                              
                                                                     
                                                   
                           
                                                   
                                               
  
            
                                          
                                                
                                                               
                                                                   
                                                                           
                                                        
                                                               
                                                                             

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { asZoneId } from '../../src/state/ids'
import type { DeathSnapshot } from '../../src/keywords/lastRites'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { GOLD_TOKEN } from './gear-triggers'

export const UNL_145_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n' +
  '{{后排}}（我在战斗中最后承担伤害。）\n' +
  '每回合限一次，如果我位于战场上，当一名敌方单位被摧毁时，打出一个休眠的"金币"装备指示物。'

                                           
export function makePykeTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-145-gold:${selfOid}`, rawId: true,
    sourceDefId: 'UNL-145',
    event: 'destroyed',
    by: 'any', // 卡文没写谁摧毁的
    oncePerTurn: true, // §383.1「每回合限一次」
    nthType: true,     // §383.1.b 同一批多名敌方一起死只算一次
    when: [{
      kind: 'custom',
      test: (ev, state): boolean => {
                                        
        const me = state.objects[selfOid]
        if (!me || state.zones[me.zone]?.kind !== 'battlefield') return false
                                                           
        const v = (ev as { victim?: DeathSnapshot }).victim
        return v !== undefined && v.controller !== me.controller && v.types.includes('unit')
      },
    }],
    effect: (): readonly GameEvent[] => [{
      kind: 'spawnToken', spec: GOLD_TOKEN,
      zone: asZoneId(`base:${controller}`), owner: controller, dormant: true,
    } as GameEvent],
  }, selfOid, controller)
}

export const UNL_145: Card = {
  id: 'UNL-145', cardNo: 'UNL-145/219', name: '派克', category: 'unit',
  domains: ['purple'], energy: 3, power: 3, keywords: ['待命', '后排'], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[待命]§811 可正面朝下布置' },
    { kind: 'passive', describe: '[后排]§465.2.c.6 战斗中最后承担伤害' },
    { kind: 'passive', describe: '每回合限一次,我在战场上时敌方单位被摧毁→打出休眠金币(makePykeTrigger)' },
  ],
}

export const UNL_145A: Card = { ...UNL_145, id: 'UNL-145a', cardNo: 'UNL-145a/219' }
