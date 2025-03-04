import { AggregateStateFactory } from "../../src/aggregate-state-factory";
import { AggregateState } from "../../src/aggregate-state";
import { TodoDescription } from "./value-objects/todo-description";


export interface TodoState extends AggregateState
{
    title: string;
    description: TodoDescription | null;
    isCompleted: boolean;
}


export class TodoStateFactory extends AggregateStateFactory<TodoState>
{
    public create(): TodoState
    {
        return {
            ...this.createDefaultAggregateState(),
            title: null as any,
            description: null,
            isCompleted: false
        };
    }   
    
    // public update(state: TodoState): TodoState
    // {
    //     given(state, "state").ensureHasValue().ensureIsObject();
        
    //     return state;
    // }
    
    // public deserializeSnapshot(snapshot: TodoState): TodoState
    // {
    //     given(snapshot, "snapshot").ensureHasValue().ensureIsObject();
        
    //     return snapshot;
    // }
}