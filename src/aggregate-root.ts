import { DomainEvent } from "./domain-event";
import { AggregateState, clearBaseState } from "./aggregate-state";
import { given } from "@nivinjoseph/n-defensive";
import { AggregateRootData } from "./aggregate-root-data";
import { DomainContext } from "./domain-context";
import { DomainEventData } from "./domain-event-data";
import { AggregateStateFactory } from "./aggregate-state-factory";
import { Deserializer, Serializable, serialize } from "@nivinjoseph/n-util";
import * as Crypto from "crypto";
// import { AggregateRebased } from "./aggregate-rebased";
import { AggregateStateHelper } from "./aggregate-state-helper";

// public
export abstract class AggregateRoot<T extends AggregateState, TDomainEvent extends DomainEvent<T>> extends Serializable<AggregateRootData>
{
    private readonly _domainContext: DomainContext;
    private readonly _stateFactory: AggregateStateFactory<T>;
    private readonly _state: T;
    private readonly _retroEvents: ReadonlyArray<DomainEvent<T>>;
    private readonly _retroVersion: number;
    private readonly _currentEvents = new Array<DomainEvent<T>>(); // track unit of work stuff
    private readonly _isNew: boolean = false;
    private _isReconstructed = false;
    private _reconstructedFromVersion = 0;
    
    
    protected get state(): T { return this._state; }
    
    
    public get context(): DomainContext { return this._domainContext; }

    @serialize("$id")
    public get id(): string { return this._state.id; }
    
    public get retroEvents(): ReadonlyArray<DomainEvent<T>> { return this._retroEvents.orderBy(t => t.version); }
    public get retroVersion(): number { return this._retroVersion; } 
    
    public get currentEvents(): ReadonlyArray<DomainEvent<T>> { return this._currentEvents.orderBy(t => t.version); }
    public get currentVersion(): number { return this._state.version; }
    
    @serialize("$events")
    public get events(): ReadonlyArray<DomainEvent<T>> { return [...this._retroEvents, ...this._currentEvents].orderBy(t => t.version); }
    
    @serialize("$version")
    public get version(): number { return this.currentVersion; }
    
    @serialize("$createdAt")
    public get createdAt(): number { return this._state.createdAt; }
    
    @serialize("$updatedAt")
    public get updatedAt(): number { return this._state.updatedAt; }

    public get isNew(): boolean { return this._isNew; } // this will always be false for anything that is reconstructed
    public get hasChanges(): boolean { return this.currentVersion !== this.retroVersion; }
    
    public get isReconstructed(): boolean { return this._isReconstructed; }
    public get reconstructedFromVersion(): number { return this._reconstructedFromVersion; }
    
    public get isRebased(): boolean { return this._state.isRebased; }
    public get rebasedFromVersion(): number { return this._state.rebasedFromVersion; }


    protected constructor(domainContext: DomainContext, events: ReadonlyArray<DomainEvent<T>>,
        stateFactory: AggregateStateFactory<T>, currentState?: T)
    {
        super({} as any);
        
        given(domainContext, "domainContext").ensureHasValue()
            .ensureHasStructure({ userId: "string" });
        this._domainContext = domainContext;
        
        given(events, "events").ensureHasValue().ensureIsArray();
        given(stateFactory, "stateFactory").ensureHasValue().ensureIsObject();
        this._stateFactory = stateFactory;
        
        given(currentState as object, "currentState").ensureIsObject();
        this._state = Object.assign(this._stateFactory.create(), currentState);
        
        if (this._state.version)
        {
            given(events, "events")
                .ensure(t => t.length === 0, "no events should be passed when constructing from snapshot");
            this._retroEvents = [];
        }
        else
        {
            given(events, "events")
                .ensure(t => t.length > 0, "no events passed")
                .ensure(t => t.some(u => u.isCreatedEvent), "no created event passed")
                .ensure(t => t.count(u => u.isCreatedEvent) === 1, "more than one created event passed");
            this._retroEvents = events;
            if (this._retroEvents.some(t => (<any>t)._aggregateId == null)) // Deliberate workaround to access aggregateId
                this._isNew = true;
            if (this._isNew)
                this._retroEvents.forEach(t => t.apply(this, this._domainContext, this._state));
            else
                this._retroEvents.orderBy(t => t.version).forEach(t => t.apply(this, this._domainContext, this._state));
        }
        this._state = this._stateFactory.update(this._state);
        this._retroVersion = this.currentVersion;
    }

