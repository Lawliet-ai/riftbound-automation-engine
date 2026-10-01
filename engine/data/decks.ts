                                                                 
                                                                                 

import { OGN_270 } from './cards/OGN-270'
import { OGN_173 } from './cards/OGN-173'
import { OGS_011 } from './cards/OGS-011'
import { UNL_202 } from './cards/UNL-202'
import { SFD_129 } from './cards/SFD-129'
import { VEN_107 } from './cards/VEN-107'
import { UNL_054 } from './cards/UNL-054'
import { OGN_179 } from './cards/OGN-179'
import { SFD_136 } from './cards/SFD-136'
import { OGN_156 } from './cards/OGN-156'
import { VEN_085 } from './cards/VEN-085'             
import { VEN_180 } from './cards/UNL-119'                   
import { OGN_203 } from './cards/OGN-203'
import { OGN_018 } from './cards/longtail-12'
import { OGN_146, OGN_153, OGN_207 } from './cards/buff-consumers'
import { OGN_012, OGN_084, OGN_140, UNL_035, VEN_007, VEN_119 } from './cards/cost-modifiers'
import { VEN_054, VEN_075, VEN_087 } from './cards/empower-nonresource'
import { UTILITY_SPELL_CARDS } from './cards/utility-spells'
import { UNL_032 } from './cards/UNL-032'
import { SFD_194 } from './cards/SFD-194'
import { UNL_192_CARD } from './cards/UNL-192'                
import { SFD_197 } from './cards/SFD-197'
import type { Card } from '../src/dsl/card'
import { resolveImplDefId } from './variantAlias'
import type { CardSpec, Deck, SpecLookup } from '../src/game/setup'
import type { CardType } from '../src/state/cardTypes'
import { SFD_010, SFD_164 } from './cards/outside-hand-play'
import { VEN_098 } from './cards/VEN-098'
import { VEN_164 } from './cards/VEN-164'
import { SFD_141 } from './cards/SFD-141'
import { VEN_SP5 } from './cards/VEN-SP5'
import { SFD_149 } from './cards/SFD-149'
import { VEN_024 } from './cards/VEN-024'
import { SFD_031, VEN_051 } from './cards/token-spells'
import { OGN_117 } from './cards/OGN-117'
import { OGN_212 } from './cards/OGN-212'
import { SFD_046, OGN_098, OGN_124 } from './cards/gear-batch-229'
import { SFD_117, SFD_083 } from './cards/variable-amount-cost'
import { SFD_019 } from './cards/SFD-019'
import { OGN_186 } from './cards/OGN-186'
import { OGN_227 } from './cards/OGN-227'
import { SFD_168 } from './cards/SFD-168'
import { UNL_013 } from './cards/UNL-013'
import { VEN_126 } from './cards/VEN-126'
import { OGN_023 } from './cards/OGN-023'
import { OGN_221, OGN_254, SFD_166, UNL_073, UNL_095, VEN_146 } from './cards/delayed-triggers'
import { OGS_020, UNL_175 } from './cards/free-recall-spells'
import { OGN_021 } from './cards/OGN-021'
import { UNL_078 } from './cards/UNL-078'
import { SFD_104, UNL_085 } from './cards/gear-batch-245'
import { OGN_077 } from './cards/OGN-077'
import { OGN_228, SFD_144 } from './cards/gear-batch-247'
import { OGN_063, UNL_161 } from './cards/gear-batch-248'
import { UNL_011, UNL_109, SFD_119 } from './cards/gear-batch-249'
import { SFD_084, VEN_175 } from './cards/jayce-gear'
import { UNL_130 } from './cards/UNL-130'
import { SFD_081 } from './cards/SFD-081'
import { UNL_164 } from './cards/UNL-164'
import { SFD_053 } from './cards/SFD-053'
import { SFD_140 , OGN_112, OGN_112A } from './cards/SFD-140'
import { SFD_175 } from './cards/SFD-175'
import { VEN_069 } from './cards/VEN-069'
import { SFD_116, SFD_233 } from './cards/SFD-116'
import { OGN_158, OGN_158A } from './cards/OGN-158'
import { OGN_167 } from './cards/OGN-167'
import { VEN_113, VEN_113A } from './cards/VEN-113'
import { UNL_119, UNL_119A } from './cards/UNL-119'
import { OGN_041, OGN_041A } from './cards/OGN-041'                    
import { UNL_029, UNL_029A } from './cards/UNL-029'
import { OGN_068, ARC_002, SFD_173, SFD_239 } from './cards/backline-heroes'                        
import { OGN_168, SFD_043 } from './cards/retreat-to-base-spells'                 
import { VEN_008 } from './cards/VEN-008'               
import { SPELL_BONUS_CARDS } from './cards/spell-bonus-batch'                   
import { UNL_140 } from './cards/UNL-140'               
import { ECHO_SPELL_CARDS_498 } from './cards/echo-spells-498'                   
import { ECHO_SPELL_CARDS_499 } from './cards/echo-spells-499'                   
import { SACRIFICE_CARDS_500 } from './cards/sacrifice-spells-500'                       
import { EXTRA_COST_CARDS_501 } from './cards/extra-cost-501'                      
import { EXTRA_COST_CARDS_502 } from './cards/extra-cost-502'                          
import { UNL_007 } from './cards/UNL-007'                     
import { FROM_STANDBY_CARDS_506 } from './cards/from-standby-506'                      
import { UNL_141 } from './cards/UNL-141'              
import { SFD_139 } from './cards/SFD-139'               
import { UNL_003 } from './cards/UNL-003'                
import { OGN_200 } from './cards/OGN-200'              
import { SFD_184 } from './cards/SFD-184'
import { UNL_050 } from './cards/UNL-050'
import { SFD_202 } from './cards/SFD-202'
import { UNL_089, UNL_089A } from './cards/UNL-089'
import { UNL_145, UNL_145A } from './cards/UNL-145'
import { VEN_138, VEN_138A, UNL_048 } from './cards/battlefield-timing'
import { UNL_133 } from './cards/UNL-133'
import { VEN_023, VEN_144, VEN_169 } from './cards/shadow-clone'
import { VEN_112 } from './cards/VEN-112'
import { UNL_046, UNL_196 } from './cards/animal-tags'
import { UNL_045 } from './cards/UNL-045'
import { VEN_108 } from './cards/VEN-108'
import { OGN_160 } from './cards/OGN-160'
import { SFD_200 } from './cards/SFD-200'
import { UNL_184 } from './cards/UNL-184'
import { UNL_025 } from './cards/UNL-025'
import { VEN_066 } from './cards/VEN-066'
import { VEN_106 } from './cards/VEN-106'
import { VEN_127 } from './cards/VEN-127'
import { AMBESSA_CARDS } from './cards/VEN-136'
import { UNL_107 } from './cards/UNL-107'
import { UNL_144 } from './cards/UNL-144'
import { KAISA_CARDS } from './cards/OGN-039'
import { OGN_155 } from './cards/OGN-155'
import { OGN_110, UNIT_LAST_RITES_CARDS , VEN_128 } from './cards/last-rites-units'
import { LAST_RITES_CHOICE_CARDS } from './cards/last-rites-choices'
import { OGN_236 } from './cards/karthus-repeats'
import { OGN_067 } from './cards/OGN-067'
import { SWAIN_CARDS } from './cards/VEN-065'
import { VEN_SP4 } from './cards/buff-consumers'
import { OGN_102 } from './cards/OGN-102'
import { UNL_138 } from './cards/UNL-138'
import { UNL_177 } from './cards/UNL-177'
import { VEN_132 } from './cards/VEN-132'
import { SFD_078 } from './cards/SFD-078'
import { VEN_133 } from './cards/VEN-133'
import { UNL_186 } from './cards/UNL-186'
import { OGN_196, OGN_226, OGN_062, SFD_188, OGN_198, VEN_089, SFD_243, UNL_148, SFD_150, SFD_026 } from './cards/play-from-deck'
import { OGN_242 } from './cards/OGN-242'
import { UNL_150 } from './cards/UNL-150'
import { UNL_131 } from './cards/UNL-131'
import { VEN_152 } from './cards/VEN-152'
import { OGN_121 } from './cards/OGN-121'
import { OGN_263 } from './cards/OGN-263'
import { UNL_081 } from './cards/UNL-081'
import { OGN_197 } from './cards/OGN-197'
import { OGN_097 } from './cards/OGN-097'
import { SFD_138 } from './cards/SFD-138'
import { OGN_169 } from './cards/OGN-169'
import { OGN_083 } from './cards/OGN-083'
import { OGN_101 } from './cards/OGN-101'
import { OGN_017, VEN_062, UNL_049, UNL_136 } from './cards/enter-dormant-gear'
import { UNL_038, VEN_105, UNL_124, OGN_258 } from './cards/enemy-move'              
import { VEN_193, OGN_277 } from './cards/longtail-31'
import { OGN_296, OGS_001, OGN_032 } from './cards/damage-boost'
import { ATTACK_STUN_CARDS } from './cards/longtail-32'
import { OGN_177, VEN_025 } from './cards/longtail-33'
import { OGN_293, UNL_105 } from './cards/longtail-34'
import { VEN_096, SFD_012, VEN_064, SFD_103 } from './cards/longtail-35'
import { UNL_104, SFD_130 } from './cards/longtail-36'
import { SFD_160, OGN_208, SFD_044, OGN_002, UNL_178, UNL_170 , UNL_052 , VEN_101 , SFD_079, SFD_228, SFD_109 } from './cards/play-extra-cost'
import { OGN_118, VEN_002, OGN_162, VEN_068, SFD_148, UNL_174, UNL_215, VEN_063 } from './cards/once-per-turn'
import { VEN_167, ARC_001, OGN_099 } from './cards/recycle-cost'
import { OGN_235 } from './cards/recycle-signal'
import { SFD_203 } from './cards/rune-recycle-signal'
import { OGN_292, SFD_142 } from './cards/spell-target-signal'
import { SFD_057, SFD_199, VEN_174 } from './cards/target-signal'
import { UNL_126 } from './cards/UNL-126'
import { ARC_005, OGN_027, UNL_074 } from './cards/longtail-37'
import { OGN_181 } from './cards/OGN-181'
import { UNL_088 } from './cards/UNL-088'
import { OGN_172, VEN_052, OGN_104, SFD_087 , VEN_035 } from './cards/diana-reactions'
import { OGN_199, SFD_145, OGN_264, OGN_183, UNL_125 } from './cards/standby-tricks'
import { UNL_071, OGN_087, UNL_149, UNL_087, UNL_043 } from './cards/combat-keywords'
import { UNL_079, UNL_134, UNL_197 } from './cards/diana-core'
import { UNL_146 } from './cards/UNL-146'
import { UNL_182 } from './cards/UNL-182'
import { SFD_077 } from './cards/SFD-077'
import { SFD_049 } from './cards/SFD-049'
import { OGN_157 } from './cards/OGN-157'
import { OGN_134, OGN_138 } from './cards/rune-summon-spells'
import { OGN_029, OGN_248 } from './cards/repeat-damage-spells'
import { SFD_041, VEN_033 } from './cards/move-reveal-units'
import { VEN_043 } from './cards/VEN-043'
import { VEN_001 } from './cards/VEN-001'
import { VEN_021 } from './cards/VEN-021'
import { VEN_032 } from './cards/VEN-032'
import { VEN_110 } from './cards/VEN-110'
import { VEN_104 } from './cards/VEN-104'
import { OGN_056 } from './cards/OGN-056'
import { OGN_152 } from './cards/OGN-152'
import { OGN_072 } from './cards/OGN-072'
import { SFD_063 } from './cards/SFD-063'
import { SFD_169 } from './cards/SFD-169'
import { VEN_009 } from './cards/VEN-009'
import { UNL_065 } from './cards/UNL-065'              
import { SFD_035 } from './cards/SFD-035'
import { SFD_069, UNL_222, SFD_152, VEN_042, VEN_170, OGN_222, SFD_038, UNL_193, UNL_232, UNL_203, UNL_237, OGN_066, UNL_112, SFD_125, SFD_126, OGS_023, UNL_179, SFD_113, UNL_127, SFD_123, SFD_179, SFD_112 } from './cards/battlefield-timing'
import { OGN_251, OGN_119, OGN_255, UNL_183, OGN_246 } from './cards/reprint-batch'
import { OGN_090, SFD_052, OGN_184, OGN_259, OGN_265 } from './cards/activated-batch'
import { UNL_030 } from './cards/UNL-030'          
import { UNL_213 } from './cards/UNL-213'                  
import { SFD_208 } from './cards/SFD-208'                  
import { UNL_101 } from './cards/UNL-101'             
import { SFD_107 } from './cards/SFD-107'           
import { UNL_228 } from './cards/UNL-228'                 
import { SFD_193 } from './cards/SFD-193'                                             
import { OGN_033 as OGN_033_CARD } from './cards/OGN-033'             
import { OGN_037 as OGN_037_CARD } from './cards/OGN-037'             
import { VEN_194 as VEN_194_CARD } from './cards/VEN-194'                             
import { VEN_140 as VEN_140_CARD } from './cards/VEN-140'           
import { VEN_189 as VEN_189_CARD } from './cards/VEN-189'                            
import { UNL_106 as UNL_106_CARD } from './cards/UNL-106'           
import { OGN_025 as OGN_025_CARD } from './cards/OGN-025'             
import { OGN_115 as OGN_115_CARD } from './cards/OGN-115'             
import { OGN_071 as OGN_071_CARD } from './cards/OGN-071'              
import { UNL_200 as UNL_200_CARD } from './cards/UNL-200'             
import { UNL_201 as UNL_201_CARD } from './cards/UNL-201'              
import { UNL_055 as UNL_055_CARD } from './cards/UNL-055'            
import { UNL_103 as UNL_103_CARD } from './cards/UNL-103'             
import { SFD_195 as SFD_195_CARD } from './cards/SFD-195'             
import { OGN_262 as OGN_262_CARD } from './cards/OGN-262'             
import { SFD_088 as SFD_088_CARD } from './cards/SFD-088'            
import { SFD_206 as SFD_206_CARD } from './cards/SFD-206'               
import { UNL_168 as UNL_168_CARD } from './cards/UNL-168'             
import { UNL_160 as UNL_160_CARD } from './cards/UNL-160'             
import { UNL_044 as UNL_044_CARD } from './cards/UNL-044'             
import { SFD_154 as SFD_154_CARD } from './cards/SFD-154'            
import { OGN_266 as OGN_266_CARD } from './cards/OGN-266'             
import { VEN_122 as VEN_122_CARD } from './cards/empower-grants'             
import { VEN_156 as VEN_156_CARD } from './cards/VEN-156'              
import { VEN_012 as VEN_012_CARD } from './cards/VEN-012'              
import { UNL_080 as UNL_080_CARD } from './cards/UNL-080'          
import { OGN_256 as OGN_256_CARD } from './cards/OGN-256'             
import { VEN_134 as VEN_134_CARD } from './cards/empower-grants'           
import { VEN_148 as VEN_148_CARD } from './cards/enemy-move'              
import { SFD_111 as SFD_111_CARD } from './cards/SFD-111'             
import { UNL_082 as UNL_082_CARD } from './cards/UNL-082'            
import { UNL_022 as UNL_022_CARD } from './cards/UNL-022'          
import { VEN_079 as VEN_079_CARD } from './cards/VEN-079'              
import { VEN_034 as VEN_034_CARD } from './cards/VEN-034'            
import { VEN_088 as VEN_088_CARD } from './cards/VEN-088'               
import { VEN_019 as VEN_019_CARD } from './cards/VEN-019'            
import { VEN_092 as VEN_092_CARD } from './cards/VEN-092'                 
import { OGS_014 as OGS_014_CARD } from './cards/restricted-gain'                            
import { VEN_125 as VEN_125_CARD } from './cards/VEN-125'             
import { UNL_118 as UNL_118_CARD, UNL_118A as UNL_118A_CARD } from './cards/UNL-118'             
import { OGN_244 as OGN_244_CARD } from './cards/OGN-244'             
import { OGN_070 as OGN_070_CARD } from './cards/OGN-070'               
import { UNL_163 as UNL_163_CARD } from './cards/UNL-163'              
import { UNL_086 as UNL_086_CARD } from './cards/UNL-086'           
import { UNL_020 as UNL_020_CARD } from './cards/UNL-020'             
import { VEN_022 as VEN_022_CARD } from './cards/VEN-022'             
import { OGN_150 as OGN_150_CARD } from './cards/OGN-150'             
import { OGN_231 as OGN_231_CARD } from './cards/OGN-231'            
import { OGN_194 as OGN_194_CARD } from './cards/OGN-194'               
import { SFD_018 as SFD_018_CARD } from './cards/SFD-018'                  
import { SFD_180 as SFD_180_CARD } from './cards/SFD-180'                 
import { SFD_029 as SFD_029_CARD } from './cards/SFD-029'                 
import { SFD_055 as SFD_055_CARD } from './cards/SFD-055'                
import { SFD_050 as SFD_050_CARD } from './cards/SFD-050'                
import { SFD_201 as SFD_201_CARD } from './cards/SFD-201'             
import { UNL_005 as UNL_005_CARD } from './cards/UNL-005'               
import { UNL_017 as UNL_017_CARD } from './cards/UNL-017'             
import { SFD_146 as SFD_146_CARD, VEN_055 as VEN_055_CARD } from './cards/cost-modifiers'              
import { SFD_177 as SFD_177_CARD } from './cards/SFD-177'               
import { UNL_018 as UNL_018_CARD, SFD_120 as SFD_120_CARD } from './cards/excess-conquer'                 
import { OGN_053 as OGN_053_CARD } from './cards/OGN-053'              
import { UNL_139 as UNL_139_CARD } from './cards/UNL-139'             
import { VEN_114 as VEN_114_CARD } from './cards/VEN-114'             
import { UNL_181 as UNL_181_CARD } from './cards/UNL-181'            
import { UNL_147 as UNL_147_CARD } from './cards/UNL-147'             
import { UNL_198 as UNL_198_CARD } from './cards/UNL-198'             
import { VEN_084 as VEN_084_CARD } from './cards/VEN-084'                      
import { VEN_181 as VEN_181_CARD } from './cards/VEN-181'                    
import { VEN_044 } from './cards/VEN-044'             
import { SFD_198 } from './cards/SFD-198'             
import { VEN_157 } from './cards/VEN-157'                 
import { OGN_107 } from './cards/OGN-107'                
import { VEN_191 } from './cards/VEN-191'                 
import { UNL_056 } from './cards/UNL-056'           
import { OGN_250 } from './cards/OGN-250'             
import { UNL_204 } from './cards/UNL-204'              
import { UNL_058 } from './cards/UNL-058'            
import { OGN_079 } from './cards/OGN-079'            
import { VEN_124 } from './cards/VEN-124'              
import { OGN_249 } from './cards/OGN-249'             
import { SFD_028 } from './cards/SFD-028'            
import { OGN_260 } from './cards/OGN-260'              
import { OGN_151 } from './cards/OGN-151'           
import { SFD_020 } from './cards/SFD-020'            
import { VEN_006 } from './cards/VEN-006'              
import { VEN_016 } from './cards/VEN-016'             
import { SFD_024 } from './cards/SFD-024'                  
import { OGN_078 } from './cards/OGN-078'                     
import { SFD_054 } from './cards/group-passives'                 
import { OGN_111, ARC_003 } from './cards/OGN-111'                  
import { OGN_006 } from './cards/OGN-006'              
import { OGN_080 } from './cards/OGN-080'             
import { VEN_053 } from './cards/longtail-12'           
import { VEN_161 } from './cards/cost-modifiers'                  
import { OGN_109 } from './cards/OGN-109'             
import { UNL_026 } from './cards/UNL-026'            
import { OGN_034 } from './cards/battlefield-timing'             
import { SFD_215 } from './cards/SFD-215'                     
import { UNL_211 } from './cards/battlefields-extra'                  
import { SIGIL_CARDS, OGN_257 } from './cards/sigils'
import { OGN_253, OGN_267, OGN_113, VEN_060, UNL_093 } from './cards/activated-batch2'
import { OGN_114, OGN_076, OGN_103, OGN_131, OGN_091, OGN_065, VEN_041 } from './cards/longtail-1'
import { OGN_229, OGN_148, VEN_071, OGN_143, OGN_195 } from './cards/longtail-2'
import { UNL_115 } from './cards/UNL-115'             
import { UNL_180, SFD_048, SFD_137, UNL_068, UNL_129, SFD_159 } from './cards/longtail-3'                                        
import { SFD_006, OGS_016, OGS_009, UNL_001, ARC_004, SFD_027, SFD_094, SFD_176, OGN_035, SFD_223, VEN_091, VEN_013, UNL_037, UNL_008 } from './cards/enter-ready'
import { UNL_171,
  UNL_057, UNL_060, OGS_013, OGN_015, OGN_100, SFD_065, UNL_077, SFD_181, SFD_089, OGN_074, UNL_041, SFD_071, OGN_294, OGN_297, UNL_111, SFD_014, OGN_295, UNL_208, OGS_019, VEN_129, SFD_110 } from './cards/group-passives'
