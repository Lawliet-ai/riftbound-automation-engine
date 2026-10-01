import { passiveDefId } from './passiveIdentity'                                      
import type { DestroyReplacement } from '../src/loop/cleanup'
import { isEmpowered } from '../src/keywords/empower'
import { hasHaste, hasteExtraCost } from '../src/keywords/haste'                                              
                                                                 
                                                                                   
                                                          
                                           
import { delayedTriggerId } from '../src/effects/delayedTriggers'
                               
                                                                        
                                         

import { isUnit, isEquipment, typesOf, type TypeSource, isTokenDefId } from '../src/state/cardTypes'                                    
import { OGN_145_SPEC, negateSpellDamageShields } from './cards/OGN-145'
import { OGN_268_SPEC } from './cards/OGN-268'
import { OGN_270, OGN_270_SPEC } from './cards/OGN-270'
import { OGN_173, OGN_173_SPEC } from './cards/OGN-173'
import { OGS_011, OGS_011_SPEC } from './cards/OGS-011'
import { UNL_202, UNL_202_SPEC } from './cards/UNL-202'
import { SFD_129, SFD_129_SPEC } from './cards/SFD-129'
import { VEN_107, VEN_107_SPEC } from './cards/VEN-107'
import { UNL_054, UNL_054_SPEC } from './cards/UNL-054'
import { OGN_179, OGN_179_SPEC } from './cards/OGN-179'
import { SFD_136, makeSFD136Spec } from './cards/SFD-136'
import { OGN_033, OGN_033_SPEC } from './cards/OGN-033'             
import { OGN_037, makePhoenixTrigger } from './cards/OGN-037'             
import { VEN_194, VEN_194_SPECS } from './cards/VEN-194'                  
import { VEN_140, VEN_140_SPEC } from './cards/VEN-140'           
import { VEN_189, VEN_189_SPEC } from './cards/VEN-189'                 
import { UNL_106, makeUNL106Spec } from './cards/UNL-106'           
import { OGN_025, OGN_025_SPEC, makeFuryPlayTrigger } from './cards/OGN-025'             
import { OGN_115, OGN_115_SPEC, makeBrightFutureRelay } from './cards/OGN-115'             
import { OGN_071, OGN_071_SPEC } from './cards/OGN-071'              
import { UNL_201, UNL_201_SPECS, makeVoidPlundererTrigger } from './cards/UNL-201'              
import { UNL_195, makeIvernSwapTrigger } from './cards/UNL-195'           
import { UNL_055, makeVexTrigger } from './cards/UNL-055'            
import { SFD_195, makeBladeDancerTargetTrigger, makeBladeDancerConquerTrigger } from './cards/SFD-195'             
import { SFD_088, SFD_088_SPECS } from './cards/SFD-088'            
import { VEN_019, makeRenekton019Trigger } from './cards/VEN-019'            
import { VEN_092, VEN_092_SPEC, makeRenektonBruteTrigger } from './cards/VEN-092'                 
import { SFD_205, makeGrandDuelistTrigger } from './cards/SFD-205'             
import { SFD_180, makeFioraDuelTrigger } from './cards/SFD-180'                 
import { OGN_269, settSave, makeSettReadyTrigger } from './cards/OGN-269'           
import { VEN_155, VEN_155_SPEC, makeRageHeartTrigger } from './cards/VEN-155'             
import { UNL_187, makeEnforcerTrigger } from './cards/UNL-187'              
import { VEN_145, makeDesertReaperTrigger } from './cards/VEN-145'             
import { UNL_199, makeDeceiverTrigger } from './cards/UNL-199'             
import { OGN_247, OGN_247_SPEC } from './cards/OGN-247'             
import { OGS_014, OGS_014_SPEC, SFD_189, SFD_189_SPEC, VEN_141, VEN_141_SPEC } from './cards/restricted-gain'                
import { VEN_125, VEN_125_SPEC } from './cards/VEN-125'             
import { dragonLethal, UNL_118, makeDragonBreathTrigger } from './cards/UNL-118'                 
import { OGN_244, OGN_244_SPEC } from './cards/OGN-244'             
import { SFD_029, rekSaiHasteGrant } from './cards/SFD-029'                 
import { SFD_055 } from './cards/SFD-055'                
import { SFD_050, SFD_050_SPEC } from './cards/SFD-050'                
import { SFD_201, makeAlchemyBaronTrigger, alchemyBaronGoldBonus } from './cards/SFD-201'             
import { suspiciousGlassesRewrite } from './cards/VEN-137'                      
import { UNL_005, makeRavnaTrigger } from './cards/UNL-005'                      
import { UNL_017, UNL_017_SPEC } from './cards/UNL-017'                         
import { SFD_146, VEN_055 } from './cards/cost-modifiers'                       
import { SFD_177, makeAzirEmperorTrigger } from './cards/SFD-177'               
import { UNL_018, SFD_120, makeYetiBruiserTrigger, makeSivirAmbitionTrigger, makeHextechGauntletConquerTrigger } from './cards/excess-conquer'                                
import { gearHostPassives } from './cards/gear-host-passives'                       
import { OGN_053, OGN_053_SPEC } from './cards/OGN-053'              
import { UNL_139, UNL_139_SPEC } from './cards/UNL-139'             
import { VEN_114, makeKarloxEmpoweredTrigger } from './cards/VEN-114'             
import { UNL_181, makeJhinExileTrigger, makeJhinCollectTrigger } from './cards/UNL-181'            
import { UNL_147, makeBaronPlayTrigger, baronPassives } from './cards/UNL-147'             
import { UNL_200, UNL_200_SPEC } from './cards/UNL-200'             
import { UNL_103, UNL_103_SPEC } from './cards/UNL-103'             
import { UNL_020, UNL_020_SPEC } from './cards/UNL-020'             
import { OGN_262, OGN_262_SPEC } from './cards/OGN-262'             
import { SFD_206, makeSFD206Spec } from './cards/SFD-206'               
import { UNL_168, UNL_168_SPEC } from './cards/UNL-168'             
import { UNL_160, UNL_160_SPEC } from './cards/UNL-160'             
import { UNL_044, makeUNL044Spec } from './cards/UNL-044'             
import { SFD_154, SFD_154_SPEC } from './cards/SFD-154'            
import { OGN_266, OGN_266_SPEC } from './cards/OGN-266'             
import { VEN_122 } from './cards/empower-grants'             
import { VEN_156, VEN_156_SPEC } from './cards/VEN-156'              
import { VEN_012, VEN_012_SPEC } from './cards/VEN-012'              
import { UNL_080, makeHweiMoveTrigger } from './cards/UNL-080'          
import { OGN_256, OGN_256_SPEC } from './cards/OGN-256'             
import { VEN_134 } from './cards/empower-grants'           
import { VEN_148, VEN_148_SPEC } from './cards/enemy-move'              
import { SFD_111, SFD_111_SPEC } from './cards/SFD-111'             
import { UNL_082, UNL_082_KEYWORDS, makeLilliaMoveTrigger } from './cards/UNL-082'            
import { UNL_022, UNL_022_KEYWORDS, makeJhinMoveTrigger } from './cards/UNL-022'          
import { VEN_079, makeDamTriggers } from './cards/VEN-079'              
import { VEN_034, VEN_034_SPEC } from './cards/VEN-034'            
import { VEN_088 as VEN_088_JAYCE, makeJayceHammerTrigger } from './cards/VEN-088'               
import { UNL_198, UNL_198_SPEC } from './cards/UNL-198'             
import { VEN_084, wolfAmbessaShields } from './cards/VEN-084'                
import { VEN_181, gangplankRewrites } from './cards/VEN-181'            
import { setResolveRewriter } from '../src/loop/chainFepr'            
import { OGN_156, OGN_156_SPEC } from './cards/OGN-156'
import { VEN_085, VEN_085_SPEC } from './cards/VEN-085'             
import { OGN_203, OGN_203_SPEC, OGN_203_KEYWORDS } from './cards/OGN-203'
import { SFD_202, SFD_202_SPEC, SFD_202_KEYWORDS } from './cards/SFD-202'
import { UTILITY_SPELL_SPECS, UTILITY_SPELL_KEYWORDS } from './cards/utility-spells'
import { UNL_032, UNL_032_SPEC } from './cards/UNL-032'
import { SFD_194, SFD_194_SPEC } from './cards/SFD-194'
import { UNL_192_CARD, UNL_192_SPEC } from './cards/UNL-192'                          
import { SFD_197, SFD_197_SPEC } from './cards/SFD-197'
import { zonesByKind, type GameState } from '../src/state/gameState'
import { shangeCopies } from '../src/effects/shange'               
import { EGG_EMPOWER_SPEC, PORO_EMPOWER_SPEC, TAP_EMPOWER_SPEC, SUSPICIOUS_TOME_DRAW_SPEC, HEX_DISC_ROBOT_SPEC, EGG_REACTION_SPEC } from './cards/empower-nonresource'
import { OGN_017, OGN_017_SPEC, VEN_062, VEN_062_SPEC, UNL_049, UNL_049_SPEC, UNL_136, UNL_136_SPEC, ENTER_DORMANT_ALL } from './cards/enter-dormant-gear'
import { EMPOWER_ON_OTHER_DEFIDS, makeEmpowerOnOtherTrigger, MIRROR_LEGEND_SPEC, IRONBLOOD_LEGEND_SPEC } from './cards/empower-legends'
import { makeJinxLegendTrigger, makeAhriDreamerTriggers, makeNineTailsLegendTrigger, makeRengarLegendTrigger, makeViktorLeaderTrigger, OGN_119, OGN_246, WAR_HAWK_TOKEN } from './cards/reprint-batch'
import { OGN_090_SPEC, SFD_052_SPEC, OGN_184_SPEC, OGN_259_SPEC, OGN_265_SPEC, OGN_090, SFD_052, OGN_184 } from './cards/activated-batch'
import { UNL_030_SPEC, UNL_030 } from './cards/UNL-030'                         
import { SIGIL_SPECS, SIGIL_DOMAIN_OF, OGN_257_SPEC } from './cards/sigils'
import { RUNE_SPECS } from './cards/runeAbilities'                                
import { makeEnterReadyTable, boardWideEnterReady, tokenEntersReady, OGN_011, SFD_171, VEN_013, makeWarwickTrigger, makeSandhornTrigger, makeVayneTrigger, makeCorruptDrakeTrigger, UNL_001_SPEC, SFD_006, OGS_016, OGS_009, UNL_001, ARC_004, SFD_027, SFD_094, SFD_176, OGN_035, SFD_223, VEN_091, UNL_037, UNL_008, UNL_008_KEYWORDS } from './cards/enter-ready'
import { groupPassives, battlefieldPassives, makeRumbleTrigger, UNL_057, UNL_057_KEYWORDS, UNL_060, UNL_060_KEYWORDS, makeThroatHoldTrigger, UNL_191, UNL_231, OGS_013, OGN_015, OGN_100, SFD_065, UNL_077, SFD_181, SFD_089, OGN_074, UNL_041, SFD_071, OGN_294, OGN_297, UNL_111, SFD_014, VEN_129, SFD_110, UNL_171, UNL_171_KEYWORDS, UNL_090, UNL_090A, UNL_090_KEYWORDS } from './cards/group-passives'
import { UNL_213, UNL_213_GRANT_KEY, UNL_213_GRANTED_SPEC } from './cards/UNL-213'
import { SFD_208_GRANT_KEY, SFD_208_GRANTED_SPEC } from './cards/SFD-208'             
import { VEN_142_GRANT_KEY, VEN_142_GRANTED_SPEC } from './cards/VEN-142'             
import { UNL_101_SPEC } from './cards/UNL-101'             
import { SFD_107_SPEC } from './cards/SFD-107'           
import { UNL_228_SPEC } from './cards/UNL-228'                 
import { makeHeron044Triggers, VEN_044 } from './cards/VEN-044'             
import { SFD_198_SPEC } from './cards/SFD-198'             
import { dragonPerchBonus } from './cards/VEN-157'            
import { makeAva107Trigger, OGN_107, STANDBY_KEYWORD } from './cards/OGN-107'                
import { makeZed191Trigger, VEN_191_SPEC } from './cards/VEN-191'             
import { makeYuumi056Triggers, UNL_056 } from './cards/UNL-056'           
import { OGN_250_SPEC } from './cards/OGN-250'             
import { UNL_204_SPEC } from './cards/UNL-204'              
import { makeLilliaTokenTrigger, UNL_058 } from './cards/UNL-058'            
import { OGN_079 } from './cards/OGN-079'            
import { VEN_124, VEN_124_EMPOWER_SPEC } from './cards/VEN-124'              
import { OGN_249, makeThunderLegendTrigger } from './cards/OGN-249'                 
import { SFD_028, SFD_028_KEYWORDS, makeLucianAttackTrigger } from './cards/SFD-028'            
import { OGN_260, OGN_260_SPEC } from './cards/OGN-260'              
import { OGN_263_SPEC } from './cards/OGN-263'                    
import { OGN_151, OGN_151_KEYWORDS } from './cards/OGN-151'           
import { SFD_020, makeDravenWonBattleTrigger, makeDravenPumpTriggers } from './cards/SFD-020'            
import { VEN_006, makeOasisRaiderTrigger } from './cards/VEN-006'              
import { VEN_016, VEN_016_KEYWORDS, makeUmbralDragonTrigger } from './cards/VEN-016'             
import { SFD_024, SFD_024_KEYWORDS, makeRellAttackTrigger } from './cards/SFD-024'           
import { OGN_078, OGN_078_KEYWORDS, OGN_078_SPEC } from './cards/OGN-078'                
import { bloodAltarSave } from './cards/UNL-206'                                 
import { SFD_054 } from './cards/group-passives'
import { OGN_111, ARC_003 } from './cards/OGN-111'                    
import { makeEclipseVanguardTrigger, makeTravelingMerchantTrigger, makeNoxianDemolitionistTrigger, makeDawnGoddessStunTrigger, makeShadowDiscipleTrigger, OGN_059, OGN_185, VEN_080, OGN_261, VEN_095 } from './cards/longtail-4'
import { makeSonaTrigger, OGN_201_SPEC, OGN_105_SPEC, OGN_201, OGN_105, OGN_073 } from './cards/longtail-5'
import { OGN_123_SPEC, OGN_043_SPEC, OGN_123, OGN_043 } from './cards/longtail-6'
import { UNL_038, UNL_038_SPEC, VEN_105, VEN_105_SPEC, VEN_105_KEYWORDS, UNL_124, UNL_124_SPEC, OGN_258, OGN_258_SPEC } from './cards/enemy-move'              
import { VEN_193, VEN_193_SPEC, OGN_277 } from './cards/longtail-31'
import { OGN_296, OGS_001, OGN_032, OGN_032_SPEC, damageBoostShields } from './cards/damage-boost'
import { ATTACK_STUN_FACTORIES, ATTACK_STUN_KEYWORDS, ATTACK_STUN_UNIT_COST } from './cards/longtail-32'
import { OGN_177, VEN_025, makeOgn177FollowTrigger, clericShields } from './cards/longtail-33'
import { OGN_293, UNL_105, makeGrandPlazaTrigger, makeUnl105MoveTrigger } from './cards/longtail-34'
import { VEN_096, SFD_012, VEN_064, SFD_103 } from './cards/longtail-35'
import { UNL_104, SFD_130, makeUnl104PlayTrigger, makeSfd130MoveTrigger } from './cards/longtail-36'
import { SFD_204_SPEC, VEN_150_SPEC, OGS_002_SPEC, SFD_147_SPEC, VEN_131_SPEC,
  SFD_204, VEN_150, OGS_002, SFD_147, VEN_131 } from './cards/longtail-7'
import { OGN_209_SPEC, OGN_187_SPEC, OGN_237_SPEC, VEN_103_SPEC, makeAnnieLegendTrigger,
  OGN_209, OGN_187, OGN_237, VEN_103, OGS_017 } from './cards/longtail-8'                             
import { makeVisorTriggers, OGN_060 } from './cards/longtail-10'
import { OGN_284, OGN_290 } from './cards/longtail-11'
import { scoreBlockedAt, scoreBlockedAnywhere, scoreDrawInsteadAt, playBannedFor, SFD_209, VEN_029, SFD_216, SFD_015, OGN_018, SFD_060, SFD_060_KEYWORDS, VEN_053 } from './cards/longtail-12'            
import { makeScrapheapTriggers, makeLuxTrigger, makeLuxLegendTrigger, OGN_182, OGS_006, OGS_021 } from './cards/longtail-14'
import { playBonusFor as optionalPlayBonusFor, OGN_044, SFD_098, UNL_028, SFD_013, VEN_120, SFD_067, makeMasaPlayTrigger, makeDemolitionistPlayTrigger, makeFrostCubPlayTrigger, makeSeaMonkeyPlayTrigger, makePykePlayTrigger, makeLittleGuardianPlayTrigger } from './cards/longtail-15'
import type { PlayExtraCost } from '../src/session/interactiveGame'
import { PLAY_EXTRA_COSTS, OGN_208, SFD_044, OGN_002, UNL_178, UNL_170, makeUnl170AttackTrigger, makeNamiPlayTrigger, makeNamiHoldTrigger, UNL_052, makeWindMonkTrigger, VEN_101, makeBardTrigger, SFD_079, SFD_228 , allUnitsOnField101, makeAkshan109Trigger, SFD_109 } from './cards/play-extra-cost'
import { OGN_118, VEN_002, OGN_162, VEN_068, SFD_148, UNL_174, UNL_215, makeUnl174Trigger,
  makeOgn118Trigger, makeVen002Trigger,
  makeOgn162Trigger, makeVen068PlayTrigger, makeVen068GearTrigger,
  makeSfd148WinTrigger, makeSfd148DeathTrigger, makeVen063Trigger, VEN_063 } from './cards/once-per-turn'