    public static deserializeFromEvents<TAggregate extends AggregateRoot<TAggregateState, TAggregateDomainEvent>,
        TAggregateState extends AggregateState, TAggregateDomainEvent extends DomainEvent<TAggregateState>>(domainContext: DomainContext,
            aggregateType: new (...args: Array<any>) => TAggregate, eventData: ReadonlyArray<DomainEventData>): TAggregate
    {
        given(domainContext, "domainContext").ensureHasValue().ensureHasStructure({ userId: "string" });
        given(aggregateType, "aggregateType").ensureHasValue().ensureIsFunction();
        given(eventData, "eventData").ensureHasValue().ensureIsArray().ensure(t => t.length > 0);
        
        
        // given(data, "data").ensureHasValue().ensureIsObject()
        //     .ensureHasStructure({
        //         $id: "string",
        //         $version: "number",
        //         $createdAt: "number",
        //         $updatedAt: "number",
        //         $events: [{
        //             $aggregateId: "string",
        //             $id: "string",
        //             $userId: "string",
        //             $name: "string",
        //             $occurredAt: "number",
        //             $version: "number",
        //             $isCreatedEvent: "boolean"
        //         }]
        //     });
        
        const deserializedEvents = eventData.map((eventData) =>
        {
            return Deserializer.deserialize(eventData);
            
            // const name = eventData.$name;
            // const event = eventTypes.find(t => (<Object>t).getTypeName() === name);
            // if (!event)
            //     throw new ApplicationException(`No event type supplied for event with name '${name}'`);
            // if (!(<any>event).deserializeEvent)
            //     throw new ApplicationException(`Event type '${name}' does not have a static deserializeEvent method defined.`);
            // return (<any>event).deserializeEvent(eventData);
        });
        
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        return new (<any>aggregateType)(domainContext, deserializedEvents) as TAggregate;
    }
    
    // public serialize(): AggregateRootData
    // {
    //     return {
    //         $id: this.id,
    //         $version: this.version,
    //         $createdAt: this.createdAt,
    //         $updatedAt: this.updatedAt,
    //         $events: this.events.map(t => t.serialize())
    //     };
    // }
    
    // public serialize(): AggregateRootData
    // {
    //     return super.serialize() as AggregateRootData;
    // }
    
    public static deserializeFromSnapshot<TAggregate extends AggregateRoot<TAggregateState, TAggregateDomainEvent>,
        TAggregateState extends AggregateState, TAggregateDomainEvent extends DomainEvent<TAggregateState>>(domainContext: DomainContext,
            aggregateType: new (...args: Array<any>) => TAggregate, stateFactory: AggregateStateFactory<TAggregateState>,
            stateSnapshot: TAggregateState | object): TAggregate
    {
        given(domainContext, "domainContext").ensureHasValue().ensureHasStructure({ userId: "string" });
        given(aggregateType, "aggregateType").ensureHasValue().ensureIsFunction();
        given(stateFactory, "stateFactory").ensureHasValue().ensureIsObject();
        given(stateSnapshot, "stateSnapshot").ensureHasValue().ensureIsObject()
            .ensureHasStructure({
                id: "string",
                version: "number",
                createdAt: "number",
                updatedAt: "number"
            });
        
        return new aggregateType(domainContext, [], stateFactory.deserializeSnapshot(stateSnapshot as any));
    }
    
    public snapshot(...cloneKeys: ReadonlyArray<string>): T | object
    {
        return AggregateStateHelper.serializeStateIntoSnapshot(this.state, ...cloneKeys);
    }

