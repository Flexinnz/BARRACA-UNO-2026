import { profileDb } from '../db/profiles';

let cachedApiKey: string | null = 're_D24Zk6eR_28y4Jt9bL3R52hH4L9o4P2XG';
let cachedFromEmail: string | null = 'onboarding@resend.dev';
// eslint-disable-next-line prefer-const
let cachedFromName: string | null = 'Barraca Uno Ventas';

export interface EmailLog {
  id: number;
  recipient: string;
  subject: string;
  status: 'delivered' | 'failed';
  resend_id?: string;
  error_message?: string;
  created_at: string;
}

export async function getEmailConfig(): Promise<{ apiKey: string | null; fromEmail: string; fromName: string }> {
  let dbKey: string | null = null;
  let dbFrom: string | null = null;
  let dbFromName: string | null = null;

  try {
    const db = profileDb();
    await db.prepare(`CREATE TABLE IF NOT EXISTS app_config (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT)`).run();

    const keyRow = await db.prepare("SELECT value FROM app_config WHERE key = 'resend_api_key'").first<{ value: string }>();
    if (keyRow?.value) dbKey = keyRow.value.trim();

    const fromRow = await db.prepare("SELECT value FROM app_config WHERE key = 'resend_from'").first<{ value: string }>();
    if (fromRow?.value) dbFrom = fromRow.value.trim();

    const fromNameRow = await db.prepare("SELECT value FROM app_config WHERE key = 'resend_from_name'").first<{ value: string }>();
    if (fromNameRow?.value) dbFromName = fromNameRow.value.trim();
  } catch (e) {
    console.warn('Could not query app_config for email settings', e);
  }

  const envKey = (typeof process !== 'undefined' && process.env?.resend_API_KEY) || null;
  const envFrom = (typeof process !== 'undefined' && process.env?.resend_FROM) || null;
  const envFromName = (typeof process !== 'undefined' && process.env?.resend_FROM_NAME) || null;

  const apiKey = dbKey || envKey || cachedApiKey;

  let fromEmail = dbFrom || envFrom || cachedFromEmail || '';
  let fromName = dbFromName || envFromName || cachedFromName || 'Barraca Uno';

  const match = fromEmail.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    fromName = match[1].trim();
    fromEmail = match[2].trim();
  }

  if (!fromEmail || fromEmail.includes('@gmail.com')) {
    // Resend no permite enviar DESDE gmail.com, usamos el email de prueba por defecto
    fromEmail = 'onboarding@resend.dev';
  }

  return { apiKey, fromEmail, fromName };
}

