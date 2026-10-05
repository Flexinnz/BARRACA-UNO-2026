declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
    BARRACA_ADMIN_EMAILS?: string;
    BARRACA_JWT_SECRET?: string;
    BARRACA_JWT_PREVIOUS_SECRET?: string;
    BUCKET?: R2Bucket;
  }
}
