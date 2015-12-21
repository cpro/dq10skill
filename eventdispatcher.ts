module Dq10.SkillSimulator {
    export interface Event {
        name: string;
        args: any[];
    }
    export class EventDispatcher {
        private events: {
            [eventName: string]: Function[];
        } = {};

        dispatch(eventName: string, ...args) {
            if (this.events[eventName] === undefined) {
                return;
            }

            this.events[eventName].forEach((listener) => {
                listener.apply(this, args);
            });
        }

        on(eventName: string, listener: Function): void {
            if (this.events[eventName] === undefined) {
                this.events[eventName] = [];
            }

            this.events[eventName].push(listener);
        }

        off(eventName: string, listener: Function): void {
            if (this.events[eventName] === undefined) {
                return;
            }
            var i = this.events[eventName].indexOf(listener);
            if (i >= 0) {
                this.events[eventName].splice(i, 1);
            }
        }
    }
}