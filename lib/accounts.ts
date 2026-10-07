import { profileDb } from '../db/profiles';
import type { ChatGPTUser } from '../app/chatgpt-auth';

export interface RegisteredAccount {
  userId: string;
  email: string;
  status: 'active' | 'blocked' | 'deleted';
  displayName: string;
  company: string;
  createdAt: string;
  lastSeenAt: string;
  updatedAt: string;
  isAdmin?: boolean;
}

export async function ensureAccount(user: ChatGPTUser) {
  const db = profileDb();
  const now = new Date().toISOString();
  await db
    .prepare(
      "INSERT INTO accounts (user_id,email,status,created_at,last_seen_at,updated_at) VALUES (?,?,'active',?,?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,last_seen_at=excluded.last_seen_at"
    )
    .bind(user.userId, user.email, now, now, now)
    .run();
  const row = await db
    .prepare(
      'SELECT user_id AS userId,email,status,created_at AS createdAt,last_seen_at AS lastSeenAt,updated_at AS updatedAt FROM accounts WHERE user_id=?'
    )
    .bind(user.userId)
    .first<RegisteredAccount>();
  if (!row) throw Error('Account registration unavailable');
  return row;
}

export function accountEnabled(account: RegisteredAccount, _user?: ChatGPTUser | null) {
  return account.status === 'active';
}
