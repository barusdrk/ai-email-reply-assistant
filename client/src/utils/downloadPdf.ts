interface DownloadPdfOptions {
  customerEmail: string;
  subject?: string;
  reply: string;
}

export async function downloadPdf({
  customerEmail,
  subject,
  reply,
}: DownloadPdfOptions): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  pdf.setFontSize(20);
  pdf.text("AI Email Reply", pageWidth / 2, y, { align: "center" });
  y += 15;

  pdf.setFontSize(12);
  pdf.text(`Customer: ${customerEmail}`, margin, y);
  y += 8;

  if (subject) {
    const subjectLines = pdf.splitTextToSize(`Subject: ${subject}`, contentWidth);
    pdf.text(subjectLines, margin, y);
    y += subjectLines.length * 6 + 4;
  }

  pdf.setFont("helvetica", "bold");
  pdf.text("Reply", margin, y);
  y += 8;

  pdf.setFont("helvetica", "normal");
  const lines = pdf.splitTextToSize(reply, contentWidth);
  const lineHeight = 6;

  for (const line of lines) {
    if (y + lineHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }

    pdf.text(line, margin, y);
    y += lineHeight;
  }

  pdf.save("email-reply.pdf");
}
