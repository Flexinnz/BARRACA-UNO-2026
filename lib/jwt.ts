const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

const JWT_ISSUER = 'barraca-uno';
const JWT_AUDIENCE = 'barraca-uno-web';
const CLOCK_SKEW_SECONDS = 30;

export interface SessionClaims {
  iss: typeof JWT_ISSUER;
  aud: typeof JWT_AUDIENCE;
  sub: string;
  iat: number;
  nbf: number;
  exp: number;
  jti: string;
  ver: number;
}

function encodeBase64Url(value: string | Uint8Array): string {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid JWT encoding');
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function parseJsonPart<T>(value: string): T {
  return JSON.parse(decoder.decode(decodeBase64Url(value))) as T;
}

function assertSecret(secret: string): void {
  if (encoder.encode(secret).byteLength < 32) {
    throw new Error('BARRACA_JWT_SECRET must contain at least 32 bytes');
  }
}

async function importSecret(secret: string): Promise<CryptoKey> {
  assertSecret(secret);
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function randomTokenId(): string {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(18)));
}

export async function signSessionJwt(
  input: { userId: string; authVersion: number },
  secret: string,
  now = Math.floor(Date.now() / 1000),
): Promise<string> {
  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const claims: SessionClaims = {
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
    sub: input.userId,
    iat: now,
    nbf: now - CLOCK_SKEW_SECONDS,
    exp: now + SESSION_TTL_SECONDS,
    jti: randomTokenId(),
    ver: input.authVersion,
  };
  const payload = encodeBase64Url(JSON.stringify(claims));
  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign('HMAC', await importSecret(secret), encoder.encode(signingInput));
  return `${signingInput}.${encodeBase64Url(new Uint8Array(signature))}`;
}

function validClaims(value: unknown, now: number): value is SessionClaims {
  if (!value || typeof value !== 'object') return false;
  const claims = value as Partial<SessionClaims>;
  return claims.iss === JWT_ISSUER
    && claims.aud === JWT_AUDIENCE
    && typeof claims.sub === 'string'
    && claims.sub.length > 0
    && claims.sub.length <= 200
    && Number.isInteger(claims.iat)
    && Number.isInteger(claims.nbf)
    && Number.isInteger(claims.exp)
    && typeof claims.jti === 'string'
    && /^[A-Za-z0-9_-]{20,64}$/.test(claims.jti)
    && Number.isInteger(claims.ver)
    && (claims.ver ?? -1) >= 0
    && (claims.nbf ?? Infinity) <= now + CLOCK_SKEW_SECONDS
    && (claims.iat ?? Infinity) <= now + CLOCK_SKEW_SECONDS
    && (claims.exp ?? 0) > now - CLOCK_SKEW_SECONDS
    && (claims.exp ?? Infinity) - (claims.iat ?? 0) <= SESSION_TTL_SECONDS + CLOCK_SKEW_SECONDS;
}

export async function verifySessionJwt(
  token: string,
  secrets: string[],
  now = Math.floor(Date.now() / 1000),
): Promise<SessionClaims | null> {
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some(part => !part)) return null;

  try {
    const header = parseJsonPart<{ alg?: unknown; typ?: unknown }>(parts[0]);
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;
    const claims = parseJsonPart<unknown>(parts[1]);
    if (!validClaims(claims, now)) return null;

    const signature = decodeBase64Url(parts[2]);
    const signingInput = encoder.encode(`${parts[0]}.${parts[1]}`);
    for (const secret of secrets.filter(Boolean)) {
      if (await crypto.subtle.verify('HMAC', await importSecret(secret), signature as unknown as BufferSource, signingInput)) {
        return claims;
      }
    }
  } catch {
    return null;
  }
  return null;
}
