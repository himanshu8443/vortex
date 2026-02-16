import { EventEmitter } from "node:events";

// Global singleton
export const eventBus = new EventEmitter();

eventBus.setMaxListeners(50);
