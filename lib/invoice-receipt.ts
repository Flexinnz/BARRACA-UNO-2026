import { generateQrSvg } from './qr';

export interface InvoiceItem {
  name: string;
  sku?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  total: number;
}

export interface InvoiceData {
  orderId: string;
  dateStr?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  companyName?: string;
  rut?: string;
  address: string;
  city: string;
  paymentMethod: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

const moneyFmt = (v: number) => new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 0 }).format(v);

export function buildInvoiceHtml(data: InvoiceData): string {
  const isCompany = !!(data.rut && data.rut.trim());
  const docType = isCompany ? 'e-Factura Electrónica' : 'e-Ticket Electrónico';
  const serie = isCompany ? 'A-00' : 'B-00';
  const fullDate = data.dateStr || new Date().toLocaleString('es-UY', { timeZone: 'America/Montevideo', dateStyle: 'short', timeStyle: 'medium' });

  // Verification string for QR code (Standard DGI CFE schema)
  const qrVerificationData = `RUT:218492010019|CFE:${isCompany ? '111' : '101'}|SERIE:${serie}|NUM:${data.orderId}|TOTAL:${data.total}|FECHA:${fullDate}|HASH:${data.orderId.slice(-6).toUpperCase()}`;
  const qrSvg = generateQrSvg(qrVerificationData, 130);

  const itemsHtml = data.items.map(item => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 8px; font-weight: 600; color: #1e293b; text-align: center;">${item.quantity} ${item.unit || 'un.'}</td>
      <td style="padding: 10px 8px; color: #0f172a;">
        <strong>${item.name}</strong>
        ${item.sku ? `<div style="font-size: 11px; color: #64748b;">SKU: ${item.sku}</div>` : ''}
      </td>
      <td style="padding: 10px 8px; text-align: right; color: #334155;">${moneyFmt(item.unitPrice)}</td>
      <td style="padding: 10px 8px; text-align: right; font-weight: 600; color: #0f172a;">${moneyFmt(item.total)}</td>
    </tr>
  `).join('');

  return `
    <div style="width: 680px; padding: 36px 40px; background: #ffffff; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; box-sizing: border-box; font-size: 13px; line-height: 1.45;">
      
      <!-- Encabezado Fiscal -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0B3C5D; padding-bottom: 18px; margin-bottom: 20px;">
        <div>
          <h1 style="margin: 0 0 4px 0; color: #0B3C5D; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">BARRACA UNO S.A.</h1>
          <div style="font-size: 11px; color: #475569; line-height: 1.4;">
            <strong>RUT: 21.849.201.0019</strong> · Casa Central Montevideo<br>
            Av. General Flores 4210 · Tel: +598 2200 1122<br>
            facturacion@barracauno.com.uy · www.barracauno.com.uy
          </div>
        </div>
        <div style="text-align: right; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Comprobante Fiscal</div>
          <div style="font-size: 16px; font-weight: 800; color: #0B3C5D; margin: 2px 0;">${docType}</div>
          <div style="font-size: 12px; color: #334155;"><strong>Nº:</strong> ${serie}${data.orderId}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">${fullDate}</div>
        </div>
      </div>

      <!-- Datos del Receptor / Cliente -->
      <div style="background: #f1f5f9; border-radius: 8px; padding: 14px 18px; margin-bottom: 22px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
        <div>
          <span style="color: #64748b; display: block; font-size: 10px; text-transform: uppercase; font-weight: 700;">Receptor / Razón Social</span>
          <strong style="font-size: 14px; color: #0f172a;">${data.companyName ? data.companyName + ' (' + data.customerName + ')' : data.customerName}</strong>
          ${data.rut ? `<div style="color: #0369a1; font-weight: 700; margin-top: 2px;">RUT / DGI: ${data.rut}</div>` : '<div style="color: #64748b;">Consumidor Final</div>'}
          <div style="color: #475569; margin-top: 2px;">${data.customerEmail}</div>
        </div>
        <div>
          <span style="color: #64748b; display: block; font-size: 10px; text-transform: uppercase; font-weight: 700;">Destino de Entrega & Pago</span>
          <div style="color: #0f172a; font-weight: 600;">${data.address}, ${data.city}</div>
          ${data.customerPhone ? `<div style="color: #475569;">Tel: ${data.customerPhone}</div>` : ''}
          <div style="margin-top: 3px;"><strong style="color: #0B3C5D;">Pago:</strong> ${data.paymentMethod}</div>
        </div>
      </div>

      <!-- Tabla de Productos -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #0B3C5D; color: #ffffff; font-size: 11px; text-transform: uppercase;">
            <th style="padding: 8px; text-align: center; border-radius: 4px 0 0 0; width: 60px;">Cant.</th>
            <th style="padding: 8px; text-align: left;">Descripción del Material</th>
            <th style="padding: 8px; text-align: right; width: 100px;">P. Unit</th>
            <th style="padding: 8px; text-align: right; border-radius: 0 4px 0 0; width: 110px;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Desglose de Totales y QR DGI -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 10px; border-top: 1px solid #cbd5e1;">
        <!-- QR Fiscal -->
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="border: 1px solid #cbd5e1; padding: 4px; background: #fff; border-radius: 6px; display: inline-block;">
            ${qrSvg}
          </div>
          <div style="font-size: 10px; color: #64748b; max-width: 190px; line-height: 1.35;">
            <strong style="color: #334155;">Constancia Fiscal Electrónica</strong><br>
            Escaneá con tu celular para verificar la validez de este comprobante en el sistema DGI de Barraca Uno.
          </div>
        </div>

        <!-- Totales -->
        <div style="width: 250px;">
          <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #64748b; font-size: 12px;">
            <span>Subtotal Neto:</span>
            <span>${moneyFmt(data.subtotal)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #64748b; font-size: 12px;">
            <span>IVA Tasa Básica (22%):</span>
            <span>${moneyFmt(data.tax)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0 4px 0; margin-top: 4px; border-top: 2px solid #0B3C5D; font-size: 17px; font-weight: 800; color: #0B3C5D;">
            <span>Total UYU:</span>
            <span>${moneyFmt(data.total)}</span>
          </div>
        </div>
      </div>

      <!-- Talón Abitab / Redpagos si es efectivo -->
      ${data.paymentMethod.includes('Efectivo') || data.paymentMethod.includes('Abitab') || data.paymentMethod.includes('Redpagos') ? `
        <div style="margin-top: 20px; border: 1px dashed #0284c7; background: #f0f9ff; border-radius: 6px; padding: 12px 16px; font-size: 11px;">
          <div style="font-weight: 700; color: #0369a1; font-size: 12px; margin-bottom: 2px;">🏦 Talón de Cobranza en Redes de Pago (Abitab / Redpagos)</div>
          <div style="color: #334155;">Convenio BARRACA UNO: <strong>Nº 8412</strong> · Código de Pago: <strong>${data.orderId.replace(/[^0-9]/g, '') || data.orderId}</strong> · Vence en 72hs.</div>
        </div>
      ` : ''}

      <!-- Footer Legal DGI -->
      <div style="margin-top: 24px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px; color: #94a3b8;">
        I.V.A. al día · Sistema Homologado DGI - Resolución N° 1204/2026 · Emitido electrónicamente por Barraca Uno SaaS v2.3
      </div>
    </div>
  `;
}

export async function generateAndDownloadPdf(data: InvoiceData, filename?: string): Promise<void> {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.innerHTML = buildInvoiceHtml(data);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename || `Comprobante_${data.orderId}_BarracaUno.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