import { OGN_059, OGN_185, VEN_080, OGN_261, VEN_095 } from './cards/longtail-4'
import { OGN_201, OGN_105, OGN_073 } from './cards/longtail-5'
import { OGN_123, OGN_043 } from './cards/longtail-6'
import { SFD_204, VEN_150, OGS_002, SFD_147, VEN_131 } from './cards/longtail-7'
import { OGN_209, OGN_187, OGN_237, OGS_017, VEN_103 } from './cards/longtail-8'                             
import { OGN_060 } from './cards/longtail-10'
import { OGN_284, OGN_290 } from './cards/longtail-11'
import { SFD_209, VEN_029, SFD_216, SFD_015, SFD_060 } from './cards/longtail-12'
import { OGN_182, OGS_006, OGS_021 } from './cards/longtail-14'
import { OGN_044, SFD_098, UNL_028, SFD_013, VEN_120, SFD_067 } from './cards/longtail-15'
import { UNL_015, UNL_110, SFD_047 } from './cards/longtail-16'
import { OGN_276 } from './cards/longtail-17'
import { VEN_036 } from './cards/longtail-18'
import { OGN_176, SFD_093, OGN_174, OGN_193, UNL_117 , SFD_025, SFD_025A , OGN_161 } from './cards/longtail-19'
import { OGN_139, VEN_121, VEN_183 } from './cards/longtail-20'
import { OGN_011, SFD_171 } from './cards/enter-ready'
import { VEN_158 } from './cards/VEN-158'
import { VEN_004 } from './cards/VEN-004'
import { VEN_102 } from './cards/VEN-102'
import { VEN_094 } from './cards/VEN-094'             
import { SFD_075 } from './cards/SFD-075'
import { SFD_100 } from './cards/SFD-100'
import { VEN_168 } from './cards/VEN-168'
import { VEN_179, UNL_120 } from './cards/VEN-179'
import { UNL_143, UNL_143A } from './cards/UNL-143'                  
import { UNL_194 } from './cards/UNL-194'
import { VEN_067 } from './cards/VEN-067'
import { OGN_122 } from './cards/OGN-122'
import { PUMP_SPELL_CARDS } from './cards/pump-spells'
import { DAMAGE_SPELL_CARDS } from './cards/damage-spells'
import { STUN_SPELL_CARDS } from './cards/stun-spells'
import { EQUIPMENT_SPELL_CARDS } from './cards/equipment-target-spells'
import { DESTROY_SPELL_CARDS } from './cards/destroy-spells'
import { OGN_170 } from './cards/OGN-170'
import { TOKEN_BATCH_CARDS } from './cards/token-batch-spells'
import { OGN_145 } from './cards/OGN-145'
import { OGN_268 } from './cards/OGN-268'
import { ENTER_TRIGGER_CARDS } from './cards/enter-triggers-batch'
import { WON_BATTLE_CARDS } from './cards/won-battle-triggers'
import { OGN_205, OGN_189 } from './cards/move-count-cards'
import { NEGATE_SPELL_CARDS } from './cards/negate-spells'
import { TWO_TARGET_CARDS } from './cards/two-target-spells'
import { COND_SELF_CARDS } from './cards/conditional-self-passives'
import { SPEND_XP_BUFF_CARDS } from './cards/spend-xp-buff-self'
import { UNL_191, UNL_231, VEN_159, UNL_090, UNL_090A } from './cards/group-passives'
import { SFD_082, SFD_082A, SFD_082B } from './cards/SFD-082'                     
                                            