import { UNL_015_SPEC, UNL_110_SPEC, makeApeElderTrigger, UNL_015, UNL_110, SFD_047 } from './cards/longtail-16'
import { winTargetBonusFor, OGN_276 } from './cards/longtail-17'
import { summonRuneCapFor, VEN_036 } from './cards/longtail-18'
import { extraPlayZonesFor, OGN_176, SFD_093, OGN_174, OGN_193, UNL_117, SFD_025, SFD_025A, SFD_025_KEYWORDS, OGN_161, OGN_161_KEYWORDS } from './cards/longtail-19'
import { wardenReadyShields } from './cards/OGN-070'        
import { tokenSpawnDoubler, UNL_086 } from './cards/UNL-086'           
import { VEN_022, makeTreasurePlayTrigger, treasureSkipsDraw, treasurePlaySources, treasureBanishShields } from './cards/VEN-022'             
import { OGN_150_KEYWORDS } from './cards/OGN-150'        
import { makeNocturneTrigger, OGN_194_KEYWORDS } from './cards/OGN-194'                    
import { OGN_231_KEYWORDS } from './cards/OGN-231'        
import { makeVen038MoveTrigger, VEN_031, VEN_031_SPEC, VEN_038 } from './cards/untargetable-cards'
import { makeApprenticeDrawTrigger, SFD_105, UNL_059, UNL_031, UNL_031_SPEC, UNL_016, UNL_040, UNL_047, UNL_075, UNL_094, UNL_098, UNL_113, UNL_151 } from './cards/level-self'
import { makeCaptainPumpTrigger, makeCloudDrakePlayTrigger, makeDianaVenSpellTrigger, VEN_121, VEN_183 } from './cards/longtail-20'
import { OGN_253_SPEC, OGN_267_SPEC, OGN_113_SPEC, makeSkyWandererSpec, OGN_113, VEN_060, UNL_093, UNL_093_SPEC } from './cards/activated-batch2'
import { OGN_068_SPEC, OGN_068, SFD_173, sorakaSave } from './cards/backline-heroes'                   
import { OGN_168_SPEC, SFD_043_SPEC, OGN_168, SFD_043 } from './cards/retreat-to-base-spells'                 
import { VEN_008_SPEC, VEN_008_EXTRA_COST, VEN_008 } from './cards/VEN-008'                        
import { OGN_048_SPEC, VEN_083_SPEC, OGN_048, VEN_083, SPELL_BONUS_COSTS } from './cards/spell-bonus-batch'                   
import { UNL_140_SPEC, UNL_140_EXTRA_COST, UNL_140 } from './cards/UNL-140'                              
import { SFD_114_SPEC, SFD_023_SPEC, SFD_114, SFD_023 } from './cards/echo-spells-498'                   
import { SFD_080_SPEC, SFD_122_SPEC, SFD_080, SFD_122 } from './cards/echo-spells-499'                   
import { UNL_173_SPEC, UNL_142_SPEC, UNL_173, UNL_142, SACRIFICE_COSTS_500 } from './cards/sacrifice-spells-500'                            
import { SFD_182_SPEC, SFD_182, UNL_122 } from './cards/extra-cost-501'                                 
import { UNL_166 } from './cards/extra-cost-502'                                         
import { UNL_007_SPEC, UNL_007, exileInsteadOfDestroy } from './cards/UNL-007'                     
import { makeBlackMarketTriggers, makeKatarinaTriggers, SFD_121, UNL_023 } from './cards/from-standby-506'                        
import { makeEvelynn141Trigger, UNL_141 } from './cards/UNL-141'                                      
import { makeNightblade139Trigger, SFD_139 } from './cards/SFD-139'                                       
import { makeMarauder003Trigger, UNL_003 } from './cards/UNL-003'                                   
import { makeTwistedFateTrigger, OGN_200 } from './cards/OGN-200'                              
import { makeYasuoTrigger, makeRavenbloomTrigger, makeDuneDrakeTrigger, makeArenaCrewTrigger, OGN_114_SPEC, OGN_114, OGN_076, OGN_103, OGN_131, OGN_091, OGN_065, makeRivenTrigger, VEN_041 } from './cards/longtail-1'
import { makeAniviaTrigger, makeRestlessCatTrigger, makePirateHavenTrigger, lissandraCostMods, OGN_229_SPEC, OGN_229, OGN_148, VEN_071, OGN_143, OGN_195 } from './cards/longtail-2'
import { makeNilahMoveTrigger, UNL_115, UNL_115_KEYWORDS } from './cards/UNL-115'                    
import { makeSkyhornTrigger, makeSeahuntTrigger, makeSpectralCentaurTrigger, makeFerociousJawfishTrigger, UNL_180_SPEC, UNL_180, SFD_048, SFD_137, UNL_068, UNL_129, SFD_159 } from './cards/longtail-3'                 
import { empoweredPassives } from './cards/empowered-passives'
import { VEN_043 } from './cards/VEN-043'
import { VEN_001, VEN_001_EMPOWER_SPEC } from './cards/VEN-001'
import { VEN_021, makeAkaliMoveTrigger } from './cards/VEN-021'
import { VEN_032, VEN_032_EMPOWER_SPEC } from './cards/VEN-032'
import { VEN_110, makeMelEmpowerSpec, makeMelEmpoweredTrigger } from './cards/VEN-110'
import { VEN_104, makeMatriarchEmpoweredTrigger } from './cards/VEN-104'
import { OGN_056, makeAdaptiveBotTrigger } from './cards/OGN-056'
import { OGN_152, makeMistTombTrigger } from './cards/OGN-152'
import { OGN_072, makeSunAltarTrigger } from './cards/OGN-072'
import { SFD_063, makeAlchemyBarrelTrigger } from './cards/SFD-063'
import { SFD_169, makeMemorialAltarTrigger } from './cards/SFD-169'
import { VEN_009, makeReaperAttackTrigger } from './cards/VEN-009'
import { UNL_065, makeIceVeilArcher065Trigger } from './cards/UNL-065'              
import { SFD_035, makeGladeWardenTrigger } from './cards/SFD-035'
import { VEN_048, OGN_051, OGN_132, OGN_234, OGN_082, VEN_026, OGN_092, SFD_158, OGN_136, OGN_130, VEN_020, UNL_027, OGN_188, OGN_165, SFD_061, OGN_164, OGN_230, VEN_188, UNL_137, SFD_128, UNL_123, UNL_064, makeCloudDrakeTrigger, makeSunShieldTrigger, makeFirstMateTrigger, makeDragonKnightTrigger, makeAzureGuardianTrigger, makeWarbandTrigger, makeSharkCannonTrigger, makeQuicksandTrigger, makeArenaRookieTrigger, makeSharpshooterTrigger, makeTwilightDancerTrigger, makeSkySingerTrigger, makeZaunBouncerTrigger, makeSpiritHoundTrigger, makeApprenticeEngineerTrigger, makeSpookyPoroTrigger, makeSuperFanTrigger, makeEverdarkLurkerTrigger, makeFateWeaverTrigger, makeOrnnTriggers, makeIvernTriggers, SFD_058, UNL_051, makeExpGainTrigger, makeExpPerUnitTrigger, makeMightyDrawTrigger, makeTotalMightDrawTrigger, makeMechReadyTrigger, makeTwoGearReadyTrigger, makeGrantRoamTrigger, makeStunOrKillTrigger, UNL_092, UNL_157, OGN_038, UNL_097, SFD_062, SFD_072, SFD_007, OGN_225, makeWorkshopOwnerTrigger, makeRoyalGuardTrigger, makeNaughtyHunterTrigger, makeLanternKrakenTrigger, makeTibbersTrigger, makeAnnieTrigger, makeStarHoundTrigger, OGN_211, SFD_157, UNL_033, UNL_132, OGS_018, OGS_010, UNL_167, makePoroShepherdTrigger, makeBarbaraTrigger, makeCarnivorousVineTrigger, makeRoyalRetainerTrigger, makeTreasureGolemTrigger, makeAlleyThiefTrigger, OGN_061, VEN_037, OGN_149, SFD_039, SFD_174, SFD_074, makeCaptainBaruTrigger, makeSpriteMotherTrigger, makeSpriteQueenTriggers, makeWildclawShamanTrigger, SFD_091, OGN_106, UNL_084, OGN_147, makeFaeDragonTriggers, SFD_101, makeEquilibriumMonkTrigger, makeAbyssalLeviathanTrigger, makeSummitGuardianTrigger, OGN_141, SFD_132, OGN_223 } from './cards/batch-play-triggers'
import { SFD_032, makeSwordRoninTrigger } from './cards/SFD-032'
import { VEN_050, VEN_050_EMPOWER_SPEC, VEN_070, VEN_093, VEN_047, makeApprenticeInsightTrigger, VEN_018, VEN_077, VEN_077_BUFF_SPEC, VEN_045, VEN_028, makeWitnessBattleEndTrigger, VEN_046, makeNasusConquerTrigger } from './cards/empower-grants'
import { HERO_TAG } from './heroTags'
import { CARD_FACTS, type CardFactsRow } from './cardFacts'
import { checkDeckLegality, type CardFacts, type DeckToCheck, type DeckViolation, type LegalityOptions } from '../src/game/deckLegality'
import { hasCardTag } from './cardTagQuery'
import { CARD_CATEGORIES, INDICATOR_DEFIDS } from './cardCategories'
import { CARD_DOMAINS } from './cardDomains'
import { CARD_NAMES } from './cardNames'
import type { CostMod } from '../src/game/costPipeline'
import { allCostMods, allAbilityCostMods, chompCostMods, EQUIP_ABILITY_COST_MODS, VEN_161 } from './cards/cost-modifiers'              
import { OGN_109, makeMundoStartTrigger } from './cards/OGN-109'             
import { UNL_026, UNL_026_SPEC } from './cards/UNL-026'            
import { VEN_163 } from './cards/VEN-163'
import { VEN_024, makeCuddlyPoroTrigger } from './cards/VEN-024'
import { UNL_189, UNL_189_SPEC } from './cards/UNL-189'
import { SFD_031, SFD_031_SPEC, VEN_051, VEN_051_SPEC } from './cards/token-spells'
import { OGN_117, makeViktorPioneerTriggers } from './cards/OGN-117'
import { OGN_212, OGN_212_SPEC, makeFutureForgePlayTrigger } from './cards/OGN-212'
import {
  SFD_046, SFD_046_SPEC, makePoroSnackPlayTrigger, OGN_098, OGN_098_SPEC, OGN_124, OGN_124_SPEC,
} from './cards/gear-batch-229'
import { SFD_117, SFD_117_SPEC, SFD_083, SFD_083_SPEC } from './cards/variable-amount-cost'
import { SFD_019, SFD_019_SPEC } from './cards/SFD-019'
import { OGN_186, OGN_186_SPEC, makeOwnerlessTreasureTriggers } from './cards/OGN-186'
import { OGN_227, makeSolariCrestTrigger } from './cards/OGN-227'
import { SFD_168, SFD_168_SPEC } from './cards/SFD-168'
import { UNL_013, UNL_013_SPEC } from './cards/UNL-013'
import { VEN_126, VEN_126_SPEC } from './cards/VEN-126'
import { OGN_023, OGN_023_SPEC, recallInsteadOfDestroy } from './cards/OGN-023'
import { allUnitsEnterReadyOf, nextUnitReadyOf } from '../src/effects/nextUnitReady'
import { delayedTriggerTriggers, OGN_221, OGN_221_SPEC, OGN_254, OGN_254_SPEC, SFD_166, SFD_166_SPEC, UNL_073, UNL_073_SPEC, UNL_095, UNL_095_SPEC, VEN_146, VEN_146_SPEC } from './cards/delayed-triggers'
import { OGS_020, OGS_020_SPEC, UNL_175, UNL_175_SPEC } from './cards/free-recall-spells'
import { OGN_021, OGN_021_SPEC } from './cards/OGN-021'
import { makeSpriteLanternPlayTrigger, UNL_078 } from './cards/UNL-078'
import { makeGutterMapTrigger, SFD_104, UNL_085 } from './cards/gear-batch-245'
import { chronoShiftSave, OGN_077 } from './cards/OGN-077'
import { makeSoulWheelTrigger, makeVanguardHelmTrigger, OGN_228, SFD_144 } from './cards/gear-batch-247'
import { makeSoulGuardPlayTrigger, OGN_063, UNL_161, UNL_161_SPEC } from './cards/gear-batch-248'
import { makeCrimsonRoseTrigger, makeMagicBeanTrigger, UNL_011, UNL_109, UNL_109_SPEC, makeJaxTrigger, SFD_119 } from './cards/gear-batch-249'
import { makeGooBerryPlayTrigger, makeGooBerryStunTrigger, UNL_133 } from './cards/UNL-133'
import { makeShadowCloneTrigger, makeZedPlayTrigger, SHADOW_CLONE_TOKEN, VEN_023, VEN_144, VEN_144_SPEC, VEN_169, ZED_EXTRA_COST } from './cards/shadow-clone'
import { makeZedConquerTrigger, VEN_112, VEN_112_SPEC } from './cards/VEN-112'
import { makeJujuAttackTrigger, UNL_046, UNL_046_KEYWORDS, UNL_046_SPEC, UNL_196 } from './cards/animal-tags'
import { UNL_045, UNL_045_SPEC } from './cards/UNL-045'
import { makeLostRelicTriggers, VEN_108 } from './cards/VEN-108'
import { makeAuroraTriggers, OGN_160 } from './cards/OGN-160'
import { SFD_200_SPEC, makeBlinkPlayTrigger, SFD_200 } from './cards/SFD-200'
import { OGN_122_SPEC } from './cards/OGN-122'
import { PUMP_SPELL_SPECS, PUMP_SPELL_KEYWORDS, DEFLECT_WAIVED_PUMP_DEFIDS } from './cards/pump-spells'
import { DAMAGE_SPELL_SPECS, DAMAGE_SPELL_KEYWORDS, makeMissile252Trigger, UNNEGATABLE_DAMAGE_DEFIDS } from './cards/damage-spells'
import { STUN_SPELL_SPECS, STUN_SPELL_KEYWORDS } from './cards/stun-spells'
import { EQUIPMENT_SPELL_SPECS, EQUIPMENT_SPELL_KEYWORDS } from './cards/equipment-target-spells'
import { DESTROY_SPELL_SPECS, DESTROY_SPELL_KEYWORDS } from './cards/destroy-spells'
import { OGN_170_SPEC } from './cards/OGN-170'
import { TOKEN_BATCH_SPECS, TOKEN_BATCH_KEYWORDS } from './cards/token-batch-spells'
import { SFD_193_SPECS } from './cards/SFD-193'                 
import {
  ENTER_TRIGGER_FACTORIES, ENTER_TRIGGER_KEYWORDS, ENTER_TRIGGER_UNIT_COST, returnToOwnerHand,
} from './cards/enter-triggers-batch'
import { WON_BATTLE_FACTORIES, WON_BATTLE_KEYWORDS, WON_BATTLE_UNIT_COST } from './cards/won-battle-triggers'
import { makeYasuoThirdMoveTrigger, moveImmunityShields, OGN_205, OGN_189 } from './cards/move-count-cards'
import { NEGATE_SPELLS, NEGATE_SPELL_KEYWORDS, makeNegateSpellSpec } from './cards/negate-spells'
import { TWO_TARGET_SPECS, TWO_TARGET_KEYWORDS } from './cards/two-target-spells'
import { conditionalSelfPassives, COND_SELF_UNIT_COST } from './cards/conditional-self-passives'
import { makeKennenPlayTrigger, makeKennenAttackTrigger } from './cards/VEN-135'
import { makeJayceGearTrigger, SFD_084, VEN_175 } from './cards/jayce-gear'
import { makePerchTrigger, UNL_130 } from './cards/UNL-130'
import { makeConArtistTrigger, SFD_081 } from './cards/SFD-081'
import { makeInspectorTrigger, UNL_164, UNL_164_EXTRA_COST } from './cards/UNL-164'
import { makeJannaTrigger, SFD_053 } from './cards/SFD-053'
import { makeFizzTrigger, SFD_140, setFizzSpecProvider , makeKaisa112Trigger, OGN_112, OGN_112A } from './cards/SFD-140'
import { makeGigalithTrigger, SFD_175, gigalithRevealedHook } from './cards/SFD-175'
import { makeMelDrawTrigger, VEN_069, melSpellGuard } from './cards/VEN-069'
import { makeYoneTrigger, SFD_116, SFD_233 } from './cards/SFD-116'
import { makeVolibearTrigger, OGN_158, OGN_158A } from './cards/OGN-158'
import { makeEmberMonkTriggers, OGN_167 } from './cards/OGN-167'
import { makeKennen113Triggers, VEN_113, VEN_113A } from './cards/VEN-113'
import { makeKhazixTrigger, UNL_119, UNL_119A, VEN_180 } from './cards/UNL-119'                    
import { makeVolibear041Trigger, OGN_041, OGN_041A } from './cards/OGN-041'                           
import { makeTreant029Trigger, UNL_029, UNL_029A } from './cards/UNL-029'
import { makeConquerReturn184Trigger, SFD_184, SFD_184_SPEC } from './cards/SFD-184'
import { makeYashira050Trigger, UNL_050 } from './cards/UNL-050'
import { UNL_089, UNL_089A } from './cards/UNL-089'
import { makePykeTrigger, UNL_145, UNL_145A } from './cards/UNL-145'
import { makeShen138Trigger, VEN_138, VEN_138A, makeTrevorTrigger, UNL_048 } from './cards/battlefield-timing'
import { makeThugTrigger, SFD_160 } from './cards/play-extra-cost'
import { setRevealedHook, type SpawnTokenEvent } from '../src/loop/events'
import { setSpellGuardProvider, setUnnegatableCardProvider } from '../src/keywords/negate'
import { setSpellEchoGrantProvider, computeCost } from '../src/game/costPipeline'
import { SPEND_XP_BUFF_SPECS, SPEND_XP_BUFF_KEYWORDS, SPEND_XP_BUFF_UNIT_COST } from './cards/spend-xp-buff-self'
import { UNL_126, UNL_126_ACTIVATED } from './cards/UNL-126'
import { UNL_184_SPEC, makeHuntPlayTrigger, UNL_184 } from './cards/UNL-184'
import { UNL_025, unyieldingPlaySources } from './cards/UNL-025'
import { VEN_066, VEN_066_SPEC, makeRiftPlayTrigger } from './cards/VEN-066'
import { VEN_106, VEN_106_SPEC, VEN_106_KEYWORDS } from './cards/VEN-106'
import { VEN_127, VEN_127_SPEC, VEN_127_KEYWORDS } from './cards/VEN-127'
import { VEN_136, VEN_136A, AMBESSA_FACTORIES, AMBESSA_KEYWORDS } from './cards/VEN-136'
import { UNL_107, UNL_107_SPEC } from './cards/UNL-107'
import { UNL_144, UNL_144_MOVE_SPEC } from './cards/UNL-144'
import { OGN_039, VEN_SP1, KAISA_FACTORIES, KAISA_KEYWORDS } from './cards/OGN-039'
import { OGN_155, OGN_155_KEYWORDS, makeQiyanaConquerTrigger } from './cards/OGN-155'
import { OGN_110, OGN_096, OGN_216, SFD_155, OGN_239, SFD_021, UNL_221, SFD_036, UNL_152, UNL_156, SFD_167, UNL_153, OGN_075, OGN_190, UNL_172 , VEN_128 } from './cards/last-rites-units'
import { OGN_178, UNL_067, SFD_165, UNL_062, lastRitesChoiceOf } from './cards/last-rites-choices'
import { OGN_236, lastRitesRepeats as karthusLastRitesRepeats } from './cards/karthus-repeats'
import { OGN_067, OGN_067_KEYWORDS, makeBlitzTriggers } from './cards/OGN-067'
import { VEN_065, VEN_173, SWAIN_FACTORIES, SWAIN_KEYWORD_ROWS } from './cards/VEN-065'
import { OGN_102, OGN_102_SPEC, OGN_102_KEYWORDS, makePortalReplayTrigger } from './cards/OGN-102'
import { UNL_138, UNL_138_SPEC, makeHitListTrigger } from './cards/UNL-138'
import { UNL_177, makeIvern177AllTriggers } from './cards/UNL-177'
import { VEN_132, makeFallenKittyTrigger } from './cards/VEN-132'
import { SFD_078, SFD_078_SPEC } from './cards/SFD-078'
import { VEN_133, VEN_133_SPEC, VEN_133_KEYWORDS, makeGlowStoneEndTrigger } from './cards/VEN-133'
import { UNL_186, UNL_186_SPEC, wellspringPlaySources, wellspringCostMods } from './cards/UNL-186'
import { deflectWaivedAt } from './cards/VEN-158'
import { VEN_004 } from './cards/VEN-004'
import { VEN_102, makeRavenbloom102Trigger } from './cards/VEN-102'
import { VEN_094, makeMaskMother094Trigger } from './cards/VEN-094'             
import { OGN_006, makeGrenade006Trigger } from './cards/OGN-006'              
import { SFD_075, makeProgressDayTrigger } from './cards/SFD-075'
import { SFD_100, makeYordleExplorer100Triggers } from './cards/SFD-100'
import { VEN_168, makeJinx168Trigger } from './cards/VEN-168'
import { VEN_179, UNL_120 } from './cards/VEN-179'
import { UNL_143, UNL_143A, makeKhazix143Triggers } from './cards/UNL-143'            
import { UNL_194, UNL_194_SPEC } from './cards/UNL-194'
import { VEN_067, makeStarBottle067Trigger } from './cards/VEN-067'
import {
  OGN_196, makeSoulEaterTrigger, OGN_226, makeGhostMotherTrigger, OGN_062, OGN_062_SPEC, makeReinforcePlayTrigger,
  SFD_188, SFD_188_SPEC, makeVoidRushPlayTrigger,
  OGN_198, OGN_198_SPEC,
  VEN_089, VEN_089_SPEC, makeHoundPlayTrigger, makeHoundEmpowerTrigger,
  SFD_243, makeBurrowerTrigger, makeBurrowerPlayTrigger,
  UNL_148, UNL_148_SPEC, makeSarcophagusTrigger,
  SFD_150, SFD_150_EQUIP_SPEC, makeLastRitesTriggers,
  SFD_026, makeRumble026Trigger,
} from './cards/play-from-deck'
import { makeHookPlayTrigger, OGN_242, OGN_242_SPEC } from './cards/OGN-242'
import { turnShieldEffects } from '../src/effects/turnShields'
import { GLORY_SPEC, makeAlbusTrigger, OPEN_ACTION_SPEC, PAIN_SPEC, SETT_ACTIVATED, SETT_FACTORIES, VEN_SP4 } from './cards/buff-consumers'
import type { ObjId, PlayerId } from '../src/state/ids'
import type { Trigger } from '../src/dsl/trigger'
import type { PlaySpec } from '../src/loop/playSpec'
import type { Cost } from '../src/state/runePool'
import type { ZoneKind } from '../src/state/zones'
import { canPayFromState } from '../src/game/economy'
import { makeVegasStunTrigger, UNL_150 } from './cards/UNL-150'
import { makeServitorPlayTrigger, UNL_081 } from './cards/UNL-081'
import { makeMilitaristTrigger, OGN_121 } from './cards/OGN-121'
import { makeScoutTrigger, OGN_197 } from './cards/OGN-197'
import { makePineconeTrigger, OGN_097 } from './cards/OGN-097'
import { makeWindWingTrigger, SFD_138 } from './cards/SFD-138'
import { galeTargets, OGN_169 } from './cards/OGN-169'
import { OGN_083 } from './cards/OGN-083'
import { makeMushroomBagTrigger, OGN_101 } from './cards/OGN-101'
import { satchelTargets, OGN_181 } from './cards/OGN-181'
import { palaceStartCheck, UNL_088 } from './cards/UNL-088'
import { battlefieldUnits, friendlyUnits, OGN_172, VEN_052, OGN_104, SFD_087 } from './cards/diana-reactions'
import { SFD_010, SFD_164, SFD_164_SPEC } from './cards/outside-hand-play'
import { spellTargetStillLegal } from './cards/targetStillLegal'
import { VEN_098 } from './cards/VEN-098'
import { VEN_164 } from './cards/VEN-164'
import { SFD_141 } from './cards/SFD-141'
import { VEN_SP5, makeEzrealSP5Trigger } from './cards/VEN-SP5'
import { SFD_082, SFD_082A, SFD_082B, SFD_082_SPEC, makeEzreal082Triggers } from './cards/SFD-082'          
import { OGN_274_KEYWORDS } from './cards/token-cards-535'                      
import { extraAttachmentGrants } from './cards/SFD-183'                            
import { VEN_090_SPEC } from './cards/VEN-090'               
import { SFD_149, makeEzreal149Trigger } from './cards/SFD-149'
import { BF_TRIGGER_FACTORIES, BF_NAMES } from './cards/battlefields-teemo'
import { DIANA_BF_TRIGGER_FACTORIES } from './cards/battlefields-diana'
import { EXTRA_BF_TRIGGER_FACTORIES } from './cards/battlefields-extra'
import { setIsSpellProvider, SFD_215 } from './cards/SFD-215'                
import { makeRekSaiTrigger, makeRekSaiPlayTrigger, SFD_170, setPlayFromDeckSpecProvider, setOptionalExtraProvider, type OptionalExtraInfo } from './cards/play-from-deck'
import { setSpawnTokenHasteProvider, spawnTokenHasteChoice, spawnTokenHasteResolve, hastePaidSoFar, hasteCostTimes } from './cards/spawn-token-haste'                                                                         
import { hasteKeyOf } from './cards/haste-key'                                                       
import { setSpawnTokenHasteHooks } from '../src/dsl/effectSpec'                                                                           
export const UNL_088_HASTE_KEY = hasteKeyOf('UNL-088:hawk')                                            
import { countScaledMightPassives, OGN_240, SFD_085, UNL_076, OGN_055, UNL_154, OGS_004, OGN_028, VEN_076, VEN_097, SFD_068, SFD_131 } from './cards/count-scaled-passives'
import { makeMindReaverTrigger, makeCharmingSpiritTrigger, makeThoroughInvestigatorTrigger, OGN_192, UNL_121, UNL_135 } from './cards/hand-reveal'
import { makeIllaoiTriggers, VEN_109, VEN_182 } from './cards/illaoi'
import { makeThunderCallerTrigger, makeRageDrakeTrigger, OGN_026, OGN_031 } from './cards/ban-play'
import { delayedReturnTriggers, makeAsheTrigger, UNL_169 } from './cards/delayed-return'
import { makeLucianTrigger, SFD_113, makeMisterRootTrigger, UNL_127, makeCorruptEnforcerMoveTrigger, makeCorruptEnforcerWinTrigger, SFD_123, makeKahinaTrigger, SFD_179, makeKatoTrigger, SFD_112, makeBadPoroTrigger, makeGoldPatronTrigger, makeShenTrigger, makeNoxianDrummerTrigger, makeSilkDancerTrigger, SFD_069, UNL_222, SFD_152, VEN_042, VEN_170, OGN_222, SFD_038, makeGloomBringerTrigger, makeSteadfastHammerTrigger, STEADFAST_HAMMER_ACTIVATED, ahriScoringBonus, tryndamereScoringBonus, OGN_034, UNL_193, UNL_232, UNL_203, UNL_237, OGN_066, makeAlluringSpriteTrigger, makeStrongSpriteTrigger, makeLoyalHoundTrigger, makeDemaciaMightTrigger, UNL_112, SFD_125, SFD_126, OGS_023, makeRiftHeraldMoveTrigger, UNL_179 } from './cards/battlefield-timing'
import { makeBladeDancerTrigger, makeInstructorTrigger, makeDianaSpellTrigger, makeGolemHoldTrigger, makeAnnouncerHoldTrigger, UNL_071, OGN_087, UNL_149, UNL_087, UNL_043 } from './cards/combat-keywords'
import { makeDianaDuelTrigger, attackingEnemies, UNL_079, UNL_134, UNL_197 } from './cards/diana-core'
import { UNL_146, syndraEchoGrants } from './cards/UNL-146'
import { UNL_182, UNL_182_SPEC } from './cards/UNL-182'
import { SFD_077, SFD_077_SPEC } from './cards/SFD-077'
import { SFD_049, makeApheliosTrigger } from './cards/SFD-049'
import { OGN_157, UDYR_SPEC } from './cards/OGN-157'
import { OGN_134, OGN_134_SPEC, OGN_138, OGN_138_SPEC } from './cards/rune-summon-spells'
import { OGN_029, OGN_029_SPEC, OGN_248, OGN_248_SPEC } from './cards/repeat-damage-spells'
import { SFD_041, VEN_033, makeSmithMoveTrigger, makePoroWardenMoveTrigger } from './cards/move-reveal-units'
import { makeTideTurnerTrigger, sameBfPairs, standbyCardsInDiscard, OGN_199, SFD_145, OGN_264, OGN_183, UNL_125 } from './cards/standby-tricks'
import { effectiveMight } from '../src/state/might'
import type { ActivatedSpec } from '../src/loop/playSpec'
import { spellLegalTargets } from '../src/loop/playSpec'                                                    
import { zonesByKind as zonesOf } from '../src/state/gameState'
import { resolveImplDefId, variantSiblings } from './variantAlias'                                          
import type { ReplacementShield } from '../src/effects/replacementRegistry'
import { GEAR_CARDS } from './gearCards'
import { VANILLA_UNITS } from './vanillaUnits'
import { makeHuntTriggers } from '../src/keywords/hunt'
import { makeForesightTriggers } from '../src/keywords/foresight'
import { makeForgeTriggers } from '../src/keywords/forge'
import { ARMAMENT_TAG } from '../src/keywords/equip'
import { liveKeywordSourcesFor, stateWithPassives } from '../src/effects/liveKeywords'
import { makeNimbleTriggers } from '../src/keywords/nimble'
import { mirrorScoringTriggers } from '../src/effects/scoringMirror'
import { conquerMirrorUnits } from './cards/battlefields-extra'
import { attachedTo } from '../src/state/attach'
import { makeBoneshiverTrigger, makeDoransRingTrigger, makeExtractionTrigger, makeAtlasTrigger, makeVanguardEyeTrigger, makePendulumBladeTrigger, makeRecurveBowTriggers, makeHearthCloakTriggers, makeThornmailTrigger, trinityBonus, guardianAngelSave, makeBlightedAxeTrigger, SHEPHERD_EQUIP_SPEC, BLACK_CLEAVER_EQUIP_SPEC, makeShepherdPlayTrigger, makeRequiemPlayTrigger, gearLastRitesEffect,
  Z_DRIVE_RECALL_SPEC,
} from './cards/gear-triggers'
import { equipActivationSpecs } from '../src/loop/equipActivation'
import { empowerActivationSpecs } from '../src/loop/empowerActivation'
import { equipCostOptions } from '../src/keywords/equip'
import type { StaticEffect } from '../src/effects/continuousView'
import type { GameObject } from '../src/state/object'

                                             
export type TriggerFactory = (selfOid: ObjId, controller: PlayerId) => readonly Trigger[]

                                                             
export const TRIGGER_FACTORIES: Readonly<Record<string, TriggerFactory>> = {
                                                   
  ...Object.fromEntries(EMPOWER_ON_OTHER_DEFIDS.map((d) => [
    d, (oid: ObjId, ctrl: PlayerId) => [makeEmpowerOnOtherTrigger(oid, ctrl, d)],
  ])),
  'VEN-047': (oid, ctrl) => [makeApprenticeInsightTrigger(oid, ctrl)], // 见习法师:变为已强化时洞察2
  'VEN-028': (oid, ctrl) => [makeWitnessBattleEndTrigger(oid, ctrl)], // 悲悯见证者:参与的战斗结束时强化我(§466.7)
  'VEN-024': (oid, ctrl) => [makeCuddlyPoroTrigger(oid, ctrl)], // 贴贴魄罗:参与的战斗结束时若本回合未受伤则抽一张(第222轮)
  'OGN-117': (oid, ctrl) => [...makeViktorPioneerTriggers(oid, ctrl)], // 维克托·创见先驱:对手回合内打牌出随从(第227轮)
  'OGN-212': (oid, ctrl) => [makeFutureForgePlayTrigger(oid, ctrl)], // 未来熔炉:打出时在基地打出1[M]随从(第228轮)
  'VEN-022': (oid, ctrl) => [makeTreasurePlayTrigger(oid, ctrl)], // ★738 无尽秘藏:打出时放逐手牌+废牌堆+燃烧7
  'OGN-194': (oid, ctrl) => [makeNocturneTrigger(oid, ctrl, 'revealed'), makeNocturneTrigger(oid, ctrl, 'viewed')], // ★746/747 魔腾:「查看或展示」双实例
  'SFD-046': (oid, ctrl) => [makePoroSnackPlayTrigger(oid, ctrl)], // 魄罗佳肴:打出时抽一张(第229轮)
  'OGN-186': (oid, ctrl) => [...makeOwnerlessTreasureTriggers(oid, ctrl)], // 无主宝藏:离场时抽1+召出一枚休眠符文(第232轮)
  'UNL-078': (oid, ctrl) => [makeSpriteLanternPlayTrigger(oid, ctrl)], // 精灵提灯:打出时出一枚活跃的3[M]精灵(第244轮)
  'UNL-085': (oid, ctrl) => [makeGutterMapTrigger(oid, ctrl)], // 地沟区地图:对手得分时抽一张(第245轮)
  'OGN-228': (oid, ctrl) => [makeVanguardHelmTrigger(oid, ctrl)], // 先锋之盔(第247轮)
  'SFD-144': (oid, ctrl) => [makeSoulWheelTrigger(oid, ctrl)], // 灵魂之轮(第247轮)
  'OGN-063': (oid, ctrl) => [makeSoulGuardPlayTrigger(oid, ctrl)], // 奥义!魂佑:打出时给增益(第248轮)
  'UNL-011': (oid, ctrl) => [makeMagicBeanTrigger(oid, ctrl)], // 魔法鲜豆(第249轮)
  'UNL-109': (oid, ctrl) => [makeCrimsonRoseTrigger(oid, ctrl)], // 猩红玫瑰句1(第249轮)
  'UNL-133': (oid, ctrl) => [makeGooBerryPlayTrigger(oid, ctrl), makeGooBerryStunTrigger(oid, ctrl)], // 喷射球果两句(第250轮)
                                                              
                                                              
  [SHADOW_CLONE_TOKEN.defId]: (oid, ctrl) => [makeShadowCloneTrigger(oid, ctrl)], // 影分身(第251轮)
  'VEN-112': (oid, ctrl) => [makeZedConquerTrigger(oid, ctrl)], // 劫:征服时出一只影分身(第253轮)
  'UNL-196': (oid, ctrl) => [makeJujuAttackTrigger(oid, ctrl)], // 小菊!句3:进攻且集齐四标签则眩晕此处敌方单位(第255轮)
  'VEN-108': (oid, ctrl) => makeLostRelicTriggers(oid, ctrl), // 遗落圣物:打出/开始阶段燃烧1,烧到单位则给加成(第257轮)
  'OGN-160': (oid, ctrl) => makeAuroraTriggers(oid, ctrl), // 闪耀极光:回合结束展示到单位,放逐并无视费用打出(第258轮)
  'SFD-200': (oid, ctrl) => [makeBlinkPlayTrigger(oid, ctrl)], // 奥术跃迁:被它放逐的单位落地后,其拥有者无视费用打出(第262轮)
  'UNL-184': (oid, ctrl) => [makeHuntPlayTrigger(oid, ctrl)], // 狩猎律动:被它放逐的单位落地后,其拥有者打到玩家选的那处战场(第265轮)
  'VEN-066': (oid, ctrl) => [makeRiftPlayTrigger(oid, ctrl)], // 时空裂隙:被它放逐的单位落地后,其拥有者打回【原位】(第279轮)
  'OGN-102': (oid, ctrl) => [makePortalReplayTrigger(oid, ctrl)], // ★第380轮 传送门大营救:打回【拥有者基地】
  'UNL-060': (oid, ctrl) => [makeThroatHoldTrigger(oid, ctrl)], // ★第382轮 卑鄙之喉:据守抽1
  ...AMBESSA_FACTORIES, // ★第387轮 安蓓萨(VEN-136 / VEN-136a):[已强化>] 进攻时摧毁此处战力低于我的敌方单位
  ...KAISA_FACTORIES, // ★第390轮 卡莎(OGN-039 / VEN-SP1):当我征服一处战场时抽一张牌
  'OGN-155': (oid, ctrl) => [makeQiyanaConquerTrigger(oid, ctrl)], // ★第392轮 奇亚娜:征服时二选一(抽一张牌 / 召一枚休眠符文)
  'OGN-067': (oid, ctrl) => makeBlitzTriggers(oid, ctrl), // ★第393轮 布里茨:打出到战场时拉一名敌方单位过来 / 据守时回所属手牌
  ...SWAIN_FACTORIES, // ★第395轮 斯维因(VEN-065 / VEN-173 同一张卡):征服时若本回合打出过单位+装备+法术则得1分
  'UNL-138': (oid, ctrl) => [makeHitListTrigger(oid, ctrl)], // 夺命名单:打出时宣告一种属性标签(第280轮)
  'UNL-177': (oid, ctrl) => makeIvern177AllTriggers(oid, ctrl), // 艾翁(第二个,≠UNL-051):获得标签 + 征服/据守集齐四种得1分(第281轮)
  'VEN-132': (oid, ctrl) => [makeFallenKittyTrigger(oid, ctrl)], // 坠落猫咪:打出时宣告一个法术(第282轮)
  'VEN-133': (oid, ctrl) => [makeGlowStoneEndTrigger(oid, ctrl)], // 发光石:我方回合结束时自毁+我方全体5伤(第284轮)
  'OGN-062': (oid, ctrl) => [makeReinforcePlayTrigger(oid, ctrl)], // 增援:被它放逐的单位落地后打出(减5法力,第271轮)
  'SFD-188': (oid, ctrl) => [makeVoidRushPlayTrigger(oid, ctrl)], // 虚空猛冲:被它放逐的常驻牌落地后打出(减2法力,第272轮)
  'OGN-025': (oid, ctrl) => [makeFuryPlayTrigger(oid, ctrl)], // ★642 暴怒冲动:被它放逐的对手牌全免打出(freeAll)
  'OGN-115': (oid, ctrl) => [makeBrightFutureRelay(oid, ctrl)], // ★646 光明未来:各人放逐的牌各自半免打出(freeMana+playerIsOwner)
  'UNL-201': (oid, ctrl) => [makeVoidPlundererTrigger(oid, ctrl)], // ★650 虚空掠夺者:你赢得战斗⇒获1经验
  'UNL-055': (oid, ctrl) => [makeVexTrigger(oid, ctrl)], // ★651 薇古丝:你眩晕战场敌方单位时可选择把我移过去
  'SFD-195': (oid, ctrl) => [makeBladeDancerTargetTrigger(oid, ctrl), makeBladeDancerConquerTrigger(oid, ctrl)], // ★655 刀锋舞者:选友方为目标可休眠+付A让其活跃/征服可付1让我活跃
  'VEN-019': (oid, ctrl) => [makeRenekton019Trigger(oid, ctrl)], // ★652 雷克顿:进攻时若符文≤4对此处敌方各2点
  'VEN-092': (oid, ctrl) => [makeRenektonBruteTrigger(oid, ctrl)], // ★713 蛮荒巨兽:战力变为10+⇒强化我(本表折叠,092a/177 自动落)
  'SFD-205': (oid, ctrl) => [makeGrandDuelistTrigger(oid, ctrl)], // ★714 无双剑姬:你的单位变为强力⇒可选休眠召休眠符文(折叠,251 自动落)
  'SFD-180': (oid, ctrl) => [makeFioraDuelTrigger(oid, ctrl)], // ★715 菲奥娜:你控制的单位变为强力⇒可付{黄色}让其变活跃(折叠,180a 自动落)
  'OGN-269': (oid, ctrl) => [makeSettReadyTrigger(oid, ctrl)], // ★716 腕豪:你征服⇒我变活跃(折叠,310/310* 自动落)
  'VEN-155': (oid, ctrl) => [makeRageHeartTrigger(oid, ctrl, 'playUnit'), makeRageHeartTrigger(oid, ctrl, 'playSpell')], // ★720 狂暴之心:手牌以外打出⇒强化我(折叠,197 自动落)
  'UNL-187': (oid, ctrl) => [makeEnforcerTrigger(oid, ctrl)], // ★721 皮城执法官:你征服+过量≥3⇒可选休眠让一名单位变活跃(折叠,229/229* 自动落)
  'VEN-145': (oid, ctrl) => [makeDesertReaperTrigger(oid, ctrl, 'playUnit'), makeDesertReaperTrigger(oid, ctrl, 'activateAbility')], // ★722 沙漠死神:打出印刷费≥7单位/装备/基础费≥7技能⇒可选休眠让最多两枚符文活跃
  'UNL-118': (oid, ctrl) => [makeDragonBreathTrigger(oid, ctrl)], // ★729 远古巨龙:打出时每位置选最多一名敌方各1点
  'UNL-118a': (oid, ctrl) => [makeDragonBreathTrigger(oid, ctrl)], // ★729 同上(⚠️无组双登 ㊼ ★710)
  'VEN-192': (oid, ctrl) => [makeDesertReaperTrigger(oid, ctrl, 'playUnit'), makeDesertReaperTrigger(oid, ctrl, 'activateAbility')], // ★722 同上(⚠️variantAliases 无组 ⇒ 双登 ㊼ ★710 纳什)
  'UNL-199': (oid, ctrl) => [makeDeceiverTrigger(oid, ctrl, 'conquer'), makeDeceiverTrigger(oid, ctrl, 'hold')], // ★723 诡术妖姬:征服/据守⇒可选弃牌+休眠打映像+内嵌复制(折叠,235/235* 自动落)
  'SFD-201': (oid, ctrl) => [makeAlchemyBaronTrigger(oid, ctrl)], // ★683 炼金男爵:据守可休眠自己换休眠金币(249 经 variantAliases 折叠)
  'UNL-005': (oid, ctrl) => [makeRavnaTrigger(oid, ctrl)], // ★685 雷芙纳:你打出实付不低于4法力的法术时我变为活跃
  'SFD-177': (oid, ctrl) => [makeAzirEmperorTrigger(oid, ctrl)], // ★690 帝君:进攻时可移任意数量指示物单位到结算时我所在战场(177a 折叠)
  'UNL-018': (oid, ctrl) => [makeYetiBruiserTrigger(oid, ctrl)], // ★691 雪人斗士:我征服+单次过量≥3 ⇒ 两个休眠金币
                                                                                   
                                                                        
                              
  'UNL-188': (oid, ctrl) => [makeHextechGauntletConquerTrigger(oid, ctrl)], // 穿戴者征服+单次过量≥3 ⇒ 抽一张
  'SFD-120': (oid, ctrl) => [makeSivirAmbitionTrigger(oid, ctrl)], // ★691 希维尔远大野心:我进攻征服+过量≥5 ⇒ 可选等额伤害(120a 折叠)
                                                       
  'VEN-089': (oid, ctrl) => [makeHoundPlayTrigger(oid, ctrl), makeHoundEmpowerTrigger(oid, ctrl)],
                                       
  'SFD-243': (oid, ctrl) => [makeBurrowerTrigger(oid, ctrl), makeBurrowerPlayTrigger(oid, ctrl)],
  'UNL-148': (oid, ctrl) => [makeSarcophagusTrigger(oid, ctrl)], // 受诅咒的石棺:打出时放逐废牌堆所有单位(第276轮)
  'SFD-150': (oid, ctrl) => [...makeLastRitesTriggers(oid, ctrl)], // 临终仪式:征服/据守时可从废牌堆打出一名单位(两条触发,第277轮)
                                                          
                                                              
                                                                             
  'SFD-026': (oid, ctrl) => [makeRumble026Trigger(oid, ctrl, defHasTag)],
  'SFD-109': (oid, ctrl) => [makeAkshan109Trigger(oid, ctrl, isArmamentDef)],
  'VEN-120': (oid, ctrl) => [makeMasaPlayTrigger(oid, ctrl)],
  'SFD-013': (oid, ctrl) => [makeDemolitionistPlayTrigger(oid, ctrl)], // ★1602 缺陷 212 修 2/6:爆破队学员的付费伤害改走打出触发入链
  'SFD-067': (oid, ctrl) => [makeFrostCubPlayTrigger(oid, ctrl)],
  'SFD-098': (oid, ctrl) => [makeSeaMonkeyPlayTrigger(oid, ctrl)], // ★1603 缺陷 212 修 4/6:船猿的付费增益改走打出触发入链
  'OGN-044': (oid, ctrl) => [makeLittleGuardianPlayTrigger(oid, ctrl)], // ★1604 缺陷 212 修 6/7:小小守护者的付费抽牌改走打出触发入链(表里最后一张留 events 的)
  'VEN-023': (oid, ctrl) => [makeZedPlayTrigger(oid, ctrl)], // ★1605 缺陷 212 修 7/7:劫的付费影分身改走打出触发入链(落点 + 指示物急速链上问;VEN-023a / VEN-169 靠 resolveImplDefId 回落)
  'UNL-028': (oid, ctrl) => [makePykePlayTrigger(oid, ctrl)], // ★1603 缺陷 212 修 5/6:派克的付费「变为活跃 + S+2」改走打出触发入链(结算期) // ★1602 缺陷 212 修 3/6:霜衣幼崽的付费 S-2 改走打出触发入链 // ★1601 缺陷 212:玛萨的付费收益改走打出触发入链(目标链上问) // ★第460轮 阿克尚:付了额外费可夺敌装备直到我离场(注入 isArmamentDef)
  'OGN-242': (oid, ctrl) => [makeHookPlayTrigger(oid, ctrl)], // 海兽钓钩句②:被它放逐的那张无视费用打出(第259轮)
  'OGN-227': (oid, ctrl) => [makeSolariCrestTrigger(oid, ctrl)], // 烈阳徽记:我方进攻打成平局→召回双方所有单位(第234轮)
  'OGN-152': (oid, ctrl) => [makeMistTombTrigger(oid, ctrl)], // 雾临剑冢:给友方上增益时可付{橙色}+休眠自己让该单位活跃
  'OGN-072': (oid, ctrl) => [makeSunAltarTrigger(oid, ctrl)], // 烈阳圣坛:摧毁被眩晕的敌方单位时可休眠自己抽一张
  'SFD-063': (oid, ctrl) => [makeAlchemyBarrelTrigger(oid, ctrl)], // 炼金科技桶:对手回合内你打出法术时可休眠自己换一个休眠金币
  'SFD-169': (oid, ctrl) => [makeMemorialAltarTrigger(oid, ctrl)], // 追忆祭坛:友方单位被摧毁时可休眠自己抽一张再放回一张
  'UNL-065': (oid, ctrl) => [makeIceVeilArcher065Trigger(oid, ctrl)], // ★544 冰谷弓箭手:进攻时可付{1}让此处一名单位本回合[S]-1
  'VEN-009': (oid, ctrl) => [makeReaperAttackTrigger(oid, ctrl)], // 巴凯收割者:进攻时可付{红色}换本回合[强攻2]
  'SFD-035': (oid, ctrl) => [makeGladeWardenTrigger(oid, ctrl)], // 幽径守卫:据守时可让废牌堆里的单位/装备回手
  'VEN-048': (oid, ctrl) => [makeCloudDrakeTrigger(oid, ctrl)], // 云端亚龙:打出时抽一张
  'OGN-051': (oid, ctrl) => [makeSunShieldTrigger(oid, ctrl)], // 烈阳盾卫:打出时眩晕一名单位(不限敌我)
  'OGN-132': (oid, ctrl) => [makeFirstMateTrigger(oid, ctrl)], // 大副:打出时让另一名单位变为活跃
  'OGN-234': (oid, ctrl) => [makeDragonKnightTrigger(oid, ctrl)], // 龙骑兵:打出时摧毁一名敌方单位
  'OGN-082': (oid, ctrl) => [makeAzureGuardianTrigger(oid, ctrl)], // 苍炎守护者
  'VEN-026': (oid, ctrl) => [makeWarbandTrigger(oid, ctrl)], // 战地乐团
  'OGN-092': (oid, ctrl) => [makeSharkCannonTrigger(oid, ctrl)], // 怒海大鲨炮
  'SFD-158': (oid, ctrl) => [makeQuicksandTrigger(oid, ctrl)], // 流沙术士
  'OGN-136': (oid, ctrl) => [makeArenaRookieTrigger(oid, ctrl)], // 竞技场新人
  'OGN-130': (oid, ctrl) => [makeSharpshooterTrigger(oid, ctrl)], // 神射海盗
  'VEN-020': (oid, ctrl) => [makeTwilightDancerTrigger(oid, ctrl)], // 暮光狂舞者
  'UNL-027': (oid, ctrl) => [makeSkySingerTrigger(oid, ctrl)], // 天声玄龙
  'OGN-188': (oid, ctrl) => [makeZaunBouncerTrigger(oid, ctrl)], // 祖安保镖
  'OGN-165': (oid, ctrl) => [makeSpiritHoundTrigger(oid, ctrl)], // 牧灵犬
  'SFD-061': (oid, ctrl) => [makeApprenticeEngineerTrigger(oid, ctrl)], // 见习工程师
  'UNL-137': (oid, ctrl) => [makeSpookyPoroTrigger(oid, ctrl)], // 悚悚魄罗
  'SFD-128': (oid, ctrl) => [makeSuperFanTrigger(oid, ctrl)], // 狂热粉丝
  'SFD-049': (oid, ctrl) => [makeApheliosTrigger(oid, ctrl)], // 厄斐琉斯(第487轮):贴附武装 → 三选一(本回合未选过)
  'SFD-041': (oid, ctrl) => [makeSmithMoveTrigger(oid, ctrl)], // 学徒铁匠(第491轮):移动展示顶牌,装备则抽否则回收
  'VEN-033': (oid, ctrl) => [makePoroWardenMoveTrigger(oid, ctrl)], // 帕卡监护者(第491轮):单位则抽,否则进废牌堆+我S+2
  'UNL-123': (oid, ctrl) => [makeEverdarkLurkerTrigger(oid, ctrl)], // 永黯潜伏者
  'VEN-SP5': (oid, ctrl) => [makeEzrealSP5Trigger(oid, ctrl)], // 伊泽瑞尔·奥法逸才(第220轮)
  'SFD-149': (oid, ctrl) => [makeEzreal149Trigger(oid, ctrl)], // 伊泽瑞尔·奥法逸才(SFD 版,第220轮)
  'UNL-064': (oid, ctrl) => [makeFateWeaverTrigger(oid, ctrl)], // 命运编织者
                                            
  'SFD-058': (oid, ctrl) => makeOrnnTriggers(oid, ctrl), // 奥恩
  'UNL-051': (oid, ctrl) => makeIvernTriggers(oid, ctrl), // 艾翁
                                                       
                                                  
  'SFD-170': (oid, ctrl) => [makeRekSaiTrigger(oid, ctrl), makeRekSaiPlayTrigger(oid, ctrl)],
                                                 
  'UNL-092': (oid, ctrl) => [makeExpGainTrigger(oid, ctrl)], // 德玛西亚使节
  'UNL-157': (oid, ctrl) => [makeExpPerUnitTrigger(oid, ctrl)], // 严厉军士
  'OGN-038': (oid, ctrl) => [makeMightyDrawTrigger(oid, ctrl)], // 邪焰巨龙
  'UNL-097': (oid, ctrl) => [makeTotalMightDrawTrigger(oid, ctrl)], // 均衡门徒
  'SFD-062': (oid, ctrl) => [makeMechReadyTrigger(oid, ctrl)], // 泡泡机
  'SFD-072': (oid, ctrl) => [makeTwoGearReadyTrigger(oid, ctrl)], // 滑板高手
  'SFD-007': (oid, ctrl) => [makeGrantRoamTrigger(oid, ctrl)], // 晶能阻断器
  'OGN-225': (oid, ctrl) => [makeStunOrKillTrigger(oid, ctrl)], // 烈阳首领
                                          
  'OGN-211': (oid, ctrl) => [makeWorkshopOwnerTrigger(oid, ctrl)], // 忠实的工坊主
  'SFD-157': (oid, ctrl) => [makeRoyalGuardTrigger(oid, ctrl)], // 皇家守卫
  'UNL-033': (oid, ctrl) => [makeNaughtyHunterTrigger(oid, ctrl)], // 调皮猎手
  'UNL-132': (oid, ctrl) => [makeLanternKrakenTrigger(oid, ctrl)], // 提灯海煞
  'OGS-018': (oid, ctrl) => [makeTibbersTrigger(oid, ctrl)], // 提伯斯
                    
  'OGN-182': (oid, ctrl) => [...makeScrapheapTriggers(oid, ctrl)], // 废料堆:打出/弃置/摧毁各抽一张
  'OGS-006': (oid, ctrl) => [makeLuxTrigger(oid, ctrl)],           // 拉克丝:你打出≥5费法术→我本回合+3
  'OGS-021': (oid, ctrl) => [makeLuxLegendTrigger(oid, ctrl)],     // 光辉女郎(传奇):同条件→抽一张
  'OGS-010': (oid, ctrl) => [makeAnnieTrigger(oid, ctrl)], // 安妮
  'UNL-167': (oid, ctrl) => [makeStarHoundTrigger(oid, ctrl)], // 星獒
                                           
  'OGN-061': (oid, ctrl) => [makePoroShepherdTrigger(oid, ctrl)], // 魄罗牧者
  'VEN-037': (oid, ctrl) => [makeBarbaraTrigger(oid, ctrl)], // 盗墓贼芭芭拉
  'OGN-149': (oid, ctrl) => [makeCarnivorousVineTrigger(oid, ctrl)], // 食肉蛇藤
  'SFD-039': (oid, ctrl) => [makeRoyalRetainerTrigger(oid, ctrl)], // 皇家随从
  'SFD-174': (oid, ctrl) => [makeTreasureGolemTrigger(oid, ctrl)], // 宝藏魔像
  'SFD-074': (oid, ctrl) => [makeAlleyThiefTrigger(oid, ctrl)], // 暗巷神偷
                                          
  'SFD-091': (oid, ctrl) => [makeCaptainBaruTrigger(oid, ctrl)], // 芭茹队长
  'OGN-106': (oid, ctrl) => [makeSpriteMotherTrigger(oid, ctrl)], // 精灵之母
  'UNL-084': (oid, ctrl) => makeSpriteQueenTriggers(oid, ctrl), // 精灵女王
  'OGN-147': (oid, ctrl) => [makeWildclawShamanTrigger(oid, ctrl)], // 野爪萨满
                                         
  'UNL-179': (oid, ctrl) => [makeRiftHeraldMoveTrigger(oid, ctrl)], // ★第408轮 峡谷先锋句①(移动到战场查顶3)
  'SFD-069': (oid, ctrl) => [makeBadPoroTrigger(oid, ctrl)], // 坏坏魄罗
  'UNL-222': (oid, ctrl) => [makeBadPoroTrigger(oid, ctrl)], // 坏坏魄罗(再版)
  'SFD-152': (oid, ctrl) => [makeGoldPatronTrigger(oid, ctrl)], // 显赫金主
  'VEN-042': (oid, ctrl) => [makeShenTrigger(oid, ctrl)], // 慎
  'VEN-170': (oid, ctrl) => [makeShenTrigger(oid, ctrl)], // 慎(再版)
  'OGN-222': (oid, ctrl) => [makeNoxianDrummerTrigger(oid, ctrl)], // 诺克萨斯鼓手
  'SFD-038': (oid, ctrl) => [makeSilkDancerTrigger(oid, ctrl)], // 绸舞士
                                                                    
  'UNL-193': (oid, ctrl) => [makeGloomBringerTrigger(oid, ctrl)], // 愁云使者
  'UNL-232': (oid, ctrl) => [makeGloomBringerTrigger(oid, ctrl)], // 愁云使者(再版)
                                                              
  'OGN-076': (oid, ctrl) => [makeYasuoTrigger(oid, ctrl)],      // 亚索:进攻时造成等同我战力的伤害
  'VEN-041': (oid, ctrl) => [makeRivenTrigger(oid, ctrl)],      // ★第416轮 锐雯:进攻时 2×我身上武装数 的伤害
  'SFD-113': (oid, ctrl) => [makeLucianTrigger(oid, ctrl)],     // ★第416轮 卢锡安:每回合首次征服⇒我变活跃
  'UNL-127': (oid, ctrl) => [makeMisterRootTrigger(oid, ctrl)], // ★第417轮 树根先生:移动至战场⇒获得2经验
                                           
  'SFD-123': (oid, ctrl) => [makeCorruptEnforcerMoveTrigger(oid, ctrl), makeCorruptEnforcerWinTrigger(oid, ctrl)],
  'SFD-179': (oid, ctrl) => [makeKahinaTrigger(oid, ctrl)],      // ★第419轮 卡银娜:移动⇒此处打出三名随从
  'SFD-112': (oid, ctrl) => [makeKatoTrigger(oid, ctrl)],        // ★第419轮 巨腕加藤:移动⇒抄关键词+战力加成
                                                                         
  'VEN-135': (oid, ctrl) => [makeKennenPlayTrigger(oid, ctrl), makeKennenAttackTrigger(oid, ctrl)],
                                               
  'SFD-084': (oid, ctrl) => [makeJayceGearTrigger('SFD-084')(oid, ctrl)],
  'VEN-175': (oid, ctrl) => [makeJayceGearTrigger('VEN-175')(oid, ctrl)],
  'UNL-130': (oid, ctrl) => [makePerchTrigger(oid, ctrl)], // ★第422轮 移动栖木:选一名对手,该玩家打出战鹰
  'SFD-081': (oid, ctrl) => [makeConArtistTrigger(oid, ctrl)], // ★第423轮 大老千:逐人问打不打金币
  'UNL-164': (oid, ctrl) => [makeInspectorTrigger(oid, ctrl)], // ★第424轮 安全检查员:每名玩家摧毁自己一名单位
  'SFD-053': (oid, ctrl) => [makeJannaTrigger(oid, ctrl)],     // ★第427轮 迦娜:移伤害+可选移走一名敌方
  'SFD-140': (oid, ctrl) => [makeFizzTrigger(oid, ctrl)],      // ★第428轮 菲兹:废牌堆免法力打法术+打后回收
  'SFD-175': (oid, ctrl) => [makeGigalithTrigger(oid, ctrl)],  // ★第429轮 垓兽:其他友方单位本回合+2S
  'VEN-069': (oid, ctrl) => [makeMelDrawTrigger(oid, ctrl)],   // ★第432轮 梅尔:打出抽一张
  'SFD-116': (oid, ctrl) => [makeYoneTrigger(oid, ctrl)],      // ★第434轮 永恩:征服开放战场→基地敌方吃我战力伤
  'SFD-233': (oid, ctrl) => [makeYoneTrigger(oid, ctrl)],      // ★第434轮 永恩变体(同文,共用工厂)
  'OGN-158': (oid, ctrl) => [makeVolibearTrigger(oid, ctrl)],  // ★第439轮 沃利贝尔:对手移动到我不在的战场→抽一张
  'OGN-158a': (oid, ctrl) => [makeVolibearTrigger(oid, ctrl)], // ★第439轮 沃利贝尔变体(同文,共用工厂)
  'OGN-167': (oid, ctrl) => [...makeEmberMonkTriggers(oid, ctrl)], // ★第439轮 余火修士:待命打出(单位/法术两条)→我本回合+2
  'SFD-121': (oid, ctrl) => [...makeBlackMarketTriggers(oid, ctrl)], // ★第506轮 黑市掮客:待命打出→休眠金币(两条)
  'UNL-023': (oid, ctrl) => [...makeKatarinaTriggers(oid, ctrl)], // ★第506轮 卡特琳娜:放下去→我变活跃;打出来→2点伤害(三条)
  'UNL-141': (oid, ctrl) => [makeEvelynn141Trigger(oid, ctrl)], // ★第507轮 伊芙琳:subjectIsSelf + fromStandby + 我的回合(一条)
  'SFD-139': (oid, ctrl) => [makeNightblade139Trigger(oid, ctrl)], // ★第508轮 夜之锋刃:subjectIsSelf + fromStandby ⇒ 贴附(一条)
  'UNL-003': (oid, ctrl) => [makeMarauder003Trigger(oid, ctrl)], // ★第509轮 鲛人滋事者:subjectIsSelf + 落点是战场(一条)
  'UNL-145': (oid, ctrl) => [makePykeTrigger(oid, ctrl)],      // ★第440轮 派克:每回合限一次敌方单位被摧毁→休眠金币
  'UNL-145a': (oid, ctrl) => [makePykeTrigger(oid, ctrl)],     // ★第440轮 派克变体(同文,共用工厂)
  'VEN-138': (oid, ctrl) => [makeShen138Trigger(oid, ctrl)],  // ★第440轮 黄慎:据守时此处我控其他单位恰好一个→得1分
  'VEN-138a': (oid, ctrl) => [makeShen138Trigger(oid, ctrl)], // ★第440轮 黄慎变体(同文,共用工厂)
  'UNL-048': (oid, ctrl) => [makeTrevorTrigger(oid, ctrl)],   // ★第442轮 特雷弗:据守→此处出活跃3S精灵带瞬息
  'UNL-052': (oid, ctrl) => [makeNamiPlayTrigger(oid, ctrl), makeNamiHoldTrigger(oid, ctrl)], // ★第443轮 娜美:付了额外费眩晕+据守授予下次打出ready+buff
  'VEN-101': (oid, ctrl) => [makeWindMonkTrigger(oid, ctrl)], // ★第444轮 劲风修士:付了额外费→放逐废牌堆一张给单位强攻2
  'VEN-113': (oid, ctrl) => [...makeKennen113Triggers(oid, ctrl)], // ★第445轮 凯南:打出燃烧2+征服给废牌堆法术等费流转
  'VEN-113a': (oid, ctrl) => [...makeKennen113Triggers(oid, ctrl)], // ★第445轮 凯南变体(同文,共用工厂)
  'SFD-079': (oid, ctrl) => [makeBardTrigger(oid, ctrl)],      // ★第446轮 巴德:付了传奇休眠额外费→移任意单位到开放战场
  'SFD-228': (oid, ctrl) => [makeBardTrigger(oid, ctrl)],      // ★第446轮 巴德再版(同文,共用工厂)
  'UNL-119': (oid, ctrl) => [makeKhazixTrigger(oid, ctrl)],   // ★第450轮 卡兹克:进攻可耗3经验对此处敌方造成等同我战力伤害
  'UNL-029': (oid, ctrl) => [makeTreant029Trigger(oid, ctrl)],   // ★第455轮 树怪:我征服时给一名友方单位增益
  'UNL-029a': (oid, ctrl) => [makeTreant029Trigger(oid, ctrl)],  // ★第455轮 树怪变体(同文,共用工厂)
  'UNL-050': (oid, ctrl) => [makeYashira050Trigger(oid, ctrl)],  // ★第457轮 娅希拉:据守→挂下个主阶段移敌延时档
  'OGN-252': (oid, ctrl) => [makeMissile252Trigger(oid, ctrl)],  // ★第458轮 死神飞弹:废牌堆里征服可弃一回手
  'OGN-041': (oid, ctrl) => [makeVolibear041Trigger(oid, ctrl)],  // ★第523轮 沃利贝尔
  'OGN-041a': (oid, ctrl) => [makeVolibear041Trigger(oid, ctrl)],  // ★第523轮 沃利贝尔异画(同文,共用工厂)
  'UNL-119a': (oid, ctrl) => [makeKhazixTrigger(oid, ctrl)],  // ★第450轮 卡兹克变体(同文,共用工厂)
  'VEN-180': (oid, ctrl) => [makeKhazixTrigger(oid, ctrl)],   // ★590 卡兹克跨系列印次(同文,共用同一条工厂)
  'OGN-112': (oid, ctrl) => [makeKaisa112Trigger(oid, ctrl)], // ★第451轮 卡莎:征服→废牌堆免法力打费用低于分数的法术
  'OGN-112a': (oid, ctrl) => [makeKaisa112Trigger(oid, ctrl)], // ★第451轮 卡莎变体(同文,共用工厂)
  'SFD-160': (oid, ctrl) => [makeThugTrigger(oid, ctrl)],      // ★第436轮 祖安混混:付了额外费则摧毁一件装备
  'SFD-119': (oid, ctrl) => [makeJaxTrigger(oid, ctrl)],        // ★第417轮 贾克斯:为我贴附武装时可付{1}抽一张
  'OGN-103': (oid, ctrl) => [makeRavenbloomTrigger(oid, ctrl)], // 拉文布鲁姆学生:你打出法术→我本回合+1
  'OGN-131': (oid, ctrl) => [makeDuneDrakeTrigger(oid, ctrl)],  // 沙丘亚龙:进攻时此处有活跃敌方→我+2
  'OGN-091': (oid, ctrl) => [makeArenaCrewTrigger(oid, ctrl)],  // 竞技场勤务小队:你打出装备→我变活跃
                   
  'OGN-148': (oid, ctrl) => [makeAniviaTrigger(oid, ctrl)],      // 艾尼维亚:进攻时此处所有敌方各3点伤害
  'VEN-071': (oid, ctrl) => [makeRestlessCatTrigger(oid, ctrl)], // 焦躁的猫咪:我变活跃→我本回合+2
  'OGN-143': (oid, ctrl) => [makePirateHavenTrigger(oid, ctrl)], // 海盗避风港:你让友方单位变活跃→它+1
                                                    
                                                   
  'ARC-004': (oid, ctrl) => [makeWarwickTrigger(oid, ctrl)],           // 沃里克:进攻时摧毁此处所有已受伤敌方
  'SFD-027': (oid, ctrl) => [makeSandhornTrigger(oid, ctrl)],          // 穿沙角兽:据守时抽两张
  'SFD-089': (oid, ctrl) => [makeRumbleTrigger(oid, ctrl)],            // 兰博:据守时打出3[M]机器人到基地
                   
  'OGN-073': (oid, ctrl) => [makeSonaTrigger(oid, ctrl)],              // 娑娜:回合结束解除四枚符文横置
  'OGS-017': (oid, ctrl) => [makeAnnieLegendTrigger(oid, ctrl)],       // 黑暗之女(传奇):回合结束解除两枚符文横置(不限敌我)
  'OGN-060': (oid, ctrl) => [...makeVisorTriggers(oid, ctrl)],         // 远见面具(装备):友方单位独自参战则该单位本回合+1
  'SFD-047': (oid, ctrl) => [makeApeElderTrigger(oid, ctrl)],          // 山猿老祖(第168轮):你给予我增益→我变活跃
  'OGN-059': (oid, ctrl) => [makeEclipseVanguardTrigger(oid, ctrl)],   // 星蚀先锋:你眩晕敌方单位→我活跃且+1
  'OGN-261': (oid, ctrl) => [makeDawnGoddessStunTrigger(oid, ctrl)], // 曙光女神(357):你眩晕【任意数量】敌方→给一名友方增益
  'VEN-095': (oid, ctrl) => [makeShadowDiscipleTrigger(oid, ctrl)], // 影流弟子(357):我移动时可燃烧1换本回合+1
  'OGN-185': (oid, ctrl) => [makeTravelingMerchantTrigger(oid, ctrl)], // 旅行商人:我移动→弃1抽1
  'VEN-080': (oid, ctrl) => [makeNoxianDemolitionistTrigger(oid, ctrl, (d) => cardCost(d).mana ?? 0)], // 爆破手
  'OGN-035': (oid, ctrl) => [makeVayneTrigger(oid, ctrl)],             // 薇恩:征服时可付1回手
  'SFD-223': (oid, ctrl) => [makeVayneTrigger(oid, ctrl, 'SFD-223')],  // 薇恩(哨兵版,不是再版)
  'VEN-091': (oid, ctrl) => [makeCorruptDrakeTrigger(oid, ctrl)],      // 腐化巨龙:进攻时可赶走此处≤5[M]敌方
  'UNL-115': (oid, ctrl) => [makeNilahMoveTrigger(oid, ctrl)],           // ★526 尼菈:每次移动→1经验
  'UNL-080': (oid, ctrl) => [makeHweiMoveTrigger(oid, ctrl)], // ★668 彗:移动→抽1+内嵌弃1分型
  'UNL-082': (oid, ctrl) => [makeLilliaMoveTrigger(oid, ctrl)], // ★673 莉莉娅:移动→起点打瞬息精灵
  'UNL-022': (oid, ctrl) => [makeJhinMoveTrigger(oid, ctrl)], // ★674 烬:移动→获得1法力+1任意符能
  'VEN-079': (oid, ctrl) => makeDamTriggers(oid, ctrl), // ★675 妲姆:已强化>攻/防→战力提至参照+1
  'VEN-088': (oid, ctrl) => [makeJayceHammerTrigger(oid, ctrl)], // ★677 杰斯:变为活跃→三选一本回合关键词
  'SFD-048': (oid, ctrl) => [makeSkyhornTrigger(oid, ctrl)],           // 天角牧者:每当我移动→抽1
  'SFD-137': (oid, ctrl) => [makeSeahuntTrigger(oid, ctrl)],           // 猎海小队:从战场向别处移动→我+2
  'UNL-068': (oid, ctrl) => [makeSpectralCentaurTrigger(oid, ctrl)],   // 幽魂半人马:另一友方单位死→我+2
  'UNL-129': (oid, ctrl) => [makeFerociousJawfishTrigger(oid, ctrl)],  // 凶残颚鱼:另一友方单位死→得1经验
                                                  
  'OGN-251': (oid, ctrl) => [makeJinxLegendTrigger(oid, ctrl)],      // 暴走萝莉(传奇)
  'OGN-119': (oid, ctrl) => makeAhriDreamerTriggers(oid, ctrl),      // 阿狸·天真绮梦
                                                                  
  'VEN-044': (oid, ctrl) => makeHeron044Triggers(oid, ctrl),
                                                   
                                                                 
                                     
                                                                                
  'VEN-191': (oid, ctrl) => [makeZed191Trigger(oid, ctrl)],
                                                                       
  'UNL-056': (oid, ctrl) => makeYuumi056Triggers(oid, ctrl),
  'OGN-107': (oid, ctrl) => [makeAva107Trigger(oid, ctrl, {
    hasStandby: (d: string) => cardKeywords(d).includes(STANDBY_KEYWORD),
    isUnitCard: (d: string) => cardKind(d) === 'unit',
    specFor: (d: string) => playSpecFor(d), // ★1254 缺陷 157:法术走 playSpellFromZone,目标按 spec 问
  })],
                                    
                                                        
  'SFD-082': (oid, ctrl) => makeEzreal082Triggers(oid, ctrl),
  'SFD-028': (oid, ctrl) => [makeLucianAttackTrigger(oid, ctrl)], // ★610 卢锡安(与 SFD-082 同骨架,只差伤害数额)
  'SFD-020': (oid, ctrl) => [makeDravenWonBattleTrigger(oid, ctrl), ...makeDravenPumpTriggers(oid, ctrl)],
  'VEN-006': (oid, ctrl) => [makeOasisRaiderTrigger(oid, ctrl)], // ★614 绿洲劫掠者
  'VEN-016': (oid, ctrl) => [makeUmbralDragonTrigger(oid, ctrl)], // ★618 蚀影巨龙
  'SFD-024': (oid, ctrl) => [makeRellAttackTrigger(oid, ctrl)], // ★621 芮尔 // ★613 德莱文(三条:赢战斗 + 进攻/防守)
  'OGN-255': (oid, ctrl) => [makeNineTailsLegendTrigger(oid, ctrl)], // 九尾妖狐(传奇)
  'OGN-249': (oid, ctrl) => [makeThunderLegendTrigger(oid, ctrl)],   // ★609 不灭狂雷(传奇;四个卡号走 variantAliases 折叠)
  'OGN-037': (oid, ctrl) => [makePhoenixTrigger(oid, ctrl)], // ★634 不朽凤凰(废牌堆触发;触发区只登 discard)
  'UNL-183': (oid, ctrl) => [makeRengarLegendTrigger(oid, ctrl)],    // 傲之追猎者(传奇)
  'UNL-058': (oid, ctrl) => [makeLilliaTokenTrigger(oid, ctrl)],     // ★606 莉莉娅(本表会 resolveImplDefId ⇒ UNL-058a 自动折叠)
  'OGN-246': (oid, ctrl) => [makeViktorLeaderTrigger(oid, ctrl)],    // 维克托·领袖
  'UNL-203': (oid, ctrl) => [makeSteadfastHammerTrigger(oid, ctrl)], // 圣锤之毅
  'UNL-237': (oid, ctrl) => [makeSteadfastHammerTrigger(oid, ctrl)], // 圣锤之毅(再版)
                                                
  'UNL-112': (oid, ctrl) => [makeAlluringSpriteTrigger(oid, ctrl)], // 诱人仙灵
  'SFD-125': (oid, ctrl) => [makeStrongSpriteTrigger(oid, ctrl)], // 大力仙灵
  'SFD-126': (oid, ctrl) => [makeLoyalHoundTrigger(oid, ctrl)], // 忠诚的猎犬
  'OGS-023': (oid, ctrl) => [makeDemaciaMightTrigger(oid, ctrl)], // 德玛西亚之力(传奇)
  'SFD-101': (oid, ctrl) => makeFaeDragonTriggers(oid, ctrl), // 仙灵龙(打出+消耗增益 两条触发)
                         
  'OGN-141': (oid, ctrl) => [makeEquilibriumMonkTrigger(oid, ctrl)], // 均衡僧侣
  'SFD-132': (oid, ctrl) => [makeAbyssalLeviathanTrigger(oid, ctrl)], // 海渊巨兽
  'OGN-223': (oid, ctrl) => [makeSummitGuardianTrigger(oid, ctrl)], // 巅峰守护者
                                                    
  'OGN-192': (oid, ctrl) => [makeMindReaverTrigger(oid, ctrl)], // 辟心玄龙
  'OGN-200': (oid, ctrl) => [makeTwistedFateTrigger(oid, ctrl)], // ★第513轮 崔斯特
  'UNL-121': (oid, ctrl) => [makeCharmingSpiritTrigger(oid, ctrl)], // 魅惑之灵
  'UNL-135': (oid, ctrl) => [makeThoroughInvestigatorTrigger(oid, ctrl)], // 缜密的调查员(㊹费用=2经验)
                                                
  'VEN-109': (oid, ctrl) => makeIllaoiTriggers(oid, ctrl), // 俄洛伊
  'VEN-182': (oid, ctrl) => makeIllaoiTriggers(oid, ctrl), // 俄洛伊(再版)
  'UNL-143': (oid, ctrl) => makeKhazix143Triggers(oid, ctrl), // ★545 卡兹克:进攻或防守时此处有落单敌方 ⇒ 本回合[S]+2 并获 2 经验
  'UNL-143a': (oid, ctrl) => makeKhazix143Triggers(oid, ctrl), // 卡兹克(再版号,同一副触发)
                                        
  'OGN-026': (oid, ctrl) => [makeThunderCallerTrigger(oid, ctrl)], // 颂雷者 布林希尔
  'OGN-031': (oid, ctrl) => [makeRageDrakeTrigger(oid, ctrl)], // 狂暴龙怪(可消耗减费)
  'UNL-169': (oid, ctrl) => [makeAsheTrigger(oid, ctrl)], // 艾希(挂延迟返回待办)
  'SFD-032': (oid, ctrl) => [makeSwordRoninTrigger(oid, ctrl)], // 斩剑浪客:当你打出我时可摧毁一件装备(无费用)
  'OGN-056': (oid, ctrl) => [makeAdaptiveBotTrigger(oid, ctrl)], // 自适应机器人:征服此处时可拆装备换增益
  'VEN-046': (oid, ctrl) => [makeNasusConquerTrigger(oid, ctrl)], // 内瑟斯:[已强化>]征服此处得1分(条件触发)
  'VEN-110': (oid, ctrl) => [makeMelEmpoweredTrigger(oid, ctrl)], // 梅尔:变为已强化时放逐≤3[S]敌方单位
  'VEN-104': (oid, ctrl) => [makeMatriarchEmpoweredTrigger(oid, ctrl, cardCost)], // 披尾女族长:变为已强化时从废牌堆无视费用打出一名≤3法力且≤{A}符能的单位到基地(第264轮)
  'VEN-114': (oid, ctrl) => [makeKarloxEmpoweredTrigger(oid, ctrl)], // ★696 卡洛克斯:变为已强化时对手燃烧3+内嵌可选从其废牌堆免费打出一名单位当自己的
  'UNL-181': (oid, ctrl) => [makeJhinExileTrigger(oid, ctrl), makeJhinCollectTrigger(oid, ctrl)],
  'UNL-195': (oid, ctrl) => [makeIvernSwapTrigger(oid, ctrl, 'conquer'), makeIvernSwapTrigger(oid, ctrl, 'hold')], // ★712 翠神:征服/据守可选休眠换草丛(233/233* 折叠) // ★703 戏命师两段:≥4法力可选离链放逐+满四收集(回废×4+召符文×4+抽1+清账)
  'UNL-147': (oid, ctrl) => [makeBaronPlayTrigger(oid, ctrl)], // ★710 纳什男爵:打出时添置男爵巢穴并于其进场
  'UNL-238': (oid, ctrl) => [makeBaronPlayTrigger(oid, ctrl)], // ★710 同上(双印次;variantAliases 生成表无此组 ⇒ 双登)
  'VEN-188': (oid, ctrl) => [makeMelEmpoweredTrigger(oid, ctrl)], // 同卡再版号
  'VEN-021': (oid, ctrl) => [makeAkaliMoveTrigger(oid, ctrl)], // 阿卡丽:移动时可对起点/终点战场一名单位造伤
  'OGN-230': (oid, ctrl) => [makeAlbusTrigger(oid, ctrl)], // 阿不思:打出我→可消耗任意数量增益,每个召一枚休眠符文
  ...SETT_FACTORIES, // ★第392轮 瑟提(OGN-164 / VEN-SP4 同一张卡):打出我/我征服→给我增益(两条共 abilityKey)
  'UNL-150': (oid, ctrl) => [makeVegasStunTrigger(oid, ctrl)], // 薇古丝:对手打单位→眩晕+本回合不可移动
  'UNL-081': (oid, ctrl) => [makeServitorPlayTrigger(oid, ctrl)], // 赐面守侍:当你打出我时→打2映像+内嵌复制触发
  'OGN-121': (oid, ctrl) => [makeMilitaristTrigger(oid, ctrl)], // 军事家:当我防守时→选此处敌方单位集火+回收
  'OGN-197': (oid, ctrl) => [makeScoutTrigger(oid, ctrl)], // 提莫·斥候:打出我→本回合[M]+3
  'OGN-196': (oid, ctrl) => [makeSoulEaterTrigger(oid, ctrl)], // 咂魂者:打出我→可从废牌堆打出一名单位(免法力费)
  'OGN-226': (oid, ctrl) => [makeGhostMotherTrigger(oid, ctrl)], // ★第399轮 幽灵主母:打出我→可从废牌堆【免费】打出一名费用≤3且符能≤1的单位
  'OGN-097': (oid, ctrl) => [makePineconeTrigger(oid, ctrl)], // 爆裂球果:打出我→一名单位本回合[M]-2低不过1(§811.1.d.2锁)
  'SFD-138': (oid, ctrl) => [makeWindWingTrigger(oid, ctrl)], // 吟风翼:打出我→可弹回≤3[M]单位
  'OGN-101': (oid, ctrl) => [makeMushroomBagTrigger(oid, ctrl)], // 蘑菇袋:你的开始阶段+控面朝下待命牌→抽1
  'OGN-109': (oid, ctrl) => [makeMundoStartTrigger(oid, ctrl)], // ★585 蒙多医生:你的开始阶段→从废牌堆回收三张
  ...ATTACK_STUN_FACTORIES, // 「当我进攻时→眩晕此处一名敌方单位」族(191 蕾欧娜 / 353 蔚)
  'OGN-177': (oid, ctrl) => [makeOgn177FollowTrigger(oid, ctrl)], // 隐秘追踪者(第193轮):友方单位从我的位置移走→可跟随
  'OGN-162': (oid, ctrl) => [makeOgn162Trigger(oid, ctrl)], // 厄运小姐(第201轮)
  'UNL-174': (oid, ctrl) => [makeUnl174Trigger(oid, ctrl)], // 逆转碎片(第203轮)
                                                       
  'OGN-235': (oid, ctrl) => [makeOgn235RecycleTrigger(oid, ctrl)],
                                                       
  'SFD-203': (oid, ctrl) => [makeSfd203RuneTrigger(oid, ctrl), makeSfd203ReadyTrigger(oid, ctrl)],
                                                                
  'SFD-142': (oid, ctrl) => [makeSfd142Trigger(oid, ctrl)],
                                           
  'SFD-057': makeIreliaTriggers('SFD-057'), // 艾瑞莉娅(211)
  'VEN-174': makeIreliaTriggers('VEN-174'), // 同名同规则的另一个卡号(358);共用同一台机器
                       
  'ARC-005': (oid, ctrl) => [makeArc005Trigger(oid, ctrl)],
  'OGN-027': (oid, ctrl) => [makeOgn027Trigger(oid, ctrl, 'playUnit'), makeOgn027Trigger(oid, ctrl, 'playSpell')],
  'UNL-074': (oid, ctrl) => [makeUnl074Trigger(oid, ctrl)], // 冰封宝石(第215轮)
                                                   
  'SFD-148': (oid, ctrl) => [makeSfd148WinTrigger(oid, ctrl), makeSfd148DeathTrigger(oid, ctrl)],
  'VEN-063': (oid, ctrl) => [makeVen063Trigger(oid, ctrl)], // 内瑟斯(354):每回合一次,此处敌方单位死→休眠符文
                                                       
  'VEN-068': (oid, ctrl) => [makeVen068PlayTrigger(oid, ctrl), makeVen068GearTrigger(oid, ctrl)],
  'OGN-118': (oid, ctrl) => [makeOgn118Trigger(oid, ctrl)], // 残响之魂(第200轮):每回合首次友方单位死→抽一张
  'VEN-002': (oid, ctrl) => [makeVen002Trigger(oid, ctrl)], // 旋风剑客(第200轮):每回合首次我移动→选一名玩家燃烧1
  'UNL-170': (oid, ctrl) => [makeUnl170AttackTrigger(oid, ctrl)], // 厄塔汗(第199轮):我进攻→防守方摧毁自己在此处的一名单位
  'UNL-104': (oid, ctrl) => [makeUnl104PlayTrigger(oid, ctrl)], // 温驯的宝石龙(第196轮):打出龙属性单位→最多两枚符文变活跃
  'VEN-094': (oid, ctrl) => [makeMaskMother094Trigger(oid, ctrl)], // 面具之母(★542):被弃置→可付{1}给友方单位本回合[S]+2
  'OGN-006': (oid, ctrl) => [makeGrenade006Trigger(oid, ctrl)], // 嚼火者手雷(★579):被弃置→可付{红色}改为把我打出到场上
  'VEN-102': (oid, ctrl) => [makeRavenbloom102Trigger(oid, ctrl)], // 拉文布鲁姆级长(第292轮):对手打出装备→可放逐我以放逐它
  'VEN-067': (oid, ctrl) => [makeStarBottle067Trigger(oid, ctrl)], // 瓶中星海(第299轮):我的主阶段开始→可拆三换一分
                                                                        
  ...ENTER_TRIGGER_FACTORIES,
  ...WON_BATTLE_FACTORIES, // 「赢得一场战斗→抽一张牌」族(第352轮 2 张)
  'OGN-205': (oid, ctrl) => [makeYasuoThirdMoveTrigger(oid, ctrl)], // 亚索(356):本回合第三次移动→得1分
  'SFD-075': (oid, ctrl) => [makeProgressDayTrigger(oid, ctrl)], // 进步荣光(第293轮):你用装备主动技能→我本回合+1
  'SFD-100': (oid, ctrl) => makeYordleExplorer100Triggers(oid, ctrl), // 约德尔探险家(第294轮):你打出符能费≥AA的卡牌→抽一张(两条:单位路+法术路)
  'VEN-168': (oid, ctrl) => [makeJinx168Trigger(oid, ctrl)], // 金克丝(第295轮):打出我时弃两张手牌
  'SFD-130': (oid, ctrl) => [makeSfd130MoveTrigger(oid, ctrl)], // 寻宝猎人(第196轮):我移动→打出一个休眠金币
  'UNL-105': (oid, ctrl) => [makeUnl105MoveTrigger(oid, ctrl)], // 气势逼人的挑战者(第194轮):我移动时可把此处弱于我的敌方单位踢走
  'OGN-199': (oid, ctrl) => [makeTideTurnerTrigger(oid, ctrl)], // 控潮者:打出时可与另一处己方单位换位
  'UNL-071': (oid, ctrl) => [makeBladeDancerTrigger(oid, ctrl)], // 环刃舞者:打出时此处其他己方单位获坚守
  'OGN-087': (oid, ctrl) => [makeInstructorTrigger(oid, ctrl)], // 约德尔教官:打出时抽1(壁垒走 damageAssign)
  'UNL-040': (oid, ctrl) => [makeApprenticeDrawTrigger(oid, ctrl)], // 无极学徒:同一条触发,外面包着[等级6>]的门
  'VEN-038': (oid, ctrl) => [makeVen038MoveTrigger(oid, ctrl)], // 阿卡丽(VEN-038)第二句:移动到战场时我本回合+2
  'UNL-149': (oid, ctrl) => [makeDianaSpellTrigger(oid, ctrl)], // 黛安娜超脱凡界:每打出一个法术本回合+2
  'VEN-183': (oid, ctrl) => [makeDianaVenSpellTrigger(oid, ctrl)], // 黛安娜(异画):同上,自己的效果 id
  'VEN-121': (oid, ctrl) => [makeCaptainPumpTrigger(oid, ctrl)], // 草包队长:你打出【另一名】单位时我本回合+2
  'OGN-139': (oid, ctrl) => [makeCloudDrakePlayTrigger(oid, ctrl)], // 云丛的希思莉亚(354):同一时机,给的是【增益】
  'UNL-087': (oid, ctrl) => [makeGolemHoldTrigger(oid, ctrl)], // 苍蓝雕纹魔像:据守我处→下个主阶段获[A]
  'UNL-043': (oid, ctrl) => [makeAnnouncerHoldTrigger(oid, ctrl)], // 热情的播报员(355):同一时机,给此处【所有】单位增益
  'UNL-079': (oid, ctrl) => [makeDianaDuelTrigger(oid, ctrl, isSpellDef)], // 黛安娜·皎月化身:对决在此处开始→可付1洞察+法术则抽
  'SFD-118': (oid, ctrl) => [makeBoneshiverTrigger(oid, ctrl)], // 碎骨棒:穿戴者征服→召休眠符文
  'SFD-124': (oid, ctrl) => [makeDoransRingTrigger(oid, ctrl)], // 多兰之戒:穿戴者征服→弃1抽1
  'SFD-134': (oid, ctrl) => [makeExtractionTrigger(oid, ctrl)], // 萃取:穿戴者征服→打出1休眠金币
  'SFD-086': (oid, ctrl) => [makeAtlasTrigger(oid, ctrl)], // 云游图鉴:穿戴者据守→打出2休眠金币
  'SFD-153': (oid, ctrl) => [makeVanguardEyeTrigger(oid, ctrl)], // 先锋之眼:穿戴者移动→此处打出1[M]随从
  'VEN-011': (oid, ctrl) => [makePendulumBladeTrigger(oid, ctrl)], // 悬摆之刃:穿戴者移动到战场→本回合+2
  'SFD-016': (oid, ctrl) => makeRecurveBowTriggers(oid, ctrl), // 反曲之弓:穿戴者攻/防→点射一名敌方2点
  'SFD-190': (oid, ctrl) => makeHearthCloakTriggers(oid, ctrl), // 炉火斗篷:穿戴者攻/防→此处敌方各2点
  'SFD-108': (oid, ctrl) => [makeThornmailTrigger(oid, ctrl)], // 狂徒铠甲:穿戴者征服→给予我增益
  'UNL-019': (oid, ctrl) => [makeBlightedAxeTrigger(oid, ctrl)], // 枯萎战斧:回合末未征服→卸除+4伤
  'UNL-158': (oid, ctrl) => [makeShepherdPlayTrigger(oid, ctrl)], // 牧人的传家宝:打出时获1经验
  'SFD-192': (oid, ctrl) => [makeRequiemPlayTrigger(oid, ctrl)], // ★653 舒瑞娅的安魂曲:打出时你的所有单位变活跃
}

   
                         
                                                            
                                                                
                                               
                                                   
                                                    
   
