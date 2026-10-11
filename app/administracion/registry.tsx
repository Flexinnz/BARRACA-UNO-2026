"use client";
import { BrandLogo } from '../brand-art';
import { useEffect, useState } from 'react';
import { Users, Search, ShieldCheck, ShieldOff, Trash2, RotateCcw, RefreshCw, X, TriangleAlert, Mail, Send, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { useTheme, ThemeButton } from '../profile-panel';
import { Dialog } from '../modal';

interface Row {
  userId: string;
  email: string;
  displayName: string;
  company: string;
  status: string;
  createdAt: string;
  lastSeenAt: string;
  isAdmin: boolean;
  totalSpent: number;
}

interface Event {
  id: number;
  targetEmail: string;
  action: string;
  createdAt: string;
}

const date = (value: string | undefined | null) => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('es-UY', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Montevideo',
    }).format(d);
  } catch {
    return String(value || '—');
  }
};

const actionLabel: Record<string, string> = { block: 'Bloquear', activate: 'Reactivar', delete: 'Eliminar' };

export function AccountRegistry() {
  const { theme, setTheme } = useTheme();
  const [accounts, setAccounts] = useState<Row[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [pending, setPending] = useState<{ account: Row; action: string } | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  // Email settings state
  const [emailConfig, setEmailConfig] = useState<{ configured: boolean; maskedKey: string; fromEmail: string } | null>(null);
  const [emailLogs, setEmailLogs] = useState<Array<{ id: number; recipient: string; subject: string; status: string; resend_id?: string; error_message?: string; created_at: string }>>([]);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [fromEmailInput, setFromEmailInput] = useState('');
  const [testEmailInput, setTestEmailInput] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [emailError, setEmailError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/accounts', { cache: 'no-store' });
      const data = (await response.json()) as { accounts: Row[]; events: Event[]; error?: string };
      if (!response.ok) throw Error(data.error || 'No pudimos cargar las cuentas.');
      setAccounts(data.accounts);
      setEvents(data.events);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos cargar las cuentas.');
    } finally {
      setLoading(false);
    }
  };

  const loadEmailConfig = async () => {
    try {
      const res = await fetch('/api/admin/email-settings', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as { configured: boolean; maskedKey: string; fromEmail: string; logs?: Array<{ id: number; recipient: string; subject: string; status: string; resend_id?: string; error_message?: string; created_at: string }> };
        setEmailConfig(data);
        if (data.fromEmail) setFromEmailInput(data.fromEmail);
        if (data.logs) setEmailLogs(data.logs);
      }
    } catch (e) {
      console.warn('Could not load email settings', e);
    }
  };

  useEffect(() => {
    void load();
    void loadEmailConfig();
  }, []);

  const handleSaveEmailConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmail(true);
    setEmailMessage('');
    setEmailError('');
    try {
      const res = await fetch('/api/admin/email-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          apiKey: apiKeyInput.trim() || undefined,
          fromEmail: fromEmailInput.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { configured?: boolean; maskedKey?: string; fromEmail?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Error al guardar.');
      if (data.configured !== undefined && data.maskedKey !== undefined && data.fromEmail !== undefined) {
        setEmailConfig({ configured: data.configured, maskedKey: data.maskedKey, fromEmail: data.fromEmail });
      }
      setApiKeyInput('');
      setEmailMessage('¡Configuración de Resend guardada correctamente en la base de datos!');
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Error al guardar configuración de correo.');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setEmailMessage('');
    setEmailError('');
    try {
      const res = await fetch('/api/admin/email-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          testEmail: testEmailInput.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Error al enviar correo.');
      setEmailMessage(data.message || '¡Correo enviado con éxito!');
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Error al enviar correo de prueba.');
    } finally {
      setTestingEmail(false);
    }
  };

  const rows = accounts.filter(
    (a) => (status === 'all' || a.status === status) && `${a.email} ${a.displayName} ${a.company}`.toLowerCase().includes(query.toLowerCase())
  );

  const start = (account: Row, action: string) => {
    setPending({ account, action });
    setConfirmation('');
    setActionError('');
    setMessage('');
  };

  return (
    <div className="admin-page">
      <header className="account-page-header">
        <a className="account-logo" href="/admin">
          <BrandLogo />
        </a>
        <a className="back-catalog" href="/admin">
          Ir al Dashboard
        </a>
        <ThemeButton theme={theme} setTheme={setTheme} />
      </header>

      <main className="admin-main">
        <div className="admin-title">
          <div>
            <div className="eyebrow">DAMBRU SAAS / ADMINISTRACIÓN</div>
            <h1>Las cuentas de la empresa.</h1>
            <p>Registro de usuarios, estado de acceso y acciones del administrador.</p>
          </div>
          <span className="admin-badge">
            <ShieldCheck size={16} />
            Administrador
          </span>
        </div>

        <section className="admin-stats">
          <div>
            <Users size={20} />
            <strong>{accounts.length}</strong>
            <span>Registradas</span>
          </div>
          <div>
            <strong>{accounts.filter((a) => a.status === 'active').length}</strong>
            <span>Activas</span>
          </div>
          <div>
            <strong>{accounts.filter((a) => a.status === 'blocked').length}</strong>
            <span>Bloqueadas</span>
          </div>
          <div>
            <strong>{accounts.filter((a) => a.status === 'deleted').length}</strong>
            <span>Eliminadas</span>
          </div>
        </section>

        <div className="registry-controls">
          <label className="registry-search">
            <Search size={18} />
            <input
              aria-label="Buscar cuentas"
              placeholder="Buscar por nombre, correo o empresa…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="sr-only" htmlFor="account-status">
            Estado de la cuenta
          </label>
          <select id="account-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Todos los estados</option>
            <option value="active">Activas</option>
            <option value="blocked">Bloqueadas</option>
            <option value="deleted">Eliminadas</option>
          </select>
          <button className="secondary" onClick={() => void load()} disabled={loading} aria-label="Actualizar cuentas">
            <RefreshCw size={17} />
          </button>
        </div>

        <div role="status" aria-live="polite">
          {message && <p className="admin-success">{message}</p>}
        </div>
        {error && (
          <p className="admin-error" role="alert">
            {error} <button onClick={() => void load()}>Reintentar</button>
          </p>
        )}

        <div className="table-scroll registry-table">
          <table>
            <thead>
              <tr>
                <th>Cuenta</th>
                <th>Empresa</th>
                <th>Estado</th>
                <th>Registro</th>
                <th>Último acceso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.userId}>
                  <td>
                    <strong>{a.status === 'deleted' ? 'Perfil eliminado' : a.displayName}</strong>
                    <small>{a.email}</small>
                    {a.isAdmin && <span className="account-role">Administrador</span>}
                  </td>
                  <td>{a.company || '—'}</td>
                  <td>
                    <span className={`account-status ${a.status}`}>
                      {a.status === 'active' ? 'Activa' : a.status === 'blocked' ? 'Bloqueada' : 'Eliminada'}
                    </span>
                  </td>
                  <td>{date(a.createdAt)}</td>
                  <td>{date(a.lastSeenAt)}</td>
                  <td>
                    <div className="account-actions">
                      {a.isAdmin ? (
                        <span className="protected-account">
                          <ShieldCheck size={14} />
                          Protegida
                        </span>
                      ) : (
                        <>
                          {a.status === 'active' ? (
                            <button className="account-block" onClick={() => start(a, 'block')}>
                              <ShieldOff size={15} />
                              Bloquear
                            </button>
                          ) : (
                            <button onClick={() => start(a, 'activate')}>
                              <RotateCcw size={15} />
                              {a.status === 'deleted' ? 'Restaurar acceso' : 'Reactivar'}
                            </button>
                          )}
                          {a.status !== 'deleted' && (
                            <button className="account-delete" onClick={() => start(a, 'delete')}>
                              <Trash2 size={15} />
                              Eliminar
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && (
            <p className="registry-empty" role="status">
              Cargando registro…
            </p>
          )}
          {!loading && !rows.length && (
            <p className="registry-empty">No hay cuentas que coincidan con estos filtros.</p>
          )}
        </div>

        {/* ── Email Notifications (Brevo) Section ── */}
        <section
          style={{
            margin: '32px 0 20px',
            padding: '24px',
            background: 'var(--surface-muted)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={20} color="var(--accent)" />
                Notificaciones por Correo Electrónico (Brevo)
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-soft)' }}>
                Envío automático de confirmaciones de compra, cambios de estado de pedidos y bienvenida a clientes.
              </p>
            </div>
            <div>
              {emailConfig?.configured ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={14} /> Clave Configurada
                </span>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    background: 'rgba(245, 158, 11, 0.12)',
                    color: '#f59e0b',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <AlertCircle size={14} /> Falta API Key
                </span>
              )}
            </div>
          </div>

          {/* Brevo setup guide */}
          <div style={{ marginBottom: '16px', padding: '14px 16px', background: 'rgba(59,130,246,0.07)', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.2)', fontSize: '12px', lineHeight: '1.7' }}>
            <strong style={{ color: '#3b82f6', fontSize: '13px' }}>🚀 Cómo activar Brevo (3 pasos, gratis):</strong>
            <ol style={{ margin: '8px 0 0 16px', padding: 0 }}>
              <li>Registrate en <a href="https://app.brevo.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontWeight: 600 }}>app.brevo.com</a> (300 emails/día sin tarjeta).</li>
              <li>En tu cuenta Brevo: <strong>Perfil → SMTP &amp; API → API Keys → Generar nueva clave</strong> y pegala abajo.</li>
              <li>En Brevo: <strong>Senders &amp; IPs → Add a Sender</strong> → verificá tu Gmail con el link que te mandan. Ponelo abajo como remitente.</li>
            </ol>
            <p style={{ margin: '8px 0 0', color: 'var(--text-soft)' }}>✅ Con esto los correos llegan a <strong>cualquier comprador</strong> (Gmail, Outlook, incógnito, etc.) sin dominio propio.</p>
          </div>

          <form onSubmit={handleSaveEmailConfig} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                Brevo API Key
              </label>
              <div className="login-input" style={{ width: '100%' }}>
                <KeyRound size={16} />
                <input
                  type="password"
                  placeholder={emailConfig?.maskedKey || 'xkeysib-...'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  disabled={savingEmail}
                />
              </div>
              <small style={{ color: 'var(--text-soft)', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                Generá tu clave en <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>app.brevo.com → SMTP &amp; API → API Keys</a>.
              </small>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                Tu correo remitente (verificado en Brevo)
              </label>
              <div className="login-input" style={{ width: '100%' }}>
                <Mail size={16} />
                <input
                  type="text"
                  placeholder="tu.gmail@gmail.com"
                  value={fromEmailInput}
                  onChange={(e) => setFromEmailInput(e.target.value)}
                  disabled={savingEmail}
                />
              </div>
              <small style={{ color: 'var(--text-soft)', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                Puede ser tu Gmail personal. Solo necesitás verificarlo una vez en Brevo (Senders &amp; IPs).
              </small>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-start' }}>
              <button className="primary" type="submit" disabled={savingEmail} style={{ fontSize: '13px', padding: '8px 16px' }}>
                {savingEmail ? 'Guardando…' : 'Guardar Configuración de Correo'}
              </button>
            </div>
          </form>

          {/* Test Email Box */}
          <div
            style={{
              padding: '14px',
              background: 'var(--surface-primary)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Send size={15} /> Probar Envío de Correo en Vivo
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="email"
                placeholder="tu.correo@gmail.com"
                value={testEmailInput}
                onChange={(e) => setTestEmailInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-muted)',
                  color: 'inherit',
                  fontSize: '13px',
                }}
              />
              <button
                className="secondary"
                type="button"
                onClick={handleTestEmail}
                disabled={testingEmail || !testEmailInput}
                style={{ fontSize: '13px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {testingEmail ? 'Enviando prueba…' : 'Enviar Prueba'}
              </button>
            </div>
            {emailMessage && <p className="admin-success" style={{ marginTop: '10px', marginBottom: 0 }}>{emailMessage}</p>}
            {emailError && <p className="admin-error" style={{ marginTop: '10px', marginBottom: 0 }}>{emailError}</p>}
          </div>

          {/* Brevo advantage note */}
          <div style={{ marginTop: '14px', padding: '12px', background: 'rgba(16,185,129,0.07)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)', fontSize: '12px', lineHeight: '1.5' }}>
            <strong style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <CheckCircle2 size={15} /> ¿Por qué Brevo y no Resend?
            </strong>
            <span style={{ color: 'var(--text-soft)' }}>
              Resend requiere un dominio propio verificado para enviar a correos externos. Con Brevo, alcanza con verificar tu Gmail como remitente y los correos llegan a <strong>cualquier comprador</strong> — incógnito, Gmail, Outlook, lo que sea — sin necesitar un dominio propio. El plan gratuito incluye 300 emails/día sin tarjeta de crédito.
            </span>
          </div>

          {/* Email logs table */}
          {emailLogs.length > 0 && (
            <div style={{ marginTop: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Historial de envíos recientes</span>
                <button type="button" className="secondary icon-only" onClick={() => void loadEmailConfig()} style={{ padding: '4px' }} title="Actualizar historial">
                  <RefreshCw size={13} />
                </button>
              </div>
              <div className="table-scroll" style={{ maxHeight: '200px' }}>
                <table style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th>Destinatario</th>
                      <th>Asunto</th>
                      <th>Estado</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailLogs.map((log) => (
                      <tr key={log.id}>
                        <td><strong>{log.recipient}</strong></td>
                        <td>{log.subject}</td>
                        <td>
                          {log.status === 'delivered' ? (
                            <span style={{ color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={13} /> Entregado
                            </span>
                          ) : (
                            <span style={{ color: '#ef4444', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }} title={log.error_message}>
                              <AlertCircle size={13} /> Bloqueado
                            </span>
                          )}
                        </td>
                        <td><small>{date(log.created_at)}</small></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className="admin-history">
          <h2>Últimos movimientos</h2>
          {events.length ? (
            <div>
              {events.map((e) => (
                <div key={e.id}>
                  <span className={`history-icon ${e.action}`}>
                    <Users size={15} />
                  </span>
                  <p>
                    <strong>
                      {e.action === 'block' ? 'Cuenta bloqueada' : e.action === 'delete' ? 'Perfil eliminado' : 'Acceso reactivado'}
                    </strong>
                    <span>{e.targetEmail}</span>
                  </p>
                  <time>{date(e.createdAt)}</time>
                </div>
              ))}
            </div>
          ) : (
            <p>No hay cambios de acceso registrados todavía.</p>
          )}
        </section>
      </main>

      {pending && (
        <Dialog
          label={`${actionLabel[pending.action]} cuenta`}
          onClose={() => {
            if (!saving) setPending(null);
          }}
        >
          <div className="admin-confirm">
            <div className="admin-confirm-head">
              <span className={`admin-confirm-icon ${pending.action}`}>
                <TriangleAlert size={26} />
              </span>
              <button className="icon-button" disabled={saving} aria-label="Cerrar confirmación" onClick={() => setPending(null)}>
                <X />
              </button>
            </div>
            <h2>{pending.action === 'delete' ? 'Eliminar esta cuenta' : pending.action === 'block' ? 'Bloquear esta cuenta' : 'Reactivar el acceso'}</h2>
            <p className="target-account">{pending.account.email}</p>
            <p>
              {pending.action === 'delete'
                ? 'Se borrarán el nombre, empresa, teléfono, presentación y preferencias del perfil. El acceso quedará deshabilitado. Esta acción no elimina la cuenta de ChatGPT.'
                : pending.action === 'block'
                ? 'El usuario no podrá entrar al catálogo ni editar su perfil. Sus datos se conservan y podés reactivarlo cuando quieras.'
                : 'El usuario podrá volver a entrar. Si su perfil fue eliminado, tendrá que completarlo nuevamente.'}
            </p>
            {pending.action === 'delete' && (
              <label className="delete-confirm-label">
                Escribí el correo para confirmar
                <input
                  type="email"
                  autoComplete="off"
                  aria-label="Correo de confirmación"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
              </label>
            )}
            {actionError && (
              <p className="admin-error" role="alert">
                {actionError}
              </p>
            )}
            <div className="modal-actions">
              <button className="secondary" disabled={saving} onClick={() => setPending(null)}>
                Cancelar
              </button>
              <button
                className={`primary ${pending.action === 'delete' ? 'danger' : ''}`}
                disabled={saving || (pending.action === 'delete' && confirmation !== pending.account.email)}
                onClick={async () => {
                  setSaving(true);
                  setActionError('');
                  try {
                    const response = await fetch('/api/admin/accounts', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: pending.account.userId,
                        action: pending.action,
                        confirmation,
                      }),
                    });
                    const result = (await response.json()) as { error?: string };
                    if (!response.ok) throw Error(result.error || 'No pudimos cambiar la cuenta.');
                    setMessage(
                      `${pending.action === 'delete' ? 'Perfil eliminado' : pending.action === 'block' ? 'Cuenta bloqueada' : 'Acceso reactivado'}: ${pending.account.email}`
                    );
                    setPending(null);
                    await load();
                  } catch (e) {
                    setActionError(e instanceof Error ? e.message : 'No pudimos cambiar la cuenta.');
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? 'Aplicando…' : actionLabel[pending.action]}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