import {
  OGN_007, OGN_042, OGN_089, OGN_126, OGN_166, OGN_214,
  OGN_271, OGN_272, OGN_273, OGN_274,
} from './cards/token-cards-535'
import { SFD_183, SFD_241 } from './cards/SFD-183'                          
import { VEN_090 } from './cards/VEN-090'                         
import { VEN_031, VEN_038 } from './cards/untargetable-cards'
import { SFD_105, UNL_059, UNL_016, UNL_031, UNL_040, UNL_047, UNL_075, UNL_094, UNL_098, UNL_113, UNL_151 } from './cards/level-self'
import { OGN_240, SFD_085, UNL_076, OGN_055, UNL_154, OGS_004, OGN_028, VEN_076, VEN_097, SFD_068, SFD_131 } from './cards/count-scaled-passives'
import { OGN_192, UNL_121, UNL_135 } from './cards/hand-reveal'
import { VEN_109, VEN_182 } from './cards/illaoi'
import { OGN_026, OGN_031 } from './cards/ban-play'
import { UNL_169 } from './cards/delayed-return'
import { SFD_170 } from './cards/play-from-deck'
import { VEN_048, OGN_051, OGN_132, OGN_234, OGN_082, VEN_026, OGN_092, SFD_158, OGN_136, OGN_130, VEN_020, UNL_027, OGN_188, OGN_165, SFD_061, OGN_164, OGN_230, VEN_188, UNL_137, SFD_128, UNL_123, UNL_064, SFD_058, UNL_051, UNL_092, UNL_157, OGN_038, UNL_097, SFD_062, SFD_072, SFD_007, OGN_225, OGN_211, SFD_157, UNL_033, UNL_132, OGS_018, OGS_010, UNL_167, OGN_061, VEN_037, OGN_149, SFD_039, SFD_174, SFD_074, SFD_091, OGN_106, UNL_084, OGN_147, SFD_101, OGN_141, SFD_132, OGN_223 } from './cards/batch-play-triggers'
import { SFD_032 } from './cards/SFD-032'
import { VEN_050, VEN_070, VEN_093, VEN_047, VEN_018, VEN_077, VEN_045, VEN_028, VEN_046 } from './cards/empower-grants'
import { GEAR_CARDS } from './gearCards'
import { CARD_CATEGORIES } from './cardCategories'
import { VANILLA_UNITS } from './vanillaUnits'
import { CARD_NAMES } from './cardNames'                                    

