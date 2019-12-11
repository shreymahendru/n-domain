import { AggregateState } from "./aggregate-state";
import { DomainEventData } from "./domain-event-data";
import "@nivinjoseph/n-ext";
import { AggregateRoot } from ".";
import { DomainContext } from "./domain-context";
export declare abstract class DomainEvent<T extends AggregateState> {
    private _aggregateId;
    private _id;
    private _userId;
    private readonly _name;
    private readonly _occurredAt;
    private _version;
    private readonly _isCreatedEvent;
    get aggregateId(): string | null;
    get id(): string;
    get userId(): string | null;
    get name(): string;
    get occurredAt(): number;
    get version(): number;
    get isCreatedEvent(): boolean;
    constructor(data: DomainEventData);
    apply(aggregate: AggregateRoot<T>, domainContext: DomainContext, state: T): void;
    serialize(): DomainEventData;
    protected abstract serializeEvent(): object;
    protected abstract applyEvent(state: T): void;
}
