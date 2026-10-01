                    

export type Brand<T, B extends string> = T & { readonly __brand: B }

                
export type PlayerId = Brand<string, 'PlayerId'>
                                                 
export type ObjId = Brand<string, 'ObjId'>
             
export type ZoneId = Brand<string, 'ZoneId'>

export const asPlayerId = (s: string): PlayerId => s as PlayerId
export const asObjId = (s: string): ObjId => s as ObjId
export const asZoneId = (s: string): ZoneId => s as ZoneId