    public constructVersion(version: number): this
    {
        given(version, "version").ensureHasValue().ensureIsNumber()
            .ensure(t => t > 0 && t <= this.version, `version must be > 0 and <= ${this.version} (current version)`);
        
        given(this, "this").ensure(t => t.retroEvents.length > 0, "invoking method on object without retro events");

        const ctor = (<Object>this).constructor;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const result = new (<any>ctor)(this._domainContext, this.events.filter(t => t.version <= version)) as this;
        result._isReconstructed = true;
        result._reconstructedFromVersion = this.version;
        
        return result;
    }
    
    public constructBefore(dateTime: number): this
    {
        given(dateTime, "dateTime").ensureHasValue().ensureIsNumber()
            .ensure(t => t > this.createdAt, "dateTime must be before createdAt");
        
        given(this, "this").ensure(t => t.retroEvents.length > 0, "invoking method on object without retro events");

        const ctor = (<Object>this).constructor;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const result = new (<any>ctor)(this._domainContext, this.events.filter(t => t.occurredAt < dateTime)) as this;
        result._isReconstructed = true;
        result._reconstructedFromVersion = this.version;
        
        return this;
    }

    public hasEventOfType<TEventType extends DomainEvent<T>>(eventType: new (...args: Array<any>) => TEventType): boolean
    {
        given(eventType, "eventType").ensureHasValue().ensureIsFunction();
        
        given(this, "this").ensure(t => t.retroEvents.length > 0, "invoking method on object without retro events");

        const eventTypeName = (<Object>eventType).getTypeName();
        return this.events.some(t => t.name === eventTypeName);
    }

    public hasRetroEventOfType<TEventType extends DomainEvent<T>>(eventType: new (...args: Array<any>) => TEventType): boolean
    {
        given(eventType, "eventType").ensureHasValue().ensureIsFunction();
        
        given(this, "this").ensure(t => t.retroEvents.length > 0, "invoking method on object without retro events");

        const eventTypeName = (<Object>eventType).getTypeName();
        return this._retroEvents.some(t => t.name === eventTypeName);
    }

    public hasCurrentEventOfType<TEventType extends DomainEvent<T>>(eventType: new (...args: Array<any>) => TEventType): boolean
    {
        given(eventType, "eventType").ensureHasValue().ensureIsFunction();

        const eventTypeName = (<Object>eventType).getTypeName();
        return this._currentEvents.some(t => t.name === eventTypeName);
    }

    public getEventsOfType<TEventType extends DomainEvent<T>>(eventType: new (...args: Array<any>) => TEventType): Array<TEventType> 
    {
        given(eventType, "eventType").ensureHasValue().ensureIsFunction();
        
        given(this, "this").ensure(t => t.retroEvents.length > 0, "invoking method on object without retro events");

        const eventTypeName = (<Object>eventType).getTypeName();
        return this.events.filter(t => t.name === eventTypeName) as Array<TEventType>;
    }

    public getRetroEventsOfType<TEventType extends DomainEvent<T>>(eventType: new (...args: Array<any>) => TEventType): Array<TEventType> 
    {
        given(eventType, "eventType").ensureHasValue().ensureIsFunction();
        
        given(this, "this").ensure(t => t.retroEvents.length > 0, "invoking method on object without retro events");

        const eventTypeName = (<Object>eventType).getTypeName();
        return this._retroEvents.filter(t => t.name === eventTypeName) as Array<TEventType>;
    }

    public getCurrentEventsOfType<TEventType extends DomainEvent<T>>(eventType: new (...args: Array<any>) => TEventType): Array<TEventType> 
    {
        given(eventType, "eventType").ensureHasValue().ensureIsFunction();

        const eventTypeName = (<Object>eventType).getTypeName();
        return this._currentEvents.filter(t => t.name === eventTypeName) as Array<TEventType>;
    }
    
