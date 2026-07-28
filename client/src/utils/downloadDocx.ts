import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

interface DownloadDocxOptions {
  customerEmail: string;
  subject?: string;
  reply: string;
}

export async function downloadDocx({
  customerEmail,
  subject,
  reply,
}: DownloadDocxOptions) {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.TITLE,
            children: [
              new TextRun(
                "AI Email Reply"
              ),
            ],
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Customer: ${customerEmail}`,
                bold: true,
              }),
            ],
          }),

          ...(subject
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Subject: ${subject}`,
                      bold: true,
                    }),
                  ],
                }),
              ]
            : []),

          new Paragraph(""),

          new Paragraph({
            heading:
              HeadingLevel.HEADING_1,
            children: [
              new TextRun("Reply"),
            ],
          }),

          ...reply
            .split("\n")
            .map(
              (line) =>
                new Paragraph(line)
            ),
        ],
      },
    ],
  });

  const blob =
    await Packer.toBlob(doc);

  const url =
    window.URL.createObjectURL(blob);

  const anchor =
    window.document.createElement("a");

  anchor.href = url;
  anchor.download =
    "email-reply.docx";

  window.document.body.appendChild(
    anchor
  );

  anchor.click();

  window.document.body.removeChild(
    anchor
  );

  window.URL.revokeObjectURL(url);
}
