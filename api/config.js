export default function configHandler(_request, response) {
  const config = {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey:
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      ""
  };

  response.setHeader("Content-Type", "text/javascript; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(`window.FAVORITE_SUPABASE = ${JSON.stringify(config, null, 2)};\n`);
};
