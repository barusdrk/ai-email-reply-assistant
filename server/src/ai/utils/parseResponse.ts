export function parseAIResponse(
  response: unknown
): string {
  if (!response) {
    return "";
  }

  if (typeof response === "string") {
    return response.trim();
  }

  if (
    typeof response === "object" &&
    response !== null
  ) {
    const data =
      response as Record<
        string,
        unknown
      >;

    if (
      typeof data.output === "string"
    ) {
      return data.output.trim();
    }

    if (
      typeof data.text === "string"
    ) {
      return data.text.trim();
    }

    if (
      Array.isArray(data.content)
    ) {
      const text =
        data.content
          .map((item) => {
            if (
              typeof item === "object" &&
              item !== null &&
              "text" in item &&
              typeof item.text === "string"
            ) {
              return item.text;
            }

            return "";
          })
          .filter(Boolean)
          .join("\n");

      if (text) {
        return text.trim();
      }
    }
  }

  throw new Error(
    "Unable to parse AI response."
  );
}

export function parseJSONResponse<T>(
  response: string
): T | null {
  try {
    return JSON.parse(response) as T;
  } catch {
    return null;
  }
}