const CARDS: readonly Card[] = [OGN_078, SFD_024, VEN_016, VEN_006, SFD_020, OGN_151, OGN_260, SFD_028, OGN_249, VEN_124, OGN_079, UNL_058, UNL_204, OGN_250, UNL_056, VEN_191, OGN_107, VEN_157, SFD_198, VEN_044, UNL_228, SFD_193, OGN_033_CARD, OGN_037_CARD, VEN_194_CARD, VEN_140_CARD, VEN_189_CARD, UNL_106_CARD, OGN_025_CARD, OGN_115_CARD, OGN_071_CARD, UNL_200_CARD, UNL_201_CARD, UNL_055_CARD, UNL_103_CARD, SFD_195_CARD, OGN_262_CARD, SFD_088_CARD, SFD_206_CARD, UNL_168_CARD, UNL_160_CARD, UNL_044_CARD, SFD_154_CARD, OGN_266_CARD, VEN_122_CARD, VEN_156_CARD, VEN_012_CARD, UNL_080_CARD, OGN_256_CARD, VEN_134_CARD, VEN_148_CARD, SFD_111_CARD, UNL_082_CARD, UNL_022_CARD, VEN_079_CARD, VEN_034_CARD, VEN_088_CARD, VEN_019_CARD, VEN_092_CARD, SFD_180_CARD, OGS_014_CARD, VEN_125_CARD, UNL_118_CARD, UNL_118A_CARD, OGN_244_CARD, OGN_070_CARD, UNL_163_CARD, UNL_086_CARD, UNL_020_CARD, VEN_022_CARD, OGN_150_CARD, OGN_231_CARD, OGN_194_CARD, SFD_018_CARD, SFD_029_CARD, SFD_055_CARD, SFD_050_CARD, SFD_201_CARD, UNL_005_CARD, UNL_017_CARD, SFD_146_CARD, VEN_055_CARD, SFD_177_CARD, UNL_018_CARD, SFD_120_CARD, OGN_053_CARD, UNL_139_CARD, VEN_114_CARD, UNL_181_CARD, UNL_147_CARD, UNL_198_CARD, VEN_084_CARD, VEN_181_CARD, SFD_107, UNL_101, SFD_208, OGN_258, OGN_237, VEN_180, VEN_085, SFD_215, UNL_211, OGN_034, UNL_026, OGN_109, VEN_161, VEN_053, OGN_080, OGN_006, OGN_111, ARC_003, SFD_054, UNL_213, UNL_030, UNL_150, UNL_131, VEN_152, OGN_121, OGN_263, UNL_081, OGN_197, OGN_097, SFD_138, OGN_169, OGN_083, OGN_101, OGN_181, UNL_088, OGN_172, VEN_052, OGN_104, SFD_087, OGN_199, SFD_145, OGN_264, OGN_183, UNL_125, UNL_071, OGN_087, UNL_149, UNL_087, UNL_043, UNL_079, UNL_134, UNL_197, VEN_043, VEN_001, VEN_021, VEN_032, VEN_110, VEN_050, VEN_070, VEN_093, VEN_047, VEN_018, VEN_077, VEN_045, VEN_028, VEN_046, OGN_056, OGN_152, OGN_072, SFD_063, SFD_169, VEN_009, UNL_065, SFD_035, SFD_032, VEN_048, OGN_051, OGN_132, OGN_234, OGN_082, VEN_026, OGN_092, SFD_158, OGN_136, OGN_130, VEN_020, UNL_027, OGN_188, OGN_165, SFD_061, OGN_164, OGN_230, VEN_188, UNL_137, SFD_128, UNL_123, UNL_064, SFD_058, UNL_051, SFD_170, UNL_092, UNL_157, OGN_038, UNL_097, SFD_062, SFD_072, SFD_007, OGN_225, OGN_211, SFD_157, UNL_033, UNL_132, OGS_018, OGS_010, UNL_167, OGN_061, VEN_037, OGN_149, SFD_039, SFD_174, SFD_074, SFD_091, OGN_106, UNL_084, OGN_147, SFD_069, UNL_222, SFD_152, VEN_042, VEN_170, OGN_222, SFD_038, UNL_193, UNL_232, UNL_203, UNL_237, OGN_066, UNL_112, SFD_125, SFD_126, OGS_023, UNL_179, SFD_101, OGN_141, SFD_132, OGN_223, OGN_240, SFD_085, UNL_076, OGN_192, UNL_121, UNL_135, VEN_109, VEN_182, UNL_143, UNL_143A, OGN_026, OGN_031, UNL_169, OGN_251, OGN_119, OGN_255, UNL_183, OGN_246, OGN_090, SFD_052, OGN_184, OGN_259, OGN_265, ...SIGIL_CARDS, OGN_257, OGN_253, OGN_267, OGN_113, VEN_060, OGN_114, OGN_076, OGN_103, OGN_131, OGN_091, OGN_065, OGN_229, OGN_148, VEN_071, OGN_143, OGN_195, UNL_180, SFD_048, SFD_137, UNL_068, UNL_129, SFD_159, SFD_006, OGS_016, OGS_009, UNL_001, ARC_004, SFD_027, SFD_094, SFD_176, OGN_035, SFD_223, VEN_091, OGS_013, OGN_015, UNL_077, SFD_181, SFD_089, OGN_074, UNL_041, SFD_071, OGN_059, OGN_185, VEN_080, OGN_261, VEN_095, OGN_294, OGN_297, OGN_201, OGN_105, OGN_073, UNL_111, SFD_014, OGN_123, OGN_043, OGN_295, SFD_204, VEN_150, OGS_002, SFD_147, VEN_131, OGN_209, OGN_187, OGS_017, VEN_103, OGN_055, UNL_154, OGS_004, OGS_019, OGN_060, VEN_129, SFD_110, OGN_284, OGN_290, SFD_209, VEN_029, SFD_216, OGN_028, VEN_013, OGN_182, OGS_006, OGS_021, OGN_044, UNL_015, UNL_110, SFD_047, OGN_276, VEN_036, OGN_176, SFD_093, OGN_174, OGN_193, SFD_015, VEN_121, VEN_183, OGN_139, VEN_063, OGN_011, UNL_191, UNL_231, UNL_016, UNL_094, UNL_098, UNL_113, UNL_151, UNL_047, UNL_075, UNL_040, UNL_031, SFD_105, UNL_059, VEN_031, VEN_038, OGN_017, VEN_062, UNL_049, UNL_136, UNL_038, VEN_193, OGN_277, OGN_296, OGS_001, ...ATTACK_STUN_CARDS, OGN_032, OGN_177, VEN_025, OGN_293, UNL_105, VEN_096, SFD_012, VEN_064, SFD_103, UNL_104, SFD_130, OGN_208, SFD_044, OGN_002, UNL_178, UNL_170, OGN_118, VEN_002, OGN_162, VEN_068, SFD_148, UNL_174, UNL_215, VEN_167, ARC_001, OGN_099, OGN_235, SFD_203, OGN_292, SFD_142, SFD_057, SFD_199, VEN_174, UNL_126, ARC_005, OGN_027, UNL_074, SFD_010, SFD_164, VEN_098, VEN_164, SFD_141, VEN_SP5, SFD_149, VEN_024, SFD_031, VEN_051, OGN_117, OGN_212, SFD_046, OGN_098, OGN_124, SFD_117, SFD_083, SFD_019, OGN_186, OGN_227, SFD_168, UNL_013, VEN_126, OGN_023, OGN_254, OGN_221, UNL_175, OGS_020, UNL_073, SFD_166, VEN_146, UNL_095, OGN_021, UNL_078, SFD_104, UNL_085, OGN_077, OGN_228, SFD_144, UNL_161, OGN_063, UNL_011, UNL_109, UNL_133, VEN_023, VEN_169, VEN_144, VEN_112, UNL_046, UNL_196, UNL_045, VEN_108, OGN_160, OGN_242, SFD_200, VEN_104, UNL_184, UNL_025, OGN_196, OGN_226, OGN_062, SFD_188, OGN_198, VEN_089, SFD_243, UNL_148, SFD_150, SFD_026, VEN_066, UNL_138, UNL_177, VEN_132, SFD_078, VEN_133, UNL_186, VEN_159, SFD_171, VEN_158, VEN_004, VEN_102, VEN_094, SFD_075, SFD_100, VEN_168, VEN_179, UNL_120, UNL_037, UNL_194, VEN_067, OGN_122, ...PUMP_SPELL_CARDS, ...DAMAGE_SPELL_CARDS, ...STUN_SPELL_CARDS, ...EQUIPMENT_SPELL_CARDS, ...DESTROY_SPELL_CARDS, OGN_170, ...TOKEN_BATCH_CARDS, OGN_145, OGN_268, ...ENTER_TRIGGER_CARDS, ...WON_BATTLE_CARDS, OGN_205, OGN_189, ...NEGATE_SPELL_CARDS, ...TWO_TARGET_CARDS, ...COND_SELF_CARDS, ...SPEND_XP_BUFF_CARDS, VEN_076, OGN_100, SFD_065, SFD_197, ...UTILITY_SPELL_CARDS, UNL_032, SFD_194, OGN_270, OGN_173, OGN_146, OGN_153, OGN_207, OGN_012, OGN_084, OGN_140, UNL_035, VEN_007, VEN_119, VEN_054, VEN_075, VEN_087, OGS_011, UNL_202, SFD_129, VEN_107, UNL_054, OGN_179, SFD_136, OGN_156, OGN_203, OGN_018, OGN_102, UNL_057, UNL_060, VEN_106, VEN_127, ...AMBESSA_CARDS, UNL_107, UNL_144, ...KAISA_CARDS, VEN_SP4, OGN_155, OGN_067, ...SWAIN_CARDS, ...UNIT_LAST_RITES_CARDS, ...LAST_RITES_CHOICE_CARDS, OGN_236, SFD_098, UNL_028, SFD_013, VEN_120, SFD_067, VEN_041, SFD_113, UNL_127, SFD_119, SFD_123, SFD_179, SFD_112, SFD_084, VEN_175, UNL_130, SFD_081, UNL_164, SFD_053, SFD_140, SFD_175, UNL_208, VEN_069, OGN_110, SFD_116, SFD_233, SFD_160, OGN_158, OGN_158A, OGN_167, UNL_145, UNL_145A, VEN_138, VEN_138A, VEN_128, UNL_048, UNL_052, VEN_101, VEN_113, VEN_113A, SFD_079, SFD_228, VEN_035, UNL_119, UNL_119A, OGN_112, OGN_112A, UNL_117, UNL_029, UNL_029A, SFD_184, UNL_050, SFD_202, SFD_109, UNL_089, UNL_089A, UNL_146, UNL_182, SFD_077, SFD_049, OGN_157, OGN_134, OGN_138, OGN_029, OGN_248, SFD_041, VEN_033, OGN_068, ARC_002, SFD_173, SFD_239, OGN_168, SFD_043, VEN_008, ...SPELL_BONUS_CARDS, UNL_140, ...ECHO_SPELL_CARDS_498, ...ECHO_SPELL_CARDS_499, ...SACRIFICE_CARDS_500, ...EXTRA_COST_CARDS_501, ...EXTRA_COST_CARDS_502, UNL_007, ...FROM_STANDBY_CARDS_506, UNL_141, SFD_139, UNL_003, VEN_097, OGN_200, UNL_192_CARD, OGN_041, OGN_041A, UNL_171, UNL_115, SFD_025, SFD_025A, OGN_161, VEN_105, UNL_124, SFD_060, SFD_068, SFD_131, UNL_090, UNL_090A, UNL_008, SFD_082, SFD_082A, SFD_082B,
  OGN_007, OGN_042, OGN_089, OGN_126, OGN_166, OGN_214, OGN_271, OGN_272, OGN_273, OGN_274, SFD_183, SFD_241, UNL_093, VEN_090]

   
                   
                                                    
                                                              
                                           
                                                           
                                                               
                                                                                                 
                                                                        
                                               
                                                
                                                            
   
