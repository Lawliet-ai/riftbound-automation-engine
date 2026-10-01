                                               
                                                             
                                                        

export interface CardMeta {
  readonly name: string
  readonly sub: string
  readonly type: string
  readonly domains: readonly string[]
  readonly energy: number | null
  readonly power: number | null
  readonly tag: string
  readonly region: string
  readonly text: string
  readonly flavor: string
                      
  readonly errata: string
}

export const CARD_META: Readonly<Record<string, CardMeta>> = {
  "OGN-083": {
    "name": "借鉴历史",
    "sub": "",
    "type": "法术",
    "domains": [
      "blue"
    ],
    "energy": 4,
    "power": null,
    "tag": "",
    "region": "",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "OGN-087": {
    "name": "约德尔教官",
    "sub": "",
    "type": "单位",
    "domains": [
      "blue"
    ],
    "energy": 3,
    "power": 2,
    "tag": "约德尔人",
    "region": "班德尔城",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "OGN-097": {
    "name": "爆裂球果仙灵",
    "sub": "",
    "type": "单位",
    "domains": [
      "blue"
    ],
    "energy": 2,
    "power": 2,
    "tag": "仙灵",
    "region": "班德尔城",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "OGN-101": {
    "name": "蘑菇袋",
    "sub": "",
    "type": "装备",
    "domains": [
      "blue"
    ],
    "energy": 2,
    "power": null,
    "tag": "",
    "region": "",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "OGN-104": {
    "name": "择日再战",
    "sub": "",
    "type": "法术",
    "domains": [
      "blue"
    ],
    "energy": 1,
    "power": null,
    "tag": "",
    "region": "",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "OGN-121": {
    "name": "提莫",
    "sub": "军事家",
    "type": "英雄单位",
    "domains": [
      "blue"
    ],
    "energy": 2,
    "power": 2,
    "tag": "约德尔人",
    "region": "班德尔城",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "OGN-169": {
    "name": "罡风",
    "sub": "",
    "type": "法术",
    "domains": [
      "purple"
    ],
    "energy": 1,
    "power": null,
    "tag": "",
    "region": "",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "OGN-172": {
    "name": "责退",
    "sub": "",
    "type": "法术",
    "domains": [
      "purple"
    ],
    "energy": 2,
    "power": null,
    "tag": "",
    "region": "",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "OGN-181": {
    "name": "奇妙行囊",
    "sub": "",
    "type": "装备",
    "domains": [
      "purple"
    ],
    "energy": 2,
    "power": null,
    "tag": "",
    "region": "",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "OGN-183": {
    "name": "卡牌骗术",
    "sub": "",
    "type": "法术",
    "domains": [
      "purple"
    ],
    "energy": 1,
    "power": null,
    "tag": "",
    "region": "",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "OGN-197": {
    "name": "提莫",
    "sub": "斥候",
    "type": "英雄单位",
    "domains": [
      "purple"
    ],
    "energy": 2,
    "power": 1,
    "tag": "约德尔人",
    "region": "班德尔城",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "OGN-199": {
    "name": "控潮者",
    "sub": "",
    "type": "单位",
    "domains": [
      "purple"
    ],
    "energy": 2,
    "power": 2,
    "tag": "",
    "region": "比尔吉沃特",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "OGN-263": {
    "name": "迅捷斥候",
    "sub": "",
    "type": "传奇",
    "domains": [
      "blue",
      "purple"
    ],
    "energy": null,
    "power": null,
    "tag": "",
    "region": "",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "OGN-264": {
    "name": "游击战",
    "sub": "",
    "type": "专属法术",
    "domains": [
      "blue",
      "purple"
    ],
    "energy": 2,
    "power": null,
    "tag": "",
    "region": "",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "OGN-278": {
    "name": "班德尔树",
    "sub": "",
    "type": "战场",
    "domains": [
      "colorless"
    ],
    "energy": null,
    "power": null,
    "tag": "",
    "region": "",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "OGN-279": {
    "name": "强化阵地",
    "sub": "",
    "type": "战场",
    "domains": [
      "colorless"
    ],
    "energy": null,
    "power": null,
    "tag": "",
    "region": "",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "OGN-280": {
    "name": "帝柳之林",
    "sub": "",
    "type": "战场",
    "domains": [
      "colorless"
    ],
    "energy": null,
    "power": null,
    "tag": "",
    "region": "",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "OGN-288": {
    "name": "星尖峰",
    "sub": "",
    "type": "战场",
    "domains": [
      "colorless"
    ],
    "energy": null,
    "power": null,
    "tag": "",
    "region": "",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "SFD-087": {
    "name": "先知之兆",
    "sub": "",
    "type": "法术",
    "domains": [
      "blue"
    ],
    "energy": 2,
    "power": null,
    "tag": "",
    "region": "",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "SFD-138": {
    "name": "吟风翼",
    "sub": "",
    "type": "单位",
    "domains": [
      "purple"
    ],
    "energy": 2,
    "power": 1,
    "tag": "",
    "region": "艾欧尼亚",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "SFD-145": {
    "name": "换换乐",
    "sub": "",
    "type": "法术",
    "domains": [
      "purple"
    ],
    "energy": 2,
    "power": null,
    "tag": "",
    "region": "",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "SFD-230": {
    "name": "提莫",
    "sub": "军事家",
    "type": "英雄单位",
    "domains": [
      "blue"
    ],
    "energy": 2,
    "power": 2,
    "tag": "约德尔人",
    "region": "班德尔城",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "UNL-071": {
    "name": "环刃舞者",
    "sub": "",
    "type": "单位",
    "domains": [
      "blue"
    ],
    "energy": 3,
    "power": 3,
    "tag": "",
    "region": "比尔吉沃特",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "UNL-079": {
    "name": "黛安娜",
    "sub": "皎月化身",
    "type": "英雄单位",
    "domains": [
      "blue"
    ],
    "energy": 3,
    "power": 3,
    "tag": "巨神峰",
    "region": "黛安娜",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "UNL-081": {
    "name": "赐面守侍",
    "sub": "",
    "type": "单位",
    "domains": [
      "blue"
    ],
    "energy": 2,
    "power": 1,
    "tag": "",
    "region": "艾欧尼亚",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "UNL-087": {
    "name": "苍蓝雕纹魔像",
    "sub": "",
    "type": "单位",
    "domains": [
      "blue"
    ],
    "energy": 4,
    "power": 4,
    "tag": "",
    "region": "巨神峰",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "UNL-088": {
    "name": "倾颓宫殿",
    "sub": "",
    "type": "装备",
    "domains": [
      "blue"
    ],
    "energy": 4,
    "power": null,
    "tag": "",
    "region": "",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "UNL-125": {
    "name": "月神恩赐",
    "sub": "",
    "type": "法术",
    "domains": [
      "purple"
    ],
    "energy": 3,
    "power": null,
    "tag": "",
    "region": "",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "UNL-131": {
    "name": "遗弃",
    "sub": "",
    "type": "法术",
    "domains": [
      "purple"
    ],
    "energy": 2,
    "power": null,
    "tag": "",
    "region": "",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "UNL-134": {
    "name": "存在焦虑",
    "sub": "",
    "type": "法术",
    "domains": [
      "purple"
    ],
    "energy": 1,
    "power": null,
    "tag": "",
    "region": "",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "UNL-149": {
    "name": "黛安娜",
    "sub": "超脱凡界",
    "type": "英雄单位",
    "domains": [
      "purple"
    ],
    "energy": 4,
    "power": 3,
    "tag": "",
    "region": "巨神峰",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "UNL-150": {
    "name": "薇古丝",
    "sub": "冷眼旁观",
    "type": "英雄单位",
    "domains": [
      "purple"
    ],
    "energy": 4,
    "power": 4,
    "tag": "约德尔人",
    "region": "暗影岛",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "UNL-197": {
    "name": "皎月女神",
    "sub": "",
    "type": "传奇",
    "domains": [
      "blue",
      "purple"
    ],
    "energy": null,
    "power": null,
    "tag": "",
    "region": "",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "UNL-209": {
    "name": "暮色玫瑰实验室",
    "sub": "",
    "type": "战场",
    "domains": [
      "colorless"
    ],
    "energy": null,
    "power": null,
    "tag": "",
    "region": "",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "UNL-214": {
    "name": "鬼影湾",
    "sub": "",
    "type": "战场",
    "domains": [
      "colorless"
    ],
    "energy": null,
    "power": null,
    "tag": "",
    "region": "",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "VEN-052": {
    "name": "惑心转意",
    "sub": "",
    "type": "法术",
    "domains": [
      "blue"
    ],
    "energy": 1,
    "power": null,
    "tag": "",
    "region": "",
    "text": "",
    "flavor": "",
    "errata": ""
  },
  "VEN-152": {
    "name": "灵魂折镜",
    "sub": "",
    "type": "专属法术",
    "domains": [
      "blue",
      "purple"
    ],
    "energy": 1,
    "power": null,
    "tag": "",
    "region": "",
    "text": "",
    "flavor": "",
    "errata": ""
  }
}
