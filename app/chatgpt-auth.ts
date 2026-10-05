import { headers, cookies } from "next/headers";
import { authClient, authConfig, safeReturn } from '../lib/supabase';
import { profileDb } from '../db/profiles';
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, getSessionUser } from '../lib/auth-local';

export type ChatGPTUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

const USER_ID_HEADER = "oai-authenticated-user-id";
const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER =
  "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  // 1. Check native database session cookie
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      const user = await getSessionUser(token);
      if (user) {
        return {
          userId: user.userId,
          displayName: user.displayName,
          email: user.email,
          fullName: user.fullName,
        };
      }
    }
  } catch (e) {
    console.error('Session lookup failed', e);
  }

  // 2. Check Supabase Auth if configured
  if (authConfig()) {
    try {
      const client = await authClient();
      const { data: { user }, error } = await client.auth.getUser();
      if (!error && user?.email && user.email_confirmed_at) {
        const email = user.email.trim().toLowerCase();
        const db = profileDb();
        let identity = await db.prepare('SELECT account_user_id AS userId FROM account_identities WHERE provider_user_id=?').bind(user.id).first<{userId:string}>();
        if (!identity) {
          const existing = await db.prepare('SELECT user_id AS userId FROM accounts WHERE lower(email)=? UNION SELECT user_id AS userId FROM profiles WHERE lower(email)=? AND NOT EXISTS(SELECT 1 FROM accounts WHERE accounts.user_id=profiles.user_id) LIMIT 2').bind(email,email).all<{userId:string}>();
          if (existing.results.length <= 1) {
            const linkedId = existing.results[0]?.userId ?? `supabase:${user.id}`;
            await db.prepare('INSERT INTO account_identities (provider_user_id,account_user_id) VALUES (?,?) ON CONFLICT(provider_user_id) DO NOTHING').bind(user.id,linkedId).run();
            identity = await db.prepare('SELECT account_user_id AS userId FROM account_identities WHERE provider_user_id=?').bind(user.id).first<{userId:string}>();
          }
        }
        if (identity) {
          const userId = identity.userId;
          const fullName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null;
          return { userId, email, fullName, displayName: fullName ?? email };
        }
      }
    } catch {}
  }

  // 3. Sites proxy headers (only if real, ignore seedy mock)
  try {
    const requestHeaders = await headers();
    const userId = requestHeaders.get(USER_ID_HEADER);
    const email = requestHeaders.get(USER_EMAIL_HEADER);
    if (userId && email && email !== 'seedy@sites.test') {
      const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
      const fullName =
        encodedFullName &&
        requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
          ? safeDecodeURIComponent(encodedFullName)
          : null;

      return {
        userId,
        displayName: fullName ?? email,
        email,
        fullName,
      };
    }
  } catch {}

  return null;
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  return `/ingresar?return_to=${encodeURIComponent(safeReturn(returnTo))}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  return `/auth/logout?return_to=${encodeURIComponent(safeReturn(returnTo))}`;
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