    /**
     * 
     * @param domainContext - provide the Domain Context
     * @param createdEvent - provide a new created event to be used by the clone
     * @param serializedEventMutatorAndFilter - provide a function that can mutate the serialized event if required and returns a boolean indicating whether to include the event or not.
     * @returns - cloned Aggregate
     */
    public clone(domainContext: DomainContext, createdEvent: DomainEvent<T>,
        serializedEventMutatorAndFilter?: (event: { $name: string; }) => boolean): this
    {
        given(domainContext, "domainContext").ensureHasValue()
            .ensureHasStructure({ userId: "string" });
        
        given(createdEvent, "createdEvent").ensureHasValue().ensureIsInstanceOf(DomainEvent)
            .ensure(t => t.isCreatedEvent, "must be created event");
        
        given(serializedEventMutatorAndFilter as Function, "serializedEventMutator").ensureIsFunction();
        
        given(this, "this").ensure(t => t.retroEvents.length > 0, "invoking method on object without retro events");
        
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const clone: this = new (<any>this.constructor)(domainContext, [createdEvent]);
        
        this.events
            .where(t => !t.isCreatedEvent)
            .forEach(t =>
            {
                const serializedEvent = t.serialize();
                
                if (serializedEventMutatorAndFilter != null)
                {
                    const keep = serializedEventMutatorAndFilter(serializedEvent as any);
                    if (!keep)
                        return;
                }
                
                serializedEvent.$aggregateId = null;
                serializedEvent.$id = null;
                serializedEvent.$userId = null;
                // serializedEvent.$name = null; // we keep the name intact
                serializedEvent.$occurredAt = null;
                serializedEvent.$version = null;
                // serializedEvent.$isCreatedEvent = null; // we dont need to touch this
                
                clone.applyEvent(Deserializer.deserialize(serializedEvent));
            });
        
        return clone;
    }
    
    public test(): void
    {
        const type = (<Object>this).constructor as new (...params: Array<any>) => this;
        given(type, "type").ensureHasValue().ensureIsFunction()
            .ensure(t => (<Object>t).getTypeName() === (<Object>this).getTypeName(), "type name mismatch");
        
        
        const defaultState = this._stateFactory.create();
        given(defaultState, "defaultState").ensureHasValue().ensureIsObject()
            .ensure(t => JSON.stringify(t) === JSON.stringify(this._stateFactory.create()), "multiple default state creations are not consistent");
        
        
        const deserializeEvents: Function = (<any>type).deserializeEvents;
        given(deserializeEvents, "deserializeEvents").ensureHasValue().ensureIsFunction();
        
        const eventsSerialized = this.serialize();
        given(eventsSerialized, "eventsSerialized").ensureHasValue().ensureIsObject()
            .ensureHasStructure({
                $id: "string",
                $version: "number",
                $createdAt: "number",
                $updatedAt: "number",
                $events: ["object"]
            })
            .ensure(t => JSON.stringify(t) === JSON.stringify(this.serialize()), "multiple serializations are not consistent");
        
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const eventsDeserializedAggregate: this = (<any>type).deserializeEvents(this._domainContext, eventsSerialized.$events);
        given(eventsDeserializedAggregate, "eventsDeserializedAggregate").ensureHasValue().ensureIsObject().ensureIsType(type);
        
        const eventsDeserializedAggregateState = eventsDeserializedAggregate.state;
        console.log("eventsDeserializedAggregateState", JSON.stringify(eventsDeserializedAggregateState));
        console.log("state", JSON.stringify(this.state));
        
        const eventsDeserializedAggregateStateHash = Crypto.createHash("sha512")
            .update(JSON.stringify(eventsDeserializedAggregateState).trim())
            .digest("hex").toUpperCase();
        
        const originalStateHash = Crypto.createHash("sha512")
            .update(JSON.stringify(this.state).trim())
            .digest("hex").toUpperCase();
        
        given(eventsDeserializedAggregateStateHash, "eventsDeserializedAggregateStateHash").ensureHasValue().ensureIsString()
            .ensure(t => t === originalStateHash, "state is not consistent with original state");
        
        const deserializeSnapshot: Function = (<any>type).deserializeSnapshot;
        given(deserializeSnapshot, "deserializeSnapshot").ensureHasValue().ensureIsFunction();
        
        const snapshot = this.snapshot();
        given(snapshot, "snapshot").ensureHasValue().ensureIsObject()
            .ensure(t => JSON.stringify(t) === JSON.stringify(this.snapshot()), "multiple snapshots are not consistent");
        
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const snapshotDeserializedAggregate: this = (<any>type).deserializeSnapshot(this._domainContext, snapshot);
        given(snapshotDeserializedAggregate, "snapshotDeserializedAggregate").ensureHasValue().ensureIsObject().ensureIsType(type);
        
        const snapshotDeserializedAggregateState = snapshotDeserializedAggregate.state;
        given(snapshotDeserializedAggregateState, "snapshotDeserializedAggregateState").ensureHasValue().ensureIsObject()
            .ensure(t => JSON.stringify(t) === JSON.stringify(this.state), "state is not consistent with original state");
    }
    
