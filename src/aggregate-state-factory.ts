import { AggregateState } from "./aggregate-state";
import { given } from "@nivinjoseph/n-defensive";
import { AggregateStateHelper } from "./aggregate-state-helper";


export abstract class AggregateStateFactory<T extends AggregateState>
{
    public abstract create(): T;
    
    public update(state: T): T
    {
        given(state, "state").ensureHasValue().ensureIsObject();
        
        return state;
    }
    
    public deserializeSnapshot(snapshot: T): T
    {
        // given(snapshot, "snapshot").ensureHasValue().ensureIsObject();
        
        // const deserialized: Record<string, any> = {};
        
        // Object.keys(snapshot).forEach(key =>
        // {
        //     const value = (snapshot as any)[key];
        //     if (value == null || typeof value !== "object")
        //     {
        //         deserialized[key] = value;
        //         return;
        //     }
            
        //     if (Array.isArray(value))
        //     {
        //         deserialized[key] = value.map(v =>
        //         {
        //             if (v == null || typeof v !== "object" || !Deserializer.hasType(v.$typename))
        //                 // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        //                 return v;
                    
        //             return Deserializer.deserialize(v);
        //         });
        //     }
        //     else
        //     {
        //         deserialized[key] = Deserializer.hasType(value.$typename)
        //             ? Deserializer.deserialize(value) : value;
        //     }
        // });
        
        // return deserialized as T;
        
        return AggregateStateHelper.deserializeSnapshotIntoState(snapshot) as T;
    }
    
    protected createDefaultAggregateState(): AggregateState
    {
        return {
            typeVersion: 1,
            id: null as any,
            version: null as any,
            createdAt: null as any,
            updatedAt: null as any,
            isRebased: false,
            rebasedFromVersion: 0
        };
    }
}