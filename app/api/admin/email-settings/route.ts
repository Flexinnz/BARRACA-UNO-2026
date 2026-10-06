import { getChatGPTUser } from '../../../chatgpt-auth';
import { isCompanyAdmin } from '../../../../lib/accounts';
import { getEmailConfig, saveEmailConfig, sendEmail, getRecentEmailLogs } from '../../../../lib/email';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getChatGPTUser();
  if (!user || !isCompanyAdmin(user)) {
    return Response.json({ error: 'Acceso no autorizado.' }, { status: 403 });
  }

  const { apiKey, fromEmail } = await getEmailConfig();
  const maskedKey = apiKey ? `${apiKey.slice(0, 4)}••••••••${apiKey.slice(-4)}` : '';
  const logs = await getRecentEmailLogs(20);

  return Response.json({
    configured: !!apiKey,
    hasApiKey: !!apiKey,
    maskedKey,
    fromEmail,
    logs,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const user = await getChatGPTUser();
  if (!user || !isCompanyAdmin(user)) {
    return Response.json({ error: 'Acceso no autorizado.' }, { status: 403 });
  }

  let body: { action?: string; apiKey?: string; fromEmail?: string; testEmail?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }

  if (body.action === 'save') {
    await saveEmailConfig(body.apiKey, body.fromEmail);
    const updated = await getEmailConfig();
    return Response.json({
      ok: true,
      message: 'Configuración de correo guardada con éxito.',
      configured: !!updated.apiKey,
      fromEmail: updated.fromEmail,
      maskedKey: updated.apiKey ? `${updated.apiKey.slice(0, 4)}••••••••${updated.apiKey.slice(-4)}` : '',
    });
  }

  if (body.action === 'test') {
    const to = body.testEmail || user.email;
    if (!to || !to.includes('@')) {
      return Response.json({ error: 'Ingresá un correo válido para la prueba.' }, { status: 400 });
    }

    const result = await sendEmail({
      to,
      subject: 'Prueba de conexión con Brevo - Barraca Uno',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #0f172a;">
          <h2 style="color: #0B3C5D;">¡Conexión con Brevo exitosa!</h2>
          <p>Este correo de prueba confirma que la integración con <strong>Brevo</strong> en Barraca Uno está funcionando al 100%.</p>
          <p><strong>Fecha y hora:</strong> ${new Date().toLocaleString('es-UY')}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <small style="color: #64748b;">Barraca Uno SaaS · Sistema Empresarial</small>
        </div>
      `,
    });

    if (!result.success) {
      return Response.json({
        ok: false,
        error: result.error || 'Error al enviar correo con Brevo.',
      }, { status: 400 });
    }

    return Response.json({
      ok: true,
      id: result.id,
      message: `¡Correo de prueba enviado con éxito a ${to}! (ID: ${result.id})`,
    });
  }

  return Response.json({ error: 'Acción inválida.' }, { status: 400 });
}
