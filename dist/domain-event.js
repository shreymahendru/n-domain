"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const n_defensive_1 = require("@nivinjoseph/n-defensive");
require("@nivinjoseph/n-ext");
const _1 = require(".");
const n_exception_1 = require("@nivinjoseph/n-exception");
// public
class DomainEvent {
    // occurredAt is epoch milliseconds
    // public constructor(user: string, occurredAt: number = DomainHelper.now, version: number = 0)
    constructor(data) {
        n_defensive_1.given(data, "data").ensureHasValue()
            .ensureHasStructure({
            "$aggregateId?": "string",
            "$id?": "string",
            "$userId?": "string",
            "$name?": "string",
            "$occurredAt?": "number",
            "$version?": "number",
            "$isCreatedEvent?": "boolean"
        });
        this._aggregateId = data.$aggregateId || null;
        this._id = data.$id || null;
        this._userId = data.$userId && !data.$userId.isEmptyOrWhiteSpace() ? data.$userId.trim() : null;
        this._name = this.getTypeName();
        if (data.$name && data.$name !== this._name)
            throw new n_exception_1.ApplicationException(`Deserialized event name '${data.$name}' does not match target type name '${this._name}'.`);
        this._occurredAt = data.$occurredAt || _1.DomainHelper.now;
        this._version = data.$version || 0;
        this._isCreatedEvent = !!data.$isCreatedEvent;
    }
    get aggregateId() { return this._aggregateId; }
    get id() { return this._id; }
    get userId() { return this._userId; }
    get name() { return this._name; }
    get occurredAt() { return this._occurredAt; }
    get version() { return this._version; }
    get isCreatedEvent() { return this._isCreatedEvent; }
    apply(aggregate, domainContext, state) {
        n_defensive_1.given(aggregate, "aggregate").ensureHasValue().ensureIsObject().ensure(t => t instanceof _1.AggregateRoot);
        n_defensive_1.given(domainContext, "domainContext").ensureHasValue().ensureHasStructure({ userId: "string" });
        n_defensive_1.given(state, "state").ensureHasValue().ensureIsObject();
        if (this._userId == null)
            this._userId = domainContext.userId;
        const version = this._version || (state.version + 1) || 1;
        this.applyEvent(state);
        if (this._isCreatedEvent)
            state.createdAt = this._occurredAt;
        state.updatedAt = this._occurredAt;
        if (aggregate.id == null)
            throw new n_exception_1.ApplicationException("Created event is not setting the id of the aggregate");
        if (this._aggregateId != null && this._aggregateId !== aggregate.id)
            throw new n_exception_1.ApplicationException(`Event of type '${this._name}' with id ${this._id} and aggregateId '${this._aggregateId}' is being applied on Aggregate of type '${aggregate.getTypeName()}' with id '${aggregate.id}'`);
        this._aggregateId = aggregate.id;
        state.version = this._version = version;
        const id = `${this._aggregateId}-${this._version}`;
        if (this._id != null && this._id !== id)
            throw new n_exception_1.ApplicationException(`Deserialized id '${this._id}' does not match computed id ${id}`);
        this._id = id;
    }
    serialize() {
        return Object.assign(this.serializeEvent(), {
            $aggregateId: this._aggregateId,
            $id: this._id,
            $userId: this._userId,
            $name: this._name,
            $occurredAt: this._occurredAt,
            $version: this._version,
            $isCreatedEvent: this._isCreatedEvent
        });
    }
}
exports.DomainEvent = DomainEvent;
//# sourceMappingURL=domain-event.js.map