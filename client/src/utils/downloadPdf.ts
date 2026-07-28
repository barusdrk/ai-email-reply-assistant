import { jsPDF } from "jspdf";

interface DownloadPdfOptions {
  customerEmail: string;
  subject?: string;
  reply: string;
}

export function downloadPdf({
  customerEmail,
  subject,
  reply,
}: DownloadPdfOptions) {
  const pdf = new jsPDF();

  const pageWidth =
    pdf.internal.pageSize.getWidth();

  let y = 20;

  pdf.setFontSize(20);
  pdf.text("AI Email Reply", pageWidth / 2, y, {
    align: "center",
  });

  y += 15;

  pdf.setFontSize(12);

  pdf.text(
    `Customer: ${customerEmail}`,
    20,
    y
  );

  y += 8;

  if (subject) {
    pdf.text(
      `Subject: ${subject}`,
      20,
      y
    );

    y += 10;
  }

  pdf.setFont("helvetica", "bold");

  pdf.text("Reply", 20, y);

  y += 8;

  pdf.setFont("helvetica", "normal");

  const lines = pdf.splitTextToSize(
    reply,
    170
  );

  pdf.text(lines, 20, y);

  pdf.save("email-reply.pdf");
}
