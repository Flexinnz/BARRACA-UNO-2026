import {profileDb} from '../db/profiles';

export const SESSION_COOKIE_NAME = 'barraca_session';

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
  return hash === expectedHash;
}

export async function createLocalUser(name: string, email: string, password: string):Promise<{ userId: string; email: string; displayName: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
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
      .bind(userId, cleanEmail, cleanName, '', '', '', 'initials', 'ocean', 'dark', 'comfortable', now),
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
  const token = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const db = profileDb();

  await db.prepare('INSERT INTO user_sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .bind(token, userId, expires, now.toISOString()).run();

  return token;
}

export async function getSessionUser(token: string): Promise<{ userId: string; email: string; displayName: string; fullName: string } | null> {
  if (!token || typeof token !== 'string') return null;
  const db = profileDb();
  const now = new Date().toISOString();

  const session = await db.prepare(`
    SELECT s.user_id AS userId, a.email, a.status, COALESCE(p.display_name, a.email) AS displayName
    FROM user_sessions s
    JOIN accounts a ON a.user_id = s.user_id
    LEFT JOIN profiles p ON p.user_id = s.user_id
    WHERE s.token = ? AND s.expires_at > ?
  `).bind(token, now).first<{
    userId: string;
    email: string;
    status: string;
    displayName: string;
  }>();

  if (!session || session.status !== 'active') return null;

  return {
    userId: session.userId,
    email: session.email,
    displayName: session.displayName || session.email.split('@')[0],
    fullName: session.displayName || session.email.split('@')[0],
  };
}

export async function deleteSession(token: string): Promise<void> {
  if (!token) return;
  const db = profileDb();
  await db.prepare('DELETE FROM user_sessions WHERE token = ?').bind(token).run();
}
