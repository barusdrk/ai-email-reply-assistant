export function buildMeetingPrompt(
  transcript: string
) {
  return `
Analyze the following meeting transcript.

Transcript:
"""
${transcript}
"""

Create a structured report with these sections:

## Summary
- Main discussion points.

## Decisions
- Decisions that were made.

## Action Items
- Task
- Owner
- Deadline
- Status (if mentioned)

## Risks
- Open issues or blockers.

## Follow-up Questions
- Items requiring clarification.

Requirements:
- Be concise.
- Do not invent information.
- If information is missing, write "Not specified."

Return the report in Markdown.
`;
}
