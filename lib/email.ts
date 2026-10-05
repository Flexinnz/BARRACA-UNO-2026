import { Resend } from 'resend';
import { profileDb } from '../db/profiles';

let cachedApiKey: string | null = null;
let cachedFromEmail: string | null = null;

export interface EmailLog {
  id: number;
  recipient: string;
  subject: string;
  status: 'delivered' | 'failed';
  resend_id?: string;
  error_message?: string;
  created_at: string;
}

export async function getEmailConfig(): Promise<{ apiKey: string | null; fromEmail: string }> {
  let dbKey: string | null = null;
  let dbFrom: string | null = null;

  try {
    const db = profileDb();
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS app_config (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT
      )
    `).run();

    const keyRow = await db.prepare("SELECT value FROM app_config WHERE key = 'resend_api_key'").first<{ value: string }>();
    if (keyRow?.value) dbKey = keyRow.value.trim();

    const fromRow = await db.prepare("SELECT value FROM app_config WHERE key = 'resend_from'").first<{ value: string }>();
    if (fromRow?.value) dbFrom = fromRow.value.trim();
  } catch (e) {
    console.warn('Could not query app_config for email settings', e);
  }

  const envKey = (typeof process !== 'undefined' && process.env?.RESEND_API_KEY) || null;
  const envFrom = (typeof process !== 'undefined' && process.env?.RESEND_FROM) || null;

  const apiKey = dbKey || envKey || cachedApiKey;
  // Default to official Resend testing sender onboarding@resend.dev
  const fromEmail = dbFrom || envFrom || cachedFromEmail || 'Barraca Uno <onboarding@resend.dev>';

  return { apiKey, fromEmail };
}

export async function saveEmailConfig(apiKey?: string, fromEmail?: string): Promise<void> {
  const db = profileDb();
  const now = new Date().toISOString();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT
    )
  `).run();

  if (typeof apiKey === 'string') {
    const cleanKey = apiKey.trim();
    cachedApiKey = cleanKey;
    await db.prepare(`
      INSERT INTO app_config (key, value, updated_at) VALUES ('resend_api_key', ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).bind(cleanKey, now).run();
  }

  if (typeof fromEmail === 'string') {
    const cleanFrom = fromEmail.trim();
    cachedFromEmail = cleanFrom;
    await db.prepare(`
      INSERT INTO app_config (key, value, updated_at) VALUES ('resend_from', ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).bind(cleanFrom, now).run();
  }
}

export async function logEmailAttempt({
  recipient,
  subject,
  status,
  resendId,
  errorMessage,
}: {
  recipient: string;
  subject: string;
  status: 'delivered' | 'failed';
  resendId?: string;
  errorMessage?: string;
}): Promise<void> {
  try {
    const db = profileDb();
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipient TEXT,
        subject TEXT,
        status TEXT,
        resend_id TEXT,
        error_message TEXT,
        created_at TEXT
      )
    `).run();

    const now = new Date().toISOString();
    await db.prepare(`
      INSERT INTO email_logs (recipient, subject, status, resend_id, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(recipient, subject, status, resendId || null, errorMessage || null, now).run();
  } catch (e) {
    console.warn('Could not record email log', e);
  }
}

export async function getRecentEmailLogs(limit = 15): Promise<EmailLog[]> {
  try {
    const db = profileDb();
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipient TEXT,
        subject TEXT,
        status TEXT,
        resend_id TEXT,
        error_message TEXT,
        created_at TEXT
      )
    `).run();

    const res = await db.prepare('SELECT * FROM email_logs ORDER BY id DESC LIMIT ?').bind(limit).all<EmailLog>();
    return res.results || [];
  } catch {
    return [];
  }
}

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const { apiKey, fromEmail } = await getEmailConfig();

  if (!apiKey) {
    const msg = 'RESEND_API_KEY no configurada. Ingresala en /administracion o variables de entorno.';
    console.warn(msg);
    await logEmailAttempt({ recipient: to, subject, status: 'failed', errorMessage: msg });
    return { success: false, error: msg };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
      replyTo: replyTo || undefined,
    });

    if (error) {
      console.error('Error returned by Resend API:', error);
      let errorMsg = error.message;
      if (errorMsg.toLowerCase().includes('only send testing emails to your own email address')) {
        errorMsg += ' [Modo Sandbox de Resend: con el remitente "onboarding@resend.dev", Resend solo permite enviar al correo de tu cuenta. Para enviar a clientes y correos externos debés agregar tu dominio en resend.com/domains]';
      } else if (errorMsg.toLowerCase().includes('domain is not verified')) {
        errorMsg += ' [Dominio no verificado: usá "Barraca Uno <onboarding@resend.dev>" como remitente para pruebas].';
      }

      await logEmailAttempt({ recipient: to, subject, status: 'failed', errorMessage: errorMsg });
      return { success: false, error: errorMsg };
    }

    const emailId = data?.id;
    await logEmailAttempt({ recipient: to, subject, status: 'delivered', resendId: emailId });
    return { success: true, id: emailId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error de conexión al enviar correo.';
    console.error('Exception calling Resend:', err);
    await logEmailAttempt({ recipient: to, subject, status: 'failed', errorMessage: errorMsg });
    return { success: false, error: errorMsg };
  }
}

export async function sendOrderConfirmationEmail({
  orderId,
  customerEmail,
  customerName,
  total,
  paymentMethod,
}: {
  orderId: string;
  customerEmail: string;
  customerName: string;
  total: number;
  paymentMethod: string;
}) {
  const moneyStr = `$${total.toLocaleString('es-UY')}`;

  // 1. Send confirmation to the customer
  const clientResult = await sendEmail({
    to: customerEmail,
    subject: `¡Confirmación de tu pedido ${orderId}! - Barraca Uno`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0f172a; background: #ffffff;">
        <div style="border-bottom: 2px solid #0B3C5D; padding-bottom: 16px; margin-bottom: 20px;">
          <h1 style="color: #0B3C5D; margin: 0; font-size: 24px;">BARRACA UNO</h1>
          <p style="color: #64748b; margin: 4px 0 0; font-size: 13px;">Uno para todos · Materiales de Construcción</p>
        </div>
        <h2 style="font-size: 20px; color: #1e293b; margin-top: 0;">¡Hola ${customerName}!</h2>
        <p style="font-size: 15px; line-height: 1.5; color: #334155;">
          Recibimos correctamente tu orden de compra <strong>${orderId}</strong> por un total de <strong>${moneyStr} UYU</strong>.
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;"><strong>Estado actual:</strong> <span style="color: #d97706; font-weight: 600;">Pendiente de preparación</span></p>
          <p style="margin: 0; font-size: 13px; color: #64748b;"><strong>Método de pago:</strong> ${paymentMethod}</p>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #475569;">
          El equipo de logística ya está procesando tu pedido. Podés ver el estado actualizado y descargar tu comprobante fiscal en la sección <strong>Mis pedidos</strong> de nuestra plataforma.
        </p>
        <div style="margin-top: 30px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
          Barraca Uno S.A. · Montevideo, Uruguay · Soporte: contacto@barraca-uno.com
        </div>
      </div>
    `,
  });

  // 2. Also send an alert copy to the store administrator
  try {
    const adminEmails = ['caordamian@gmail.com', 'brunosaravia09@gmail.com'];
    for (const adm of adminEmails) {
      if (adm.toLowerCase() !== customerEmail.toLowerCase()) {
        await sendEmail({
          to: adm,
          subject: `🛒 [NUEVA VENTA] Pedido ${orderId} por ${moneyStr} - ${customerName}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #0f172a;">
              <h2 style="color: #0B3C5D;">¡Nueva orden de compra recibida en la barraca!</h2>
              <p>Un cliente acaba de realizar una orden de compra:</p>
              <ul>
                <li><strong>Número de pedido:</strong> ${orderId}</li>
                <li><strong>Cliente:</strong> ${customerName} (${customerEmail})</li>
                <li><strong>Total con IVA:</strong> ${moneyStr} UYU</li>
                <li><strong>Forma de pago:</strong> ${paymentMethod}</li>
              </ul>
              <p>Ingresá al <a href="/pedidos-admin">Panel de Gestión de Pedidos</a> para aprobar el despacho.</p>
            </div>
          `,
        });
      }
    }
  } catch (e) {
    console.warn('Admin notification email failed', e);
  }

  return clientResult;
}