const TYPES_OF_CATEGORY: Readonly<Record<string, readonly CardType[]>> = {
  unit: ['unit'],
  equipment: ['equipment'],
  spell: ['spell'],
  rune: ['rune'],
  legend: ['legend'],
  battlefield: ['battlefield'],
}

const SPECS: Record<string, CardSpec> = {}
for (const c of CARDS) {
  const types = TYPES_OF_CATEGORY[c.category]
  SPECS[c.id] = {
    defId: c.id,
    baseMight: c.power ?? 0,
    baseKeywords: c.keywords,
    ...(types ? { baseTypes: types } : {}),
  }
}
                        
                                                    
                                                
                                                              
SPECS['BLK'] = { defId: 'BLK', baseMight: 2, baseKeywords: [] }
SPECS['DEMO-BOLT'] = { defId: 'DEMO-BOLT', baseMight: 0, baseKeywords: [] }

                                                               
const specLookupRaw: SpecLookup = (queried) => {
                                           
                                          
                                        
  const defId = resolveImplDefId(queried, (x) => x in SPECS || x in VANILLA_UNITS || x in GEAR_CARDS)
  const hand = SPECS[defId]
  if (hand) {
                                                                                                                      
    const gearRow = GEAR_CARDS[defId]
    if (!gearRow) return { ...hand, defId: queried }
    return {
      ...hand, defId: queried,
      baseTags: [...new Set([...(hand.baseTags ?? []), '武装'])],
      ...(gearRow.powerBonus !== null && hand.basePowerBonus === undefined ? { basePowerBonus: gearRow.powerBonus } : {}),
      ...(gearRow.grants.length > 0 && (hand.baseGrants ?? []).length === 0 ? { baseGrants: gearRow.grants } : {}),
    }
  }
  const vu = VANILLA_UNITS[defId]
  if (vu) {
    return { defId: queried, baseMight: vu.might, baseKeywords: vu.keywords, baseTypes: ['unit'] }
  }
  const gear = GEAR_CARDS[defId]
  if (gear) {
    return {
      defId: queried,
      baseMight: 0, // 装备没有战力(§137 的 power 是【战力加成】,走 basePowerBonus,别混)
      baseKeywords: gear.keywords,
      baseTypes: ['equipment'], // §178 必须声明,否则 typesOf 回落推断成单位、清理召回/参战过滤全错
      baseTags: ['武装'], // §150(§818.3 配装判定)
      ...(gear.powerBonus !== null ? { basePowerBonus: gear.powerBonus } : {}),
      ...(gear.grants.length > 0 ? { baseGrants: gear.grants } : {}), // §718.3 关键词横幅授予
    }
  }
                                                     
                                                                  
                                                                         
                                                
                                                            
  const cat = CARD_CATEGORIES[queried] ?? CARD_CATEGORIES[defId]
  const fallbackTypes = cat ? TYPES_OF_CATEGORY[cat] : undefined
  return { defId: queried, baseMight: 0, baseKeywords: [], ...(fallbackTypes ? { baseTypes: fallbackTypes } : {}) }
}

   
                                              
                                                                       
                            
                                             
   
