import { profileDb } from '../db/profiles';

let cachedApiKey: string | null = null;
let cachedFromEmail: string | null = null;
// eslint-disable-next-line prefer-const
let cachedFromName: string | null = null;

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

  if (!fromEmail) {
    fromEmail = 'barraca.uno.noreply@gmail.com';
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
  await db.prepare(`CREATE TABLE IF NOT EXISTS email_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, recipient TEXT, subject TEXT, status TEXT, resend_id TEXT, error_message TEXT, created_at TEXT)`).run();
  return db;
}

export async function logEmailAttempt({ recipient, subject, status, resendId, errorMessage }: { recipient: string; subject: string; status: 'delivered' | 'failed'; resendId?: string; errorMessage?: string; }): Promise<void> {
  try {
    const db = await ensureEmailLogsTable();
    const now = new Date().toISOString();
    await db.prepare(`INSERT INTO email_logs (recipient, subject, status, resend_id, error_message, created_at) VALUES (?, ?, ?, ?, ?, ?)`).bind(recipient, subject, status, resendId || null, errorMessage || null, now).run();
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
  const { apiKey, fromEmail, fromName } = await getEmailConfig();

  if (!apiKey) {
    const msg = 'resend_API_KEY no configurada. Ingresala en /administracion bajo Configuracion de Correo (resend).';
    console.warn(msg);
    await logEmailAttempt({ recipient: to, subject, status: 'failed', errorMessage: msg });
    return { success: false, error: msg };
  }

  try {
    const body = {
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json() as { id?: string; message?: string; name?: string };

    if (!response.ok) {
      let errorMsg = data.message || `Error ${response.status} de Resend`;
      console.error('Resend API error:', errorMsg, data);
      await logEmailAttempt({ recipient: to, subject, status: 'failed', errorMessage: errorMsg });
      return { success: false, error: errorMsg };
    }

    const emailId = data.id;
    await logEmailAttempt({ recipient: to, subject, status: 'delivered', resendId: emailId });
    return { success: true, id: emailId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error de conexion al enviar correo con Resend.';
    console.error('Exception calling Resend:', err);
    await logEmailAttempt({ recipient: to, subject, status: 'failed', errorMessage: errorMsg });
    return { success: false, error: errorMsg };
  }
}

export async function sendOrderConfirmationEmail({ orderId, customerEmail, customerName, total, paymentMethod }: { orderId: string; customerEmail: string; customerName: string; total: number; paymentMethod: string; }) {
  const moneyStr = `$${total.toLocaleString('es-UY')}`;

  const clientResult = await sendEmail({
    to: customerEmail,
    subject: `Confirmacion de tu pedido ${orderId} - Barraca Uno`,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;background:#ffffff"><div style="border-bottom:2px solid #0B3C5D;padding-bottom:16px;margin-bottom:20px"><h1 style="color:#0B3C5D;margin:0;font-size:24px">BARRACA UNO</h1><p style="color:#64748b;margin:4px 0 0;font-size:13px">Uno para todos - Materiales de Construccion</p></div><h2 style="font-size:20px;color:#1e293b;margin-top:0">Hola ${customerName}!</h2><p style="font-size:15px;line-height:1.5;color:#334155">Recibimos correctamente tu orden de compra <strong>#${orderId}</strong> por un total de <strong>${moneyStr} UYU</strong>.</p><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:20px 0"><p style="margin:0 0 8px;font-size:13px;color:#64748b"><strong>Estado actual:</strong> <span style="color:#d97706;font-weight:600">Pendiente de preparacion</span></p><p style="margin:0;font-size:13px;color:#64748b"><strong>Metodo de pago:</strong> ${paymentMethod}</p></div><p style="font-size:14px;line-height:1.5;color:#475569">El equipo de logistica ya esta procesando tu pedido. Podes ver el estado actualizado y descargar tu comprobante fiscal en la seccion <strong>Mis pedidos</strong> de nuestra plataforma.</p><div style="margin-top:30px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center">Barraca Uno S.A. - Montevideo, Uruguay - Soporte: contacto@barraca-uno.com</div></div>`,
  });

  try {
    const adminEmails = ['caordamian@gmail.com', 'brunosaravia09@gmail.com'];
    for (const adm of adminEmails) {
      if (adm.toLowerCase() !== customerEmail.toLowerCase()) {
        await sendEmail({
          to: adm,
          subject: `[NUEVA VENTA] Pedido #${orderId} por ${moneyStr} - ${customerName}`,
          html: `<div style="font-family:sans-serif;padding:20px;color:#0f172a"><h2 style="color:#0B3C5D">Nueva orden de compra en la barraca</h2><p>Un cliente acaba de realizar una orden:</p><ul><li><strong>Pedido:</strong> #${orderId}</li><li><strong>Cliente:</strong> ${customerName} (${customerEmail})</li><li><strong>Total:</strong> ${moneyStr} UYU</li><li><strong>Pago:</strong> ${paymentMethod}</li></ul></div>`,
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
