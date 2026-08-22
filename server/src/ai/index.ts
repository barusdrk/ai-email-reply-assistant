import {
  createAIProvider,
} from "./factory.js";

import {
  setAIProvider,
} from "./provider.js";

export const ai =
  createAIProvider();

setAIProvider(ai);

export * from "./types.js";
export * from "./provider.js";
export * from "./factory.js";