    protected rebase(version: number, rebasedEventFactoryFunc: (defaultState: object, rebaseState: object, rebaseVersion: number) => TDomainEvent): void
    {
        given(version, "version").ensureHasValue().ensureIsNumber()
            .ensure(t => t > 0 && t <= this.version, `version must be > 0 and <= ${this.version} (current version)`);

        given(rebasedEventFactoryFunc, "rebasedEventFactoryFunc").ensureHasValue().ensureIsFunction();

        const rebaseVersionInstance = this.constructVersion(version);
        given(rebaseVersionInstance, "rebaseVersionInstance")
            .ensure(t => t.version === version, "could not reconstruct rebase version");
        const rebaseVersion = rebaseVersionInstance.version;
        const rebaseState = AggregateStateHelper.serializeStateIntoSnapshot(rebaseVersionInstance.state);
        clearBaseState(rebaseState);

        const defaultState = AggregateStateHelper.serializeStateIntoSnapshot(this._stateFactory.create());
        clearBaseState(defaultState);

        // const rebaseEvent = rebasedEventFactoryFunc != null
        //     ? rebasedEventFactoryFunc(defaultState, rebaseState, rebaseVersion)
        //     : new AggregateRebased({ defaultState, rebaseState, rebaseVersion });
        
        const rebaseEvent = rebasedEventFactoryFunc(defaultState, rebaseState, rebaseVersion);

        this.applyEvent(rebaseEvent);

        // console.log("rebaseEvent");
        // console.dir(rebaseEvent);

        // console.log("rebaseEvent serialized");
        // console.dir(rebaseEvent.serialize());

        // console.log("rebaseEvent deserialized");
        // console.dir(Deserializer.deserialize(rebaseEvent.serialize()));
    }
    
    protected applyEvent(event: TDomainEvent): void
    {
        given(event, "event").ensureHasValue().ensureIsObject().ensureIsInstanceOf(DomainEvent)
            .ensure(t => t.isCreatedEvent ? this._retroEvents.isEmpty && this._currentEvents.isEmpty : true,
                "'isCreatedEvent = true' cannot be the case for multiple events");
        
        event.apply(this, this._domainContext, this._state);

        this._currentEvents.push(event);
 
        // if (this._retroEvents.length > 0)
        // {
        //     const trimmed = this.trim(this._retroEvents.orderBy(t => t.version)).orderBy(t => t.version);
        //     given(trimmed, "trimmed").ensureHasValue().ensureIsArray()
        //         .ensure(t => t.length > 0, "cannot trim all retro events")
        //         .ensure(t => t.length <= this._retroEvents.length, "only contraction is allowed")
        //         .ensure(t => t.some(u => u.isCreatedEvent), "cannot trim created event")
        //         .ensure(t => t.count(u => u.isCreatedEvent) === 1, "cannot add new created events")
        //         .ensure(t => t.every(u => this._retroEvents.contains(u)), "cannot add new events")
        //         ;

        //     this._retroEvents = trimmed;
        // }
    }
    // /**
    //  *
    //  * @deprecated DO NOT USE
    //  * @description override to trim retro events on the application of a new event
    //  */
    // protected trim(retroEvents: ReadonlyArray<DomainEvent<T>>): ReadonlyArray<DomainEvent<T>>
    // {
    //     given(retroEvents, "retroEvents").ensureHasValue().ensureIsArray().ensure(t => t.length > 0);
        
    //     return retroEvents;
    // }
}