function isSpellDef(defId: string): boolean {
  return cardKind(defId) === 'spell' || defId === 'DEMO-BOLT'
}

                                         
const ACTIVE_ZONES: readonly ZoneKind[] = ['battlefield', 'base', 'legend', 'standby']

   
                                  
                                               
                                     
                                          
   
const TRIGGER_ZONES: Readonly<Record<string, readonly ZoneKind[]>> = {
                                                      
  'OGN-182': [...ACTIVE_ZONES, 'hand', 'discard'],
                                                             
  'VEN-094': [...ACTIVE_ZONES, 'hand', 'discard'],
                                                             
  'OGN-006': [...ACTIVE_ZONES, 'hand', 'discard'],
                                                        
  'OGN-186': [...ACTIVE_ZONES, 'discard', 'exile', 'hand', 'mainDeck'],
                                                           
  'SFD-148': [...ACTIVE_ZONES, 'discard'],
                                                        
                                                           
                                                        
  'OGN-037': ['discard'],
                                                      
                                     
  'SFD-200': [...ACTIVE_ZONES, 'chain', 'exile', 'discard'],
                                            
  'UNL-184': [...ACTIVE_ZONES, 'chain', 'discard'],
  'VEN-066': [...ACTIVE_ZONES, 'chain', 'discard'], // 时空裂隙(第279轮):法术,结算时在链上、之后进废牌堆
                                                                          
                                                                       
                                                                      
                                                  
                                                    
                                                                  
                                                
  'OGN-102': [...ACTIVE_ZONES, 'chain', 'discard'],
  'OGN-062': [...ACTIVE_ZONES, 'chain', 'discard'], // 增援(第271轮):法术,结算时在链上、之后进废牌堆
  'SFD-188': [...ACTIVE_ZONES, 'chain', 'discard'], // 虚空猛冲(第272轮):同上
  'OGN-025': [...ACTIVE_ZONES, 'chain', 'discard'], // ★642 暴怒冲动:法术,relay 要在链上/废牌堆还扫得到
  'OGN-115': [...ACTIVE_ZONES, 'chain', 'discard'], // ★646 光明未来:法术,relay 同款
  'VEN-089': [...ACTIVE_ZONES, 'chain', 'discard'], // 狂野钩爪(第274轮):同上
                                                        
                                                        
  'OGN-252': [...ACTIVE_ZONES, 'discard'], // ★第458轮
                                                                
  'OGN-194': ['mainDeck'],
  // ⚠️ 虚空遁地兽是【传奇】,一直待在传奇区 —— 不需要加宽 TRIGGER_ZONES(它不会跑到链上/废牌堆)
}
                          
export const TRIGGER_ZONE_DEFIDS: readonly string[] = Object.keys(TRIGGER_ZONES)

   
                              
                                             
                                                             
                                                
                                                 
   
   
                                                                       
                                                            
   
export function isArmamentDef(defId: string): boolean {
  return defHasTag(defId, ARMAMENT_TAG)
}

   
                                                                        
                                                                             
                                
                                                                        
                                                       
                                                          
                                                                   
                                                              
                                                         
                                                          
                                                                 
                                                                        
                                                            
                                                                
                                                        
                                                                                
   
export function isPlainEquipmentDef(defId: string): boolean {
  if (isTokenDefId(defId)) return false                          
  return cardKind(defId) === 'equipment' && !INDICATOR_DEFIDS.has(defId)
}

   
                                                            
                 
                                     
                                                                   
                                                              
   
export function isPlainUnitDef(defId: string): boolean {
  if (isTokenDefId(defId)) return false                            
  return cardKind(defId) === 'unit' && !INDICATOR_DEFIDS.has(defId)
}

export function defHasTag(defId: string, tag: string): boolean {
  if (hasCardTag(defId, tag)) return true                                  
  return tag === '武装' && defId in GEAR_CARDS
}

                                                                  
export function activeTriggers(state: GameState): Trigger[] {
  const out: Trigger[] = []
  for (const o of Object.values(state.objects)) {
    const zone = state.zones[o.zone]
                                                       
                                                                       
    const zonesFor = TRIGGER_ZONES[resolveImplDefId(passiveDefId(o), (x) => x in TRIGGER_ZONES)] ?? ACTIVE_ZONES
    if (!zone || !zonesFor.includes(zone.kind)) continue
    const factory = TRIGGER_FACTORIES[resolveImplDefId(passiveDefId(o), (x) => x in TRIGGER_FACTORIES)]
                                                                   
                                             
    if (factory) {
      const mk = (): Trigger[] => factory(o.oid, o.controller).map((t) => (t.sourceDefId ? t : { ...t, sourceDefId: passiveDefId(o) }))
      out.push(...mk())
                                                           
                                                      
                                                                
                                                     
                                                        
                                                   
      const shangeN = shangeCopies(state, o)
      for (let i = 1; i <= shangeN; i++) {
        out.push(...mk().map((t) => ({ ...t, id: `${t.id}:shange:${i}` })))
      }
    }
  }
                                                   
                                                                                    
  for (const oid of Object.keys(state.grantedConquerReturnThisTurn ?? {})) {
    const o = state.objects[oid as never]
    const zk = o ? state.zones[o.zone]?.kind : undefined
    if (o && (zk === 'battlefield' || zk === 'base')) out.push(makeConquerReturn184Trigger(o.oid, o.controller))
  }
                                          
                                                                         
                                                            
                                                               
                                                                   
                                                              
  const kwSourcesOf = liveKeywordSourcesFor(state, cardKeywords)
                                                       
                                                                                     
  out.push(...makeHuntTriggers(stateWithPassives(state)))
                                    
  out.push(...makeForesightTriggers(state, kwSourcesOf))
                                                 
                                                            
                                           
  out.push(...makeNimbleTriggers(state, kwSourcesOf))
  out.push(...makeForgeTriggers(state, {
    sourcesOf: kwSourcesOf,
    hasTag: (defId, tag) => defHasTag(defId, tag),
                                                                    
    handwrittenEquipOf: (defId) => {
      const k = resolveImplDefId(defId, (x) => x in HANDWRITTEN_EQUIP)
      const spec = (HANDWRITTEN_EQUIP[k] ?? []).find((x) => x.key.startsWith('equip:'))
      return spec === undefined ? undefined : { cost: spec.cost, ...(spec.extraCost !== undefined ? { extraCost: spec.extraCost } : {}) }
    },
                                                                          
                                                     
                                                                                
                                                               
                                                      
                   
                                                                               
                                                         
                                                                  
                                               
                                                                       
                                                      
    equipCostOf: (defId, ctx) => {
      const gearKey = resolveImplDefId(defId, (x) => x in GEAR_CARDS)
      const kws = GEAR_CARDS[gearKey]?.keywords
      const printed = equipCostOptions(kws).parsed[0]?.cost
      if (printed === undefined || ctx === undefined) return printed
      const abilityKey = equipActivationSpecs(kws).specs[0]?.key
      if (abilityKey === undefined) return printed
                                                                     
      const external = allAbilityCostMods(ctx.state, ctx.player, gearKey, abilityKey, ctx.gearOid as string)
                                                            
      const own = EQUIP_ABILITY_COST_MODS[gearKey]?.(ctx.state, ctx.player, abilityKey, ctx.forgeUnitOid as string) ?? []
      const mods = [...external, ...own]
      return mods.length > 0 ? computeCost(printed, mods) : printed
    },
    canPay: canPayFromState,
  }))
                                                            
  for (const [zid, bc] of Object.entries(state.battlefieldCards ?? {})) {
                                                                 
                                                            
                                                
    const bfKey = resolveImplDefId(bc.defId, (x) => x in BF_TRIGGER_FACTORIES
      || x in DIANA_BF_TRIGGER_FACTORIES || x in EXTRA_BF_TRIGGER_FACTORIES)
    const factory = BF_TRIGGER_FACTORIES[bfKey] ?? DIANA_BF_TRIGGER_FACTORIES[bfKey]
      ?? EXTRA_BF_TRIGGER_FACTORIES[bfKey]
    if (!factory) continue
    for (const p of state.players) out.push(...factory(zid, p))
  }
                                         
                                                            
  out.push(...delayedReturnTriggers(state))
                                                                       
  out.push(...delayedTriggerTriggers(state))
                                                       
                                   
  const mirrored = Object.values(state.objects)
    .filter((o) => o.defId === 'SFD-030')
    .map((o) => attachedTo(o))
    .filter((x): x is NonNullable<typeof x> => x !== undefined)
  out.push(...mirrorScoringTriggers(state, out, mirrored))
                                                       
                                                     
                                                       
  out.push(...mirrorScoringTriggers(state, out, conquerMirrorUnits(state), 'conquer'))
  return out
}

                                               
                                                                            