export async function sendOrderStatusUpdatedEmail({
  orderId,
  customerEmail,
  customerName,
  newStatus,
}: {
  orderId: string;
  customerEmail: string;
  customerName: string;
  newStatus: string;
}) {
  const statusMap: Record<string, { label: string; desc: string; color: string }> = {
    pending: { label: 'Pendiente de pago', desc: 'Estamos a la espera de la confirmación del pago.', color: '#d97706' },
    approved: { label: 'Aprobado y en preparación', desc: 'Tu pago fue confirmado y los materiales están siendo acopiados.', color: '#2563eb' },
    shipped: { label: 'En camino a tu obra', desc: 'El camión de despacho salió con tus materiales rumbo a la dirección indicada.', color: '#7c3aed' },
    delivered: { label: 'Entregado en destino', desc: 'Los materiales fueron entregados con éxito en la obra. ¡Gracias por confiar en Barraca Uno!', color: '#16a34a' },
    cancelled: { label: 'Cancelado', desc: 'La orden ha sido cancelada.', color: '#e11d48' },
  };

  const info = statusMap[newStatus] || { label: newStatus, desc: 'Estado actualizado.', color: '#0f172a' };

  return sendEmail({
    to: customerEmail,
    subject: `Actualización de tu pedido ${orderId}: ${info.label} - Barraca Uno`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0f172a; background: #ffffff;">
        <div style="border-bottom: 2px solid #0B3C5D; padding-bottom: 16px; margin-bottom: 20px;">
          <h1 style="color: #0B3C5D; margin: 0; font-size: 24px;">BARRACA UNO</h1>
          <p style="color: #64748b; margin: 4px 0 0; font-size: 13px;">Seguimiento de Pedido</p>
        </div>
        <h2 style="font-size: 18px; color: #1e293b;">Hola ${customerName},</h2>
        <p style="font-size: 15px; color: #334155; line-height: 1.5;">
          Hay novedades sobre tu pedido <strong>${orderId}</strong>:
        </p>
        <div style="background: #f8fafc; border-left: 4px solid ${info.color}; padding: 14px 18px; margin: 18px 0; border-radius: 4px;">
          <div style="font-size: 16px; font-weight: 700; color: ${info.color}; margin-bottom: 6px;">${info.label}</div>
          <div style="font-size: 14px; color: #475569;">${info.desc}</div>
        </div>
        <p style="font-size: 13px; color: #64748b;">
          Podés consultar los detalles completos ingresando a tu cuenta en Barraca Uno.
        </p>
        <div style="margin-top: 30px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
          Barraca Uno S.A. · De la barraca a tu obra
        </div>
      </div>
    `,
  });
}
