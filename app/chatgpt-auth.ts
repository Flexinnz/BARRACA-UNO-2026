import { cookies } from "next/headers";
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

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  // Every application request trusts only the app-issued, signed JWT.
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

  return null;
}

// Supabase is an identity provider. Login and callback routes use this once,
// then exchange the verified identity for the application's own signed JWT.
export async function getProviderUser(): Promise<ChatGPTUser | null> {
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