function enemyUnitsOnField(state: GameState, controller: PlayerId): string[] {
  const ids: string[] = []
  for (const bf of zonesByKind(state, 'battlefield')) {
    for (const oid of bf.contents) {
      const o = state.objects[oid]
      if (o && o.controller !== controller) ids.push(oid)
    }
  }
  return ids
}

export function spellChainItems(state: GameState): string[] {
  return state.chain.filter((i) => i.kind === 'spell').map((i) => i.id)
}

   
                                                            
                         
                                                     
                                                                 
                                                   
                                                                    
                                              
                                                                             
   
export function chainItemsTargetingMine(state: GameState, me: PlayerId): string[] {
  return state.chain
    .filter((i) => {
      if (i.controller === me) return false        
      if (i.kind !== 'spell' && i.kind !== 'ability' && i.kind !== 'triggered') return false          
                                                   
      const oids = targetsOf(i)
                                                    
                                                                      
                                                            
                                                 
                                                                                   
                                                 
                                                             
                                                            
      return oids.some((oid) => {
        const o = state.objects[oid as never]
        return o !== undefined && o.controller === me && (isUnit(o) || isEquipment(o))             
      })
    })
    .map((i) => i.id)
}

   
                                           
                                                               
                                         
                                                           
   
export function spellChainItemsUnderCost(state: GameState, maxMana: number, maxPips?: number): string[] {
  return state.chain
    .filter((i) => {
      if (i.kind !== 'spell' || !i.cardOid) return false
      const defId = state.objects[i.cardOid]?.defId
      const spec = defId ? PLAY_SPECS[defId] : undefined
      if ((spec?.cost.mana ?? 0) > maxMana) return false              
      if (maxPips !== undefined && (spec?.cost.pips ?? []).length > maxPips) return false        
      return true
    })
    .map((i) => i.id)
}
const spellChainItemsUnderMana = (state: GameState, maxMana: number): string[] =>
  spellChainItemsUnderCost(state, maxMana)

   
                                                                
                                                               
                 
                      
                                                                             
                                                         
                                                                      
                                                          
   
export function rechosenTarget(orig: string | undefined, self?: { readonly rechoice?: { readonly target?: unknown } }): string | undefined {
  const re = self?.rechoice?.target as string | undefined
  if (re === undefined) return orig
  if (orig === undefined || !orig.includes(':')) return re
  return `${orig.slice(0, orig.indexOf(':'))}:${re}`
}

   
                                                                                
  
                                                     
                                 
  
                                       
                                             
                                                 
                                                       
                                                      
                                                             
  
                                                                        
                                                 
                                                          
                                             
                                                                                
                                                                        
                                                          
                                                     
  
                                                                   
                                                        
                                              
   
export function seizedSpellRechoiceCandidates(
  state: GameState, seizedItemId: string, newController: PlayerId,
): string[] {
  const item = state.chain.find((i) => i.id === seizedItemId)
  if (!item || !item.cardOid) return []
  const defId = state.objects[item.cardOid]?.defId
  if (defId === undefined) return []
  const spec = playSpecFor(defId)                               
  if (!spec) return []                                                
                                                                                      
                                                                                                  
  const legal = spellLegalTargets(spec, state, newController, seizedItemId)                                                      
                                                     
  const prior = new Set<string>(targetsOf(item))
  if (item.rechoice?.target !== undefined) {
    for (const oid of decodeTargetOids(item.rechoice.target as string)) prior.add(oid)
  }
  return legal.filter((t) => {
    if (t === item.chosenTarget) return false                                          
    const oids = decodeTargetOids(t)
    if (oids.length === 0) return true               
    return oids.every((oid) => !prior.has(oid))                              
  })
}

export const PLAY_SPECS: Readonly<Record<string, PlaySpec>> = {
  'UNL-182': UNL_182_SPEC, // 完美谢幕(第485轮·专属法术):三份印刷回响 + 四选一未选过的效果
  'SFD-077': SFD_077_SPEC, // 火箭轰击(第486轮·§820.2.a 举例卡):印刷回响{4}{蓝} + 二选一(不互斥)
  'OGN-029': OGN_029_SPEC, // 星落(第490轮·errata 展开成两条独立指示):两次各3点,可重复选同一个
  'OGN-248': OGN_248_SPEC, // 艾卡西亚暴雨(第490轮·同族):六次各2点
  'OGN-134': OGN_134_SPEC, // 动员(第489轮):召一枚休眠符文,召不出则抽一张
  'OGN-138': OGN_138_SPEC, // 万世催化石(第489轮):召两枚休眠符文,召不满两枚则抽一张(§430.5 举例卡)
  'OGN-114': OGN_114_SPEC, // 进化日(第150轮):抽四张牌
  'OGN-229': OGN_229_SPEC, // 复仇(第151轮):摧毁一名单位
  'UNL-180': UNL_180_SPEC, // 破败之咒(第152轮):摧毁所有单位
  'OGN-201': OGN_201_SPEC, // 反转时间线(第157轮):每人弃光手牌然后抽四张
  'OGN-105': OGN_105_SPEC, // 星芒凝汇(第157轮):对最多两名单位各6点
  'OGN-123': OGN_123_SPEC, // 过载能量(第158轮):友方全休眠,然后战场上全体12点
  'OGN-043': OGN_043_SPEC, // 魅惑妖术(第158轮):移动一名敌方单位
  'UNL-124': UNL_124_SPEC, // ★543 隔绝:把一名敌方单位从战场赶回【它自己控制者的】基地;那儿若还剩落单的敌方则抽1
  'VEN-105': VEN_105_SPEC, // ★529 奥义!幽步:移动一名不高于3战力的单位(敌我都算)+ [流转4紫色]
  'UNL-038': UNL_038_SPEC, // 升龙踢(第187轮):同上第一句 + {等级6>}【追加】眩晕一名敌方单位
  'OGN-258': OGN_258_SPEC, // ★592 猛龙摆尾:移动一名敌方单位,再让它与【终点处另一名】敌方单位互殴
                                       
  'OGN-250': OGN_250_SPEC,
  'UNL-204': UNL_204_SPEC,
  'OGN-260': OGN_260_SPEC, // ★611 狂风绝息斩
  'SFD-198': SFD_198_SPEC, // ★598 沙兵现身:每件武装出一名沙兵,然后【内嵌式触发】让其中最多两名变活跃
  'UNL-101': UNL_101_SPEC, // ★594 战斗号令:我移一名单位进我控制的战场,再由【选中的对手自己】送一名过来
  'SFD-107': SFD_107_SPEC, // ★595 击倒:以配装友方的战力打一名敌方,然后卸除它一件武装(§359.3.e.12 举例卡)
  'SFD-204': SFD_204_SPEC, // 狩猎(第159轮):你的所有单位变活跃
  'VEN-150': VEN_150_SPEC, // 加速之门(第159轮):最多四个单位/装备/符文变活跃
  'OGS-002': OGS_002_SPEC, // 烈火风暴(第159轮):一处战场的所有敌方单位各3点
  'SFD-147': SFD_147_SPEC, // 坠渊之流(第159轮):所有单位和装备回所属手牌
  'VEN-131': VEN_131_SPEC, // 团结箴言(第159轮):摧毁一个紫色敌方单位或装备
  'OGN-209': OGN_209_SPEC, // 清理门户(第160轮):每名玩家必须摧毁一名自己的单位
  'OGN-187': OGN_187_SPEC, // 飓风席卷(第160轮):从下一名玩家起各可让一名单位回手
  'OGN-237': OGN_237_SPEC, // ★591 国王诏令:从下一名玩家起【每名其他玩家】各选一个非我方且未被选过的单位,一起摧毁
  'VEN-103': VEN_103_SPEC, // 往日阴影(第160轮):最多两名单位从任意废牌堆回所属手牌
  'UNL-015': UNL_015_SPEC, // 占山为王(第168轮):抽1,每控制一处战场再抽1
  'SFD-200': SFD_200_SPEC, // 奥术跃迁(第262轮):放逐友方→拥有者无视费用打出;战场上敌方吃3点;放逐此牌
                                                 
  'OGN-122': OGN_122_SPEC,
                                                                  
  ...PUMP_SPELL_SPECS,
                                                              
  ...DAMAGE_SPELL_SPECS,
  ...STUN_SPELL_SPECS, // 第340轮:「眩晕一名单位」法术族(OGN-050 / SFD-040)
  ...EQUIPMENT_SPELL_SPECS, // 第342轮:「一件装备」为目标的法术族(SFD-135 / UNL-070)
  ...DESTROY_SPELL_SPECS, // 第344轮:「摧毁…」法术族(OGS-012 / OGN-022)
  'OGN-170': OGN_170_SPEC, // 第344轮:亡者复生(废牌堆捞单位回手)
  ...TOKEN_BATCH_SPECS, // 第345轮:「打出 N 名指示物」法术族(OGS-015 / UNL-069)
  'OGN-145': OGN_145_SPEC, // 第347轮:坚毅不倒(本回合法术/技能伤害归零)
  'OGN-268': OGN_268_SPEC, // 第349轮:弹幕时间(付 N 枚{A} ⇒ 一处战场所有敌方各 N 点)
                                                             
                                                 
  ...Object.fromEntries(NEGATE_SPELLS.map((r) =>
    [r.defId, makeNegateSpellSpec(r, spellChainItems, spellChainItemsUnderCost, chainItemsTargetingMine)])),
                                                                 
  ...TWO_TARGET_SPECS,
  'UNL-184': UNL_184_SPEC, // 狩猎律动(第265轮):放逐友方→拥有者无视费用打到任意一处战场
  'UNL-186': UNL_186_SPEC, // 涌泉之恨(第285轮):摧毁战场上一名单位;≤3[S] 则授予一次从废牌堆打出
  'VEN-066': VEN_066_SPEC, // 时空裂隙(第279轮):放逐一名单位→拥有者无视费用打回同一位置
  'VEN-106': VEN_106_SPEC, // ★第385轮 风灵瞬转:战场上一名单位,战力≤3 放逐 / 否则返回其所属手牌
  'VEN-127': VEN_127_SPEC, // ★第386轮 血戮:一名单位,已强化则解除,然后战力≤3 则摧毁
  'UNL-107': UNL_107_SPEC, // ★第388轮 对峙:选友方单位+战场,该处战力更低的敌方单位召回基地,获得1经验
  'OGN-102': OGN_102_SPEC, // ★第380轮 传送门大营救:放逐一名友方单位→拥有者无视费用打回所属基地
  'VEN-090': VEN_090_SPEC, // ★第538轮 末日决斗:每名玩家各留一个自己的单位,其余全摧毁
  'OGN-062': OGN_062_SPEC, // 增援(第271轮):看顶五张→放逐一名单位→减5法力打出→其余回收
  'UNL-032': UNL_032_SPEC, // 龙虎双雄(362):看顶三张→取一名单位进手牌→其余回收;[回响2]走 echo
  'SFD-188': SFD_188_SPEC, // 虚空猛冲(第272轮):展示顶两张→放逐一张→减2法力打出→其余【抽走】
  'OGN-025': OGN_025_SPEC, // ★642 暴怒冲动:每名对手展示顶1→选一张放逐→全免打出→其余回收
  'OGN-115': OGN_115_SPEC, // ★646 光明未来:每人看自己顶5放逐一张余回收→从下家起各自半免打出
  'OGN-071': OGN_071_SPEC, // ★647 次元门狂欢:每名对手二选一(卡牌=各抽1/符文=各召1休眠符文)
  'UNL-200': UNL_200_SPEC, // ★648 镜花水月:选一名单位→打1活跃映像到你基地→内嵌复制+瞬息
  'UNL-103': UNL_103_SPEC, // ★654 处置命令:二选一(回收对手废牌堆最多3张/抽1)
  'UNL-020': UNL_020_SPEC, // ★737 曼舞手雷:2伤+对手可付{{A}}乒乓回敬每炸+1
  'OGN-244': OGN_244_SPEC, // ★730 圣裁之刻:双方四类多选保留+其余回收
  'UNL-044': makeUNL044Spec({ spellChainItems }), // ★662 羽毛旋风:二选一(无效化链上法术/打四战鹰)
  'UNL-017': UNL_017_SPEC, // ★688 怒吼清算:回响—弃一张手牌(echoDiscard 首例);单体本回合[强攻4]
  'OGN-053': OGN_053_SPEC, // ★692 慈悲度魂落:友方单体 grantBuff+本回合增益额外+1(第二十四本账)
  'UNL-139': UNL_139_SPEC, // ★694 透骨尖钉:对手手牌单位免费打出到所选战场+内嵌眩晕(errata 版)
  'SFD-154': SFD_154_SPEC, // ★663 护驾!:打2[S]黄沙士兵+内嵌可付黄让其活跃(errata 内嵌式)
  'OGN-266': OGN_266_SPEC, // ★664 虹吸能量:选战场,该处友方+1/敌方-1下限1至回合末
  'OGN-256': OGN_256_SPEC, // ★669 妖异狐火:选战场,摧毁总计战力不高于4的任意数量单位
  'VEN-148': VEN_148_SPEC, // ★671 奥义!影缚:移敌方到我有单位的战场,恰两名各+1([流转5AA])
  'SFD-111': SFD_111_SPEC, // ★672 前来相助:可从手牌打一名单位到我控战场减3([待命][迅捷])
  'VEN-034': VEN_034_SPEC, // ★676 回音击:选我控战场+其他位置我控单位,移动+2([待命][反应])
  'VEN-156': VEN_156_SPEC, // ★666 奥义!雷铠:查顶3指定抽1余进废([流转2A])
  'VEN-012': VEN_012_SPEC, // ★667 表里杀缭乱:一名单位活跃+本回合强攻3([流转3红色])
  'OGN-262': OGN_262_SPEC, // ★656 天顶之刃:眩晕战场敌方单位+可选移友方跟进
  'UNL-168': UNL_168_SPEC, // ★660 忠诚不渝:从废牌堆免费打出双上限单位(减费在 loyaltyCostMods)
                                                                       
  'SFD-206': makeSFD206Spec({
    spellChainItems,
    spellManaOf: (state, itemId) => {
      const item = state.chain.find((i) => i.id === itemId && i.kind === 'spell')
      if (!item || !item.cardOid) return undefined
      const defId = state.objects[item.cardOid]?.defId
      return defId === undefined ? undefined : (PLAY_SPECS[defId]?.cost.mana ?? 0)              
    },
  }),
  'UNL-198': UNL_198_SPEC, // ★643 月之降临:选我有单位的战场→可移最多一名敌方→该处敌方 -2
  'OGN-198': OGN_198_SPEC, // 蚀魂夜(第273轮):从废牌堆打出一名单位,无视法力费(符能照付)——与 OGN-196 同一句话
  'VEN-089': VEN_089_SPEC, // 狂野钩爪(第274轮):看顶五张→放逐一个常驻牌→减5法力打出→其余回收→可强化该牌
  'UNL-110': UNL_110_SPEC, // 巨人之战(第168轮):选两名单位相互以自身战力互殴
  'OGN-153': OPEN_ACTION_SPEC as unknown as PlaySpec, // 公开行动:消耗任意数量友方增益使其活跃,然后给所有友方单位增益
  'OGN-146': PAIN_SPEC as unknown as PlaySpec, // 痛殴:可消耗一个增益改付(无视费用)→ 让一名单位变活跃
  'OGN-207': GLORY_SPEC as unknown as PlaySpec, // 荣耀召唤:同上改付 → 一名单位本回合+3战力
                                            
  'UNL-131': {
    defId: 'UNL-131',
    cardNo: 'UNL-131/219',
    name: '遗弃',
    kind: 'spell',
    cost: { mana: 2 }, // 卡面核:2法力+0符能(2026-07-20)
    keywords: ['反应'],
    target: 'chainSpell',
    legalTargets: (state) => spellChainItems(state),
    makeResolve:
      ({ target, controller }) =>
      (state, _chosen, self) => {
        const rt = rechosenTarget(target, self)                 
        const out: import('../src/loop/events').GameEvent[] = []
                                                                       
                                                              
        if (rt !== undefined && state.chain.some((it) => it.id === rt)) {
          out.push({ kind: 'negate', target: rt, returnToHand: true })                     
        }
        out.push({ kind: 'insight', player: controller, count: 1 })            
        return out
      },
  },
                                       
                                             
    
                                                  
                                                
                                                    
                                                                                  
                                                 
                                         
                                                          
                                                    
  'OGN-080': {
    defId: 'OGN-080',
    cardNo: 'OGN·080/298',
    name: '倒转神通',
    kind: 'spell',
    cost: { mana: 4, pips: [['green'], ['green'], ['green']] }, // 卡面核:4法力+3绿pip(CARD_COSTS 现查,不从卡文推)
    keywords: ['反应'],
    target: 'chainSpell',
    legalTargets: (state) => spellChainItems(state), // ⚠️ 全部法术项目(无费用上限、不分敌我)
    makeNextChoice:
      ({ movedCardOid, target, controller }) =>
      (state, chosen) => {
        if (!target) return null
        if (chosen['rechoose'] !== undefined) return null
                                                                      
                                                                              
                                                                
        const cands = seizedSpellRechoiceCandidates(state, target, controller)
          .map((t) => ({ id: t, label: `重选目标→${t}` }))
                                                
        if (cands.length === 0) return null
                                           
        cands.push({ id: 'keep', label: '不重选(保留原目标)' })
                                                                                 
                                                            
                                           
        return {
          itemId: `play:${movedCardOid}`, controller,
          key: 'rechoose', prompt: '倒转神通:为被夺法术指定新目标?(§752.1)', candidates: cands,
        }
      },
    makeResolve:
      ({ target, controller }) =>
      (state, chosen) => {
        if (!target) return []
                                                                     
        if (!state.chain.some((it) => it.id === target)) return []
        const rechoose = chosen?.['rechoose'] && chosen['rechoose'] !== 'keep' ? chosen['rechoose'] : undefined
                                                                   
        return [{ kind: 'seize', target, newController: controller, ...(rechoose ? { rechoiceTarget: rechoose } : {}) }]
      },
  },
                                                          
  'VEN-152': {
    defId: 'VEN-152',
    cardNo: 'VEN·152',
    name: '灵魂折镜',
    kind: 'spell',
    cost: { mana: 1, pips: [['blue', 'purple']] }, // 卡面核:1法力+1符能pip(蓝|紫双域[C],§135.2.e.6.c)(2026-07-20)
    keywords: ['反应'],
    target: 'chainSpell',
    legalTargets: (state) => spellChainItemsUnderMana(state, 4), // §206 印刷法力费≤4
    makeNextChoice:
      ({ movedCardOid, target, controller }) =>
      (state, chosen) => {
        if (!target) return null
                                                                                    
                                                                           
        if (!state.chain.some((it) => it.id === target)) return null
        const iid = `play:${movedCardOid}`
        if (chosen.payA === undefined) {
          const canA = canPayFromState(state, controller, { pips: [[]] })                                  
          const cands = canA
            ? [{ id: 'yes', label: '支付[A]→夺控' }, { id: 'no', label: '不付→无效化' }]
            : [{ id: 'no', label: '无法付[A]→无效化' }]
          return { itemId: iid, controller, key: 'payA', prompt: '灵魂折镜:是否支付[A]夺取此法术控制权?', candidates: cands }
        }
        if (chosen.payA === 'yes' && chosen.rechoose === undefined) {
                                                                        
                                                                                
                                                                    
          const cands = seizedSpellRechoiceCandidates(state, target, controller)
            .map((t) => ({ id: t, label: `重选目标→${t}` }))
                                                             
          if (cands.length === 0) return null
          cands.push({ id: 'keep', label: '不重选(保留原目标)' })
                                                                                   
                                                              
                                             
                                                                      
          return { itemId: iid, controller, key: 'rechoose', prompt: '为被夺法术重选目标(§752.1)', candidates: cands }
        }
        return null
      },
    makeResolve:
      ({ target, controller }) =>
      (state, chosen) => {
        if (!target) return []
                                                                         
        if (!state.chain.some((it) => it.id === target)) return []
        if (chosen?.payA === 'yes') {
          const rechoose = chosen.rechoose && chosen.rechoose !== 'keep' ? chosen.rechoose : undefined
          return [
            { kind: 'spend', player: controller, cost: { pips: [[]] } }, // 付[A](任意域符能§135.2.e.5)
            { kind: 'seize', target, newController: controller, ...(rechoose ? { rechoiceTarget: rechoose } : {}) }, // §751+§754
          ]
        }
        return [{ kind: 'negate', target, returnToHand: false }]                    
      },
  },
                                             
  'OGN-169': {
    defId: 'OGN-169',
    cardNo: 'OGN·169/298',
    name: '罡风',
    kind: 'spell',
    cost: { mana: 1 }, // 卡面核:1法力+0符能(2026-07-20)
    keywords: ['反应'],
    target: 'enemyUnit', // 语义=场上单位(敌我皆可,galeTargets 不过滤控者;PlayTargetKind 枚举暂无泛'unit')
    legalTargets: (state) => galeTargets(state),
    makeResolve:
      ({ target }) =>
      (state, _chosen, self) => {
                                                      
        return returnToOwnerHand(state, (self?.rechoice?.target ?? target) as string | undefined) as never
      },
  },
                                  
  'OGN-083': {
    defId: 'OGN-083',
    cardNo: 'OGN·083/298',
    name: '借鉴历史',
    kind: 'spell',
    cost: { mana: 4 }, // 卡面核:4法力+0符能(2026-07-20)
    keywords: ['待命', '反应'],
    target: 'none',
    legalTargets: () => [],
    makeResolve:
      ({ controller }) =>
      () => [{ kind: 'draw', player: controller, count: 2 }],
  },
                                       
  'SFD-164': SFD_164_SPEC, // 流沙陷坑(迅捷·摧毁战场上一名单位·手牌外减费2)第216轮
  'SFD-031': SFD_031_SPEC, // 点沙成兵(回响2·打出2[M]黄沙士兵)第226轮
  'UNL-013': UNL_013_SPEC, // 莲花陷阱(待命+反应·本回合该单位受到的伤害翻倍)第236轮
  'VEN-126': VEN_126_SPEC,
  'UNL-192': UNL_192_SPEC, // ★522 阿尔法突袭:选一名友方单位，它向战场上敌方分摊合计=其战力的伤害；每死一个得1经验
  'SFD-194': SFD_194_SPEC, // 反击风暴(364):选一名单位本回合抵挡其下一次伤害;抽1 // 忍法!气合盾(反应·本回合抵挡该单位 7 点伤害)第237轮
  'OGN-254': OGN_254_SPEC, // 诺克萨斯断头台(迅捷·本回合它下次受伤时摧毁;鼓舞则立即)第239轮
  'OGN-221': OGN_221_SPEC, // 帝国谕令(迅捷·本回合任意单位一受伤就摧毁)第240轮
  'UNL-073': UNL_073_SPEC, // 致命华彩(3点伤害;它本回合被摧毁则出休眠金币)第241轮
  'SFD-166': SFD_166_SPEC, // 集结部队(迅捷·本回合友方单位被打出就给增益;抽1)第241轮
  'VEN-146': VEN_146_SPEC, // 汲魂痛击(4/7点伤害;它本回合被摧毁则召出休眠符文)第242轮
  'UNL-095': UNL_095_SPEC, // 视死如归(迅捷·本回合+3力;它赢一场战斗则获2经验)第242轮
  'UNL-175': UNL_175_SPEC, // 战术撤退(反应·本回合它下次被摧毁改为清伤+休眠+召回)第240轮
  'OGS-020': OGS_020_SPEC, // 高原血统(同上,费用与域不同)第240轮
  'VEN-051': VEN_051_SPEC, // 迭代式设计(打出3[M]机器人·流转2蓝色)第226轮
  'VEN-144': VEN_144_SPEC,
  'UNL-046': UNL_046_SPEC, // 动物之友(第255轮) // 禁奥义!瞬狱影杀阵(燃烧3+出影分身·流转1AA)第252轮
  'OGN-172': {
    defId: 'OGN-172', cardNo: 'OGN·172/298', name: '责退', kind: 'spell',
    cost: { mana: 2, pips: [['purple'], ['purple']] }, // 卡面核:2法力+双紫pip(2026-07-21)
    keywords: ['迅捷'],
    target: 'enemyUnit', // 语义=战场上任意单位
    legalTargets: (state) => battlefieldUnits(state),
    makeResolve:
      ({ target, controller }) =>
      (state, _chosen, self) => {
                                                                    
        const eff = (self?.rechoice?.target ?? target) as string | undefined
        if (!spellTargetStillLegal({ legalTargets: battlefieldUnits }, state, controller, eff)) return []
                           
        return returnToOwnerHand(state, eff) as never
      },
  },
                                                                                
                                                                                
  'VEN-035': {
    defId: 'VEN-035', cardNo: 'VEN·035', name: '念化盈虚', kind: 'spell',
    cost: { mana: 3, pips: [['green']] }, // 卡面核:3法力+1绿pip(2026-08-11)
    keywords: ['反应'],
    target: 'enemyUnit', // 语义=按前缀编码的两种模式目标
    legalTargets: (state, controller) => [
                                                   
      ...allUnitsOnField101(state).filter((o) => !isEmpowered(state.objects[o as ObjId])).map((o) => `emp:${o}`),
                                 
      ...allUnitsOnField101(state).filter((o) => isEmpowered(state.objects[o as ObjId])).map((o) => `dis:${o}`),
    ],
    makeResolve:
      ({ target: target0, controller }) =>
      (state, _chosen, self) => {
        const target = rechosenTarget(target0, self)                      
        if (!target) return []
        const [mode, oid] = [target.slice(0, target.indexOf(':')), target.slice(target.indexOf(':') + 1)]
        if (!state.objects[oid as ObjId]) return []
        const toEmpower = mode === 'dis'                             
        return [
          { kind: toEmpower ? 'disempower' : 'empower', target: oid },
          { kind: 'delayedTrigger', add: {
            id: delayedTriggerId('empowerFlipAtTurnEnd', 'VEN-035', oid as ObjId),
            controller, sourceDefId: 'VEN-035',
            kind: 'empowerFlipAtTurnEnd', target: oid as ObjId, toEmpower,
          } },
        ] as never
      },
  },
                                                                            
  'VEN-052': {
    defId: 'VEN-052', cardNo: 'VEN·052', name: '惑心转意', kind: 'spell',
    cost: { mana: 1, pips: [['blue']] }, // 卡面核:1法力+1蓝pip(2026-07-21)
    keywords: ['反应'],
    target: 'enemyUnit',
    legalTargets: (state, controller) => [
      ...friendlyUnits(state, controller).map((o) => `back:${o}`),
      ...battlefieldUnits(state).filter((o) => state.objects[o]?.controller !== controller).map((o) => `weak:${o}`),
    ],
    makeResolve:
      ({ target: target0, controller: _c }) =>
      (state, _chosen, self) => {
        const target = rechosenTarget(target0, self)                      
        if (!target) return []
        const [mode, oid] = [target.slice(0, target.indexOf(':')), target.slice(target.indexOf(':') + 1)]
        const o = state.objects[oid]
        if (!o) return []
        if (mode === 'back') return returnToOwnerHand(state, oid) as never                 
        return [{
          kind: 'addEffect',
          effect: { id: `VEN-052:${oid}`, duration: 'thisTurn', fromPassive: false, predicate: (x: { oid: string }) => x.oid === oid, modification: { kind: 'addMight', delta: -2 } },
        }]
      },
  },
                                                      
  'OGN-104': {
    defId: 'OGN-104', cardNo: 'OGN·104/298', name: '择日再战', kind: 'spell',
    cost: { mana: 1 }, // 卡面核:1法力+0pip(2026-07-21)
    keywords: ['反应'],
    target: 'enemyUnit',
    legalTargets: (state, controller) => friendlyUnits(state, controller),
    makeResolve:
      ({ target: target0 }) =>
      (state, _chosen, self) => {
        const target = rechosenTarget(target0, self)                 
        const o = target ? state.objects[target] : undefined
        if (!target || !o) return []
        return [
          ...(returnToOwnerHand(state, target) as never[]), // ★第377轮:第一条收口到共用件
          { kind: 'summonRune', player: o.owner, count: 1, dormant: true }, // "让【其拥有者】召出"
        ]
      },
  },
                             
  'SFD-087': {
    defId: 'SFD-087', cardNo: 'SFD·087/221', name: '先知之兆', kind: 'spell',
    cost: { mana: 2, pips: [['blue'], ['blue'], ['blue']] }, // 卡面核:2法力+三蓝pip(2026-07-21)
    keywords: ['反应'],
    target: 'none',
    legalTargets: () => [],
    makeResolve:
      ({ controller }) =>
      () => [{ kind: 'draw', player: controller, count: 3 }],
  },
                                                     
  'VEN-008': VEN_008_SPEC, // ★495 无情打击:付了额外费(弃一张手牌)则改为5点 —— 法术额外费通道首张
  'UNL-140': UNL_140_SPEC, // ★497 强制征召:付5经验则目标域从「≤3[S]」放宽到「任意」
  'SFD-182': SFD_182_SPEC,
  'UNL-007': UNL_007_SPEC, // ★第504轮 惩戒 // ★501 危险温度:[反应]+回响{1}{A};我方「机械」单位本回合[S]+1
  'UNL-173': UNL_173_SPEC, // ★500 牺牲:[反应];必须摧毁一名友方[强力]单位;抽两张+召一枚休眠符文
  'UNL-142': UNL_142_SPEC, // ★500 残酷复活:[反应];必须摧毁一名友方单位;从废牌堆无视费用打出费用不高于它的单位
  'SFD-080': SFD_080_SPEC, // ★499 风箱炎息:[迅捷]+回响1蓝;同一位置最多三名各1点(含基地、不分敌我)
  'SFD-122': SFD_122_SPEC, // ★499 预判攻势:[迅捷]+回响紫;查看顶两张抽一张回收另一张(不发 revealed)
  'SFD-114': SFD_114_SPEC, // ★498 行军号令:[迅捷]+回响3;一友(含基地)一敌(限战场)互伤
  'SFD-023': SFD_023_SPEC, // ★498 透体圣光:回响2红;战场一名2点,然后最多另一名(含基地)2点
  'OGN-048': OGN_048_SPEC, // ★496 冥想:休眠一名友方单位则抽两张,否则抽一张(errata 改的形状)
  'VEN-083': VEN_083_SPEC, // ★496 暴走:一友一敌互伤;付了{橙}则友方本回合+2
  'OGN-168': OGN_168_SPEC, // 战或逃:一名、不分敌我
  'SFD-043': SFD_043_SPEC, // 禁军之墙:一处、任意数量、只友方
                                            
  'SFD-145': {
    defId: 'SFD-145', cardNo: 'SFD·145/221', name: '换换乐', kind: 'spell',
    cost: { mana: 2, pips: [['purple'], ['purple']] }, // 卡面核:2+双紫pip(2026-07-21)
    keywords: ['待命', '迅捷'],
    target: 'enemyUnit',
    legalTargets: (state) => sameBfPairs(state),
                                                             
                                                     
    makeResolve:
      ({ target }) =>
      (state) => {
        if (!target?.startsWith('swap:')) return []
        const [, a, b] = target.split(':')
        const oa = a ? state.objects[a] : undefined
        const ob = b ? state.objects[b] : undefined
        if (!oa || !ob) return []
        const ma = effectiveMight(oa).actual
        const mb = effectiveMight(ob).actual
                                                                
                                                            
        const mk = (oid: string, delta: number) => ({
          kind: 'addEffect' as const,
          effect: { id: `SFD-145:${oid}:${delta}`, duration: 'thisTurn' as const, fromPassive: false, predicate: (o: { oid: string }) => o.oid === oid, modification: { kind: 'addMight' as const, delta } },
        })
        return [mk(a!, mb - ma), mk(b!, ma - mb)]                         
      },
  },
                                                   
  'OGN-264': {
    defId: 'OGN-264', cardNo: 'OGN·264/298', name: '游击战', kind: 'spell',
    cost: { mana: 2, pips: [['blue', 'purple']] }, // 卡面核:2+1[C]pip(蓝|紫,2026-07-21)
    keywords: [],
    target: 'none',
    legalTargets: () => [],
    choiceTiming: 'confirm', // ★1800【缺陷 257 · §355.7】「让最多两张待命卡牌从废牌堆里返回你的手牌」= 打出时选目标
    firstAskOptional: true, // ★1802c §355.13:卡文「让**最多两张**待命卡牌…返回你的手牌」⇒ 含 0
    makeNextChoice:
      ({ movedCardOid, controller }) =>
      (state, chosen) => {
        const iid = `play:${movedCardOid}`
        const already = [chosen.r1, chosen.r2].filter((x) => x !== undefined && x !== 'done') as string[]
        const key = chosen.r1 === undefined ? 'r1' : chosen.r2 === undefined ? 'r2' : null
        if (!key) return null
        const cands = standbyCardsInDiscard(state, controller, (d) => cardKeywords(d).includes('待命'))
          .filter((oid) => !already.includes(oid))
          .map((oid) => ({ id: oid, label: `回收 ${state.objects[oid]?.defId ?? oid} 到手牌` }))
        if (cands.length === 0 && key === 'r1') return null                       
        if (cands.length === 0) return null
        cands.push({ id: 'done', label: key === 'r1' ? '一张都不回收' : '只回收这一张' })
        return { itemId: iid, controller, key, prompt: `游击战:选择返手的待命卡(${key === 'r1' ? '第1张' : '第2张'},最多2张)`, candidates: cands,
          isTarget: true, // ★1782 让最多两张待命卡牌从废牌堆里返回你的手牌
          }
      },
    makeResolve:
      ({ controller }) =>
      (state, chosen) => {
        const evs: import('../src/loop/events').GameEvent[] = []
                                                                      
                                                    
        const legal = standbyCardsInDiscard(state, controller, (d) => cardKeywords(d).includes('待命'))
        for (const k of ['r1', 'r2'] as const) {
          const oid = chosen?.[k]
          if (oid && oid !== 'done' && legal.includes(oid)) evs.push({ kind: 'zoneChange', obj: oid as never, to: `hand:${controller}` as never })
        }
        evs.push({ kind: 'freeStandby', player: controller })               
        return evs
      },
  },
                                                                        
  'OGN-183': {
    defId: 'OGN-183', cardNo: 'OGN·183/298', name: '卡牌骗术', kind: 'spell',
    cost: { mana: 1 }, // 卡面核:1+0(2026-07-21)
    keywords: ['迅捷'],
    target: 'none',
    legalTargets: () => [],
    makeNextChoice:
      ({ movedCardOid, controller }) =>
      (state, chosen) => {
        if (chosen.take !== undefined) return null
        const deck = state.zones[`mainDeck:${controller}`]
        const top3 = (deck?.contents ?? []).slice(-3).reverse()       
        if (top3.length === 0) return null
        const cands = top3.map((oid) => ({ id: oid, label: `拿 ${state.objects[oid]?.defId ?? '?'}` }))
        return { itemId: `play:${movedCardOid}`, controller, key: 'take', prompt: '卡牌骗术:顶3选1进手,其余回收', candidates: cands }
      },
    makeResolve:
      ({ controller }) =>
      (state, chosen) => {
        const take = chosen?.take
        if (!take) return []
        const deck = state.zones[`mainDeck:${controller}`]
        const top3 = (deck?.contents ?? []).slice(-3)
        const rest = top3.filter((oid) => oid !== take)
        return [
                                                                            
                                                           
                                                                       
                                                               
                                                     
                                                                                               
                                                            
                                                                           
                                                 
                                              
          { kind: 'viewed', player: controller, cards: top3 } as never,
          { kind: 'zoneChange', obj: take as never, to: `hand:${controller}` as never },
                                                                             
          ...(rest.length > 0 ? [{ kind: 'recycle' as const, player: controller, objs: rest as never[] }] : []),
        ]
      },
  },
                                                         
  'UNL-125': {
    defId: 'UNL-125', cardNo: 'UNL-125/219', name: '月神恩赐', kind: 'spell',
    cost: { mana: 3 }, // 卡面核:3+0(2026-07-21)
    keywords: ['反应'],
    target: 'none',
    legalTargets: () => [],
    makeNextChoice:
      ({ movedCardOid, controller }) =>
      (state, chosen) => {
        if (chosen.toss !== undefined) return null
        const hand = state.zones[`hand:${controller}`]?.contents ?? []
        if (hand.length === 0) return null
        const cands = hand.map((oid) => ({ id: oid, label: `弃置 ${state.objects[oid]?.defId ?? '?'}` }))
        return { itemId: `play:${movedCardOid}`, controller, key: 'toss', prompt: '月神恩赐:弃置一张手牌,然后抽两张牌', candidates: cands }
      },
    makeResolve:
      ({ controller }) =>
      (state, chosen) => {
        const evs: import('../src/loop/events').GameEvent[] = []
        const toss = chosen?.toss
        if (toss && state.objects[toss]) evs.push({ kind: 'zoneChange', obj: toss as never, to: `discard:${controller}` as never })
        evs.push({ kind: 'draw', player: controller, count: 2 })
        return evs
      },
  },
                                                       
  'UNL-134': {
    defId: 'UNL-134', cardNo: 'UNL-134/219', name: '存在焦虑', kind: 'spell',
    cost: { mana: 1, pips: [['purple']] }, // 卡面核:1法力+1紫pip(2026-07-21)
    echo: { mana: 2 }, // §820 回响{2}
    keywords: ['迅捷'],
    target: 'enemyUnit',
    legalTargets: (state, controller) => attackingEnemies(state, controller),
    makeResolve:
      ({ target: target0 }) =>
      (state, _chosen, self) => {
        const target = rechosenTarget(target0, self)                 
        const o = target ? state.objects[target] : undefined
        if (!target || !o) return []
                                
        return o.status.stunned === true
          ? (returnToOwnerHand(state, target) as never)                 
          : [{ kind: 'stun', target: target as never }]
      },
  },
                                                                           
  'UNL-031': UNL_031_SPEC, // 实战经验:让一名单位本回合+1;等级6 改为 +3
  ...UTILITY_SPELL_SPECS, // 【无目标·纯收益法术】族(第323轮 3 张:OGN-047/SFD-076/UNL-091)
  'OGN-270': OGN_270_SPEC, // 叹为观止:给基地里友方单位增益,然后移到一处战场(第324轮)
  'OGN-173': OGN_173_SPEC, // 驭风而行:移动一名友方单位,然后让它变为活跃(第325轮)
  'SFD-184': SFD_184_SPEC, // 冷酷追击(迅捷):移动友方+可贴武装+本回合授予征服回基地(第456轮)
  'OGS-011': OGS_011_SPEC, // 闪现:最多两名友方单位从战场撤回基地(第328轮)
  'UNL-202': UNL_202_SPEC, // 虚空来袭:移动一名友方单位,然后移动一名敌方单位(第329轮)
  'SFD-129': SFD_129_SPEC, // 诱饵:把一名敌方单位挪到它同伴所在的位置(第330轮)
  'VEN-107': VEN_107_SPEC, // 不和箴言:总计战力≤5 的序理敌方单位返回其拥有者手牌(第331轮)
  'UNL-054': UNL_054_SPEC, // 顽皮触手:同控制者、总计战力≤8 的敌方单位聚到同一位置(第332轮)
  'OGN-179': OGN_179_SPEC, // 折戟再战:每名玩家各摧毁自己的一件装备(第333轮)
  'SFD-136': makeSFD136Spec(spellChainItems), // 强买强卖:其控制者不付{2}就无效化(第334轮)
  'OGN-033': OGN_033_SPEC, // ★632 巧取豪夺:同骨架敌方二选一(抽两张 or 6点伤害)
  'VEN-140': VEN_140_SPEC, // ★636 隼舞:最多一名(skip档)2点伤害+移动友方(OGN-173 通用件)
  'UNL-106': makeUNL106Spec(targetsOf), // ★640 击退:选战场友方,无效化以它为目标的敌方法术/技能(targetsOf 注入)
  'OGN-156': OGN_156_SPEC, // 暗中破坏:看对手手牌挑一张非单位卡让他回收(第335轮)
  'VEN-085': VEN_085_SPEC, // ★589 力量箴言:同族,只差筛选判据(灵光=蓝色,§134.2.c)
  'OGN-203': OGN_203_SPEC, // ★第378轮 据为己有:夺取战场上一名敌方单位并召回到我基地
  'SFD-202': SFD_202_SPEC, // ★第459轮 恶意收购:夺控+变活跃,回合结束还控并召回(loseControlAtTurnEnd)
  'VEN-031': VEN_031_SPEC, // 我流奥义!霞阵:给一名友方单位本回合+1并敌方不可选;[流转2]
  'DEMO-BOLT': {
    defId: 'DEMO-BOLT',
    cardNo: 'DEMO-BOLT',
    name: '灼击(演示)',
    kind: 'spell',
    cost: { mana: 1 },
    keywords: [], // 非反应:仅开环主阶段可打(起链)
    target: 'enemyUnit',
    legalTargets: (state, controller) => enemyUnitsOnField(state, controller),
    makeResolve:
      ({ target, controller, movedCardOid }) =>
      (_state, _chosen, self) => [{ kind: 'damage', target: (self?.rechoice?.target ?? target) as ObjId, amount: 2, sourcePlayer: controller, source: movedCardOid as ObjId }], // §754 被夺控重选后打新目标
  },
}

                                        
export function handPlaySpecs(state: GameState, player: PlayerId): PlaySpec[] {
                                              
                                                               
                                                                      
                                                                  
                                                                
                                            
  const hand = [
    ...(state.zones[`hand:${player}`]?.contents ?? []),
    ...(state.zones[`heroZone:${player}`]?.contents ?? []),
    ...extraPlaySourcesFor(state, player),
  ]
  const seen = new Set<string>()
  const out: PlaySpec[] = []
  for (const oid of hand) {
    const o = state.objects[oid]
    if (!o || seen.has(o.defId)) continue
    const spec = PLAY_SPECS[o.defId]
    if (spec) { out.push(spec); seen.add(o.defId) }
  }
  return out
}

                                        
                                                                            