export async function saveEmailConfig(apiKey?: string, fromEmail?: string): Promise<void> {
  const db = profileDb();
  const now = new Date().toISOString();

  await db.prepare(`CREATE TABLE IF NOT EXISTS app_config (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT)`).run();

  if (typeof apiKey === 'string') {
    const cleanKey = apiKey.trim();
    cachedApiKey = cleanKey;
    await db.prepare(`INSERT INTO app_config (key, value, updated_at) VALUES ('resend_api_key', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).bind(cleanKey, now).run();
  }

  if (typeof fromEmail === 'string') {
    const cleanFrom = fromEmail.trim();
    cachedFromEmail = cleanFrom;
    await db.prepare(`INSERT INTO app_config (key, value, updated_at) VALUES ('resend_from', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).bind(cleanFrom, now).run();
  }
}

async function ensureEmailLogsTable() {
  const db = profileDb();
  await db.prepare(`CREATE TABLE IF NOT EXISTS email_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT, recipient TEXT, subject TEXT, status TEXT, resend_id TEXT, error_message TEXT, created_at TEXT)`).run();
  return db;
}

export async function logEmailAttempt({ recipient, subject, status, resendId, errorMessage }: { recipient: string; subject: string; status: 'delivered' | 'failed'; resendId?: string; errorMessage?: string; }): Promise<void> {
  try {
    const db = await ensureEmailLogsTable();
    const now = new Date().toISOString();
    await db.prepare(`INSERT INTO email_logs (tenant_id, recipient, subject, status, resend_id, error_message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(null, recipient, subject, status, resendId || null, errorMessage || null, now).run();
  } catch (e) {
    console.warn('Could not record email log', e);
  }
}

export async function getRecentEmailLogs(limit = 15): Promise<EmailLog[]> {
  try {
    const db = await ensureEmailLogsTable();
    const res = await db.prepare('SELECT * FROM email_logs ORDER BY id DESC LIMIT ?').bind(limit).all<EmailLog>();
    return res.results || [];
  } catch {
    return [];
  }
}

export async function sendEmail({ to, subject, html, replyTo }: { to: string; subject: string; html: string; replyTo?: string; }): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const body = {
      service_id: 'service_zo7btip',
      template_id: 'template_l4yucnk',
      user_id: '-iWca7bJBiuZ31cBA',
      accessToken: 'dRGdw9jdAbXAQiGb4cgBT',
      template_params: {
        to_email: to,
        subject: subject,
        html_content: html
      }
    };

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();

    if (!response.ok) {
      let errorMsg = responseText || `Error ${response.status} de EmailJS`;
      console.error('EmailJS API error:', errorMsg);
      await logEmailAttempt({ recipient: to, subject, status: 'failed', errorMessage: errorMsg });
      return { success: false, error: errorMsg };
    }

    const emailId = `ejs_${Date.now()}`;
    await logEmailAttempt({ recipient: to, subject, status: 'delivered', resendId: emailId });
    return { success: true, id: emailId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error de conexion al enviar correo con EmailJS.';
    console.error('Exception calling EmailJS:', err);
    await logEmailAttempt({ recipient: to, subject, status: 'failed', errorMessage: errorMsg });
    return { success: false, error: errorMsg };
  }
}

export async function sendOrderConfirmationEmail({ orderId, customerEmail, customerName, customerPhone, customerDocument, total, subtotal, tax, paymentMethod, items, shippingAddress, invoiceType }: { 
  orderId: string; 
  customerEmail: string; 
  customerName: string;
  customerPhone?: string;
  customerDocument?: string;
  total: number;
  subtotal: number;
  tax: number;
  paymentMethod: string; 
  items: Array<{ name: string; sku: string; quantity: number; unitPrice: number; lineTotal: number }>;
  shippingAddress: string;
  invoiceType?: string;
}) {
  const moneyStr = `$${total.toLocaleString('es-UY')}`;
  const subtotalStr = `$${subtotal.toLocaleString('es-UY')}`;
  const taxStr = `$${tax.toLocaleString('es-UY')}`;
  const dateStr = new Date().toLocaleString('es-UY', { timeZone: 'America/Montevideo' });

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #334155;">${item.sku}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #334155;">${item.name}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #334155; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #334155; text-align: right;">$${item.unitPrice.toLocaleString('es-UY')}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #334155; text-align: right;">$${item.lineTotal.toLocaleString('es-UY')}</td>
    </tr>
  `).join('');

  const htmlTemplate = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 40px 20px;">
    <div style="max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      
      <!-- Header -->
      <div style="background-color: #0B3C5D; padding: 24px 40px; text-align: right;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px; font-style: italic;">
          <span style="font-size: 16px; font-weight: 500; font-style: normal; margin-right: 4px;">Barraca</span>UNO
        </h1>
      </div>

      <div style="padding: 40px;">
        <h2 style="margin: 0 0 8px; font-size: 22px; color: #1e293b; font-weight: 500;">Gracias por tu orden</h2>
        <p style="margin: 0 0 24px; font-size: 14px; color: #64748b;">${customerName}:</p>
        <p style="margin: 0 0 40px; font-size: 13px; color: #64748b;">La orden ha sido recibida con éxito y será procesada a la brevedad.</p>

        <!-- Order Info Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 24px;">
          <h3 style="margin: 0; font-size: 18px; color: #334155;">Orden de compra <strong>${orderId}</strong></h3>
          <span style="font-size: 12px; color: #64748b; font-weight: 600;">${dateStr} hs</span>
        </div>

        <!-- User Info Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px; font-size: 12px;">
          <tr>
            <td style="width: 50%; padding: 0 16px 0 0; vertical-align: top;">
              <div style="background-color: #f8fafc; padding: 6px 12px; font-weight: 600; color: #475569; margin-bottom: 12px;">Datos de usuario</div>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 4px 0; color: #64748b; width: 100px;">Nombre y apellido</td><td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${customerName}</td></tr>
                <tr><td style="padding: 4px 0; color: #64748b;">Email</td><td style="padding: 4px 0; color: #2563eb; font-weight: 600;">${customerEmail}</td></tr>
                <tr><td style="padding: 4px 0; color: #64748b;">Celular</td><td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${customerPhone || '-'}</td></tr>
                <tr><td style="padding: 4px 0; color: #64748b;">RUT / Doc.</td><td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${customerDocument || '-'}</td></tr>
              </table>
            </td>
            <td style="width: 50%; padding: 0 0 0 16px; vertical-align: top;">
              <div style="background-color: #f8fafc; padding: 6px 12px; font-weight: 600; color: #475569; margin-bottom: 12px;">Información de envío</div>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 4px 0; color: #64748b; width: 100px;">Nombre y apellido</td><td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${customerName}</td></tr>
                <tr><td style="padding: 4px 0; color: #64748b;">Dirección</td><td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${shippingAddress}</td></tr>
                <tr><td style="padding: 4px 0; color: #64748b;">Teléfono</td><td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${customerPhone || '-'}</td></tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Billing Info -->
        <div style="background-color: #f8fafc; padding: 6px 12px; font-weight: 600; color: #475569; margin-bottom: 12px; font-size: 12px;">Datos de facturación</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px; font-size: 12px;">
          <tr>
            <td style="padding: 16px; background-color: #f1f5f9; color: #64748b; width: 150px; vertical-align: top;">Forma de pago</td>
            <td style="padding: 16px; color: #0f172a;">
              <strong>${paymentMethod}</strong><br><br>
              <span style="color: #64748b; font-size: 11px;">
                Gracias por elegir comprar a través de nuestra web. Tu pago está pendiente de confirmación por parte de la administración.<br><br>
                *IMPORTANTE: Nuestra empresa nunca te solicitará datos de tus tarjetas de crédito por teléfono o email.
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px; background-color: #f1f5f9; color: #64748b; border-top: 2px solid #ffffff;">Forma de envío</td>
            <td style="padding: 16px; color: #0f172a; font-weight: 600; border-top: 2px solid #e2e8f0;">${shippingAddress.toLowerCase().includes('retiro') ? 'Retiro en el local' : 'Envío a domicilio'}</td>
          </tr>
        </table>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr>
              <th style="padding: 8px 12px; background-color: #e2e8f0; color: #475569; font-size: 11px; text-align: left; font-weight: 600;">Cód.</th>
              <th style="padding: 8px 12px; background-color: #e2e8f0; color: #475569; font-size: 11px; text-align: left; font-weight: 600;">Productos</th>
              <th style="padding: 8px 12px; background-color: #e2e8f0; color: #475569; font-size: 11px; text-align: center; font-weight: 600;">Cantidad</th>
              <th style="padding: 8px 12px; background-color: #e2e8f0; color: #475569; font-size: 11px; text-align: right; font-weight: 600;">Precio unit. $</th>
              <th style="padding: 8px 12px; background-color: #e2e8f0; color: #475569; font-size: 11px; text-align: right; font-weight: 600;">Subtotal $</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- Totals -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px; font-size: 12px;">
          <tr>
            <td style="text-align: right; padding: 4px 12px; color: #64748b;">Subtotal</td>
            <td style="text-align: right; padding: 4px 12px; color: #0f172a; width: 120px;">${subtotalStr}</td>
          </tr>
          <tr>
            <td style="text-align: right; padding: 4px 12px; color: #64748b;">IVA (22%)</td>
            <td style="text-align: right; padding: 4px 12px; color: #0f172a;">${taxStr}</td>
          </tr>
          <tr>
            <td style="text-align: right; padding: 8px 12px; font-size: 14px; font-weight: 700; color: #0f172a;">Total a pagar</td>
            <td style="text-align: right; padding: 8px 12px; font-size: 14px; font-weight: 700; color: #0f172a;">${moneyStr}</td>
          </tr>
        </table>

        <!-- Footer Notice -->
        <div style="background-color: #f1f5f9; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
          <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 4px;">Información</div>
          <div style="font-size: 12px; color: #2563eb;">Ante cualquier consulta sobre tu pedido, por favor comunicate al número de la barraca o respondé este correo.</div>
        </div>
      </div>
      
      <!-- Footer Bar -->
      <div style="background-color: #e2e8f0; padding: 12px 40px; display: flex; justify-content: space-between; font-size: 10px; color: #64748b;">
        <span>barracauno.com.uy</span>
        <span>© 2026 Barraca Uno S.A.</span>
      </div>
    </div>
  </div>
  `;

  const clientResult = await sendEmail({
    to: customerEmail,
    subject: `Confirmación de tu pedido ${orderId} - Barraca Uno`,
    html: htmlTemplate,
  });

  try {
    const adminEmails = ['caordamian@gmail.com', 'brunosaravia09@gmail.com'];
    
    const adminHtmlTemplate = htmlTemplate
      .replace('Gracias por tu orden', 'Nueva venta registrada')
      .replace('La orden ha sido recibida con éxito y será procesada a la brevedad.', 'Un cliente acaba de realizar una nueva orden de compra en la web. Detalles a continuación:');

    for (const adm of adminEmails) {
      if (adm.toLowerCase() !== customerEmail.toLowerCase()) {
        await sendEmail({
          to: adm,
          subject: `[NUEVA VENTA] Pedido #${orderId} por ${moneyStr} - ${customerName}`,
          html: adminHtmlTemplate,
        });
      }
    }
  } catch (e) {
    console.warn('Admin notification email failed', e);
  }

  return clientResult;
}

