declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
    BARRACA_ADMIN_EMAILS?: string;
    BUCKET?: R2Bucket;
  }
}
