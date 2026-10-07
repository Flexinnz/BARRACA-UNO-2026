import { requireApiPermission } from '../../../../lib/api-auth';
import { tenantSettingsRepository } from '../../../../lib/data';
import { getEmailConfig, sendEmail, getRecentEmailLogs } from '../../../../lib/email';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireApiPermission(req, 'settings:read');
  if (!auth.authorized || !auth.context) {
    return auth.response!;
  }

  // 1. Consultar configuración y secreto propios del tenant
  const [tenantApiKey, tenantFromEmail] = await Promise.all([
    tenantSettingsRepository.getSecret(auth.context, 'resend_api_key'),
    tenantSettingsRepository.getSetting(auth.context, 'resend_from'),
  ]);

  // Si aún no está configurado por tenant, usar fallback del sistema
  const globalConfig = await getEmailConfig();
  const apiKey = tenantApiKey || globalConfig.apiKey;
  const fromEmail = tenantFromEmail || globalConfig.fromEmail;

  const maskedKey = apiKey ? `${apiKey.slice(0, 4)}••••••••${apiKey.slice(-4)}` : '';
  let logs: any[] = [];
  try {
    logs = await getRecentEmailLogs(20);
  } catch {}

  return Response.json(
    {
      configured: !!apiKey,
      hasApiKey: !!apiKey,
      maskedKey,
      fromEmail,
      logs,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(req: Request) {
  const auth = await requireApiPermission(req, 'settings:manage');
  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response!;
  }

  let body: { action?: string; apiKey?: string; fromEmail?: string; testEmail?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }

  if (body.action === 'save') {
    // 1. Guardar configuraciones y secretos estrictamente dentro del tenant actual
    if (body.fromEmail !== undefined) {
      await tenantSettingsRepository.setSetting(auth.context, 'resend_from', body.fromEmail.trim());
    }
    if (body.apiKey && body.apiKey.trim()) {
      await tenantSettingsRepository.setSecret(auth.context, 'resend_api_key', body.apiKey.trim());
    }

    const [savedKey, savedFrom] = await Promise.all([
      tenantSettingsRepository.getSecret(auth.context, 'resend_api_key'),
      tenantSettingsRepository.getSetting(auth.context, 'resend_from'),
    ]);

    const activeKey = savedKey || '';
    const maskedKey = activeKey ? `${activeKey.slice(0, 4)}••••••••${activeKey.slice(-4)}` : '';

    return Response.json({
      ok: true,
      message: 'Configuración de correo guardada con éxito en la organización.',
      configured: !!activeKey,
      fromEmail: savedFrom || '',
      maskedKey,
    });
  }

  if (body.action === 'test') {
    const to = body.testEmail || auth.user.email;
    if (!to || !to.includes('@')) {
      return Response.json({ error: 'Ingresá un correo válido para la prueba.' }, { status: 400 });
    }

    const tenantName = auth.context.tenant.name;

    const result = await sendEmail({
      to,
      subject: `Prueba de conexión - ${tenantName}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #0f172a;">
          <h2 style="color: #0B3C5D;">¡Conexión de correo exitosa!</h2>
          <p>Este correo de prueba confirma que la integración de correo en <strong>${tenantName}</strong> está funcionando al 100%.</p>
          <p><strong>Fecha y hora:</strong> ${new Date().toLocaleString('es-UY')}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <small style="color: #64748b;">${tenantName} · Plataforma Multi-Tenant</small>
        </div>
      `,
    });

    if (!result.success) {
      return Response.json(
        {
          ok: false,
          error: result.error || 'Error al enviar correo de prueba.',
        },
        { status: 400 }
      );
    }

    return Response.json({
      ok: true,
      id: result.id,
      message: `¡Correo de prueba enviado con éxito a ${to}! (ID: ${result.id})`,
    });
  }

  return Response.json({ error: 'Acción inválida.' }, { status: 400 });
}