export async function sendOrderStatusUpdatedEmail({ orderId, customerEmail, customerName, newStatus }: { orderId: string; customerEmail: string; customerName: string; newStatus: string; }) {
  const statusMap: Record<string, { label: string; desc: string; color: string }> = {
    pending: { label: 'Pendiente de pago', desc: 'Estamos a la espera de la confirmacion del pago.', color: '#d97706' },
    approved: { label: 'Aprobado y en preparacion', desc: 'Tu pago fue confirmado y los materiales estan siendo acopiados.', color: '#2563eb' },
    shipped: { label: 'En camino a tu obra', desc: 'El camion de despacho salio con tus materiales.', color: '#7c3aed' },
    delivered: { label: 'Entregado en destino', desc: 'Los materiales fueron entregados. Gracias por confiar en Barraca Uno!', color: '#16a34a' },
    cancelled: { label: 'Cancelado', desc: 'La orden ha sido cancelada.', color: '#e11d48' },
  };
  const info = statusMap[newStatus] || { label: newStatus, desc: 'Estado actualizado.', color: '#0f172a' };
  return sendEmail({
    to: customerEmail,
    subject: `Actualizacion de tu pedido #${orderId}: ${info.label} - Barraca Uno`,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;background:#ffffff"><div style="border-bottom:2px solid #0B3C5D;padding-bottom:16px;margin-bottom:20px"><h1 style="color:#0B3C5D;margin:0;font-size:24px">BARRACA UNO</h1><p style="color:#64748b;margin:4px 0 0;font-size:13px">Seguimiento de Pedido</p></div><h2 style="font-size:18px;color:#1e293b">Hola ${customerName},</h2><p style="font-size:15px;color:#334155;line-height:1.5">Hay novedades sobre tu pedido <strong>#${orderId}</strong>:</p><div style="background:#f8fafc;border-left:4px solid ${info.color};padding:14px 18px;margin:18px 0;border-radius:4px"><div style="font-size:16px;font-weight:700;color:${info.color};margin-bottom:6px">${info.label}</div><div style="font-size:14px;color:#475569">${info.desc}</div></div><p style="font-size:13px;color:#64748b">Podes consultar los detalles completos ingresando a tu cuenta en Barraca Uno.</p><div style="margin-top:30px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center">Barraca Uno S.A. - De la barraca a tu obra</div></div>`,
  });
}
