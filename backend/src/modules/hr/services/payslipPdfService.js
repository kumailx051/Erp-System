const PDFDocument = require('pdfkit');

function money(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function buildPayslipPdf({ employee, payslip, lineItems }) {
  const doc = new PDFDocument({ margin: 50 });
  const chunks = [];

  doc.on('data', (chunk) => chunks.push(chunk));

  doc.fontSize(20).text('Employee Payslip', { align: 'left' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#666').text(`Period: ${payslip.month_year}`);
  doc.text(`Generated: ${new Date(payslip.generated_at || Date.now()).toLocaleDateString()}`);

  doc.moveDown();
  doc.fillColor('#000').fontSize(12).text('Employee Information', { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(10).text(`Name: ${employee.fullName}`);
  doc.text(`Employee Code: ${employee.employeeCode || '-'}`);
  doc.text(`Department: ${employee.department || '-'}`);
  doc.text(`Designation: ${employee.designation || '-'}`);

  doc.moveDown();
  doc.fontSize(12).text('Payroll Summary', { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(10).text(`Base Salary: ${money(payslip.base_salary)}`);
  doc.text(`Payable Days: ${payslip.payable_days} / ${payslip.working_days}`);
  doc.text(`Overtime Minutes: ${payslip.overtime_minutes}`);
  doc.text(`Gross Pay: ${money(payslip.gross_pay)}`);
  doc.text(`Total Deductions: ${money(payslip.total_deductions)}`);
  doc.fontSize(12).fillColor('#0f766e').text(`Net Pay: ${money(payslip.net_pay)}`);

  doc.moveDown();
  doc.fillColor('#000').fontSize(12).text('Line Items', { underline: true });
  doc.moveDown(0.4);

  if (!lineItems || lineItems.length === 0) {
    doc.fontSize(10).fillColor('#666').text('No line items available.');
  } else {
    lineItems.forEach((item) => {
      const label = `${item.item_type === 'earning' ? '[Earning]' : '[Deduction]'} ${item.name}`;
      doc.fontSize(10).fillColor('#000').text(`${label}: ${money(item.amount)}`);
    });
  }

  doc.moveDown();
  doc.fontSize(9).fillColor('#666').text('This is a system-generated payslip.', { align: 'left' });

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

module.exports = {
  buildPayslipPdf
};
