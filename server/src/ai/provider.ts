import type {
  AIProvider,
} from "./types.js";

let provider:
  AIProvider | null =
  null;

export function setAIProvider(
  value: AIProvider
): void {
  provider = value;
}

export function getAIProvider():
  AIProvider {

  if (!provider) {
    throw new Error(
      "AI provider has not been initialized."
    );
  }

  return provider;
}

export function hasAIProvider():
  boolean {

  return provider !== null;
}
