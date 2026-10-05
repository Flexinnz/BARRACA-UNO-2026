import {env} from 'cloudflare:workers';
import {profileDb} from '../db/profiles';
import {signSessionJwt,verifySessionJwt} from './jwt';

export const SESSION_COOKIE_NAME = 'barraca_session';

function sessionSecrets(): string[] {
  const current = env.BARRACA_JWT_SECRET?.trim();
  if (!current) throw new Error('La firma de acceso no está configurada.');
  return [current, env.BARRACA_JWT_PREVIOUS_SECRET?.trim()].filter((value): value is string => !!value);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function hashPassword(password: string, saltHex?: string): Promise<{ hash: string; salt: string }> {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  return {
    hash: bytesToHex(new Uint8Array(derived)),
    salt: bytesToHex(salt),
  };
}

export async function verifyPassword(password: string, expectedHash: string, saltHex: string): Promise<boolean> {
  const { hash } = await hashPassword(password, saltHex);
  if (hash.length !== expectedHash.length) return false;
  let difference = 0;
  for (let index = 0; index < hash.length; index++) {
    difference |= hash.charCodeAt(index) ^ expectedHash.charCodeAt(index);
  }
  return difference === 0;
}

export async function createLocalUser(
  name: string, 
  email: string, 
  password: string,
  company?: string,
  phone?: string,
  rut?: string
): Promise<{ userId: string; email: string; displayName: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const cleanCompany = (company || '').trim();
  const cleanPhone = (phone || '').trim();
  const cleanRut = (rut || '').trim();
  const bio = cleanRut ? `RUT: ${cleanRut}` : '';
  const db = profileDb();

  const existing = await db.prepare('SELECT user_id FROM accounts WHERE lower(email) = ?').bind(cleanEmail).first();
  if (existing) {
    throw new Error('Ya existe una cuenta con este correo. Probá iniciar sesión.');
  }

  const userId = `usr_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const { hash, salt } = await hashPassword(password);

  await db.batch([
    db.prepare('INSERT INTO accounts (user_id, email, status, created_at, last_seen_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(userId, cleanEmail, 'active', now, now, now),
    db.prepare('INSERT INTO user_credentials (user_id, password_hash, salt, created_at) VALUES (?, ?, ?, ?)')
      .bind(userId, hash, salt, now),
    db.prepare('INSERT INTO profiles (user_id, email, display_name, company, phone, bio, avatar, accent, theme, density, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(userId, cleanEmail, cleanName, cleanCompany, cleanPhone, bio, 'initials', 'ocean', 'dark', 'comfortable', now),
  ]);

  return { userId, email: cleanEmail, displayName: cleanName };
}

export async function authenticateLocalUser(email: string, password: string): Promise<{ userId: string; email: string; displayName: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const db = profileDb();

  const account = await db.prepare(`
    SELECT a.user_id AS userId, a.email, a.status, uc.password_hash AS passwordHash, uc.salt, COALESCE(p.display_name, a.email) AS displayName
    FROM accounts a
    JOIN user_credentials uc ON uc.user_id = a.user_id
    LEFT JOIN profiles p ON p.user_id = a.user_id
    WHERE lower(a.email) = ?
  `).bind(cleanEmail).first<{
    userId: string;
    email: string;
    status: string;
    passwordHash: string;
    salt: string;
    displayName: string;
  }>();

  if (!account) {
    throw new Error('Correo o contraseña incorrectos.');
  }

  if (account.status === 'blocked') {
    throw new Error('Esta cuenta ha sido bloqueada por la empresa.');
  }
  if (account.status === 'deleted') {
    throw new Error('Esta cuenta ha sido eliminada.');
  }

  const valid = await verifyPassword(password, account.passwordHash, account.salt);
  if (!valid) {
    throw new Error('Correo o contraseña incorrectos.');
  }

  const now = new Date().toISOString();
  await db.prepare('UPDATE accounts SET last_seen_at = ? WHERE user_id = ?').bind(now, account.userId).run();

  return {
    userId: account.userId,
    email: account.email,
    displayName: account.displayName || account.email.split('@')[0],
  };
}

export async function createSession(userId: string): Promise<string> {
  const db = profileDb();
  const account = await db.prepare('SELECT auth_version AS authVersion,status FROM accounts WHERE user_id = ?')
    .bind(userId)
    .first<{authVersion:number;status:string}>();
  if (!account || account.status !== 'active') throw new Error('La cuenta no está habilitada.');
  return signSessionJwt({userId,authVersion:account.authVersion},sessionSecrets()[0]);
}

export async function getSessionUser(token: string): Promise<{ userId: string; email: string; displayName: string; fullName: string } | null> {
  if (!token || typeof token !== 'string') return null;
  const claims = await verifySessionJwt(token,sessionSecrets());
  if (!claims) return null;
  const db = profileDb();
  const session = await db.prepare(`
    SELECT a.user_id AS userId, a.email, a.status, a.auth_version AS authVersion,
           COALESCE(p.display_name, a.email) AS displayName
    FROM accounts a
    LEFT JOIN profiles p ON p.user_id = a.user_id
    WHERE a.user_id = ?
  `).bind(claims.sub).first<{
    userId: string;
    email: string;
    status: string;
    authVersion: number;
    displayName: string;
  }>();

  if (!session || session.status !== 'active' || session.authVersion !== claims.ver) return null;

  return {
    userId: session.userId,
    email: session.email,
    displayName: session.displayName || session.email.split('@')[0],
    fullName: session.displayName || session.email.split('@')[0],
  };
}

export async function revokeUserSessions(userId: string): Promise<void> {
  const db = profileDb();
  await db.prepare('UPDATE accounts SET auth_version = auth_version + 1, updated_at = ? WHERE user_id = ?')
    .bind(new Date().toISOString(),userId)
    .run();
}

export async function hasLocalCredentials(userId: string): Promise<boolean> {
  const row = await profileDb().prepare('SELECT 1 AS present FROM user_credentials WHERE user_id = ?')
    .bind(userId)
    .first<{present:number}>();
  return row?.present === 1;
}

export async function changeUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const db = profileDb();
  const creds = await db.prepare('SELECT password_hash AS passwordHash, salt FROM user_credentials WHERE user_id = ?').bind(userId).first<{ passwordHash: string; salt: string }>();
  if (!creds) {
    throw new Error('Credenciales no encontradas para esta cuenta.');
  }
  const valid = await verifyPassword(currentPassword, creds.passwordHash, creds.salt);
  if (!valid) {
    throw new Error('La contraseña actual es incorrecta.');
  }
  if (!newPassword || newPassword.length < 10) {
    throw new Error('La nueva contraseña debe tener al menos 10 caracteres.');
  }
  const { hash, salt } = await hashPassword(newPassword);
  await db.batch([
    db.prepare('UPDATE user_credentials SET password_hash = ?, salt = ? WHERE user_id = ?').bind(hash, salt, userId),
    db.prepare('UPDATE accounts SET auth_version = auth_version + 1, updated_at = ? WHERE user_id = ?')
      .bind(new Date().toISOString(),userId),
  ]);
}
