                                                          
                                       
                                                                     

import type { Card } from '../../src/dsl/card'

export const OGN_083_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n' +
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n' +
  '抽两张牌。'

export const OGN_083: Card = {
  id: 'OGN-083',
  cardNo: 'OGN·083/298',
  name: '借鉴历史',
  category: 'spell',
  domains: ['blue'],
  energy: 4,
  keywords: ['待命', '反应'],
  playModes: [{ kind: 'standard' }, { kind: 'hidden' }],
  abilities: [{ kind: 'passive', describe: '抽两张牌(PlaySpec 于 registry 注册)' }],
}
