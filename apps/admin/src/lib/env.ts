function required(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta la variable pública requerida: ${name}`);
  return value;
}

export function getSupabaseEnv() {
  return {
    url: required('NEXT_PUBLIC_SUPABASE_URL'),
    publishableKey: required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
  };
}
