"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainHelper = void 0;
// import { Uuid } from "@nivinjoseph/n-util";
const n_defensive_1 = require("@nivinjoseph/n-defensive");
const ulid_1 = require("ulid");
// public
class DomainHelper {
    static get now() { return Date.now(); }
    // public static generateId(prefix: string): string
    // {
    //     given(prefix, "prefix").ensureHasValue().ensureIsString()
    //         .ensure(t => t.trim().length === 3, "should be 3 chars long")
    //         .ensure((t) => t.matchesFormat("@@@"), "should contain only alphabet chars");
    //     // 4 + 32 = 36
    //     return `${prefix.trim().toLowerCase()}_${Uuid.create().replaceAll("-", "")}`;
    // }
    static generateId(prefix) {
        (0, n_defensive_1.given)(prefix, "prefix").ensureHasValue().ensureIsString()
            .ensure(t => t.trim().length === 3, "should be 3 chars long")
            .ensure((t) => t.matchesFormat("@@@"), "should contain only alphabet chars");
        const date = new Date();
        const year = date.getUTCFullYear().toString().substring(2);
        const month = ((date.getUTCMonth() + 1) / 100).toFixed(2).split(".").takeLast();
        const day = (date.getUTCDate() / 100).toFixed(2).split(".").takeLast();
        const dateValue = `${year}${month}${day}`;
        console.log(dateValue);
        // 4 + 32 = 36
        return `${prefix.trim().toLowerCase()}_${dateValue}${(0, ulid_1.ulid)()}`.toLowerCase();
    }
}
exports.DomainHelper = DomainHelper;
//# sourceMappingURL=domain-helper.js.map