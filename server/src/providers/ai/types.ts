export interface GenerateReplyInput {
  email: string;
  tone: string;
  length: string;
}

export interface SummarizeInput {
  text: string;
}

export interface AIProvider {
  generateReply(
    input: GenerateReplyInput
  ): Promise<string>;

  summarize(
    input: SummarizeInput
  ): Promise<string>;
}