export const specLookup: SpecLookup = (queried) => {
  const base = specLookupRaw(queried)
  const id = resolveImplDefId(queried, (x) => x in CARD_NAMES)
  const name = CARD_NAMES[id] ?? CARD_NAMES[queried]
  return name === undefined ? base : { ...base, name }
}

const RUNES = (color: string, n: number): string[] => Array.from({ length: n }, () => `rune:${color}`)

   
                                                              
                                                                       
                                                            
   
export const DEMO_DECK_A: Deck = {
  name: '混沌·黛安娜',
  mainDeck: ['UNL-150', 'UNL-131', 'VEN-152', 'OGN-197', 'SFD-138', 'OGN-169', 'OGN-181', 'OGN-172', 'OGN-199', 'SFD-145', 'OGN-183', 'UNL-125', 'UNL-149', 'UNL-071', 'UNL-079', 'UNL-134'],
  runeDeck: RUNES('purple', 12),
  battlefields: ['UNL-214', 'OGN-280', 'OGN-288'], // §485.4.a 三选一(黛安娜组战场)
  legend: 'UNL-197', // 皎月女神(传奇·黛安娜标签)
  hero: 'UNL-079', // §103.2.a.2 选定英雄=与传奇同标签的英雄单位(黛安娜·皎月化身)
}

                                               
                                                               
                                     
export const DEMO_DECK_C: Deck = {
  name: '圣枪·卢锡安',
  mainDeck: ['SFD-113', 'SFD-068', 'SFD-009', 'SFD-016', 'SFD-022', 'SFD-030', 'OGN-010', 'OGN-013', 'OGN-135', 'SFD-008', 'SFD-092', 'SFD-096', 'OGN-001', 'SFD-002'],
  runeDeck: RUNES('red', 12),
  battlefields: ['OGN-284', 'OGN-286', 'OGN-280'],
  legend: 'SFD-183', // 圣枪游侠(传奇·卢锡安标签,red+orange)
  hero: 'SFD-113', // §103.2.a.2 选定英雄=同标签英雄单位(卢锡安)
}

                                                               
   
                                                  
  
                                                           
                                                                 
                                                         
  
                                              
                                                                     
                                                                
                                                                          
                                                                           
                                                               
                                                              
                                                         
                                                                           
                                     
                                                                  
                                                             
                         
  
                                                
                                                                                         
                                  
                                                  
                                                                                  
                           
                                                                                  
                                                                      
                                                                                 
                                                           
                                                                     
                                           
  
                                                         
                                                                                    
                       
                                                                       
                                                                                 
                                                               
                                                                             
                                                                                         
                                                                
                                                                                
                                                                
                                                             
                                                          
                                                             
                            
  
                                                                
                                                                               
                                  
                                                                               
                                       
                                                                               
   