const UNIT_COST: Record<string, Cost> = {
  'OGN-070': { mana: 6, pips: [['green']] }, // ★732 搜魔人典狱长(1pip 绿)
  'UNL-163': { mana: 4 }, // ★733 搜魔人巡管(0pip)
  'UNL-086': { mana: 5, pips: [['blue']] }, // ★736 基兰(1pip 蓝)
  'VEN-022': { mana: 5, pips: [['red']] }, // ★738 无尽秘藏(装备 1pip 红)
  'OGN-150': { mana: 3, pips: [['orange'], ['orange']] }, // ★739 海妖猎手(2pip 橙)
  'OGN-231': { mana: 6, pips: [['yellow'], ['yellow'], ['yellow'], ['yellow']] }, // ★739 莱卓斯(4pip 黄)
  'OGN-194': { mana: 4, pips: [['purple']] }, // ★746 魔腾(1pip 紫)
  'SFD-018': { mana: 2 }, // ★748 虚空兽苗(0pip)
                                                          
  'UNL-056': { mana: UNL_056.energy ?? 0, pips: [['green']] },
  'OGN-107': { mana: OGN_107.energy ?? 0 }, // ★600 艾娃 5+0pip(registryCoverage 闸)
  'VEN-044': { mana: VEN_044.energy ?? 0 }, // ★597 星界灵鹭 7+0pip(registryCoverage 闸:登了触发就得登费用)
                                             
  'OGN-017': { mana: OGN_017.energy ?? 0 }, // 钢铁弩炮 3+0pip
  'VEN-062': { mana: VEN_062.energy ?? 0 }, // 海克斯方程式 2+0pip
  'UNL-049': { mana: UNL_049.energy ?? 0 }, // 蜜糖果实 2+0pip
  'UNL-136': { mana: UNL_136.energy ?? 0 }, // 占卜花朵 1+0pip(第186轮)
  'VEN-193': { mana: 0 }, // 暮光之眼(传奇 0 费)
  'OGN-277': { mana: OGN_277.energy ?? 0 }, // 后巷酒吧(战场,0费)
  'OGN-296': { mana: OGN_296.energy ?? 0 }, // 虚空之门(战场,0费)
  'OGS-001': { mana: OGS_001.energy ?? 0, pips: [['red']] }, // 安妮 5+1红pip(第190轮)
  ...ATTACK_STUN_UNIT_COST, // 进攻眩晕族(第353轮族表化;老的单行登记已并进来)
  'OGN-032': { mana: OGN_032.energy ?? 0 }, // 邪鸦魔典 3+0pip(第192轮)
  'OGN-177': { mana: OGN_177.energy ?? 0, pips: [['purple']] }, // 隐秘追踪者 4+1紫pip(第193轮)
  'VEN-025': { mana: VEN_025.energy ?? 0 }, // 圣职尊者 5+0pip(第193轮)
  'UNL-105': { mana: UNL_105.energy ?? 0 }, // 气势逼人的挑战者 5+0pip(第194轮)
  'OGN-293': { mana: OGN_293.energy ?? 0 }, // 宏伟广场(战场,0费)(第194轮)
                                                                     
  'VEN-096': { mana: VEN_096.energy ?? 0 }, // 影刃潜伏者 5+0pip
  'SFD-012': { mana: SFD_012.energy ?? 0 }, // 攻城锤 5+0pip
  'VEN-064': { mana: VEN_064.energy ?? 0 }, // 广场守卫 10+0pip
  'SFD-103': { mana: SFD_103.energy ?? 0, pips: [['orange'], ['orange']] }, // 琢珥鱼 7+2橙pip
           
  'UNL-104': { mana: UNL_104.energy ?? 0 }, // 温驯的宝石龙 8+0pip
  'SFD-130': { mana: SFD_130.energy ?? 0 }, // 寻宝猎人 2+0pip
  'VEN-004': { mana: VEN_004.energy ?? 0 }, // 沙丘冲浪者 3+0pip(第291轮)
  'VEN-094': { mana: VEN_094.energy ?? 0 }, // 面具之母 3+0pip(★542)
                                                             
                                                                
                               
  'OGN-006': { mana: OGN_006.energy ?? 0 },
  'VEN-053': { mana: VEN_053.energy ?? 0 }, // ★583 章獭 2法力+0pip(CARD_COSTS 现查)
  'VEN-102': { mana: VEN_102.energy ?? 0 }, // 拉文布鲁姆级长 3+0pip(第292轮)
  'SFD-075': { mana: SFD_075.energy ?? 0, pips: [['blue']] }, // 进步荣光 4+1蓝pip(第293轮)
  'SFD-100': { mana: SFD_100.energy ?? 0 }, // 约德尔探险家 4+0pip(第294轮)
  'VEN-168': { mana: VEN_168.energy ?? 0, pips: [['red']] }, // 金克丝 3+1红pip(第295轮)
  'VEN-179': { mana: VEN_179.energy ?? 0, pips: [['orange']] }, // 雷恩加尔 5+1橙pip(第296轮)
  'UNL-120': { mana: 5, pips: [['orange']] }, // 雷恩加尔(另一卡号)5+1橙pip(360)
                     
  'OGN-208': { mana: OGN_208.energy ?? 0 }, // 冷血贵族 4+0pip
  'SFD-044': { mana: SFD_044.energy ?? 0 }, // 军团军需官 3+0pip
                      
  'OGN-002': { mana: OGN_002.energy ?? 0 }, // 粗鲁的海盗 6+0pip
  'UNL-178': { mana: UNL_178.energy ?? 0, pips: [['yellow']] }, // 波比 6+1黄pip
  'UNL-170': { mana: UNL_170.energy ?? 0, pips: [['yellow'], ['yellow'], ['yellow']] }, // 厄塔汗 10+3黄pip(第199轮)
                    
  'OGN-118': { mana: OGN_118.energy ?? 0, pips: [['blue']] }, // 残响之魂 6+1蓝pip
  'VEN-002': { mana: VEN_002.energy ?? 0 }, // 旋风剑客 4+0pip
           
  'OGN-162': { mana: OGN_162.energy ?? 0, pips: [['orange']] }, // 厄运小姐 5+1橙pip
  'VEN-068': { mana: VEN_068.energy ?? 0, pips: [['blue']] }, // 杰斯 6+1蓝pip
  'SFD-148': { mana: SFD_148.energy ?? 0, pips: [['purple']] }, // 德莱文 6+1紫pip(第202轮)
  'UNL-174': { mana: UNL_174.energy ?? 0 }, // 逆转碎片 6+0pip(第203轮)
  'UNL-215': { mana: UNL_215.energy ?? 0 }, // 流星疗泉(战场,0费)(第203轮)
           
  'VEN-167': { mana: VEN_167.energy ?? 0, pips: [['red']] }, // 蔚 2+1红pip
  'ARC-001': { mana: ARC_001.energy ?? 0, pips: [['red']] }, // 蔚(异画) 2+1红pip
  'OGN-099': { mana: OGN_099.energy ?? 0 }, // 拾荒小能手 2费 0pip(第205轮)
  'OGN-235': { mana: OGN_235.energy ?? 0, pips: [['yellow']] }, // 卡尔玛 6+1黄pip(第206轮)
  'SFD-203': { mana: 0 }, // 战争女神(传奇,0费)(第207轮)
  'SFD-142': { mana: SFD_142.energy ?? 0, pips: [['purple'], ['purple']] }, // 贾尔 5+2紫pip(第210轮)
  'OGN-292': { mana: 0 }, // 幻梦之树(战场,0费)(第210轮)
  'SFD-057': { mana: SFD_057.energy ?? 0 }, // 艾瑞莉娅 5费 0pip(第211轮)
  'VEN-174': { mana: 5 }, // 艾瑞莉娅(另一卡号)5费 0pip(358)
  'UNL-126': { mana: 6 }, // 巨牙海兽 6费 0pip(358)
  'SFD-199': { mana: 0 }, // 探险家(传奇,0费)(第212轮)
  'ARC-005': { mana: ARC_005.energy ?? 0, pips: [['purple']] }, // 金克丝 5+1紫pip(第214轮)
  'OGN-027': { mana: OGN_027.energy ?? 0, pips: [['red']] }, // 德莱厄斯 5+1红pip(第214轮)
  'UNL-074': { mana: UNL_074.energy ?? 0 }, // 冰封宝石 2费 0pip(第215轮)
  'SFD-010': { mana: SFD_010.energy ?? 0 }, // 虚空蜢 3费 0pip(第216轮)
  'SFD-164': { mana: SFD_164.energy ?? 0, pips: [['yellow']] }, // 流沙陷坑 5+1黄pip(第216轮)
  'VEN-098': { mana: VEN_098.energy ?? 0 }, // 观星者 5费 0pip(第217轮)
  'VEN-164': { mana: VEN_164.energy ?? 0 }, // 沙蚀墓穴(战场,0费)(第218轮)
  'VEN-163': { mana: VEN_163.energy ?? 0 }, // 升格圣坛(战场,0费)(第221轮)
  'VEN-161': { mana: VEN_161.energy ?? 0 }, // ★584 皮城锻炉(战场,0费)
  'SFD-215': { mana: SFD_215.energy ?? 0 }, // ★588 拉文布鲁姆学院(战场,0费)
  'UNL-211': { mana: 0 }, // ★686 失落书库(战场,0费)
  'VEN-024': { mana: VEN_024.energy ?? 0 }, // 贴贴魄罗 3费 0pip(第222轮)
  'UNL-189': { mana: 0 }, // 含羞蓓蕾(传奇,0费)(第223轮)
  'SFD-031': { mana: SFD_031.energy ?? 0 }, // 点沙成兵 2费 0pip(第226轮)
  'VEN-051': { mana: VEN_051.energy ?? 0 }, // 迭代式设计 4费 0pip(第226轮)
  'VEN-144': { mana: VEN_144.energy ?? 0, pips: [['red', 'purple']] }, // 瞬狱影杀阵 2费+1枚红/紫pip(第252轮)
  'VEN-112': { mana: VEN_112.energy ?? 0 }, // 劫 5费 0pip(第253轮)
  'UNL-196': { mana: UNL_196.energy ?? 0, pips: [['green'], ['yellow']] }, // 小菊! 9费+绿黄各1pip(第255轮)
  'UNL-046': { mana: UNL_046.energy ?? 0 }, // 动物之友 1费 0pip(法术也进这张,铁律214)
  'UNL-045': { mana: UNL_045.energy ?? 0 }, // 被遗忘的路标 2费 0pip(第256轮)
  'VEN-108': { mana: VEN_108.energy ?? 0 }, // 遗落圣物 5费 0pip(第257轮)
  'OGN-160': { mana: OGN_160.energy ?? 0, pips: [['orange'], ['orange']] }, // 闪耀极光 9费+2橙pip(第258轮)
  'SFD-200': { mana: SFD_200.energy ?? 0, pips: [['blue', 'purple']] }, // 奥术跃迁 3费+1【双色单】pip(第262轮)
  'UNL-184': { mana: UNL_184.energy ?? 0, pips: [['red', 'orange']] }, // 狩猎律动 2费+1【双色单】pip(第265轮)
  'VEN-066': { mana: VEN_066.energy ?? 0, pips: [['blue']] }, // 时空裂隙 2费+1蓝pip(第279轮)
  'OGN-102': { mana: OGN_102.energy ?? 0, pips: [['blue']] }, // ★第380轮 传送门大营救 3费+1蓝pip(★带触发的法术照 VEN-066 也进这张表,不然覆盖闸判它免费)
  'UNL-138': { mana: UNL_138.energy ?? 0 }, // 夺命名单 1费+0pip(第280轮)
  'UNL-177': { mana: UNL_177.energy ?? 0 }, // 艾翁 6费+0pip(第281轮)
  'VEN-132': { mana: VEN_132.energy ?? 0, pips: [['yellow']] }, // 坠落猫咪 2费+1黄pip(第282轮)
  'SFD-078': { mana: SFD_078.energy ?? 0 }, // 预时之门 3费+0pip(第283轮)
  'VEN-133': { mana: VEN_133.energy ?? 0 }, // 发光石 2费+0pip(第284轮)
  'SFD-171': { mana: SFD_171.energy ?? 0, pips: [['yellow']] }, // 烈娜塔·戈拉斯克 4费+1黄pip(第287轮)
  'UNL-186': { mana: UNL_186.energy ?? 0, pips: [['red', 'purple']] }, // 涌泉之恨 4费+1红/紫pip(第285轮)
  'OGN-062': { mana: OGN_062.energy ?? 0 }, // 增援 5费+0pip(第271轮)
  'SFD-188': { mana: SFD_188.energy ?? 0, pips: [['red', 'yellow']] }, // 虚空猛冲 2费+1【双色单】pip(第272轮)
  'OGN-198': { mana: OGN_198.energy ?? 0, pips: [['purple'], ['purple']] }, // 蚀魂夜 6费+【两枚】紫pip(第273轮)
  'VEN-089': { mana: VEN_089.energy ?? 0, pips: [['orange']] }, // 狂野钩爪 7费+1橙pip(第274轮)
  'SFD-243': { mana: 0 }, // 虚空遁地兽(传奇,第275轮):传奇不打出,记 0(照 OGN-253)
  'UNL-148': { mana: UNL_148.energy ?? 0, pips: [['purple']] }, // 受诅咒的石棺 4费+1紫pip(第276轮)
  'SFD-026': { mana: SFD_026.energy ?? 0 }, // 兰博 4费+0pip(第278轮)
  'OGN-242': { mana: OGN_242.energy ?? 0 }, // 海兽钓钩 3费 0pip(第259轮)
  'OGN-117': { mana: OGN_117.energy ?? 0, pips: [['blue']] }, // 维克托·创见先驱 4+1蓝pip(第227轮)
  'OGN-212': { mana: OGN_212.energy ?? 0 }, // 未来熔炉(常驻装备,非武装)2+0pip(第228轮)
  'SFD-046': { mana: SFD_046.energy ?? 0, pips: [['green']] }, // 魄罗佳肴 1+1绿pip(第229轮)
  'OGN-098': { mana: OGN_098.energy ?? 0 }, // 能量通道 3+0pip(第229轮)
  'OGN-124': { mana: OGN_124.energy ?? 0 }, // 竞技场酒吧 3+0pip(第229轮)
  'SFD-117': { mana: SFD_117.energy ?? 0, pips: [['orange']] }, // 远古簇碑 2+1橙pip(第230轮)
  'SFD-083': { mana: SFD_083.energy ?? 0, pips: [['blue']] }, // 海克斯异常体 3+1蓝pip(第230轮)
  'SFD-019': { mana: SFD_019.energy ?? 0 }, // 装配架 4+0pip(第231轮)
  'OGN-023': { mana: OGN_023.energy ?? 0 }, // 来路不明的武器 2+0pip(第238轮)
  'OGN-021': { mana: OGN_021.energy ?? 0, pips: [['red']] }, // 太阳圆盘 2+1红pip(第243轮)
  'UNL-078': { mana: UNL_078.energy ?? 0, pips: [['blue']] }, // 精灵提灯 2+1蓝pip(第244轮)
  'SFD-104': { mana: SFD_104.energy ?? 0 }, // 禁魔石丰碑 2+0pip(第245轮)
  'OGN-077': { mana: OGN_077.energy ?? 0 }, // 中娅沙漏 2+0pip(第246轮)
  'OGN-228': { mana: OGN_228.energy ?? 0 }, // 先锋之盔 2+0pip(第247轮)
  'SFD-144': { mana: SFD_144.energy ?? 0 }, // 灵魂之轮 2+0pip(第247轮)
  'UNL-161': { mana: UNL_161.energy ?? 0 }, // 占卜贝壳 2+0pip(第248轮)
  'OGN-063': { mana: OGN_063.energy ?? 0, pips: [['green']] }, // 奥义!魂佑 2+1绿pip(第248轮)
  'UNL-011': { mana: UNL_011.energy ?? 0 }, // 魔法鲜豆 2+0pip(第249轮)
  'UNL-109': { mana: UNL_109.energy ?? 0 }, // 猩红玫瑰 1+0pip(第249轮)
  'UNL-133': { mana: UNL_133.energy ?? 0, pips: [['purple']] }, // 喷射球果 4+1紫pip(第250轮)
  'VEN-023': { mana: VEN_023.energy ?? 0, pips: [['red']] }, // 劫 4+1红pip(第251轮)
  'VEN-169': { mana: VEN_169.energy ?? 0, pips: [['red']] }, // 劫(同文再版)第251轮
  'UNL-085': { mana: UNL_085.energy ?? 0 }, // 地沟区地图 2+0pip(第245轮)
  'OGN-186': { mana: OGN_186.energy ?? 0 }, // 无主宝藏 2+0pip(第232轮)
  'OGN-227': { mana: OGN_227.energy ?? 0 }, // 烈阳徽记 1+0pip(第234轮)
  'SFD-168': { mana: SFD_168.energy ?? 0, pips: [['yellow']] }, // 先锋军备 7+1黄pip(第235轮)
  'SFD-141': { mana: SFD_141.energy ?? 0, pips: [['purple']] }, // 艾瑞莉娅·绝世风华 4+1紫pip(第219轮)
  'VEN-SP5': { mana: VEN_SP5.energy ?? 0, pips: [['purple']] }, // 伊泽瑞尔·奥法逸才 3+1紫pip(第220轮)
  'SFD-149': { mana: SFD_149.energy ?? 0, pips: [['purple']] }, // 伊泽瑞尔·奥法逸才(SFD 版)3+1紫pip(第220轮)
                                                                       
                                                                           
  'VEN-007': { mana: 2 },                    // 拳拳魄罗 2+0pip
  'VEN-054': { mana: 3 },                    // 可疑之书 3+0pip
  'VEN-075': { mana: 3 },                    // 剑头蛟的卵 3+0pip
  'VEN-087': { mana: 4, pips: [['orange']] },// 海克斯圆盘 4+1橙pip
  'UNL-150': { mana: UNL_150.energy ?? 0 }, // 薇古丝 4+0pip(卡面核)
  'UNL-081': { mana: UNL_081.energy ?? 0 }, // 赐面守侍 2+0pip(卡面核)
  'OGN-121': { mana: OGN_121.energy ?? 0, pips: [['blue']] }, // 军事家 2+1蓝pip(卡面核)
  'OGN-197': { mana: OGN_197.energy ?? 0 }, // 提莫·斥候 2+0pip(卡面核)
  'OGN-196': { mana: OGN_196.energy ?? 0, pips: [['purple'], ['purple']] }, // 咂魂者 8+【两枚】紫pip(卡面核)
  'OGN-226': { mana: OGN_226.energy ?? 0, pips: [['yellow'], ['yellow']] }, // ★第399轮 幽灵主母 4+【两枚】黄pip(returnEnergy=2)
  'OGN-097': { mana: OGN_097.energy ?? 0, pips: [['blue']] }, // 爆裂球果 2+1蓝pip(卡面核)
  'SFD-138': { mana: SFD_138.energy ?? 0 }, // 吟风翼 2+0pip(卡面核)
  'OGN-199': { mana: OGN_199.energy ?? 0 }, // 控潮者 2+0pip(卡面核)
  'UNL-071': { mana: UNL_071.energy ?? 0 }, // 环刃舞者 3+0pip(卡面核)
  'OGN-087': { mana: OGN_087.energy ?? 0 }, // 约德尔教官 3+0pip(卡面核)
  'UNL-149': { mana: UNL_149.energy ?? 0, pips: [['purple']] }, // 黛安娜·超脱凡界 4+1紫pip(卡面核)
  'UNL-087': { mana: UNL_087.energy ?? 0, pips: [['blue']] }, // 苍蓝雕纹魔像 4+1蓝pip(卡面核)
  'UNL-043': { mana: 3 }, // 热情的播报员 3费 0pip(355)
  'UNL-122': { mana: UNL_122.energy ?? 0 },
  'UNL-166': { mana: UNL_166.energy ?? 0, pips: [['yellow']] }, // ★第502轮 卡面实测 4法力 + 1黄pip // ★501 新月禁卫 4+0pip(卡面核 4/4)
                                                                              
  'OGN-068': { mana: OGN_068.energy ?? 0, pips: [['green']] },  // 凯特琳-守望者 3+1绿pip(卡面核)
  'UNL-026': { mana: UNL_026.energy ?? 0 }, // ★586 泽拉斯 5法力+0pip(CARD_COSTS 现查;卡文那个{红色}是【技能费】)
  'SFD-173': { mana: SFD_173.energy ?? 0, pips: [['yellow']] }, // 索拉卡-星尘逆旅 4+1黄pip(卡面核)
  'UNL-079': { mana: UNL_079.energy ?? 0 }, // 黛安娜·皎月化身 3+0pip(卡面核)
  'UNL-088': { mana: UNL_088.energy ?? 0 }, // 倾颓宫殿 4+0pip(卡面核)
  'OGN-101': { mana: OGN_101.energy ?? 0 }, // 蘑菇袋 2+0pip(卡面核)
                                                                      
  'OGN-109': { mana: OGN_109.energy ?? 0, pips: [['blue'], ['blue']] },
  'OGN-181': { mana: OGN_181.energy ?? 0 }, // 奇妙行囊 2+0pip(卡面核)
  'VEN-043': { mana: VEN_043.energy ?? 0 }, // 钢爪 1+0pip(卡面核 2026-08-05)
  'VEN-001': { mana: VEN_001.energy ?? 0 }, // 巴凯旋沙者 6+0pip(卡面核 2026-08-05)
  'VEN-021': { mana: VEN_021.energy ?? 0 }, // 阿卡丽 3+0pip(卡面核 2026-08-05)
  'VEN-032': { mana: VEN_032.energy ?? 0 }, // 霜衣狼母 3+0pip(卡面核 2026-08-05)
  'VEN-110': { mana: VEN_110.energy ?? 0 }, // 梅尔 5+0pip(卡面核 2026-08-06)
  'VEN-104': { mana: VEN_104.energy ?? 0 }, // 披尾女族长 4+0pip(★强化技能那 {2}{紫} 是另一笔账,第264轮)
  'VEN-114': { mana: VEN_114.energy ?? 0 }, // ★696 卡洛克斯 6+0pip(强化技能那 {6}{紫}{紫} 是另一笔账)
  'UNL-181': { mana: UNL_181.energy ?? 0 }, // ★703 戏命师传奇 {mana:0}
  'UNL-195': { mana: UNL_195.energy ?? 0 }, // ★712 翠神传奇 {mana:0}(233/233* 折叠)
  'SFD-205': { mana: SFD_205.energy ?? 0 }, // ★714 无双剑姬传奇 {mana:0}(251 折叠)
  'OGN-269': { mana: OGN_269.energy ?? 0 }, // ★716 腕豪传奇 {mana:0}(310/310* 折叠)
  'VEN-155': { mana: VEN_155.energy ?? 0 }, // ★720 狂暴之心传奇 {mana:0}(197 折叠)
  'UNL-187': { mana: UNL_187.energy ?? 0 }, // ★721 皮城执法官传奇 {mana:0}(229/229* 折叠)
  'VEN-145': { mana: VEN_145.energy ?? 0 }, // ★722 沙漠死神传奇 {mana:0}
  'VEN-192': { mana: VEN_145.energy ?? 0 }, // ★722 同上(无组双登 ㊼ ★710)
  'UNL-199': { mana: UNL_199.energy ?? 0 }, // ★723 诡术妖姬传奇 {mana:0}(235/235* 折叠)
  'OGN-247': { mana: OGN_247.energy ?? 0 }, // ★725 虚空之女传奇 {mana:0}(299/299* 折叠)
  'OGS-014': { mana: OGS_014.energy ?? 0 }, // ★726 拉克丝:4费(登了技能的单位必登 ㊼ UNL-160)
  'SFD-189': { mana: SFD_189.energy ?? 0 }, // ★726 山隐之焰传奇 {mana:0}(244 折叠)
  'VEN-141': { mana: VEN_141.energy ?? 0 }, // ★726 荒漠屠夫传奇 {mana:0}(190 折叠)
  'VEN-125': { mana: VEN_125.energy ?? 0 }, // ★727 冰原饿狼:4费(登了技能的单位必登 ㊼ UNL-160)
  'UNL-118': { mana: UNL_118.energy ?? 0, pips: [['orange'], ['orange'], ['orange'], ['orange']] }, // ★729 远古巨龙:12费 4橙pip(㊼ SFD-120 pip 也要登)
  'UNL-118a': { mana: UNL_118.energy ?? 0, pips: [['orange'], ['orange'], ['orange'], ['orange']] }, // ★729 同上(无组双登)
  'UNL-147': { mana: 10, pips: [['purple'], ['purple'], ['purple']] }, // ★710 纳什男爵 10+3紫pip(上游实测)
  'UNL-238': { mana: 10, pips: [['purple'], ['purple'], ['purple']] }, // ★710 同上(双印次)
  'VEN-050': { mana: VEN_050.energy ?? 0 }, // 凶暴的岩熊 4+0pip(卡面核 2026-08-06)
  'VEN-093': { mana: VEN_093.energy ?? 0 }, // ★627 均衡渡命人 4费 **0pip**(⚠️与 VEN-070 的 1pip 不同,现查过)
  'VEN-122': { mana: VEN_122.energy ?? 0 }, // ★665 烈阳之鹰 3费 0pip(现查过)
  'VEN-134': { mana: VEN_134.energy ?? 0 }, // ★670 凯尔 3费 0pip(现查过)
  'VEN-070': { mana: VEN_070.energy ?? 0, pips: [['orange']] }, // 残暴猎手 3+1orangepip(第112轮修:原登记漏了 pip,注释却写着卡面核——真值 returnEnergy=1)
  'VEN-047': { mana: VEN_047.energy ?? 0 }, // 见习法师 3+0pip(卡面核 2026-08-06)
  'VEN-018': { mana: VEN_018.energy ?? 0, pips: [['red']] }, // 怒火放大器 4+1redpip(第112轮修:原登记漏了 pip,注释却写着卡面核——真值 returnEnergy=1)
  'VEN-077': { mana: VEN_077.energy ?? 0 }, // 帝国工具 4+0pip(卡面核 2026-08-06)
  'VEN-045': { mana: VEN_045.energy ?? 0, pips: [['green']] }, // 抑制之盔 4+1greenpip(第112轮修:原登记漏了 pip,注释却写着卡面核——真值 returnEnergy=1)
  'VEN-028': { mana: VEN_028.energy ?? 0 }, // 悲悯见证者 2+0pip(卡面核 2026-08-06)
  'VEN-046': { mana: VEN_046.energy ?? 0, pips: [['green']] }, // 内瑟斯 8+1greenpip(第112轮修:原登记漏了 pip,注释却写着卡面核——真值 returnEnergy=1)
  'OGN-056': { mana: OGN_056.energy ?? 0 }, // 自适应机器人 4+0pip(卡面核 2026-08-06)
  'OGN-152': { mana: OGN_152.energy ?? 0 }, // 雾临剑冢 3+0pip(卡面核 2026-08-06)
  'OGN-072': { mana: OGN_072.energy ?? 0 }, // 烈阳圣坛 3+0pip(卡面核 2026-08-06)
  'SFD-063': { mana: SFD_063.energy ?? 0 }, // 炼金科技桶 1+0pip(卡面核 2026-08-06)
  'SFD-169': { mana: SFD_169.energy ?? 0 }, // 追忆祭坛 2+0pip(卡面核 2026-08-07)
  'UNL-065': { mana: UNL_065.energy ?? 0 }, // 冰谷弓箭手 2费 0pip(★544;㊶ 上游 pips=0 ⇒ 一枚都不写)
  'VEN-009': { mana: VEN_009.energy ?? 0, pips: [['red']] }, // 巴凯收割者 3+1redpip(第112轮修:原登记漏了 pip,注释却写着卡面核——真值 returnEnergy=1)
  'SFD-035': { mana: SFD_035.energy ?? 0 }, // 幽径守卫 6+0pip(卡面核 2026-08-07)
  'VEN-048': { mana: VEN_048.energy ?? 0 }, // 云端亚龙 6+0pip
  'OGN-051': { mana: OGN_051.energy ?? 0 }, // 烈阳盾卫 3+0pip
  'OGN-132': { mana: OGN_132.energy ?? 0 }, // 大副 3+0pip
  'OGN-234': { mana: OGN_234.energy ?? 0, pips: [['yellow'], ['yellow']] }, // 龙骑兵 8+2黄pip(returnEnergy=2)
  'OGN-082': { mana: OGN_082.energy ?? 0, pips: [['green'], ['green']] }, // 苍炎守护者 8+2绿pip
  'VEN-026': { mana: VEN_026.energy ?? 0 }, // 战地乐团 4+0pip
  'OGN-092': { mana: OGN_092.energy ?? 0, pips: [['blue'], ['blue']] }, // 怒海大鲨炮 6+2蓝pip
  'SFD-158': { mana: SFD_158.energy ?? 0, pips: [['yellow'], ['yellow']] }, // 流沙术士 5+2黄pip
  'OGN-136': { mana: OGN_136.energy ?? 0 }, // 竞技场新人 2+0pip
  'OGN-130': { mana: OGN_130.energy ?? 0 }, // 神射海盗 3+0pip
  'VEN-020': { mana: VEN_020.energy ?? 0 }, // 暮光狂舞者 3+0pip
  'UNL-027': { mana: UNL_027.energy ?? 0, pips: [['red'], ['red']] }, // 天声玄龙 8+2红pip
  'OGN-188': { mana: OGN_188.energy ?? 0, pips: [['purple'], ['purple']] }, // 祖安保镖 4+2紫pip
                                                             
                                                                          
                                                                    
                                                             
  'OGN-165': { mana: OGN_165.energy ?? 0, pips: [['purple']] }, // 牧灵犬 3+1紫pip
  'SFD-061': { mana: SFD_061.energy ?? 0, pips: [['blue']] }, // 见习工程师 3+1蓝pip
                                          
  'OGN-164': { mana: OGN_164.energy ?? 0, pips: [['orange']] }, // 瑟提 5+1橙pip(returnEnergy=1)
  'OGN-230': { mana: OGN_230.energy ?? 0 }, // 阿不思 4+0pip
  'VEN-188': { mana: VEN_188.energy ?? 0 }, // 梅尔(VEN-110 再版号)5+0pip
  'UNL-137': { mana: UNL_137.energy ?? 0, pips: [['purple']] }, // 悚悚魄罗 2+1紫pip
  'SFD-128': { mana: SFD_128.energy ?? 0 }, // 狂热粉丝 2+0pip
  'UNL-123': { mana: UNL_123.energy ?? 0 }, // 永黯潜伏者 3+0pip
  'UNL-064': { mana: UNL_064.energy ?? 0 }, // 命运编织者 5+0pip
  'SFD-058': { mana: SFD_058.energy ?? 0, pips: [['green']] }, // 奥恩 5+1绿pip(returnEnergy=1)
  'UNL-051': { mana: UNL_051.energy ?? 0, pips: [['green']] }, // 艾翁 5+1绿pip(returnEnergy=1)
  'SFD-170': { mana: SFD_170.energy ?? 0, pips: [['yellow']] }, // 雷克塞 5+1黄pip(returnEnergy=1)
  'UNL-092': { mana: UNL_092.energy ?? 0 }, // 德玛西亚使节 0pip
  'UNL-157': { mana: UNL_157.energy ?? 0 }, // 严厉军士 0pip
  'OGN-038': { mana: OGN_038.energy ?? 0, pips: [['red'], ['red']] }, // 邪焰巨龙 2枚redpip(returnEnergy=2)
  'UNL-097': { mana: UNL_097.energy ?? 0 }, // 均衡门徒 0pip
  'SFD-062': { mana: SFD_062.energy ?? 0 }, // 泡泡机 0pip
  'SFD-072': { mana: SFD_072.energy ?? 0 }, // 滑板高手 0pip
  'SFD-007': { mana: SFD_007.energy ?? 0 }, // 晶能阻断器 0pip
  'OGN-225': { mana: OGN_225.energy ?? 0, pips: [['yellow']] }, // 烈阳首领 1枚yellowpip(returnEnergy=1)
  'OGN-211': { mana: OGN_211.energy ?? 0 }, // 忠实的工坊主 0pip
  'SFD-157': { mana: SFD_157.energy ?? 0 }, // 皇家守卫 0pip
  'UNL-033': { mana: UNL_033.energy ?? 0 }, // 调皮猎手 0pip
  'UNL-132': { mana: UNL_132.energy ?? 0, pips: [['purple']] }, // 提灯海煞 1枚pip
  'OGS-018': { mana: OGS_018.energy ?? 0, pips: [['red', 'purple'], ['red', 'purple']] }, // 提伯斯 2枚pip
  'OGS-010': { mana: OGS_010.energy ?? 0, pips: [['purple']] }, // 安妮 1枚pip
  'UNL-167': { mana: UNL_167.energy ?? 0, pips: [['yellow']] }, // 星獒 1枚pip
  'OGN-061': { mana: OGN_061.energy ?? 0, pips: [['green']] }, // 魄罗牧者 1枚pip
  'VEN-037': { mana: VEN_037.energy ?? 0 }, // 盗墓贼芭芭拉 0pip
  'OGN-149': { mana: OGN_149.energy ?? 0, pips: [['orange'], ['orange']] }, // 食肉蛇藤 2枚pip
  'SFD-039': { mana: SFD_039.energy ?? 0, pips: [['green']] }, // 皇家随从 1枚pip
  'SFD-174': { mana: SFD_174.energy ?? 0, pips: [['yellow'], ['yellow']] }, // 宝藏魔像 2枚pip
  'SFD-074': { mana: SFD_074.energy ?? 0 }, // 暗巷神偷 0pip
  'SFD-091': { mana: SFD_091.energy ?? 0, pips: [['orange']] }, // 芭茹队长 1枚pip
  'OGN-106': { mana: OGN_106.energy ?? 0, pips: [['blue']] }, // 精灵之母 1枚pip
  'UNL-084': { mana: UNL_084.energy ?? 0, pips: [['blue']] }, // 精灵女王 1枚pip
  'OGN-147': { mana: OGN_147.energy ?? 0 }, // 野爪萨满 0pip
  'SFD-069': { mana: SFD_069.energy ?? 0 }, // 坏坏魄罗 0pip
  'UNL-222': { mana: UNL_222.energy ?? 0 }, // 坏坏魄罗(再版) 0pip
  'SFD-152': { mana: SFD_152.energy ?? 0 }, // 显赫金主 0pip
  'VEN-042': { mana: VEN_042.energy ?? 0, pips: [['green']] }, // 慎 1枚pip
  'VEN-170': { mana: VEN_170.energy ?? 0, pips: [['green']] }, // 慎(再版) 1枚pip
  'OGN-222': { mana: OGN_222.energy ?? 0 }, // 诺克萨斯鼓手 0pip
  'SFD-038': { mana: SFD_038.energy ?? 0 }, // 绸舞士 0pip
  'OGN-066': { mana: OGN_066.energy ?? 0, pips: [['green']] }, // 阿狸 1枚pip
  'OGN-034': { mana: OGN_034.energy ?? 0, pips: [['red'], ['red']] }, // ★587 泰达米尔 7法力+**2红pip**(cardCosts 闸咬出来的)
                                             
  'UNL-193': { mana: 0 }, // 愁云使者(传奇)
  'UNL-232': { mana: 0 }, // 愁云使者(再版)(传奇)
                               
                            
                                                               
                                                     
  ...Object.fromEntries(Object.entries(SIGIL_DOMAIN_OF)
    .filter(([id]) => id in SIGIL_SPECS)
    .map(([id, dom]) => [id, { mana: 0, pips: [[dom]] }])),
  'OGN-257': { mana: 0 }, // 盲僧(传奇;再版 OGN-304 走别名)
                                               
  'OGN-123': { mana: OGN_123.energy ?? 0, pips: [['blue'], ['blue']] }, // 过载能量 7+2蓝pip
  'OGN-043': { mana: OGN_043.energy ?? 0, pips: [['green']] },          // 魅惑妖术 1+1绿pip
  'SFD-204': { mana: SFD_204.energy ?? 0, pips: [['orange', 'purple'], ['orange', 'purple']] }, // 狩猎 1+2pip(橙|紫)
  'VEN-150': { mana: VEN_150.energy ?? 0, pips: [['blue', 'orange']] }, // 加速之门 3+1pip(蓝|橙)
  'OGS-002': { mana: OGS_002.energy ?? 0, pips: [['red']] },            // 烈火风暴 6+1红pip
  'SFD-147': { mana: SFD_147.energy ?? 0, pips: [['purple'], ['purple']] }, // 坠渊之流 8+2紫pip
  'VEN-131': { mana: VEN_131.energy ?? 0, pips: [['yellow']] },         // 团结箴言 2+1黄pip
  'OGN-209': { mana: OGN_209.energy ?? 0, pips: [['yellow']] },         // 清理门户 2+1黄pip
  'OGN-187': { mana: OGN_187.energy ?? 0, pips: [['purple']] },         // 飓风席卷 4+1紫pip
  'VEN-103': { mana: VEN_103.energy ?? 0, pips: [['purple']] },         // 往日阴影 3+1紫pip
  'OGS-017': { mana: 0 },                                               // 黑暗之女(传奇,0费0pip)
  'OGN-055': { mana: OGN_055.energy ?? 0 },                             // 驭水者 3+0pip
  'UNL-154': { mana: UNL_154.energy ?? 0 },                             // 猩红飞鸽 3+0pip
  'OGS-004': { mana: OGS_004.energy ?? 0, pips: [['green']] },          // 易 5+1绿pip
  'OGS-019': { mana: 0 },                                               // 无极剑圣(传奇,0费0pip)
  'OGN-284': { mana: OGN_284.energy ?? 0 },                             // 力量方尖碑(战场,0费)
  'OGN-290': { mana: OGN_290.energy ?? 0 },                             // 荣耀竞技场(战场,0费)
  'SFD-060': { mana: SFD_060.energy ?? 0, pips: [['green'], ['green']] }, // ★530 缇亚娜·冕卫 7+2绿pip
  'SFD-209': { mana: SFD_209.energy ?? 0 },                             // 遗忘丰碑(战场,0费)
  'VEN-029': { mana: VEN_029.energy ?? 0 },                             // 老老魄罗 2+0pip
  'SFD-216': { mana: SFD_216.energy ?? 0 },                             // 落岩之径(战场,0费)
  'OGN-028': { mana: OGN_028.energy ?? 0, pips: [['red']] },            // 德莱文 5+1红pip
  'VEN-013': { mana: VEN_013.energy ?? 0 },                             // 暗影刺客 5+0pip
  'OGN-182': { mana: OGN_182.energy ?? 0 },                             // 废料堆(装备)2+0pip
  'OGS-006': { mana: OGS_006.energy ?? 0, pips: [['blue']] },           // 拉克丝 6+1蓝pip
  'OGS-021': { mana: 0 },                                               // 光辉女郎(传奇,0费0pip)
  'OGN-044': { mana: OGN_044.energy ?? 0 },                             // 小小守护者 2+0pip
  'SFD-098': { mana: SFD_098.energy ?? 0 }, // ★第414轮 船猿 2+0pip(可选额外费{1}→给我增益)
  'UNL-028': { mana: UNL_028.energy ?? 0 }, // ★第414轮 派克 3+0pip(可选额外费{红}→活跃+{S}+2)
  'SFD-013': { mana: SFD_013.energy ?? 0 }, // ★第415轮 爆破队学员 2+0pip
  'VEN-120': { mana: VEN_120.energy ?? 0 }, // ★第415轮 雷霆之怒 玛萨 4+0pip
  'SFD-067': { mana: SFD_067.energy ?? 0 }, // ★第415轮 霜衣幼崽 3+0pip
  'UNL-015': { mana: UNL_015.energy ?? 0, pips: [['red']] },            // 占山为王 3+1红pip
  'UNL-025': { mana: UNL_025.energy ?? 0 },                              // 不死军团 3+0pip(★从废牌堆打出另加一枚红 pip,见 unyieldingCostMods)
  'UNL-110': { mana: UNL_110.energy ?? 0, pips: [['orange'], ['orange']] }, // 巨人之战 6+2橙pip
  'SFD-047': { mana: SFD_047.energy ?? 0, pips: [['green']] },          // 山猿老祖 5+1绿pip
  'OGN-276': { mana: OGN_276.energy ?? 0 },                             // 攀圣长阶(战场,0费)
  'VEN-036': { mana: VEN_036.energy ?? 0, pips: [['green'], ['green']] }, // 砂岩奇美拉 7+2绿pip
  'SFD-025': { mana: SFD_025.energy ?? 0, pips: [['red']] },  // ★527 雷恩加尔·暴起 3+1红pip
  'SFD-025a': { mana: SFD_025A.energy ?? 0, pips: [['red']] }, // ★527 异画
  'OGN-161': { mana: OGN_161.energy ?? 0, pips: [['orange'], ['orange']] }, // ★528 亡花掠食者 8+2橙pip
  'OGN-176': { mana: OGN_176.energy ?? 0 }, // 鬼祟的水手 3费 0pip
  'SFD-093': { mana: SFD_093.energy ?? 0, pips: [['orange']] }, // 无畏先锋 4+1橙pip
  'OGN-174': { mana: 6 }, // 大塞斥候 6费 0pip(359)
  'OGN-193': { mana: OGN_193.energy ?? 0, pips: [['purple']] }, // ★第375轮 厄运小姐 4费 1紫pip
  'UNL-117': { mana: UNL_117.energy ?? 0, pips: [['orange']] }, // ★第454轮 空境掠翼龙 6费 1橙pip
  'OGN-018': { mana: OGN_018.energy ?? 0 }, // ★第379轮 诺克萨斯破坏者 3费 0pip
  'SFD-015': { mana: 4 }, // 栖息的冥龙 4费 0pip(359)
  'VEN-121': { mana: VEN_121.energy ?? 0, pips: [['yellow']] }, // 草包队长 4+1黄pip
  'OGN-139': { mana: 2 }, // 云丛的希思莉亚 2费 0pip(354)
  'VEN-063': { mana: 5, pips: [['blue']] }, // 内瑟斯 5+1蓝pip(354)
  'VEN-183': { mana: VEN_183.energy ?? 0, pips: [['purple']] }, // 黛安娜(异画) 4+1紫pip
  'OGN-011': { mana: OGN_011.energy ?? 0, pips: [['red']] }, // 熔浆巨龙 8+1红pip
  'UNL-191': { mana: 0 }, // 无极宗师(传奇)
  'UNL-231': { mana: 0 }, // 无极宗师(传奇·另一个卡号,不是再版)
                                                         
  'UNL-016': { mana: UNL_016.energy ?? 0, pips: [['red']] },    // 焰爪 3+1红pip
  'UNL-094': { mana: UNL_094.energy ?? 0 },                      // 晶手猎人 2费 0pip
  'UNL-098': { mana: UNL_098.energy ?? 0 },                      // 巨神峰先知 6费 0pip
  'UNL-113': { mana: UNL_113.energy ?? 0 },                      // 易 4费 0pip
  'UNL-151': { mana: UNL_151.energy ?? 0, pips: [['yellow']] },  // 班德尔士兵 4+1黄pip
  'UNL-047': { mana: UNL_047.energy ?? 0, pips: [['green']] },   // 踏苔蜥 3+1绿pip
  'UNL-075': { mana: UNL_075.energy ?? 0, pips: [['blue']] },    // 风行狐 3+1蓝pip
  'UNL-040': { mana: UNL_040.energy ?? 0 },                      // 无极学徒 2费 0pip
                                                         
  'SFD-105': { mana: SFD_105.energy ?? 0 },                      // 沙墟啸匪 6费 0pip
  'UNL-059': { mana: UNL_059.energy ?? 0, pips: [['green'], ['green'], ['green']] }, // 易 12+3绿pip
  'UNL-057': { mana: UNL_057.energy ?? 0, pips: [['green'], ['green']] }, // ★第381轮 野爪兽王 6+2绿pip
                                                                       
  'UNL-058': { mana: UNL_058.energy ?? 0 },
                                                  
  'SFD-028': { mana: SFD_028.energy ?? 0 },
                                                 
  'OGN-151': { mana: OGN_151.energy ?? 0 },
                                                  
  'SFD-020': { mana: SFD_020.energy ?? 0 },
                                                    
  'VEN-006': { mana: VEN_006.energy ?? 0 },
  'VEN-016': { mana: VEN_016.energy ?? 0 },
  'SFD-024': { mana: SFD_024.energy ?? 0 },
  'OGN-078': { mana: OGN_078.energy ?? 0, pips: [['green']] },
                                                    
  'VEN-124': { mana: VEN_124.energy ?? 0 },
                                                                        
                                                         
  'OGN-079': { mana: OGN_079.energy ?? 0, pips: [['green']] },
  'UNL-146': { mana: UNL_146.energy ?? 0, pips: [['purple']] }, // ★第483轮 辛德拉(英雄单位)6+1紫pip(cardCosts 实测)
  'SFD-049': { mana: SFD_049.energy ?? 0, pips: [['green']] }, // ★第487轮 厄斐琉斯 4+1绿pip(cardCosts 实测)
  'OGN-157': { mana: OGN_157.energy ?? 0, pips: [['orange']] }, // ★第488轮 乌迪尔 6+1橙pip(cardCosts 实测)
  'SFD-041': { mana: SFD_041.energy ?? 0 }, // ★第491轮 学徒铁匠 2+0pip
  'VEN-033': { mana: VEN_033.energy ?? 0 }, // ★第491轮 帕卡监护者 5+0pip
  'UNL-060': { mana: UNL_060.energy ?? 0, pips: [['green'], ['green']] }, // ★第382轮 卑鄙之喉 8+2绿pip
  'VEN-136': { mana: VEN_136.energy ?? 0 }, // ★第387轮 安蓓萨 5+0pip
  'VEN-084': { mana: VEN_084.energy ?? 0 }, // ★644 恶狼意志 4+0pip
  'VEN-181': { mana: VEN_181.energy ?? 0 }, // ★645 普朗克 6+0pip
  'UNL-144': { mana: UNL_144.energy ?? 0, pips: [['purple']] }, // ★第389轮 守门者马杜里 7+1紫pip
  'OGN-039': { mana: OGN_039.energy ?? 0 }, // ★第390轮 卡莎 4+0pip
  'VEN-SP4': { mana: VEN_SP4.energy ?? 0, pips: [['orange']] }, // ★第392轮 瑟提的另一个印刷号(与 OGN-164 同卡)
  'VEN-SP1': { mana: VEN_SP1.energy ?? 0 }, // 同上(SP 那组)
  'OGN-155': { mana: OGN_155.energy ?? 0, pips: [['orange']] }, // ★第392轮 奇亚娜 4+1橙pip(returnEnergy=1)
  'OGN-096': { mana: OGN_096.energy ?? 0 }, // ★第400轮 警觉的哨兵 2费 0pip([绝念]抽1)
  'OGN-216': { mana: OGN_216.energy ?? 0 }, // ★第400轮 侦察飞鹰 2费 0pip([绝念]召休眠符文)
  'SFD-155': { mana: SFD_155.energy ?? 0 }, // ★第401轮 诚实掮客 2费 0pip([绝念]出休眠金币)
  'OGN-239': { mana: OGN_239.energy ?? 0, pips: [['yellow']] }, // ★第401轮 机械戏法师 5费 1黄pip([绝念]出三名随从)
  'SFD-021': { mana: SFD_021.energy ?? 0, pips: [['red']] }, // ★第401轮 铁甲先锋 6费 1红pip([绝念]出两名机器人)
  'UNL-221': { mana: UNL_221.energy ?? 0 }, // ★第402轮 哀哀魄罗 2费 0pip([绝念]独自一处则抽1)
  'OGN-178': { mana: OGN_178.energy ?? 0, pips: [['purple']] }, // ★第403轮 卧底特工 5费 1紫pip([绝念]弃2抽2)
  'UNL-067': { mana: UNL_067.energy ?? 0, pips: [['blue']] }, // ★第403轮 破败大鲨炮 6费 1蓝pip([绝念]打4)
  'UNL-152': { mana: UNL_152.energy ?? 0 }, // ★第404轮 黑色玫瑰要员 3费 0pip([强攻] + [绝念]召休眠符文)
  'UNL-156': { mana: UNL_156.energy ?? 0 }, // ★第404轮 忠忠魄罗 3费 0pip([绝念]未落单则抽1)
  'SFD-167': { mana: SFD_167.energy ?? 0 }, // ★第404轮 无名英雄 2费 0pip([绝念]强力则抽2)
  'UNL-153': { mana: UNL_153.energy ?? 0 }, // ★第405轮 腐泥疏浚工 2费 0pip([绝念]出带法盾的战鹰)
  'OGN-075': { mana: OGN_075.energy ?? 0 }, // ★第405轮 美味仙灵 7费 0pip([急速] + [绝念]召两枚符文再抽1)
  'OGN-190': { mana: OGN_190.energy ?? 0, pips: [['purple']] }, // ★第406轮 克格莫 3费 1紫pip([绝念]全场打4)
  'UNL-172': { mana: UNL_172.energy ?? 0, pips: [['yellow']] }, // ★第406轮 乐芙兰 3费 1黄pip([强攻] + [绝念]抽1或2)
  'SFD-165': { mana: SFD_165.energy ?? 0, pips: [['yellow']] }, // ★第407轮 戈拉斯克调酒师 5费 1黄pip([绝念]从废牌堆免费打出)
  'UNL-062': { mana: UNL_062.energy ?? 0 }, // ★第409轮 戏精远见家 4费 0pip([绝念]洞察2)
  'OGN-236': { mana: OGN_236.energy ?? 0, pips: [['yellow']] }, // ★第411轮 卡尔萨斯 3费 1黄pip(常驻:绝念额外触发一次)
  'UNL-179': { mana: UNL_179.energy ?? 0, pips: [['yellow']] }, // ★第408轮 峡谷先锋 8费 1黄pip(移动查顶3 + [绝念]从手牌打出)
  'SFD-036': { mana: SFD_036.energy ?? 0 }, // ★第402轮 哀哀魄罗(另一个卡号,无别名组 ⇒ 各登一份)
  'OGN-067': { mana: OGN_067.energy ?? 0, pips: [['green']] }, // ★第393轮 布里茨 5+1绿pip(returnEnergy=1)
  'VEN-065': { mana: VEN_065.energy ?? 0, pips: [['blue']] }, // ★第395轮 斯维因 6+1蓝pip(returnEnergy=1)
  'VEN-173': { mana: VEN_173.energy ?? 0, pips: [['blue']] }, // 同上(斯维因的另一个印刷号)
  'VEN-136a': { mana: VEN_136A.energy ?? 0 }, // 同上(异画那组)
  'VEN-038': { mana: VEN_038.energy ?? 0, pips: [['green']] }, // 阿卡丽 4+1绿pip
  'OGN-060': { mana: OGN_060.energy ?? 0 },                             // 远见面具 2+0pip(装备)
  'UNL-171': { mana: UNL_171.energy ?? 0, pips: [['yellow']] },        // ★525 加里奥 3+1黄pip
  'VEN-129': { mana: VEN_129.energy ?? 0, pips: [['yellow']] },         // 神圣守护者 4+1黄pip
  'SFD-110': { mana: SFD_110.energy ?? 0, pips: [['orange']] },         // 菲奥娜 3+1橙pip
                  
  'UNL-111': { mana: UNL_111.energy ?? 0 }, // 坚定的哨兵 1+0pip
  'SFD-014': { mana: SFD_014.energy ?? 0 }, // 牛头人清算者 5+0pip
                                
  'OGN-201': { mana: OGN_201.energy ?? 0, pips: [['purple']] },            // 反转时间线 3+1紫pip
  'OGN-105': { mana: OGN_105.energy ?? 0, pips: [['blue'], ['blue']] },    // 星芒凝汇 6+2蓝pip
  'OGN-073': { mana: OGN_073.energy ?? 0, pips: [['green']] },             // 娑娜 4+1绿pip
                                
  'OGN-074': { mana: OGN_074.energy ?? 0, pips: [['green']] },  // 塔里克 4+1绿pip
  'UNL-041': { mana: UNL_041.energy ?? 0 },                      // 艾蕾 3+0pip
  'SFD-071': { mana: SFD_071.energy ?? 0, pips: [['blue'], ['blue']] }, // 疾驰机械 8+2蓝pip
  'OGN-059': { mana: OGN_059.energy ?? 0, pips: [['green']] },  // 星蚀先锋 7+1绿pip
  'OGN-261': { mana: 0 }, // 曙光女神(传奇,357)
  'VEN-095': { mana: 2 }, // 影流弟子 2费 0pip(357)
  'OGN-185': { mana: OGN_185.energy ?? 0 },                      // 旅行商人 2+0pip
  'VEN-080': { mana: VEN_080.energy ?? 0 },                      // 诺克萨斯爆破手 2+0pip
                                                         
  'OGS-013': { mana: OGS_013.energy ?? 0, pips: [['yellow']] }, // 盖伦 6+1黄pip
  'OGN-015': { mana: OGN_015.energy ?? 0, pips: [['red']] },    // 法荣队长 4+1红pip
  'OGN-100': { mana: OGN_100.energy ?? 0, pips: [['blue']] },   // 宝石真知者 3+1蓝pip(第317轮)
  'SFD-065': { mana: SFD_065.energy ?? 0 },                     // 先见机甲 2+0pip(第318轮)
  'SFD-197': { mana: 0 },                                       // 沙漠皇帝(传奇一律记 0,第319轮)
  'UNL-077': { mana: UNL_077.energy ?? 0 },                      // 牧魂人 5+0pip
  'SFD-181': { mana: 0 },                                        // 机械公敌(传奇)
  'SFD-089': { mana: SFD_089.energy ?? 0, pips: [['blue']] },   // 兰博 5+1蓝pip
                                  
  'SFD-176': { mana: SFD_176.energy ?? 0, pips: [['yellow']] },                 // 赵信 3+1黄pip
  'UNL-037': { mana: UNL_037.energy ?? 0, pips: [['green']] }, // 影卫 4+1绿pip(第297轮)
  'UNL-008': { mana: UNL_008.energy ?? 0 }, // ★第533轮 莽林巨象 6费 0pip
                                                                     
  'SFD-082': { mana: SFD_082.energy ?? 0, pips: [['blue']] },
  'SFD-082a': { mana: SFD_082A.energy ?? 0, pips: [['blue']] },
  'SFD-082b': { mana: SFD_082B.energy ?? 0, pips: [['blue']] },
  'UNL-194': { mana: UNL_194.energy ?? 0 }, // 黑影 3+0pip(第298轮)
  'VEN-067': { mana: VEN_067.energy ?? 0, pips: [['blue'], ['blue']] }, // 瓶中星海(装备,第299轮)10+2蓝pip
  ...WON_BATTLE_UNIT_COST, // ★传奇也进这张表(记 {mana:0})
  'OGN-205': { mana: 5, pips: [['purple']] }, // 亚索 5+1紫pip(356)
  'OGN-189': { mana: 6, pips: [['purple']] }, // 凯隐 6+1紫pip(356)
  ...ENTER_TRIGGER_UNIT_COST, // 「当你打出我时」单位族(第306轮 5 张)
  ...COND_SELF_UNIT_COST, // 「如果…则我获得X」条件性被动族(第310轮 2 张)
  ...SPEND_XP_BUFF_UNIT_COST, // 「[狩猎] 消耗N经验:给予我增益」单位族(第312轮 2 张)
                                                        
                                                            
                                                                           
                                                            
                                                       
                                                            
  'OGN-012': { mana: 4 },                    // 诺克萨斯新兵 4+0pip 红
  'OGN-084': { mana: 3 },                    // 踊跃的学徒 3+0pip 蓝
  'OGN-140': { mana: 4 },                    // 唤龙使者 4+0pip 橙
  'UNL-035': { mana: 6 },                    // 啃啃 6+0pip 绿
  'VEN-119': { mana: 5, pips: [['yellow']] }, // 律法守护者 5+1黄pip
  'OGN-035': { mana: OGN_035.energy ?? 0, pips: [['red']] },                    // 薇恩 4+1红pip
  'SFD-223': { mana: SFD_223.energy ?? 0, pips: [['red']] },                    // 薇恩(哨兵版)4+1红pip
  'VEN-091': { mana: VEN_091.energy ?? 0, pips: [['orange'], ['orange']] },     // 腐化巨龙 10+2橙pip
                                           
  'SFD-006': { mana: SFD_006.energy ?? 0, pips: [['red']] },     // 好斗的龙犬 3+1红pip
  'OGS-016': { mana: OGS_016.energy ?? 0, pips: [['yellow']] },  // 先锋扈从 6+1黄pip
  'OGS-009': { mana: OGS_009.energy ?? 0, pips: [['orange']] },  // 易 7+1橙pip
  'UNL-001': { mana: UNL_001.energy ?? 0 },                       // 竞技场理事 5+0pip
  'ARC-004': { mana: ARC_004.energy ?? 0, pips: [['orange']] },  // 沃里克 6+1橙pip
  'SFD-027': { mana: SFD_027.energy ?? 0, pips: [['red']] },     // 穿沙角兽 7+1红pip
  'SFD-094': { mana: SFD_094.energy ?? 0 },                       // 凶翼 7+0pip
                
  'UNL-180': { mana: UNL_180.energy ?? 0, pips: [['yellow'], ['yellow'], ['yellow']] }, // 破败之咒 9+3黄pip
  'UNL-115': { mana: UNL_115.energy ?? 0, pips: [['orange']] }, // ★526 尼菈 3+1橙pip
  'UNL-080': { mana: UNL_080.energy ?? 0, pips: [['blue']] }, // ★668 彗 5+1蓝pip(现查过)
  'UNL-082': { mana: UNL_082.energy ?? 0 }, // ★673 莉莉娅 3费 0pip(现查过)
  'UNL-022': { mana: UNL_022.energy ?? 0, pips: [['red']] }, // ★674 烬 4+1红pip(现查过)
  'VEN-079': { mana: VEN_079.energy ?? 0 }, // ★675 妲姆 5费 0pip(现查过)
  'VEN-088': { mana: VEN_088_JAYCE.energy ?? 0, pips: [['orange']] }, // ★677 杰斯 4+1橙pip(现查过)
  'SFD-048': { mana: SFD_048.energy ?? 0 },                       // 天角牧者 4+0pip
  'SFD-137': { mana: SFD_137.energy ?? 0 },                       // 猎海小队 4+0pip
  'UNL-068': { mana: UNL_068.energy ?? 0 },                       // 幽魂半人马 6+0pip
  'UNL-129': { mana: UNL_129.energy ?? 0 },                       // 凶残颚鱼 5+0pip
  'SFD-159': { mana: SFD_159.energy ?? 0 },                       // 可靠攻城犬 2+0pip
                
  'OGN-229': { mana: OGN_229.energy ?? 0, pips: [['yellow'], ['yellow']] }, // 复仇 4+2黄pip
  'OGN-148': { mana: OGN_148.energy ?? 0, pips: [['orange'], ['orange']] }, // 艾尼维亚 7+2橙pip
  'VEN-071': { mana: VEN_071.energy ?? 0 },                                  // 焦躁的猫咪 6+0pip
  'OGN-143': { mana: OGN_143.energy ?? 0 },                                  // 海盗避风港 3+0pip
  'OGN-195': { mana: OGN_195.energy ?? 0, pips: [['purple']] },              // 裂魂者喇煞 10+1紫pip
                                      
  'OGN-114': { mana: OGN_114.energy ?? 0, pips: [['blue']] },                 // 进化日 6+1蓝pip
  'OGN-076': { mana: OGN_076.energy ?? 0, pips: [['green'], ['green']] },     // 亚索 6+2绿pip
  'VEN-041': { mana: VEN_041.energy ?? 0, pips: [['green']] },                // ★第416轮 锐雯 3+1绿pip
  'SFD-113': { mana: SFD_113.energy ?? 0 },                                   // ★第416轮 卢锡安 3+0pip
  'UNL-127': { mana: UNL_127.energy ?? 0 },                                   // ★第417轮 树根先生 2+0pip
  'SFD-123': { mana: SFD_123.energy ?? 0, pips: [['purple']] },               // ★第418轮 腐化执法官 3+1紫pip
  'SFD-179': { mana: SFD_179.energy ?? 0, pips: [['yellow']] },               // ★第419轮 卡银娜 7+1黄pip
  'SFD-112': { mana: SFD_112.energy ?? 0, pips: [['orange']] },               // ★第419轮 巨腕加藤 4+1橙pip
  'SFD-084': { mana: SFD_084.energy ?? 0 },                                   // ★第421轮 杰斯 4+0pip
  'VEN-175': { mana: VEN_175.energy ?? 0 },                                   // ★第421轮 杰斯(另号)4+0pip
  'UNL-130': { mana: UNL_130.energy ?? 0 },                                   // ★第422轮 移动栖木 5+0pip
  'SFD-081': { mana: SFD_081.energy ?? 0 },                                   // ★第423轮 大老千 3+0pip
  'UNL-164': { mana: UNL_164.energy ?? 0, pips: [['yellow']] },               // ★第424轮 安全检查员 5+1黄pip
  'SFD-053': { mana: SFD_053.energy ?? 0, pips: [['green']] },                // ★第427轮 迦娜 3+1绿pip
  'SFD-140': { mana: SFD_140.energy ?? 0, pips: [['purple']] },               // ★第428轮 菲兹 3+1紫pip
  'SFD-175': { mana: SFD_175.energy ?? 0, pips: [['yellow']] },               // ★第429轮 垓兽 6+1黄pip
  'VEN-069': { mana: VEN_069.energy ?? 0, pips: [['blue']] },                 // ★第432轮 梅尔 4+1蓝pip
  'SFD-116': { mana: SFD_116.energy ?? 0, pips: [['orange']] },               // ★第434轮 永恩 5+1橙pip
  'SFD-233': { mana: SFD_233.energy ?? 0, pips: [['orange']] },               // ★第434轮 永恩变体
  'OGN-158': { mana: OGN_158.energy ?? 0, pips: [['orange'], ['orange']] },   // ★第439轮 沃利贝尔 12+2橙pip
  'OGN-158a': { mana: OGN_158A.energy ?? 0, pips: [['orange'], ['orange']] }, // ★第439轮 沃利贝尔变体
  'OGN-167': { mana: OGN_167.energy ?? 0 },                                   // ★第439轮 余火修士 4+0pip
  'SFD-121': { mana: SFD_121.energy ?? 0 },                                   // ★第506轮 黑市掮客 3+0pip
  'UNL-023': { mana: UNL_023.energy ?? 0, pips: [['red']] },                  // ★第506轮 卡特琳娜 5+1红pip
  'UNL-141': { mana: UNL_141.energy ?? 0 },                                   // ★第507轮 伊芙琳 2+0pip
  'UNL-003': { mana: UNL_003.energy ?? 0 },                                   // ★第509轮 鲛人滋事者 2+0pip
  'OGN-200': { mana: OGN_200.energy ?? 0 },                                   // ★第513轮 崔斯特 4+0pip
  'UNL-145': { mana: UNL_145.energy ?? 0 },                                   // ★第440轮 派克 3+0pip
  'UNL-145a': { mana: UNL_145A.energy ?? 0 },                                 // ★第440轮 派克变体
  'VEN-138': { mana: VEN_138.energy ?? 0, pips: [['yellow'], ['yellow']] },   // ★第440轮 慎 6+2黄pip
  'VEN-138a': { mana: VEN_138A.energy ?? 0, pips: [['yellow'], ['yellow']] }, // ★第440轮 慎变体
  'SFD-160': { mana: SFD_160.energy ?? 0 },                                   // ★第436轮 祖安混混 3+0pip
  'OGN-110': { mana: OGN_110.energy ?? 0, pips: [['blue']] },                 // ★第433轮 艾克 5+1蓝pip
  'VEN-128': { mana: VEN_128.energy ?? 0 },                                   // ★第441轮 诺克萨斯使节 2+0pip
  'UNL-048': { mana: UNL_048.energy ?? 0 },                                   // ★第442轮 特雷弗 3+0pip
  'UNL-052': { mana: UNL_052.energy ?? 0 },                                   // ★第443轮 娜美 3+0pip
  'VEN-101': { mana: VEN_101.energy ?? 0 },                                   // ★第444轮 劲风修士 2+0pip
  'VEN-113': { mana: VEN_113.energy ?? 0, pips: [['purple']] },               // ★第445轮 凯南 3+1紫pip
  'VEN-113a': { mana: VEN_113A.energy ?? 0, pips: [['purple']] },             // ★第445轮 凯南变体
  'SFD-079': { mana: SFD_079.energy ?? 0, pips: [['blue']] },                 // ★第446轮 巴德 4+1蓝pip
  'SFD-228': { mana: SFD_228.energy ?? 0, pips: [['blue']] },                 // ★第446轮 巴德再版
  'UNL-119': { mana: UNL_119.energy ?? 0, pips: [['orange']] },               // ★第450轮 卡兹克 5+1橙pip
  'UNL-029': { mana: UNL_029.energy ?? 0, pips: [['red']] },                  // ★第455轮 树怪 4+1红pip
  'UNL-029a': { mana: UNL_029.energy ?? 0, pips: [['red']] },                 // ★第455轮 树怪变体
  'UNL-050': { mana: UNL_050.energy ?? 0, pips: [['green']] },                // ★第457轮 娅希拉 7+1绿pip
  'SFD-109': { mana: SFD_109.energy ?? 0 },                                   // ★第460轮 阿克尚 4费0pip
  'UNL-089': { mana: UNL_089.energy ?? 0 },                                   // ★第462轮 烬 4费0pip
  'UNL-089a': { mana: UNL_089A.energy ?? 0 },                                 // ★第462轮 烬变体
  'OGN-041': { mana: OGN_041.energy ?? 0, pips: [['red'], ['red']] },        // ★523 沃利贝尔 10+2红pip
  'OGN-041a': { mana: OGN_041A.energy ?? 0, pips: [['red'], ['red']] },      // ★523 异画
  'UNL-119a': { mana: UNL_119A.energy ?? 0, pips: [['orange']] },             // ★第450轮 卡兹克变体
  'VEN-180': { mana: VEN_180.energy ?? 0, pips: [['orange']] },               // ★590 卡兹克跨系列印次(pips 由 cardCosts 闸校验)
  'OGN-112': { mana: OGN_112.energy ?? 0, pips: [['blue']] },                 // ★第451轮 卡莎 6+1蓝pip
  'OGN-112a': { mana: OGN_112A.energy ?? 0, pips: [['blue']] },               // ★第451轮 卡莎变体
  'SFD-119': { mana: SFD_119.energy ?? 0, pips: [['orange']] },               // ★第417轮 贾克斯 4+1橙pip
  'OGN-037': { mana: OGN_037.energy ?? 0, pips: [['red']] }, // ★634 不朽凤凰 3+1红pip(registryCoverage 闸抓的漏)
  'OGN-103': { mana: OGN_103.energy ?? 0 },                                    // 拉文布鲁姆学生 2+0pip
  'OGN-131': { mana: OGN_131.energy ?? 0 },                                    // 沙丘亚龙 5+0pip
  'OGN-091': { mana: OGN_091.energy ?? 0 },                                    // 竞技场勤务小队 3+0pip
  'OGN-065': { mana: OGN_065.energy ?? 0 },                                    // 睿智长者 4+0pip
  'OGN-253': { mana: 0 }, // 诺克萨斯之手(传奇)
  'UNL-093': { mana: UNL_093.energy ?? 0 }, // ★第537轮 龙魂贤者 2费 0pip
  'OGN-267': { mana: 0 }, // 赏金猎人(传奇)
  'OGN-113': { mana: OGN_113.energy ?? 0 },                     // 玛尔扎哈 4+0pip
  'VEN-060': { mana: VEN_060.energy ?? 0, pips: [['blue']] },   // 天际漫游者 4+1蓝pip
  'OGN-259': { mana: 0 }, // 疾风剑豪(传奇)
  'OGN-265': { mana: 0 }, // 奥术先驱(传奇)
  'OGN-090': { mana: OGN_090.energy ?? 0 },                     // 懊悔法球 1+0pip
                                                                          
  'UNL-030': { mana: UNL_030.energy ?? 0 },
  'SFD-054': { mana: SFD_054.energy ?? 0, pips: [['green']] },
                                                        
  'OGN-111': { mana: OGN_111.energy ?? 0, pips: [['blue']] },
  'ARC-003': { mana: ARC_003.energy ?? 0, pips: [['blue']] }, // ★577 贾克斯 5法力+1绿pip(卡面核;照抄 UNL-030 的无 pip 写法被 cardCosts 闸咬住)                     // 蔚 4+0pip 红
  'SFD-052': { mana: SFD_052.energy ?? 0, pips: [['green']] },  // 玄冰之心 3+1绿pip
  'OGN-184': { mana: OGN_184.energy ?? 0 },                     // 塞壬号 2+0pip
  'UNL-201': { mana: 0 }, // ★650 虚空掠夺者:传奇也要登(漏登查不到费用,㊼ won-battle 族)
  'SFD-195': { mana: 0 }, // ★655 刀锋舞者:传奇必登
  'SFD-088': { mana: 5 }, // ★657 烈娜塔:5费 0pip(登了技能的单位必登)
  'UNL-160': { mana: 5 }, // ★661 绵绵魄罗:5费 0pip(登了技能的单位必登)
  'UNL-055': { mana: 5, pips: [['green']] }, // ★651 薇古丝:登了触发的单位必登
  'VEN-019': { mana: 6 }, // ★652 雷克顿:6费 0pip(登了触发的单位必登)
  'VEN-092': { mana: 5 }, // ★713 蛮荒巨兽:5费 0pip(登了触发的单位必登;折叠)
  'SFD-180': { mana: 3 }, // ★715 菲奥娜:3费 0pip(登了触发的单位必登;折叠)
  'SFD-029': { mana: 3 }, // ★679 雷克塞·黄沙噬猎:3费 0pip(登了效果的单位必登)
  'SFD-055': { mana: 10, pips: [['green'], ['green'], ['green']] }, // ★680 超大型约德尔人:10费 3绿pip(登了效果的单位必登)
  'SFD-050': { mana: 6, pips: [['green']] }, // ★682 阿兹尔·飞升者:6费 1绿pip(登了技能的单位必登)
  'SFD-201': { mana: 0 }, // ★683 炼金男爵:传奇必登(★650)
  'UNL-005': { mana: 7, pips: [['red']] }, // ★685 雷芙纳:7费 1红pip(登了触发的单位必登)
  'SFD-146': { mana: 5, pips: [['purple']] }, // ★689 薇古丝:5费 1紫pip(登了效果的单位必登)
  'SFD-177': { mana: 4 }, // ★690 帝君:4费 0pip(登了触发的单位必登)
  'UNL-018': { mana: 6 }, // ★691 雪人斗士:6费 0pip(登了触发的单位必登)
  'SFD-120': { mana: 6, pips: [['orange'], ['orange'], ['orange']] }, // ★691 希维尔远大野心:6费 3橙pip
  'VEN-055': { mana: 4 }, // ★689 实干研究员:4费 0pip(登了效果的单位必登)
                                                                              
                                                            
                                                 
                                                  
  'OGN-251': { mana: 0 }, // 暴走萝莉(传奇)
  'OGN-255': { mana: 0 }, // 九尾妖狐(传奇)
  'UNL-183': { mana: 0 }, // 傲之追猎者(传奇)
  'OGN-119': { mana: OGN_119.energy ?? 0, pips: [['blue']] },   // 阿狸 3+1蓝pip
  'OGN-246': { mana: OGN_246.energy ?? 0, pips: [['yellow']] }, // 维克托 4+1黄pip
  'UNL-203': { mana: 0 }, // 圣锤之毅(传奇)
  'UNL-237': { mana: 0 }, // 圣锤之毅(再版)(传奇)
  'UNL-112': { mana: UNL_112.energy ?? 0 }, // 诱人仙灵 0pip
  'SFD-125': { mana: SFD_125.energy ?? 0 }, // 大力仙灵 0pip
  'SFD-126': { mana: SFD_126.energy ?? 0 }, // 忠诚的猎犬 0pip
  'OGS-023': { mana: 0 }, // 德玛西亚之力(传奇,无打出费用)
  'SFD-101': { mana: SFD_101.energy ?? 0, pips: [['orange']] }, // 仙灵龙 1枚pip
  'OGN-141': { mana: OGN_141.energy ?? 0, pips: [['orange']] }, // 均衡僧侣 1枚pip
  'SFD-132': { mana: SFD_132.energy ?? 0, pips: [['purple'], ['purple']] }, // 海渊巨兽 2枚pip
  'OGN-223': { mana: OGN_223.energy ?? 0, pips: [['yellow']] }, // 巅峰守护者 1枚pip
  'OGN-240': { mana: OGN_240.energy ?? 0, pips: [['yellow']] }, // 瑟提 1枚pip
  'SFD-085': { mana: SFD_085.energy ?? 0 }, // 奥恩 0pip
  'SFD-068': { mana: SFD_068.energy ?? 0 }, // ★第531轮 机械迷 5费 0pip
  'SFD-131': { mana: SFD_131.energy ?? 0 }, // ★第540轮 远古战狂 5费 0pip(⚠️★534 本表【每号一行、不折叠】)
  'UNL-090': { mana: UNL_090.energy ?? 0 }, // ★第532轮 乐芙兰 4费 0pip
  'UNL-090a': { mana: UNL_090A.energy ?? 0 }, // ★第532轮 异画(② 每处登两份)
  'VEN-076': { mana: VEN_076.energy ?? 0 }, // 维修专家 3费 0pip(第315轮)
  'UNL-076': { mana: UNL_076.energy ?? 0 }, // 花瓣仙子 0pip
  'VEN-097': { mana: VEN_097.energy ?? 0 }, // ★第510轮 小蜘蛛 3+0pip
  'OGN-192': { mana: OGN_192.energy ?? 0, pips: [['purple'], ['purple']] }, // 辟心玄龙 2枚pip
  'UNL-121': { mana: UNL_121.energy ?? 0 }, // 魅惑之灵 0pip
  'UNL-135': { mana: UNL_135.energy ?? 0 }, // 缜密的调查员 0pip
  'VEN-109': { mana: VEN_109.energy ?? 0 }, // 俄洛伊 0pip
  'VEN-182': { mana: VEN_182.energy ?? 0 }, // 俄洛伊(再版)0pip
  'UNL-143': { mana: UNL_143.energy ?? 0, pips: [['purple']] }, // 卡兹克 4+1紫pip(★545)
  'UNL-143a': { mana: UNL_143A.energy ?? 0, pips: [['purple']] }, // 卡兹克(再版号)
  'OGN-026': { mana: OGN_026.energy ?? 0 }, // 颂雷者 布林希尔 0pip
  'OGN-031': { mana: OGN_031.energy ?? 0, pips: [['red']] }, // 狂暴龙怪 1枚pip
  'UNL-169': { mana: UNL_169.energy ?? 0, pips: [['yellow']] }, // 艾希 1枚pip
                                                                           
                                                                           
  'SFD-032': { mana: SFD_032.energy ?? 0, pips: [['green']] },
  BLK: { mana: 2 }, // vanilla 素单位(演示,无pip)
}

                                                                            
                                  
