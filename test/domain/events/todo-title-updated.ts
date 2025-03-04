import { given } from "@nivinjoseph/n-defensive";
import { TodoState } from "../todo-state";
import { DomainEventData } from "../../../src";
import { serialize } from "@nivinjoseph/n-util";
import { TodoDomainEvent } from "./todo-domain-event";


export class TodoTitleUpdated extends TodoDomainEvent
{
    private readonly _title: string;
    
    
    @serialize
    public get title(): string { return this._title; }


    public constructor(data: EventData)
    {
        super(data);
        
        const { title } = data;

        given(title, "title").ensureHasValue().ensureIsString();
        this._title = title;
    }

    
    // public static deserializeEvent(data: DomainEventData & Serialized): TodoTitleUpdated
    // {
    //     given(data, "data").ensureHasValue().ensureIsObject();

    //     return new TodoTitleUpdated(data, data.title);
    // }

    
    // protected serializeEvent(): Serialized
    // {
    //     return {
    //         title: this._title
    //     };
    // }

    protected applyEvent(state: TodoState): void
    {
        state.title = this._title;
    }
}


interface EventData extends DomainEventData
{
    title: string;
}