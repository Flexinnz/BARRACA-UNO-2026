"use client";

import { useState } from 'react';
import { BrandLogo, CityScape } from '../brand-art';
import { ThemeButton, useTheme } from '../profile-panel';
import { Eye, EyeOff, ArrowRight, LockKeyhole, Mail, Building2, User, Phone, FileText, CheckCircle2 } from 'lucide-react';

export function LoginPanel({
  configured,
  providers,
  returnTo,
  initialMode,
  initialError,
}: {
  configured: boolean;
  providers: string[];
  returnTo: string;
  initialMode: string;
  initialError: string;
}) {
  const { theme, setTheme } = useTheme();
  const [mode, setMode] = useState(initialMode);
  const [clientType, setClientType] = useState<'persona' | 'empresa'>('persona');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [rut, setRut] = useState('');
  const [phone, setPhone] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(initialError);

  const changeMode = (next: string) => {
    setMode(next);
    setMessage('');
    setError('');
    setPassword('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    if (mode === 'register' && clientType === 'empresa') {
      if (!rut.trim() || rut.trim().length !== 12 || !/^\d+$/.test(rut.trim())) {
        setError('El RUT para DGI en Uruguay debe contener exactamente 12 dígitos numéricos.');
        setBusy(false);
        return;
      }
      if (!company.trim()) {
        setError('Ingresá la Razón Social o Nombre de la Empresa.');
        setBusy(false);
        return;
      }
    }

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: mode,
          email,
          password,
          name,
          returnTo,
          clientType,
          company: clientType === 'empresa' ? company : undefined,
          rut: clientType === 'empresa' ? rut : undefined,
          phone: clientType === 'empresa' ? phone : undefined,
        }),
      });

      const data = (await response.json()) as { error?: string; message?: string; redirect?: string };
      if (!response.ok) throw new Error(data.error || 'No pudimos completar el acceso.');
      if (data.redirect) {
        window.location.assign(data.redirect);
        return;
      }
      setMessage(data.message || 'Listo.');
      setPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos conectar. Reintentá.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <header className="account-page-header">
        <a className="account-logo" href="/">
          <BrandLogo />
        </a>
        <ThemeButton theme={theme} setTheme={setTheme} />
      </header>

      <main className="login-layout">
        <aside className="login-story">
          <div className="eyebrow">UNO PARA TODOS · PLATAFORMA B2B & B2C</div>
          <h1>
            Tu obra empieza
            <br />
            en la barraca.
          </h1>
          <p>
            Materiales, existencias y compras.
            <br />
            Facturación con RUT oficial DGI y cuenta corriente.
          </p>
          <CityScape className="login-city" />
          <small>BARRACA UNO · SISTEMA EMPRESARIAL v2.3</small>
        </aside>

        <section className="login-card">
          <span className="login-lock">
            <LockKeyhole size={24} />
          </span>
          <h2>
            {mode === 'register'
              ? 'Creá tu cuenta'
              : mode === 'recover'
              ? 'Recuperá tu acceso'
              : mode === 'reset'
              ? 'Nueva contraseña'
              : 'Bienvenido a Barraca Uno'}
          </h2>
          <p>
            {mode === 'register'
              ? 'Elegí tu tipo de cuenta (Particular o Empresa) para registrarte.'
              : mode === 'recover'
              ? 'Te enviaremos un enlace para cambiar tu contraseña.'
              : mode === 'reset'
              ? 'Elegí una contraseña nueva para tu cuenta.'
              : 'Entrá con tu correo y tu contraseña.'}
          </p>

          {!configured ? (
            <p role="alert" className="admin-error">
              El acceso está pendiente de configuración.
            </p>
          ) : (
            <>
              <form onSubmit={handleSubmit}>
                {mode === 'register' && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-soft)' }}>
                      Tipo de cuenta
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setClientType('persona')}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '8px',
                          border: `2px solid ${clientType === 'persona' ? 'var(--accent)' : 'var(--border)'}`,
                          background: clientType === 'persona' ? 'rgba(59, 130, 246, 0.12)' : 'var(--surface-muted)',
                          color: clientType === 'persona' ? 'var(--accent)' : 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontWeight: clientType === 'persona' ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <User size={16} /> Persona / Particular
                      </button>
                      <button
                        type="button"
                        onClick={() => setClientType('empresa')}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '8px',
                          border: `2px solid ${clientType === 'empresa' ? 'var(--accent)' : 'var(--border)'}`,
                          background: clientType === 'empresa' ? 'rgba(59, 130, 246, 0.12)' : 'var(--surface-muted)',
                          color: clientType === 'empresa' ? 'var(--accent)' : 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontWeight: clientType === 'empresa' ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Building2 size={16} /> Empresa / Obra (RUT)
                      </button>
                    </div>
                  </div>
                )}

                {mode === 'register' && (
                  <label>
                    {clientType === 'empresa' ? 'Nombre del titular o apoderado' : 'Tu nombre completo'}
                    <input
                      required
                      autoComplete="name"
                      maxLength={80}
                      placeholder={clientType === 'empresa' ? 'Ej. Ing. Martín Rodríguez' : 'Ej. Carlos González'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={busy}
                    />
                  </label>
                )}

                {mode === 'register' && clientType === 'empresa' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <label>
                        RUT de la Empresa (12 dígitos)
                        <div className="login-input">
                          <FileText size={18} />
                          <input
                            type="text"
                            required
                            maxLength={12}
                            placeholder="210000000012"
                            value={rut}
                            onChange={(e) => setRut(e.target.value.replace(/\D/g, ''))}
                            disabled={busy}
                          />
                        </div>
                      </label>
                      <label>
                        Razón Social / Obra
                        <div className="login-input">
                          <Building2 size={18} />
                          <input
                            type="text"
                            required
                            maxLength={100}
                            placeholder="Constructora del Este S.A."
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            disabled={busy}
                          />
                        </div>
                      </label>
                    </div>
                    <label>
                      Teléfono de contacto / Compras
                      <div className="login-input">
                        <Phone size={18} />
                        <input
                          type="tel"
                          maxLength={30}
                          placeholder="099 123 456 / 2900 1234"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          disabled={busy}
                        />
                      </div>
                    </label>
                  </>
                )}

                {mode !== 'reset' && (
                  <label>
                    {clientType === 'empresa' && mode === 'register' ? 'Correo corporativo / Facturación' : 'Correo electrónico'}
                    <div className="login-input">
                      <Mail size={18} />
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        maxLength={254}
                        placeholder={clientType === 'empresa' && mode === 'register' ? 'compras@empresa.com.uy' : 'tu.nombre@gmail.com'}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={busy}
                      />
                    </div>
                  </label>
                )}

                {mode !== 'recover' && (
                  <label>
                    Contraseña
                    <div className="login-input">
                      <input
                        type={visible ? 'text' : 'password'}
                        required
                        minLength={mode === 'login' ? 1 : 10}
                        maxLength={128}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={busy}
                      />
                      <button
                        type="button"
                        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        onClick={() => setVisible(!visible)}
                      >
                        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {mode !== 'login' && <small>Al menos 10 caracteres. Usá una contraseña segura.</small>}
                  </label>
                )}

                {error && (
                  <p className="admin-error" role="alert">
                    {error}
                  </p>
                )}
                {message && (
                  <p className="admin-success" role="status">
                    {message}
                  </p>
                )}

                <button className="primary login-submit" disabled={busy}>
                  {busy
                    ? 'Un momento…'
                    : mode === 'register'
                    ? 'Crear cuenta empresarial / personal'
                    : mode === 'recover'
                    ? 'Enviar enlace'
                    : mode === 'reset'
                    ? 'Guardar contraseña'
                    : 'Iniciar sesión'}
                  <ArrowRight size={17} />
                </button>
              </form>

              {mode === 'login' && (
                <button className="login-text-button" disabled={busy} onClick={() => changeMode('recover')}>
                  ¿Olvidaste tu contraseña?
                </button>
              )}

              {mode === 'login' && providers.length > 0 && (
                <>
                  <div className="login-divider">o continuá con</div>
                  <div className="login-social">
                    {providers.map((provider) => (
                      <a
                        key={provider}
                        className="secondary"
                        href={`/auth/provider?provider=${provider}&return_to=${encodeURIComponent(returnTo)}`}
                      >
                        {provider === 'google' ? 'Google' : 'X / Twitter'}
                      </a>
                    ))}
                  </div>
                </>
              )}

              <div className="login-switch">
                {mode === 'login' ? (
                  <>
                    ¿Todavía no tenés cuenta? <button disabled={busy} onClick={() => changeMode('register')}>Registrate</button>
                  </>
                ) : (
                  <button disabled={busy} onClick={() => changeMode('login')}>
                    Volver a iniciar sesión
                  </button>
                )}
              </div>
            </>
          )}

          <footer>
            Tu perfil se guarda al entrar. Emisión directa de e-Factura y e-Ticket DGI Uruguay.
            <a className="guide-link" href="/locales">
              Nuestros locales
            </a>
            <small>Barraca Uno Enterprise v2.3</small>
          </footer>
        </section>
      </main>
    </div>
  );
}