const CARD_KEYWORDS: Record<string, readonly string[]> = {
  'OGN-203': OGN_203_KEYWORDS, // ★第378轮 据为己有:[迅捷](㊵ 时机权限两处都要有)
  'SFD-202': SFD_202_KEYWORDS, // ★第459轮 恶意收购:[待命](§811 卡无关通道)
  'OGN-173': OGN_173.keywords, // 驭风而行:印刷[迅捷](第325轮;时机权限另在 spec.keywords 上)
  'OGS-011': OGS_011.keywords, // 闪现:印刷[反应](第328轮)
  'OGN-179': OGN_179.keywords, // 折戟再战:印刷[迅捷](第333轮)
  'SFD-136': SFD_136.keywords, // 强买强卖:印刷[反应](第334轮;[回响2] 走 echo 不进这张表)
  'OGN-033': OGN_033.keywords, // ★632 巧取豪夺:印刷[反应]
  'OGN-037': OGN_037.keywords, // ★634 不朽凤凰:印刷[强攻2](§807 通用工厂按关键词接)
  'VEN-194': VEN_194.keywords, // ★635 未来守护者:印刷[强化2AA](纯资源费 → empowerActivationSpecs 工厂)
  'VEN-140': VEN_140.keywords, // ★636 隼舞:印刷[流转3A](§829 通用实现;parseCostSuffix('3A'))
  'VEN-189': VEN_189.keywords, // ★637 离群之刺:印刷[强化3A](纯资源费 → empowerActivationSpecs 工厂)
  'UNL-106': UNL_106.keywords, // ★640 击退:印刷[反应]
  'OGN-025': OGN_025.keywords, // ★642 暴怒冲动:印刷[迅捷]
  'OGN-115': OGN_115.keywords, // ★646 光明未来:无印刷关键词
  'OGN-071': OGN_071.keywords, // ★647 次元门狂欢:无印刷关键词
  'UNL-201': UNL_201.keywords, // ★650 虚空掠夺者:无印刷关键词(三号)
  'UNL-055': UNL_055.keywords, // ★651 薇古丝:印刷[坚守][壁垒]
  'UNL-055a': UNL_055.keywords, // ★651 同上(异画)
  'SFD-195': SFD_195.keywords, // ★655 刀锋舞者:无印刷关键词(三号)
  'SFD-195a': SFD_195.keywords, // ★655 同上(异画)
  'SFD-246': SFD_195.keywords, // ★655 同上(异画)
  'SFD-088': SFD_088.keywords, // ★657 烈娜塔:无印刷关键词
  'SFD-088a': SFD_088.keywords, // ★657 同上(异画)
  'VEN-019': VEN_019.keywords, // ★652 雷克顿:印刷[急速](§805 引擎统一管,登了才真生效)
  'VEN-019a': VEN_019.keywords, // ★652 同上(异画)
  'VEN-092': VEN_092.keywords, // ★713 蛮荒巨兽:无印刷横幅(三段全是技能)
  'VEN-092a': VEN_092.keywords, // ★713 同上(异画)
  'VEN-177': VEN_092.keywords, // ★713 同上(符文传说号)
  'SFD-180': SFD_180.keywords, // ★715 菲奥娜:无印刷横幅
  'SFD-180a': SFD_180.keywords, // ★715 同上(异画)
  'SFD-029': SFD_029.keywords, // ★679 雷克塞:印刷[急速][强攻](§805 引擎统一管)
  'SFD-029a': SFD_029.keywords, // ★679 同上(异画)
  'SFD-055': SFD_055.keywords, // ★680 超大型约德尔人:[坚守5][壁垒](§814 引擎统一管,㊼ OGN-241 同款)
  'UNL-005': UNL_005.keywords, // ★685 雷芙纳:印刷[游走](单印次)
  'SFD-146': SFD_146.keywords, // ★689 薇古丝:无印刷关键词(单印次)
  'SFD-177': SFD_177.keywords, // ★690 帝君:印刷[急速](§805 引擎统一管)
  'SFD-177a': SFD_177.keywords, // ★690 同上(异画,登了才真生效)
  'UNL-018': UNL_018.keywords, // ★691 雪人斗士:无印刷关键词(单印次)
  'SFD-120': SFD_120.keywords, // ★691 希维尔远大野心:['法盾2'](deflectValue 认 N ★665)
  'SFD-120a': SFD_120.keywords, // ★691 同上(异画)
  'OGN-053': OGN_053.keywords, // ★692 慈悲度魂落:[待命][迅捷](§811 待命引擎统一管)
  'UNL-139': UNL_139.keywords, // ★694 透骨尖钉:[待命](§811 引擎统一管)
  'VEN-055': VEN_055.keywords, // ★689 实干研究员:['强化3'] → 通用工厂(㊼ VEN-070 同款)
  'UNL-236': UNL_201.keywords, // ★650 同上(异画)
  'UNL-236*': UNL_201.keywords, // ★650 同上(异画星号)
  'UNL-200': UNL_200.keywords, // ★648 镜花水月:无印刷关键词
  'UNL-103': UNL_103.keywords, // ★654 处置命令:印刷[反应]
  'UNL-020': UNL_020.keywords, // ★737 曼舞手雷:无横幅
  'OGN-150': OGN_150_KEYWORDS, // ★739 海妖猎手:[急速][强攻]
  'OGN-231': OGN_231_KEYWORDS, // ★739 莱卓斯:[法盾][游走]
  'OGN-194': OGN_194_KEYWORDS, // ★746 魔腾:[游走]
  'OGN-244': OGN_244.keywords, // ★730 圣裁之刻:无印刷横幅
  'OGN-262': OGN_262.keywords, // ★656 天顶之刃:印刷[迅捷]
  'UNL-168': UNL_168.keywords, // ★660 忠诚不渝:无印刷关键词
  'UNL-160': UNL_160.keywords, // ★661 绵绵魄罗:无印刷关键词
  'UNL-044': UNL_044.keywords, // ★662 羽毛旋风:[反应]
  'SFD-154': SFD_154.keywords, // ★663 护驾!:[待命](§811 引擎统一管)
  'OGN-266': OGN_266.keywords, // ★664 虹吸能量:[反应]
  'VEN-156': VEN_156.keywords, // ★666 奥义!雷铠:[流转2A](§829 引擎解析)
  'VEN-012': VEN_012.keywords, // ★667 表里杀缭乱:[流转3红色]
  'UNL-080': UNL_080.keywords, // ★668 彗:无印刷关键词
  'UNL-082': UNL_082_KEYWORDS, // ★673 莉莉娅:[急速](§805 引擎统一管)
  'UNL-082a': UNL_082_KEYWORDS, // ★673 异画号同登(§805 登了才真生效,㊼ VEN-019 同注)
  'UNL-022': UNL_022_KEYWORDS, // ★674 烬:[法盾][游走](引擎统一管)
  'UNL-022a': UNL_022_KEYWORDS, // ★674 异画号同登
  'VEN-079': VEN_079.keywords, // ★675 妲姆:['强化5橙色'] → 通用工厂(纯资源费)
  'VEN-088': VEN_088_JAYCE.keywords, // ★677 杰斯举锤待发:无印刷关键词
  'VEN-088a': VEN_088_JAYCE.keywords, // ★677 异画号同登
  'VEN-034': VEN_034.keywords, // ★676 回音击:[待命][反应](引擎统一管)
  'OGN-256': OGN_256.keywords, // ★669 妖异狐火:[待命][迅捷](都是引擎统一管)
  'VEN-148': VEN_148.keywords, // ★671 奥义!影缚:[流转5AA]
  'SFD-111': SFD_111.keywords, // ★672 前来相助:[待命][迅捷](都是引擎统一管)
  'SFD-206': SFD_206.keywords, // ★659 劳伦特心眼刀:印刷[反应]
  'UNL-198': UNL_198.keywords, // ★643 月之降临:印刷[迅捷]
  'VEN-084': VEN_084.keywords, // ★644 恶狼意志:印刷[强化3橙色](纯资源费 → 工厂)
  'VEN-084a': VEN_084.keywords, // ★644 异画号同登(㊼ VEN-136/136a 先例)
  'VEN-181': VEN_181.keywords, // ★645 普朗克:印刷[强化橙色橙色](纯资源费 → 工厂)
  'VEN-086': VEN_181.keywords, // ★645 异画号同登
  'UNL-046': UNL_046_KEYWORDS, // 动物之友:印刷[反应](第255轮)
  'SFD-200': SFD_200.keywords, // 奥术跃迁:印刷[迅捷](第262轮)
  'UNL-184': UNL_184.keywords, // 狩猎律动:印刷[反应](第265轮)
  'VEN-066': VEN_066.keywords, // 时空裂隙:印刷[待命](第279轮)
  'VEN-106': VEN_106_KEYWORDS, // ★第385轮 风灵瞬转:印刷[迅捷]
  'VEN-127': VEN_127_KEYWORDS, // ★第386轮 血戮:印刷[流转4黄色黄色]
  ...AMBESSA_KEYWORDS, // ★第387轮 安蓓萨:印刷[强化1黄色黄色](→ empowerActivationSpecs 通用工厂)
  ...KAISA_KEYWORDS, // ★第390轮 卡莎:印刷[急速](§805 由引擎统一管)
  'OGN-155': OGN_155_KEYWORDS, // ★第392轮 奇亚娜:印刷[法盾](§809 由引擎统一管)
  'OGN-067': OGN_067_KEYWORDS, // ★第393轮 布里茨:印刷[壁垒](§465 由引擎统一管)
  ...SWAIN_KEYWORD_ROWS, // ★第395轮 斯维因(两个号):印刷[预知](§436 由引擎统一管)
  'UNL-057': UNL_057_KEYWORDS, // ★第381轮 野爪兽王:印刷[壁垒]
  'SFD-028': SFD_028_KEYWORDS, // ★610 卢锡安:印刷[强攻]
  'SFD-024': SFD_024_KEYWORDS, // ★621 芮尔:印刷[壁垒](在 IMPL_KEYWORDS 白名单,登了才真生效)
  'OGN-078': OGN_078_KEYWORDS, // ★625 李青:印刷[坚守](同在白名单)
  'VEN-016': VEN_016_KEYWORDS, // ★618 蚀影巨龙:印刷[急速](同在 IMPL_KEYWORDS 白名单,登了才真生效)
  'OGN-151': OGN_151_KEYWORDS, // ★612 李青:印刷[急速](在 IMPL_KEYWORDS 白名单里,登了就真生效)(⚠️漏登会让本卡的伤害数额直接变 0)
  'UNL-060': UNL_060_KEYWORDS, // ★第382轮 卑鄙之喉:印刷[伏击]
  'UNL-171': UNL_171_KEYWORDS, // ★第525轮 加里奥:印刷[法盾]+[壁垒]
  'UNL-115': UNL_115_KEYWORDS, // ★第526轮 尼菈:印刷[急速]+[游走]
  'OGN-161': OGN_161_KEYWORDS, // ★第528轮 亡花掠食者:印刷[法盾]
  'VEN-105': VEN_105_KEYWORDS, // ★第529轮 奥义!幽步:印刷[流转4紫色]
  'SFD-060': SFD_060_KEYWORDS, // ★第530轮 缇亚娜·冕卫:印刷[法盾]
  'SFD-025': SFD_025_KEYWORDS, // ★第527轮 雷恩加尔·暴起:印刷[反应]+[强攻2]
  'SFD-025a': SFD_025_KEYWORDS, // ★第527轮 异画(同文)
  'OGN-102': OGN_102_KEYWORDS, // ★第380轮 传送门大营救:印刷[迅捷]
  'VEN-133': VEN_133_KEYWORDS, // 发光石:印刷[强化AA](§827 批量层照它生成主动技能,第284轮)
                                                               
                                                 
  'OGS-009': OGS_009.keywords, // 易:[游走]
  ...ATTACK_STUN_KEYWORDS, // 蕾欧娜[坚守] / 蔚[伏击]
  'VEN-168': VEN_168.keywords, // 金克丝:[急速][强攻2](第295轮)
  'VEN-179': VEN_179.keywords, // 雷恩加尔:[伏击](第296轮)
  'UNL-143': UNL_143.keywords, // 卡兹克:[伏击](★545;⚠️折叠 —— 再版号 UNL-143a 靠 resolveImplDefId 回退)
  'UNL-120': UNL_120.keywords, // 同上:[伏击](360)
  'OGN-074': OGN_074.keywords, // 塔里克:[坚守][壁垒]
  'UNL-041': UNL_041.keywords, // 艾蕾:[法盾]
  'VEN-064': VEN_064.keywords, // 广场守卫:[法盾](第195轮)
  'SFD-103': SFD_103.keywords, // 琢珥鱼:[急速](第195轮)
  'UNL-178': UNL_178.keywords, // 波比:[伏击][壁垒](第198轮补登,当轮 replace 静默失效过)
  'UNL-170': UNL_170.keywords, // 厄塔汗:[游走](第199轮)
  'OGN-162': OGN_162.keywords, // 厄运小姐:[急速][游走](第201轮)
  'SFD-148': SFD_148.keywords, // 德莱文:[法盾](第202轮)
  'UNL-013': UNL_013.keywords, // 莲花陷阱:[待命][反应](第236轮)
  'UNL-078': UNL_078.keywords, // 精灵提灯:[瞬息][绝念](第244轮)
                                                                     
                                                          
  'OGN-096': OGN_096.keywords, 'OGN-216': OGN_216.keywords,
  'SFD-155': SFD_155.keywords, 'OGN-239': OGN_239.keywords, 'SFD-021': SFD_021.keywords,
  'UNL-221': UNL_221.keywords, 'SFD-036': SFD_036.keywords, // ★第402轮 哀哀魄罗两号
  'OGN-178': OGN_178.keywords, 'UNL-067': UNL_067.keywords, // ★第403轮 带结算期选择的绝念两张
                                                             
  'UNL-152': UNL_152.keywords, 'UNL-156': UNL_156.keywords, 'SFD-167': SFD_167.keywords,
                                                         
  'UNL-153': UNL_153.keywords, 'OGN-075': OGN_075.keywords,
                                     
  'OGN-190': OGN_190.keywords, 'UNL-172': UNL_172.keywords,
  'SFD-165': SFD_165.keywords, // ★第407轮
  'UNL-062': UNL_062.keywords, // ★第409轮
  'UNL-028': UNL_028.keywords, // ★第414轮 派克:[待命][游走]
  'UNL-179': UNL_179.keywords, // ★第408轮
  'SFD-104': SFD_104.keywords, // 禁魔石丰碑:[瞬息](法盾是授予别人的,不是自己的)第245轮
  'OGN-077': OGN_077.keywords, // 中娅沙漏:[待命](§811 布置合法性读这张表)第246轮
  'UNL-161': UNL_161.keywords, // 占卜贝壳:[预知](§817 已实现)第248轮
  'UNL-085': UNL_085.keywords, // 地沟区地图:[反应][瞬息](第245轮)
  'VEN-126': VEN_126.keywords, // 忍法!气合盾:[反应](第237轮)
  'UNL-192': UNL_192_CARD.keywords, // ★522 阿尔法突袭(② 印刷关键词三处都要登)
  'SFD-194': SFD_194.keywords, // 反击风暴:[反应](364)
  'OGN-254': OGN_254.keywords, // 诺克萨斯断头台:[迅捷](第239轮)
  'OGN-221': OGN_221.keywords, // 帝国谕令:[迅捷](第240轮)
  'UNL-073': UNL_073.keywords, // 致命华彩:无印刷关键词(第241轮)
  'SFD-166': SFD_166.keywords, // 集结部队:[迅捷](第241轮)
  'VEN-146': VEN_146.keywords, // 汲魂痛击:无印刷关键词(第242轮)
  'UNL-095': UNL_095.keywords, // 视死如归:[迅捷](第242轮)
  'UNL-175': UNL_175.keywords, // 战术撤退:[反应](第240轮)
  'OGS-020': OGS_020.keywords, // 高原血统:[反应](第240轮)
  'VEN-167': VEN_167.keywords, // 蔚:[游走](第204轮)
  'ARC-001': ARC_001.keywords, // 蔚(异画):[游走](第204轮)
  'OGN-235': OGN_235.keywords, // 卡尔玛:[预知](第206轮)
  'SFD-057': SFD_057.keywords, // 艾瑞莉娅:[法盾](第211轮)
  'VEN-174': VEN_174.keywords, // 同上:[法盾](358)
  'UNL-126': UNL_126.keywords, // 巨牙海兽:卡文没有横幅 ⇒ 空(358)
  'OGN-174': OGN_174.keywords, // 大塞斥候:[预知](359)
  'SFD-015': SFD_015.keywords, // 栖息的冥龙:卡文没有横幅 ⇒ 空(359)
  'SFD-176': SFD_176.keywords, // 赵信:[壁垒]
  'OGN-035': OGN_035.keywords, 'SFD-223': SFD_223.keywords, // 薇恩两张:[强攻3](SFD-223 不是再版,标签多个'哨兵')
  'UNL-150': UNL_150.keywords, 'UNL-081': UNL_081.keywords, 'OGN-121': OGN_121.keywords,
  'OGN-197': OGN_197.keywords, 'OGN-097': OGN_097.keywords, 'SFD-138': SFD_138.keywords,
  'UNL-031': UNL_031.keywords, // 实战经验(法术):印着[反应]
  'VEN-031': VEN_031.keywords, // 霞阵(法术):印着[流转2]
  'VEN-051': VEN_051.keywords, // 迭代式设计(法术):印着[流转2蓝色](第226轮)
  'VEN-144': VEN_144.keywords, // 瞬狱影杀阵(法术):印着[流转1AA](第252轮)
  'OGN-169': OGN_169.keywords, 'OGN-083': OGN_083.keywords, 'UNL-131': ['反应'], 'VEN-152': ['反应'], 'OGN-080': ['反应'], // ★580 倒转神通
  'OGN-199': OGN_199.keywords, 'SFD-145': SFD_145.keywords, 'OGN-264': OGN_264.keywords,
  'OGN-168': OGN_168.keywords, 'SFD-043': SFD_043.keywords, // ★第493轮 [待命]+[迅捷]
  'VEN-008': VEN_008.keywords, // ★第495轮 [迅捷]
  'OGN-048': OGN_048.keywords, 'VEN-083': VEN_083.keywords, // ★第496轮([反应] / 无关键词)
  'UNL-140': UNL_140.keywords, // ★第497轮(无印刷关键词)
  'SFD-114': SFD_114.keywords, 'SFD-023': SFD_023.keywords, // ★第498轮([迅捷]+[回响] / [回响])
  'SFD-080': SFD_080.keywords, 'SFD-122': SFD_122.keywords, // ★第499轮(都是[迅捷]+[回响])
  'UNL-173': UNL_173.keywords, 'UNL-142': UNL_142.keywords, // ★第500轮(都是[反应])
  'SFD-182': SFD_182.keywords,
  'UNL-166': UNL_166.keywords, // ★第502轮 [伏击] 是印刷关键词(② 三处都要登)
  'UNL-007': UNL_007.keywords, // ★第504轮 [迅捷]
  'UNL-141': UNL_141.keywords, // ★第507轮 [待命]+[后排](② 两个都要登)
  'UNL-003': UNL_003.keywords, // ★第509轮 [待命]
  'VEN-097': VEN_097.keywords, // ★第510轮 [待命](② 差点漏掉,被 upstreamKeywordParity 闸抓住)
  'OGN-183': OGN_183.keywords, 'UNL-125': UNL_125.keywords,
  'SFD-164': SFD_164.keywords, // 流沙陷坑:[迅捷](第216轮)
  'OGN-172': ['迅捷'], 'VEN-052': ['反应'], 'OGN-104': ['反应'], 'SFD-087': ['反应'],
  'VEN-035': ['反应'], // ★第449轮 念化盈虚(教训②:spec 与 CARD_KEYWORDS 两条通道都登)
                                                   
  'UNL-030': ['法盾'],
                                                            
  'SFD-054': ['法盾'],
  'SFD-054a': ['法盾'],
  'UNL-030a': ['法盾'],
  'UNL-119': UNL_119.keywords, // ★第450轮 卡兹克:[狩猎](通用求值)
  'SFD-184': SFD_184.keywords, // ★第456轮 冷酷追击:[迅捷](时机权限,spec 侧另一份)
  'UNL-029': UNL_029.keywords, // ★第455轮 树怪:[急速](§805 卡无关)
  'UNL-029a': UNL_029A.keywords, // ★第455轮 树怪变体
  'SFD-109': SFD_109.keywords, // ★第460轮 阿克尚:[百炼](forge.ts 卡无关)
  'UNL-089': UNL_089.keywords, // ★第462轮 烬:[预知](§823 卡无关)
  'UNL-089a': UNL_089A.keywords, // ★第462轮 烬变体
  'UNL-117': UNL_117.keywords, // ★第454轮 空境掠翼龙:[狩猎2](通用求值,带数字)
  'OGN-041': OGN_041.keywords, // ★523 沃利贝尔:[法盾2]
  'OGN-041a': OGN_041A.keywords, // ★523 异画
  'UNL-119a': UNL_119A.keywords, // ★第450轮 卡兹克变体
  'VEN-180': VEN_180.keywords, // ★590 卡兹克跨系列印次:[狩猎]
  'OGN-112': OGN_112.keywords, // ★第451轮 卡莎:[游走](§810.1.b)
  'OGN-112a': OGN_112A.keywords, // ★第451轮 卡莎变体
  ...PUMP_SPELL_KEYWORDS, // 「让一名单位本回合 {S}±N」法术族:各自印着[迅捷]或[反应](第303轮)
  ...DAMAGE_SPELL_KEYWORDS, // 「造成 N 点伤害」法术族:各自印着[迅捷]或[反应](第305轮)
  ...STUN_SPELL_KEYWORDS, // 「眩晕」法术族:两张都印[迅捷](第340轮;★[回响2]不进这里,走 PlaySpec.echo)
  ...EQUIPMENT_SPELL_KEYWORDS, // 「一件装备」法术族(第342轮;★UNL-070 一个关键词都没印)
  ...DESTROY_SPELL_KEYWORDS, // 「摧毁」法术族:两张都印[迅捷](第344轮)
  'OGN-170': ['迅捷'], // 第344轮
  ...TOKEN_BATCH_KEYWORDS, // 第345轮(★UNL-069 一个关键词都没印 ⇒ 不进这张表)
  'OGN-145': ['反应'], // 第347轮
  'OGN-268': ['迅捷'], // 第349轮
  ...WON_BATTLE_KEYWORDS, // 奈德丽的[伏击];荣耀行刑官是空的
  'OGN-261': OGN_261.keywords, 'VEN-095': VEN_095.keywords, // 两张卡文都没有关键词横幅 ⇒ 空(357)
  'OGN-205': OGN_205.keywords, 'OGN-189': OGN_189.keywords, // 两张都印[游走](356)
  ...ENTER_TRIGGER_KEYWORDS, // 「当你打出我时」单位族:各自印着[壁垒]/[狩猎]/[伏击](第306轮)
  ...NEGATE_SPELL_KEYWORDS, // 「无效化一个法术」法术族:都印着[反应](第307轮)
  ...TWO_TARGET_KEYWORDS, // 「一次选两个目标」法术族:[迅捷]/[反应](第309轮)
  'UNL-071': UNL_071.keywords, 'OGN-087': OGN_087.keywords, 'UNL-149': UNL_149.keywords, 'UNL-087': UNL_087.keywords,
  'UNL-043': UNL_043.keywords, // [后排](355)
                                                              
  'OGN-068': OGN_068.keywords, // 凯特琳-守望者 [后排]
  'SFD-173': SFD_173.keywords, // 索拉卡-星尘逆旅 [后排]
  'VEN-183': VEN_183.keywords, // 印着[伏击]
                                                      
  'UNL-016': UNL_016.keywords, 'UNL-094': UNL_094.keywords, 'UNL-113': UNL_113.keywords,
  'UNL-047': UNL_047.keywords, 'UNL-075': UNL_075.keywords, 'UNL-040': UNL_040.keywords,
  'UNL-079': UNL_079.keywords, 'UNL-134': UNL_134.keywords, 'UNL-197': UNL_197.keywords,
  'UNL-182': ['回响'], // ★第485轮 完美谢幕:卡面横幅印着[回响](② 两条通道都要登)
  'SFD-077': ['回响'], // ★第486轮 火箭轰击
                                                                         
  'VEN-043': VEN_043.keywords,
  'VEN-104': VEN_104.keywords, // ['强化2紫色'] → 通用工厂(第325轮:删掉手写的等价 spec,收口到印刷关键词这一处)
  'VEN-114': VEN_114.keywords, // ★696 ['强化6紫色紫色'] → 通用工厂(parseCostSuffix 双色后缀)
  'UNL-181': UNL_181.keywords, // ★703 戏命师:无印刷横幅
  'UNL-195': UNL_195.keywords, // ★712 翠神:无印刷横幅(233/233* 折叠)
  'SFD-205': SFD_205.keywords, // ★714 无双剑姬:无印刷横幅
  'SFD-251': SFD_205.keywords, // ★714 同上(双印次直查表两号都登)
  'OGN-269': OGN_269.keywords, // ★716 腕豪:无印刷横幅
  'OGN-310': OGN_269.keywords, // ★716 同上
  'OGN-310*': OGN_269.keywords, // ★716 同上(星号)
  'VEN-155': VEN_155.keywords, // ★720 狂暴之心:无印刷横幅(卡文两段全是技能)
  'VEN-197': VEN_155.keywords, // ★720 同上(双印次直查表两号都登)
  'UNL-187': UNL_187.keywords, // ★721 皮城执法官:无印刷横幅
  'UNL-229': UNL_187.keywords, // ★721 同上
  'UNL-229*': UNL_187.keywords, // ★721 同上(星号)
  'VEN-145': VEN_145.keywords, // ★722 沙漠死神:无印刷横幅
  'VEN-192': VEN_145.keywords, // ★722 同上(双印次直查表两号都登)
  'UNL-199': UNL_199.keywords, // ★723 诡术妖姬:无印刷横幅
  'UNL-235': UNL_199.keywords, // ★723 同上
  'UNL-235*': UNL_199.keywords, // ★723 同上(星号)
  'OGN-247': OGN_247.keywords, // ★725 虚空之女:无印刷横幅([反应]在技能冒号后=权限,㊼ sigils)
  'OGN-299': OGN_247.keywords, // ★725 同上
  'OGN-299*': OGN_247.keywords, // ★725 同上(星号)
  'OGS-014': OGS_014.keywords, // ★726 拉克丝:无印刷横幅(反应在技能内=权限)
  'SFD-189': SFD_189.keywords, // ★726 山隐之焰:同上
  'SFD-244': SFD_189.keywords, // ★726 同上(双印次直查)
  'VEN-141': VEN_141.keywords, // ★726 荒漠屠夫:同上
  'VEN-190': VEN_141.keywords, // ★726 同上(双印次直查)
  'VEN-125': VEN_125.keywords, // ★727 冰原饿狼:无印刷横幅
  'UNL-118': UNL_118.keywords, // ★729 远古巨龙:无印刷横幅
  'UNL-118a': UNL_118.keywords, // ★729 同上(异画)
  'UNL-147': UNL_147.keywords, // ★710 纳什男爵:无印刷横幅
  'UNL-238': UNL_147.keywords, // ★710 同上(双印次)
  'VEN-021': VEN_021.keywords, // ['强化2红色'] → 通用工厂出带域费用的强化技能
  'VEN-070': VEN_070.keywords, // ['强化3'] → 通用工厂
  'VEN-093': VEN_093.keywords, // ★627 ['强化2'] → 通用工厂(纯资源费才登,见 empower-grants.ts 那段边界)
  'VEN-122': VEN_122.keywords, // ★665 ['强化2'] → 通用工厂(纯资源费)
  'VEN-134': VEN_134.keywords, // ★670 ['强化3'] → 通用工厂(可叠加档,上限3在 kaylePassives)
  'VEN-047': VEN_047.keywords, // ['强化2'] → 通用工厂
  'VEN-018': VEN_018.keywords, // ['强化6红色'] → 通用工厂(带域)
  'VEN-077': VEN_077.keywords, // ['强化2'] → 通用工厂
  'VEN-045': VEN_045.keywords, // ['强化4绿色'] → 通用工厂(带域)
  'VEN-046': VEN_046.keywords, // ['法盾2','强化8'] → 法盾走 §809,强化走通用工厂
                                              
                                                                         
                                                                                      
                                                                          
                                                            
  'OGN-240': OGN_240.keywords, // 瑟提:[壁垒]
  'SFD-085': SFD_085.keywords, // 奥恩:[法盾2][百炼] ——★[百炼] 之前完全没接上
  'SFD-068': SFD_068.keywords, // ★第531轮 机械迷:[急速]
  'SFD-131': SFD_131.keywords, // ★第540轮 远古战狂:[急速](⚠️「强攻N」是**被动产出**的、不是印刷的,不登这里)
  'UNL-090': UNL_090.keywords, // ★第532轮 乐芙兰:[后排]
  'UNL-090a': UNL_090A.keywords, // ★第532轮 异画
  'UNL-008': UNL_008_KEYWORDS, // ★第533轮 莽林巨象:[强攻]
                                                                              
  'OGN-274': OGN_274_KEYWORDS,
                                                              
  'VEN-041': VEN_041.keywords, // 锐雯:[百炼]
  'SFD-113': SFD_113.keywords, // 卢锡安:[百炼]
                                                    
                                      
  'SFD-119': SFD_119.keywords, // 贾克斯:[百炼]
  'UNL-127': UNL_127.keywords, // 树根先生:[急速]
  'SFD-179': SFD_179.keywords, // ★第419轮 卡银娜:[急速]
  'SFD-112': SFD_112.keywords, // ★第419轮 巨腕加藤:[法盾]
  'VEN-135': ['待命'], // ★第420轮 凯南:[待命](§811 布置/翻开打出的枚举读这张印刷表)
  'VEN-117': ['待命'], // ★第511轮 慎的弟子:[待命](② 族表 Card 那份是自动生成的,这份要手登)
  'SFD-143': ['急速'], // ★681 希维尔:[急速](§805 引擎统一管,② 族表 Card 那份自动、这份手登)
  'SFD-143a': ['急速'], // ★681 同上(异画,§805 登了才真生效)
  'UNL-130': UNL_130.keywords, // ★第422轮 移动栖木:[法盾]
  'SFD-053': SFD_053.keywords, // ★第427轮 迦娜:[反应](426 的 reactionUnitPlays 通道读这张表)
  'VEN-069': VEN_069.keywords, // ★第432轮 梅尔:[强化3](通用工厂按它生成激活)
  'OGN-110': OGN_110.keywords, // ★第433轮 艾克:[急速](§805 通道)+[绝念]
  'VEN-128': VEN_128.keywords, // ★第441轮 诺克萨斯使节:[强化1黄色](通用工厂)+条件[绝念]
  'UNL-048': UNL_048.keywords, // ★第442轮 特雷弗:[坚守](通用求值)
  'SFD-116': SFD_116.keywords, // ★第434轮 永恩:[百炼](通用工厂)
  'SFD-233': SFD_233.keywords, // ★第434轮 永恩变体
  'OGN-158': OGN_158.keywords, // ★第439轮 沃利贝尔:[坚守3]+[壁垒](通用求值/分伤优先级)
  'OGN-158a': OGN_158A.keywords, // ★第439轮 沃利贝尔变体
  'UNL-145': UNL_145.keywords, // ★第440轮 派克:[待命]+[后排]
  'UNL-145a': UNL_145A.keywords, // ★第440轮 派克变体
  'VEN-138': VEN_138.keywords, // ★第440轮 慎:[坚守](通用求值)
  'VEN-138a': VEN_138A.keywords, // ★第440轮 慎变体
  'SFD-150': SFD_150.keywords, // 临终仪式:[装配]
                                                         
                                                            
                                                    
                                          
  'OGN-146': ['迅捷'], // 痛殴
  'OGN-153': ['迅捷'], // 公开行动
  'OGN-207': ['反应'], // 荣耀召唤
  'UNL-204': ['迅捷'], // ★605 持卫的裁决
  'OGN-260': ['迅捷'], // ★611 狂风绝息斩(印刷横幅那一份;时机门读的是 spec 那份)
  ...UTILITY_SPELL_KEYWORDS, // 印刷时机关键词([迅捷] 等;第323轮,只有 OGN-047 印了)
  'OGN-100': OGN_100.keywords, // 宝石真知者:印刷[预知](第317轮;给别人的那份走 GROUP_PASSIVES)
  ...SPEND_XP_BUFF_KEYWORDS, // 印刷[狩猎](第312轮 2 张;征服/据守触发由 keywords/hunt.ts 卡无关地发)
}
export function cardKeywords(defId: string): readonly string[] {
                                                   
  const id = resolveImplDefId(defId, (x) => x in CARD_KEYWORDS || x in GEAR_CARDS || x in VANILLA_UNITS)
  return CARD_KEYWORDS[id] ?? GEAR_CARDS[id]?.keywords ?? VANILLA_UNITS[id]?.keywords ?? []
}

   
                                              
                                                                 
                                                               
                                                               
                                                          
                                                                 
                                              
   
export function standbyAltCost(state: GameState, player: PlayerId): Cost | null {
  const kin = variantSiblings('OGN-263')
  for (const z of zonesOf(state, 'legend')) {
    if (z.owner !== player) continue
    for (const oid of z.contents) if (kin.includes(state.objects[oid]?.defId ?? '')) return { mana: 1 }
  }
  return null
}

                                             
export function playSpecFor(defId: string): PlaySpec | undefined {
  return PLAY_SPECS[resolveImplDefId(defId, (x) => x in PLAY_SPECS)]
}

   
                                                   
                                                    
                                                           
   
                                                                        
