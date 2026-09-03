export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} must be configured before using Supabase.`);
  }

  return value;
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  return {
    url: requiredEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      requiredEnvironmentVariable("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

export function getSupabaseServiceRoleKey(): string {
  return requiredEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY");
}