export const DEMO_DECK_D: Deck = {
  name: '机制·压测',
  mainDeck: [
    'VEN-113', // §103.2 选定英雄(凯南,与 legend VEN-155 同标签),必须在牌堆里
    'VEN-127', // ★1299 disempower 的备用产地(自带「流转4黄黄」⇒ 从废牌堆打出,正好喂 VEN-155 的 empower)
    'UNL-147', // ★1299 addBattlefieldZone 唯一产地。⚠️10 法力+3 紫 pip,实测在 60 回合随机对局里**打不出来**
    'VEN-156', // 凯南专属(紫黄 1 费),曲线最低的一张
                                                                   
    'VEN-095', 'VEN-101', 'VEN-117', 'VEN-105', 'VEN-107',
    'UNL-131', 'OGN-169', 'OGN-172', 'UNL-125', 'UNL-134',
  ],
  runeDeck: [...RUNES('purple', 8), ...RUNES('yellow', 4)],
  battlefields: ['UNL-214', 'OGN-280', 'OGN-288'],
  legend: 'VEN-155', // 狂暴之心(紫黄 0 费):empower 与 disempower 的双料产地,开局就在场
  hero: 'VEN-113', // §103.2.a.2 选定英雄=同标签(凯南)英雄单位
}

export const DEMO_DECK_B: Deck = {
  name: '灵光·提莫',
  mainDeck: ['OGN-121', 'UNL-081', 'OGN-097', 'OGN-083', 'OGN-101', 'UNL-088', 'VEN-052', 'OGN-104', 'SFD-087', 'OGN-264', 'OGN-087', 'UNL-087', 'OGN-103'],
  runeDeck: RUNES('blue', 12),
  battlefields: ['OGN-278', 'OGN-279', 'UNL-209'],
  legend: 'OGN-263', // 迅捷斥候(传奇·提莫标签)
  hero: 'OGN-121', // §103.2.a.2 选定英雄=提莫·军事家
}