export function activatedDefIds(): readonly string[] {
  return Object.keys(ACTIVATED)
}

   
                                                                  
                                                                   
                                                
   
export function replacementShieldsFor(state: GameState): readonly ReplacementShield[] {
                                                     
  return [...damageBoostShields(state), ...clericShields(state), ...turnShieldEffects(state),
    ...negateSpellDamageShields(state), // 第347轮:坚毅不倒 OGN-145 本回合无效化法术/技能伤害
    ...moveImmunityShields(state), // 第356轮:凯隐 OGN-189 本回合移动两次后免疫伤害
    ...wolfAmbessaShields(state), // ★644 恶狼意志:已强化且不在战斗中 ⇒ 免伤
    ...wardenReadyShields(state), // ★732 搜魔人典狱长:禁敌方单位/装备经效果变活跃
    ...treasureBanishShields(state)]                               
}

export function costRegisteredDefIds(): readonly string[] {
  return [...new Set([...Object.keys(UNIT_COST), ...Object.keys(GEAR_CARDS), ...Object.keys(VANILLA_UNITS)])]
}

                                                         
export function cardCost(defId: string): Cost {
  defId = resolveImplDefId(defId, (x) => x in GEAR_CARDS || x in VANILLA_UNITS || x in UNIT_COST)
  const gear = GEAR_CARDS[defId]
  if (gear) {
                                                             
                                                                
                                                                
                                         
    return gear.pips > 0
      ? { mana: gear.energy, pips: Array.from({ length: gear.pips }, () => [...gear.domains]) }
      : { mana: gear.energy }
  }
  const vu = VANILLA_UNITS[defId]
  if (vu) {
                                                                      
    return vu.pips > 0 ? { mana: vu.mana, pips: Array.from({ length: vu.pips }, () => [...vu.domains]) } : { mana: vu.mana }
  }
  return UNIT_COST[defId] ?? { mana: 0 }
}

                                                     
                                                                
                                                           
                                                          
                                                                               
                                                             
                                                                   
                                                          
                                                                        

                                                                    
const CARD_CATEGORY: Record<string, string> = {
  'UNL-088': UNL_088.category, 'OGN-101': OGN_101.category, 'OGN-181': OGN_181.category,
}
   
             
                                              
                                               
                                         
                                                           
   
   
                                                                
                                                                                 
                                                        
   
export function battlefieldName(state: GameState, battlefield: string): string | undefined {
  const defId = (state.battlefieldCards ?? {})[battlefield]?.defId
                                                            
                                                          
  return defId === undefined
    ? undefined
    : (BF_NAMES[resolveImplDefId(defId, (x) => x in BF_NAMES)] ?? defId)
}

export function cardKind(defId: string): string {
  const id = resolveImplDefId(defId, (x) => x in GEAR_CARDS || x in CARD_CATEGORY || x in CARD_CATEGORIES)
  if (GEAR_CARDS[id]) return 'equipment'
  return CARD_CATEGORY[id] ?? CARD_CATEGORIES[id] ?? 'unit'
}

                                    
                                              
const isSpellDefId = (defId: string): boolean => cardKind(defId) === 'spell'
const MEL_EMPOWER_SPEC = makeMelEmpowerSpec(isSpellDefId)
                                              
const isEquipmentDefId = (defId: string): boolean => cardKind(defId) === 'equipment'
const SKY_WANDERER_SPEC = makeSkyWandererSpec(isEquipmentDefId)

const SIGIL_SPECS_ENTRIES: Record<string, readonly ActivatedSpec[]> =
  Object.fromEntries(Object.entries(SIGIL_SPECS).map(([id, spec]) => [id, [spec]]))

import { OGN_235, makeOgn235RecycleTrigger } from './cards/recycle-signal'
import { SFD_203, makeSfd203RuneTrigger, makeSfd203ReadyTrigger } from './cards/rune-recycle-signal'
import { OGN_292, SFD_142, makeOgn292Trigger, makeSfd142Trigger } from './cards/spell-target-signal'
import { SFD_057, SFD_199, SFD_199_ACTIVATED, VEN_174, makeIreliaTriggers } from './cards/target-signal'
import { ARC_005, OGN_027, UNL_074, makeArc005Trigger, makeOgn027Trigger, makeUnl074Trigger } from './cards/longtail-37'
import { VEN_167, ARC_001, OGN_099, VEN_167_ACTIVATED, ARC_001_ACTIVATED, OGN_099_ACTIVATED } from './cards/recycle-cost'
import { targetsOf, decodeTargetOids } from '../src/loop/chainTargets'                                         

const ACTIVATED: Record<string, readonly ActivatedSpec[]> = {
  'OGN-078': [OGN_078_SPEC], // ★625 李青:[横置]给予我增益
                                                 
                                                                                      
  'UNL-228': [UNL_228_SPEC],
                                          
  'VEN-191': [VEN_191_SPEC],
  'UNL-144': [UNL_144_MOVE_SPEC], // ★第389轮 守门者马杜里:付[紫]移动到压得住的敌方战场
                                                 
  'VEN-167': [VEN_167_ACTIVATED],
  'ARC-001': [ARC_001_ACTIVATED],
                                             
  'OGN-099': [OGN_099_ACTIVATED],
                                      
  'SFD-199': [SFD_199_ACTIVATED],
                                            
  'UNL-203': [STEADFAST_HAMMER_ACTIVATED],
  'UNL-237': [STEADFAST_HAMMER_ACTIVATED],
                                                    
                                                           
                                              
                                  
  ...SETT_ACTIVATED, // ★第392轮 瑟提(两个印刷号):消耗我的增益 → 本回合+4战力
  'OGN-157': [UDYR_SPEC], // ★第488轮 乌迪尔:消耗我的增益 → 四选一(本回合未选过)
  'UNL-001': [UNL_001_SPEC], // 竞技场理事(第153轮):[横置]让一名单位本回合+3
                                                             
                                                                  
  'OGN-090': [OGN_090_SPEC], // 懊悔法球:[横置]一名单位本回合-1(不低于1)
  'UNL-030': [UNL_030_SPEC], // ★575 蔚:付{2}{红色} 让我本回合战力翻倍(§477.3 doubleMight)
  'SFD-052': [SFD_052_SPEC], // 玄冰之心:[横置]一名单位本回合+3
  'UNL-161': [UNL_161_SPEC], // 占卜贝壳:[迅捷][摧毁此牌][横置]一名单位本回合+2(第248轮)
  'UNL-109': [UNL_109_SPEC], // 猩红玫瑰句2:[消耗3经验][横置]让一名单位变活跃(第249轮)
  ...SPEND_XP_BUFF_SPECS, // 「[狩猎] 消耗2经验:给予我增益」单位族(第312轮 2 张)
  'UNL-126': [UNL_126_ACTIVATED], // 巨牙海兽(358):消耗3经验→此处我方单位本回合获[游走]
  'SFD-197': [SFD_197_SPEC], // 沙漠皇帝句②:付1+横置 ⇒ 基地打出一名2[M]黄沙士兵(第319轮)
  'VEN-112': [VEN_112_SPEC], // 劫句2:[迅捷]付{1}{紫}与影分身互换位置(第253轮)
  'UNL-045': [UNL_045_SPEC], // 被遗忘的路标:[迅捷]休眠一名+横置,把另一名移过去(第256轮)
  'OGN-242': [OGN_242_SPEC], // 海兽钓钩:看顶五张放逐一名并无视费用打出(第259轮)
  'OGN-184': [OGN_184_SPEC], // 塞壬号:付1横置,战场上的友方单位移回其基地
  'OGN-259': [OGN_259_SPEC], // 疾风剑豪(传奇):付2横置,战场↔其基地往返
  'OGN-265': [OGN_265_SPEC], // 奥术先驱(传奇):付1横置,打出一名1[M]随从
                                                                           
  'OGN-263': [OGN_263_SPEC],
                                                
                                                                        
                                                   
  ...SIGIL_SPECS_ENTRIES,
  ...RUNE_SPECS, // ★758 'rune:<域>' → [横置产法力, 回收产符能]
  'OGN-257': [OGN_257_SPEC], // 盲僧(传奇):付1横置,给一名友方单位增益
                                                   
  'OGN-253': [OGN_253_SPEC],               // 诺克萨斯之手:[横置][反应][鼓舞]获得{1}
  'UNL-093': [UNL_093_SPEC],               // ★第537轮 龙魂贤者:同上但【没有[鼓舞]那道闸】
  'OGN-267': [OGN_267_SPEC],               // 赏金猎人:[横置]让一名单位本回合获得[游走]
  'OGN-068': [OGN_068_SPEC],               // ★492 凯特琳:[横置]对任意战场的敌方单位打等同我战力的伤害
  'UNL-026': [UNL_026_SPEC],               // ★586 泽拉斯:[付{红色}][横置]对**一名单位**(不限位置/阵营)打 3 点
  'OGN-113': [OGN_113_SPEC],               // 玛尔扎哈:摧毁友方单位/装备+横置,[迅捷]获得{A}{A}
  'VEN-060': [SKY_WANDERER_SPEC],          // 天际漫游者:弃装备牌+付1+横置,4点伤害
                                                              
                                                        
                                     
  'VEN-001': [VEN_001_EMPOWER_SPEC], // 巴凯旋沙者:强化5,符文≤4时减{3}(定额减免)
  'UNL-189': [UNL_189_SPEC], // 含羞蓓蕾(传奇):付4横置打出活跃瞬息精灵,每名瞬息友方单位减{1}(第223轮)
  'VEN-032': [VEN_032_EMPOWER_SPEC], // 霜衣狼母:强化12,每控制一枚符文减{1}(变量减免)
  'VEN-050': [VEN_050_EMPOWER_SPEC], // 凶暴的岩熊:同上句卡文,共用 perRuneEmpowerDiscount
  'VEN-077': [VEN_077_BUFF_SPEC], // 帝国工具:[横置]给一名单位本回合+2,已强化改+4
  'VEN-110': [MEL_EMPOWER_SPEC], // 梅尔:强化—弃置一张【法术】牌(discardFilter)
  'VEN-188': [MEL_EMPOWER_SPEC], // 同卡再版号
  'VEN-007': [PORO_EMPOWER_SPEC], // 拳拳魄罗:强化—弃一张手牌
  'VEN-124': [VEN_124_EMPOWER_SPEC], // ★608 脱逃的灰背:强化—摧毁一名友方单位(第⑤种非资源费用形态)
  'VEN-054': [TAP_EMPOWER_SPEC, SUSPICIOUS_TOME_DRAW_SPEC], // 可疑之书:强化—横置 / 解除强化+{1}+横置:抽1(第85轮补齐)
  'VEN-087': [TAP_EMPOWER_SPEC, HEX_DISC_ROBOT_SPEC], // 海克斯圆盘:强化—横置 / 解除强化+{1}+横置:打出3力机器人(第86轮补齐)
  'VEN-075': [EGG_EMPOWER_SPEC, EGG_REACTION_SPEC], // 剑头蛟的卵:强化—付{1}+横置 / [反应]横置:获得{1},已强化改{2}(第87轮补齐)
                                                      
  'OGN-017': [OGN_017_SPEC], // 钢铁弩炮:[横置]对战场上一名单位造成2点(与 VEN-060 同句、费用不同)
  'VEN-062': [VEN_062_SPEC], // 海克斯方程式:[横置]强化【另一件】装备
  'UNL-049': [UNL_049_SPEC], // 蜜糖果实:[反应][横置]获得{A},{等级6>}改为{1}和{A}
  'UNL-136': [UNL_136_SPEC], // 占卜花朵:摧毁此牌+{1}+横置 → 洞察2,然后抽一张,获得1经验(第186轮)
  'OGN-212': [OGN_212_SPEC], // 未来熔炉:摧毁此装备 → 从任意废牌堆回收最多四张(第228轮)
  'SFD-046': [SFD_046_SPEC], // 魄罗佳肴:付{1}{绿}+横置+摧毁自身 → 抽一张(第229轮)
  'OGN-098': [OGN_098_SPEC], // 能量通道:[反应][横置] → 获得1法力(第229轮)
  'OGN-124': [OGN_124_SPEC], // 竞技场酒吧:[横置] → 给休眠的友方单位增益(第229轮)
  'SFD-117': [SFD_117_SPEC], // 远古簇碑:[反应][横置] → 付N法力换N点{A}(第230轮)
  'SFD-083': [SFD_083_SPEC], // 海克斯异常体:[反应][横置] → 付N点{A}换N法力(第230轮)
  'SFD-019': [SFD_019_SPEC], // 装配架:付{1}{红}+回收自己废牌堆一名单位+横置 → 基地出3[M]机器人(第231轮)
  'OGN-023': [OGN_023_SPEC], // 来路不明的武器:弃牌+横置 → 给友方单位挂「下次被摧毁可付红召回」(第238轮)
  'OGN-021': [OGN_021_SPEC], // 太阳圆盘:横置+鼓舞 → 本回合下一名单位活跃进场(第243轮)
  'UNL-148': [UNL_148_SPEC], // 受诅咒的石棺:[横置]打出一名以此方式放逐的单位(照卡面费用付,第276轮)
  'UNL-138': [UNL_138_SPEC], // 夺命名单:[横置]让一名具有【宣告标签】的单位本回合[S]-2(第280轮)
  'SFD-078': [SFD_078_SPEC], // 预时之门:[A]+[横置]给本回合下一个法术授予回响(第283轮)
  'UNL-194': [UNL_194_SPEC], // 黑影(第298轮):[迅捷]{1}{A}+横置 → 眩晕进攻此处的敌方单位
  'SFD-082': [SFD_082_SPEC], // ★第534轮 伊泽瑞尔:[迅捷] 付{蓝} → 把我移回基地(本表也折叠别名)
  'VEN-133': [VEN_133_SPEC], // 发光石:解除强化+[横置]把控制权交给一名玩家并召回(第284轮)
  'OGN-186': [OGN_186_SPEC], // 无主宝藏:付{紫}+横置 → 摧毁此牌(摧毁是【效果】不是费用)(第232轮)
  'SFD-168': [SFD_168_SPEC], // 先锋军备:[横置] → 打出三名1[M]随从,落点各选一次(第235轮)
  'VEN-193': [VEN_193_SPEC], // 暮光之眼(第188轮):[迅捷][横置] 给一名【友方】单位本回合[壁垒]
  'OGN-032': [OGN_032_SPEC], // 邪鸦魔典(第192轮):[横置] 你打出的下一个法术伤害+1
  'VEN-151': [MIRROR_LEGEND_SPEC as unknown as ActivatedSpec], // 流光镜影:解除我的强化+横置 → 一名单位本回合-2
                                       
  'VEN-153': [IRONBLOOD_LEGEND_SPEC], // 解除我的强化+{A}+横置 → 让一名单位变为活跃
  'VEN-196': [IRONBLOOD_LEGEND_SPEC], // 同卡再版号
  'VEN-195': [MIRROR_LEGEND_SPEC as unknown as ActivatedSpec], // 同卡再版号
                                                            
  'UNL-197': [{
    key: 'mana',
    label: '[E]:获得{1}(对决法力)',
    cost: {},
    tapSelf: true,
    target: 'none',
    keywords: ['反应'], // 卡面印 [反应][>]:权限轴(§813.2 不受闭环/对决限制)——没这条会被时机门挡在窗口外
    fastResolve: true, // §337.2/§429.2 获资源技能确认后立即结算,优先权不传递;§429.3 窗口内也可激活
    makeResolve: ({ controller }) => () => [{ kind: 'gainResource', player: controller, duelMana: 1 }], // 卡文:此法力仅可在法术对决期间消耗
  }],
                                      
  'OGN-181': [{
    key: 'bounce',
    label: '{{横置}}:让另一张友方装备、单位或正面朝下的卡牌返回其所属的手牌', // ★899 统一 {{横置}} 写法+勘误现行措辞
    cost: {},
    tapSelf: true,
    target: 'custom',
    legalTargets: (state, controller, selfOid) => satchelTargets(state, controller, selfOid),
    makeResolve:
      ({ target }) =>
      (state) => {
                             
        return returnToOwnerHand(state, target) as never
      },
  }],
                                                  
                                                           
                                                   
  'token:金币': [{
    key: 'cash',
    label: '[反应] 摧毁+横置:获得[A]',
    cost: {},
    tapSelf: true,
    destroySelf: true,
    target: 'none',
    keywords: ['反应'],
    fastResolve: true,
                                                              
    makeResolve: ({ controller }) => (state) => [{
      kind: 'gainResource', player: controller, energy: { '*': 1 },
      ...(alchemyBaronGoldBonus(state, controller) ? { mana: 1 } : {}),
    }],
  }],
                                         
  'UNL-088': [{
    key: 'hawk',
    label: '弃1+[E]:打出1[M]战鹰(法盾)',
    cost: {},
    tapSelf: true,
    discard: 1,
    target: 'custom', // 目标=战鹰的打出位置(战场或己方基地,§141 单位可打出至任意有效位置)
    legalTargets: (state, controller) => [
      ...zonesOf(state, 'battlefield').map((z) => z.id as string),
      `base:${controller}`,
    ],
                                                                          
    makeNextChoice: ({ selfOid, controller }) => (state, chosen) =>
      spawnTokenHasteChoice(state, controller, WAR_HAWK_TOKEN, { itemId: `act:${selfOid}:UNL-088:hawk`, key: UNL_088_HASTE_KEY, label: '战鹰' }, chosen),
    makeResolve:
      ({ target, controller }) =>
      (state, chosen) => {
        if (!target) return []
        const x = spawnTokenHasteResolve(state, controller, WAR_HAWK_TOKEN, UNL_088_HASTE_KEY, chosen)                                       
        return [...x.pre, { kind: 'spawnToken', spec: WAR_HAWK_TOKEN, zone: target as never, owner: controller, ...(x.ready ? { ready: true } : {}) }]
      },
  }],
                                                     
                                                                           
  'SFD-193': [...SFD_193_SPECS],
  'UNL-201': [...UNL_201_SPECS], // ★650 虚空掠夺者:耗1经验横置给增益/耗2经验横置移休眠友方(正典一行,236/236*折叠)
  'VEN-092': [VEN_092_SPEC], // ★713 蛮荒巨兽:付{1}本回合+1(正典一行,092a/177 折叠)
  'VEN-155': [VEN_155_SPEC], // ★720 狂暴之心:迅捷>解除强化+横置给强攻2(正典一行,197 折叠)
  'OGN-247': [OGN_247_SPEC], // ★725 虚空之女:横置反应获得受限{A}(正典一行,299/299* 折叠)
  'OGS-014': [OGS_014_SPEC], // ★726 拉克丝:获得受限{2}仅打法术
  'SFD-189': [SFD_189_SPEC], // ★726 山隐之焰:获得受限{A}仅装备面(244 折叠)
  'VEN-141': [VEN_141_SPEC], // ★726 荒漠屠夫:付{A}{A}横置获得受限{2}仅单位面(190 折叠)
  'VEN-125': [VEN_125_SPEC], // ★727 冰原饿狼:付{黄色}变活跃+1(available=选过敌方单位账+oncePerTurn)
  'SFD-088': [...SFD_088_SPECS], // ★657 烈娜塔:付1+蓝抽1/付4+四蓝+横置得1分(战场才可用;正典一行 088a 折叠)
  'UNL-160': [UNL_160_SPEC], // ★661 绵绵魄罗:横置打两战鹰(战场才可用)
  'VEN-194': [...VEN_194_SPECS], // ★635 未来守护者(传奇,两条解横置技能;VEN-149 经 variantAliases 折叠)
  'VEN-189': [VEN_189_SPEC], // ★637 离群之刺(传奇,[迅捷]横置捞对决友方;VEN-139 经 variantAliases 折叠)
  'SFD-050': [SFD_050_SPEC], // ★682 阿兹尔·飞升者:付1绿pip[迅捷]互换位置+可转移武装;每回合一次(050a 经 variantAliases 折叠)
}
                                                               
   
                                                               
                                              
                                         
   
const EQUIP_SPEC_REWRITES: Readonly<Record<string, (sp: ActivatedSpec) => ActivatedSpec>> = {
  'VEN-137': suspiciousGlassesRewrite, // ★684 可疑的眼镜:QA L585 先贴附再复制(不入链)
}

const HANDWRITTEN_EQUIP: Readonly<Record<string, readonly ActivatedSpec[]>> = {
  'UNL-158': [SHEPHERD_EQUIP_SPEC as ActivatedSpec],
  'SFD-178': [BLACK_CLEAVER_EQUIP_SPEC as ActivatedSpec],
  'SFD-090': [Z_DRIVE_RECALL_SPEC as ActivatedSpec], // Z型驱动第二框(付费放逐自己→免费打出被它放逐的单位)
  'SFD-150': [SFD_150_EQUIP_SPEC], // 临终仪式:[装配]付{紫}+从废牌堆回收两张(第277轮)
}

export function activatedFor(defId: string): readonly ActivatedSpec[] {
  defId = resolveImplDefId(defId, (x) => x in ACTIVATED || x in GEAR_CARDS || x in HANDWRITTEN_EQUIP)
  const hand = ACTIVATED[defId] ?? []
                                                   
  const empowerSpecs = empowerActivationSpecs(cardKeywords(defId)).specs
                                       
                                                                      
                                  
  const gear = GEAR_CARDS[defId]
  if (!gear) return [...hand, ...empowerSpecs]
                                                         
  const handwritten = HANDWRITTEN_EQUIP[defId] ?? []
                                                     
                                             
  const equipMods = EQUIP_ABILITY_COST_MODS[defId]
  const rewrite = EQUIP_SPEC_REWRITES[defId]
  const equipSpecs = equipActivationSpecs(gear.keywords).specs.map((sp) => (equipMods === undefined ? sp : {
    ...sp,
    costMods: (state: GameState, player: PlayerId, _selfOid: string, target?: string) =>
      equipMods(state, player, sp.key, target),
  })).map((sp) => (rewrite === undefined ? sp : rewrite(sp)))                           
  return [...hand, ...empowerSpecs, ...handwritten, ...equipSpecs]
}

   
                                     
                                                           
   
   
                                                   
                                                   
   
   
                                                            
                                                                     
                                                                            
                                                                           
   
export function extraPlaySourcesFor(state: GameState, player: PlayerId): readonly ObjId[] {
  return [
    ...unyieldingPlaySources(state, player), // 不死军团 UNL-025:{鼓舞>} 时可从自己废牌堆打出
    ...wellspringPlaySources(state, player), // 涌泉之恨 UNL-186:被授予过就能从自己废牌堆打出(第285轮)
    ...treasurePlaySources(state, player), // ★738 无尽秘藏:在场即可从自己废牌堆打出
  ]
}

export function costModsFor(state: GameState, player: PlayerId, defId: string, ctx?: { readonly fromZone?: string; readonly target?: string; readonly grantedRecursion?: true; readonly standbyFaceDown?: true }): readonly CostMod[] {
  return allCostMods(state, player, defId, isSpellDef, ctx, cardKeywords, isPlainEquipmentDef)
}

                                                           
export function abilityCostModsFor(
  state: GameState, player: PlayerId, defId: string, abilityKey: string, selfOid: string,
): readonly CostMod[] {
  return allAbilityCostMods(state, player, defId, abilityKey, selfOid)
}

   
                                                              
                                                  
                                       
                                                    
                                      
   
export function cardFacts(defId: string): CardFactsRow {
  const id = resolveImplDefId(defId, (x) => x in CARD_FACTS)
  return CARD_FACTS[id] ?? { name: defId }                       
}

                                           
export function validateDeck(deck: DeckToCheck, options?: LegalityOptions): readonly DeckViolation[] {
  return checkDeckLegality(deck, deckFacts, options)
}

   
                                        
                                                                     
                                                 
                                                  
                                                       
                                                      
                                                          
   
export function deckFacts(defId: string): CardFacts {
  if (defId.startsWith('rune:')) {
    const color = defId.slice('rune:'.length)
    return { name: `符文·${color}`, domains: [color], kind: 'rune' }
  }
  const f = cardFacts(defId)
  const tag = HERO_TAG[resolveImplDefId(defId, (x) => x in HERO_TAG)]
  const domains = cardDomains(defId)
  return { ...f, kind: cardKind(defId), ...(tag ? { heroTag: tag } : {}), ...(domains.length > 0 ? { domains } : {}) }
}

   
                                 
                                                                        
   
   
                                                         
                                              
  
                                                         
                                                                 
                                                                           
                                                               
  
                                                   
                                                             
                                     
  
                   
                                  
                                                 
                             
                                                   
                                                                        
                                                           
                                                  
   
                                                    
                                                                 
                                                                    
const HEIMER_DEFIDS: ReadonlySet<string> = new Set(variantSiblings('OGN-111'))
const BORROWABLE_TYPES: ReadonlySet<string> = new Set(['legend', 'unit', 'equipment'])

function borrowedTapAbilities(obj: GameObject, state: GameState): readonly StaticEffect[] {
  if (!HEIMER_DEFIDS.has(passiveDefId(obj))) return []
  const keys: string[] = []
  for (const o of Object.values(state.objects)) {
                                                   
                                                               
                                               
                                                       
    if (o.oid === obj.oid) continue                                           
    if (o.controller !== obj.controller) continue                             
    const k = state.zones[o.zone]?.kind
    if (k !== 'battlefield' && k !== 'base') continue                         
                                                     
                                                       
                                                      
    if (!typesOf(o).some((t) => BORROWABLE_TYPES.has(t))) continue           
    for (const sp of activatedFor(o.defId)) if (sp.tapSelf === true) keys.push(sp.key)
  }
  if (keys.length === 0) return []
                                                          
                                                                            
                                                        
                                              
  return [...new Set(keys)].map((specKey): StaticEffect => ({
    id: `${obj.defId}:borrow:${specKey}:${obj.oid}`,
    duration: 'permanent' as const,
    fromPassive: true,
    timestamp: 0,
    predicate: (x: GameObject) => x.oid === obj.oid, // 只加在我自己身上
    modification: { kind: 'grantActivated', specKey },
  }))
}

export function cardPassives(obj: GameObject, state: GameState): readonly StaticEffect[] {
  return [
    ...empoweredPassives(obj),
                                                       
    ...borrowedTapAbilities(obj, state),
                                            
    ...countScaledMightPassives(obj, state),
                                                    
                                                                    
    ...groupPassives(obj, state, defHasTag),
                                                 
                                          
    ...conditionalSelfPassives(obj, state),
                                                          
                                              
    ...baronPassives(obj, state),
                                                        
                                                         
                                               
    ...gearHostPassives(obj, state),
  ]
}

   
                                  
                                                                 
   
export const bfCardPassives = battlefieldPassives

   
                                               
                                                          
                                                                 
                          
                                         
   
const GRANTED_SPECS: Readonly<Record<string, ActivatedSpec>> = {
  [UNL_213_GRANT_KEY]: UNL_213_GRANTED_SPEC,
                                                            
  [SFD_208_GRANT_KEY]: SFD_208_GRANTED_SPEC,
                                                 
                                                           
  [VEN_142_GRANT_KEY]: VEN_142_GRANTED_SPEC,
}

                                                 
export function grantedSpec(key: string): ActivatedSpec | undefined {
  const own = GRANTED_SPECS[key]
  if (own) return own
                                       
                                                       
                                                
  return printedSpecIndex()[key]
}

let PRINTED_SPEC_INDEX: Record<string, ActivatedSpec> | undefined
                                             
function printedSpecIndex(): Readonly<Record<string, ActivatedSpec>> {
  if (PRINTED_SPEC_INDEX) return PRINTED_SPEC_INDEX
  const idx: Record<string, ActivatedSpec> = {}
  for (const specs of Object.values(ACTIVATED)) {
                                                     
                              
    for (const sp of specs) if (!(sp.key in idx)) idx[sp.key] = sp
  }
  PRINTED_SPEC_INDEX = idx
  return idx
}

   
                               
                                                                       
                                                                 
   
export const extraGrants = extraAttachmentGrants

                                                     
export function cardDomains(defId: string): readonly string[] {
  return CARD_DOMAINS[resolveImplDefId(defId, (x) => x in CARD_DOMAINS)] ?? []
}

   
                                          
                                                    
                                                  
                                
   
   
                                             
                                  
   
export function entryDormantFor(_state: GameState, _player: PlayerId, defId: string): boolean {
  return ENTER_DORMANT_ALL.has(resolveImplDefId(defId, (x) => ENTER_DORMANT_ALL.has(x)))
}

const ENTER_READY = makeEnterReadyTable(defHasTag, (defId) => CARD_NAMES[defId] ?? defId)

   
                                                                            
                                                           
                                                   
                                                
   
export function tokenEntersReadyFor(state: GameState, player: PlayerId): boolean {
  return tokenEntersReady(state, player)
}

                                                                       
   
                                                           
                                                                  
                                            
   
export function runeIdOf(defId: string): string | undefined {
  if (cardKind(defId) !== 'rune') return undefined
  const d = cardDomains(defId)[0]
  return d === undefined ? undefined : `rune:${d}`
}

                                           
export function kindOf(defId: string): string | undefined {
  return cardKind(defId)
}

export function tokenSpawnDoublerFor(state: GameState, ev: SpawnTokenEvent): ObjId | undefined {
  return tokenSpawnDoubler(state, ev)
}

                                                               
export function skipDrawPhaseFor(state: GameState, player: PlayerId): boolean {
  return treasureSkipsDraw(state, player)
}

export function entryReadyFor(state: GameState, player: PlayerId, defId: string, to?: string, self?: string): boolean {
                                         
                                           
  if (defId === 'UNL-035') return chompCostMods(state, player, defId).length > 0
                                                                  
  const cond = ENTER_READY[resolveImplDefId(defId, (x) => x in ENTER_READY)]
  if (cond !== undefined && cond(state, player, to, self)) return true
                                             
                                        
  if (nextUnitReadyOf(state, player)) return true
                                                 
                                                  
  if (allUnitsEnterReadyOf(state, player)) return true
                                                   
                                    
  return boardWideEnterReady(state, player, self)
}

                                                
export const lastRitesEffect = gearLastRitesEffect
                                                                            
export { unitLastRitesBasePerform as lastRitesBasePerform } from './cards/last-rites-units'
                                                                                   
export const lastRitesChoice = lastRitesChoiceOf

   
                                          
                                                                        
                                                                        
   
const SPELL_BONUS_FOR_SPELLS: Readonly<Record<string, PlayExtraCost>> = {
  'VEN-008': VEN_008_EXTRA_COST, // ★495 无情打击:弃一张手牌 ⇒ 改为 5 点
  ...SPELL_BONUS_COSTS,          // ★496 冥想(休眠友军)/ 暴走(付{橙})
  'UNL-140': UNL_140_EXTRA_COST, // ★497 强制征召:消耗5经验 ⇒ 换掉【目标域】
  ...SACRIFICE_COSTS_500,        // ★500 牺牲 / 残酷复活(**required:true** 首两张)
}

                                                                 
export function extraLethal(state: GameState, o: GameObject): boolean {
  return dragonLethal(state, o)
}

   
                                                                
  
                                                               
                                               
                                            
                                                                
                                                         
                                                                                            
                                                        
                          
                                         
                                         
                                         
                                                   
                                                       
                                                         
                                                                        
                                                                      
                                                                 
                         
                                                                         
                                                                                      
                                                                   
                                                                      
                                                      
                                                              
                                                                          
                                               
                                                      
                                                           
                                                                        
                                                                              
   
export function replaceDestroy(state: GameState, oid: ObjId): GameState | null {
                                               
                                                       
                                          
                                                         
                                     
                                                   
                                                       
                                                              
                                                          
                                                              
  const cands = replaceDestroyCandidates(state, oid)
  if (cands.length === 0) return null
  return cands[0]!.apply(state, oid)                                
}

   
                                            
  
                                         
                                          
                                   
                                              
                                                      
                                                           
                                                         
  
                          
                                          
                                       
                                                        
                                                
                                                  
                                            
   
   
                                                      
                                                       
                                                                
                                                                   
                   
   
export type DestroyReplacementCandidate = DestroyReplacement

   
                                          
                                             
                                             
   
const DESTROY_REPLACEMENTS: readonly DestroyReplacementCandidate[] = [
  { id: 'guardianAngel', sourceDefId: 'SFD-051', apply: guardianAngelSave },
                                                           
                                    
                                      
  { id: 'recallInstead', sourceDefId: 'OGN-023', apply: recallInsteadOfDestroy, optional: true }, // 「你可以选择支付{红色}」
  { id: 'chronoShift', sourceDefId: 'OGN-077', apply: chronoShiftSave },
                                                      
                                                                    
  { id: 'soraka', sourceDefId: 'SFD-173', apply: sorakaSave },
  { id: 'bloodAltar', sourceDefId: 'UNL-206', apply: bloodAltarSave, optional: true }, // 「其控制者可以选择支付{A}{A}{A}」
  { id: 'sett', sourceDefId: 'OGN-269', apply: settSave, optional: true }, // 「你可以选择支付{A}让我变为休眠状态」
  { id: 'exileInstead', sourceDefId: 'UNL-007', apply: exileInsteadOfDestroy },
]

   
                                                
                                           
                                                
                                                      
                                
   
export const REPLACE_DESTROY_ORDER: readonly string[] = DESTROY_REPLACEMENTS.map((c) => c.id)

export function replaceDestroyCandidates(state: GameState, oid: ObjId): readonly DestroyReplacementCandidate[] {
  const all = DESTROY_REPLACEMENTS
                                                   
                                               
                                                        
                                  
  return all.filter((c) => c.apply(state, oid) !== null)
}

                                                              
export function scoringBonus(state: GameState, player: PlayerId, battlefield: string, kind: 'conquer' | 'hold'): number {
  return trinityBonus(state, player, battlefield, kind)
    + ahriScoringBonus(state, player, battlefield, kind)                       
    + tryndamereScoringBonus(state, player, battlefield, kind)                                           
}

   
                                                      
  
                                                                  
                                                               
                                                                    
                                                    
                                                        
                                                                             
                                                                     
                                                                       
                                   
                                                                  
                                                       
   
export function holdRepeats(state: GameState, player: PlayerId, battlefield: string): number {
  const z = state.zones[battlefield]
  if (!z) return 1
  const kin = variantSiblings('UNL-087')
  const golems = z.contents.filter((oid) => {
    const o = state.objects[oid]
    return !!o && kin.includes(o.defId) && o.controller === player
  }).length
  return 1 + golems
}

   
                                                  
                                                 
                                                                  
   
export function conquerRepeats(state: GameState, player: PlayerId, battlefield: string): number {
  const z = state.zones[battlefield]
  if (!z) return 1
                                                                    
                                                       
                                                 
  const kin = variantSiblings('UNL-029')
  const treants = z.contents.filter((oid) => {
    const o = state.objects[oid]
    return !!o && kin.includes(o.defId) && o.controller === player
  }).length
  return 1 + treants
}

   
                                                           
                                                          
   
export function lastRitesRepeats(state: GameState, player: PlayerId): number {
  return karthusLastRitesRepeats(state, player)
}

                                                 
export function startStepHook(state: GameState, player: PlayerId): GameState {
  let s = state
  for (const o of Object.values(s.objects)) {
    if (s.winner) break
    if (o.defId !== 'UNL-088' || o.controller !== player) continue
    const z = s.zones[o.zone]
    if (!z || (z.kind !== 'base' && z.kind !== 'battlefield')) continue         
    s = palaceStartCheck(s, player)                    
  }
  return s
}

                                                            
export { scoreBlockedAt, scoreBlockedAnywhere, scoreDrawInsteadAt, playBannedFor } from './cards/longtail-12'                
                                                                             
export { deflectWaivedAt } from './cards/VEN-158'

   
                                                           
                                             
                                                   
   
export function deflectWaivedForCard(defId: string): boolean {
  return DEFLECT_WAIVED_PUMP_DEFIDS.includes(defId)
}

                                                                                    
export { barrierIgnoredAt } from './cards/VEN-004'
                                                                           
export { combatImmuneAt } from './cards/move-count-cards'
                                                                 
export { echoDiscountFor } from './cards/cost-modifiers'
                                                                      
export function hasteGrantedBy(state: GameState, player: PlayerId, defId: string, fromZone?: string, spec?: TypeSource): boolean {
  return rekSaiHasteGrant(state, player, defId, fromZone, spec)                                              
}

                                                                            
                                                                                  
   
                                               
  
                                                            
                                                 
                                                       
                                                            
  
               
                                                                         
                                                                      
                                         
                                                        
                                                            
  
                                               
                                                                                
                                      
                                  
  
                                  
                                                                                                  
                                                                        
                                                                                     
                                                                      
                                                                                   
                                                                              
                                             
                                                                       
                                                                                   
                                                                                  
                                                                 
   
export function hasOptionalExtraCost(defId: string): boolean {
  return optionalExtraInfo(defId) !== undefined
}
   
                                                                 
                                                                                                 
                                                                                                
                                  
                                            
   
export function optionalExtraInfo(defId: string): OptionalExtraInfo | undefined {
  const b = playBonusFor(defId)
  const bonus = b !== undefined && b.required !== true ? b : undefined                                                            
  const haste = hasHaste(cardKeywords(defId))                                    
  if (bonus === undefined && !haste) return undefined
  return { ...(bonus !== undefined ? { bonus } : {}), ...(haste ? { hasteCost: hasteExtraCost(cardDomains(defId)) } : {}) }
}

export function playBonusFor(defId: string): PlayExtraCost | undefined {
                                                                
                                                        
                                                                              
                                                       
                                                            
                                                        
                                                                   
                                                          
  if (variantSiblings('VEN-023').includes(defId)) return ZED_EXTRA_COST
  if (defId === 'UNL-164') return UNL_164_EXTRA_COST                              
                                                         
                                           
                                                               
                                                                    
                                                 
                                                                                    
  const implId = resolveImplDefId(defId, (x) =>
    SPELL_BONUS_FOR_SPELLS[x] !== undefined || optionalPlayBonusFor(x) !== undefined || PLAY_EXTRA_COSTS[x] !== undefined)
  const spellBonus = SPELL_BONUS_FOR_SPELLS[implId]
  if (spellBonus !== undefined) return spellBonus
  const own = optionalPlayBonusFor(implId) ?? PLAY_EXTRA_COSTS[implId]
  if (own !== undefined) return own
                                                 
                                                
                                       
  return dragonPerchBonus(defId, defHasTag)
}
export { winTargetBonusFor } from './cards/longtail-17'
export { summonRuneCapFor } from './cards/longtail-18'
export { extraPlayZonesFor } from './cards/longtail-19'
export { standardMoveSurchargeFor } from './cards/UNL-163'                           

                                                                       
export { extraAmbushZonesFor } from './cards/VEN-179'

                                                                        
setFizzSpecProvider(playSpecFor)
setResolveRewriter(gangplankRewrites)                               
setPlayFromDeckSpecProvider(playSpecFor)                                   
setOptionalExtraProvider(optionalExtraInfo)                                                                          
setSpawnTokenHasteProvider(hasteGrantedBy)                                                                          
setSpawnTokenHasteHooks({ choice: spawnTokenHasteChoice, resolve: spawnTokenHasteResolve, paidSoFar: hastePaidSoFar, costTimes: hasteCostTimes })                                                                                               
                                                                 
setRevealedHook(gigalithRevealedHook)
                                                       
setIsSpellProvider((defId: string) => cardKind(defId) === 'spell')
                                                        
setSpellGuardProvider(melSpellGuard)
                                             
                                                        
setUnnegatableCardProvider((defId) => UNNEGATABLE_DAMAGE_DEFIDS.includes(defId))
                                                     
                                                        
setSpellEchoGrantProvider(syndraEchoGrants)

