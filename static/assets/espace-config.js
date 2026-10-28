// Connexion à Supabase pour l'espace client.
// Supabase > Project Settings > API : copier « Project URL » et la clé « anon public ».
// La clé « anon » est faite pour être publique : les règles d'accès (supabase/schema.sql) protègent les données.
window.ACHA_SUPABASE = {
  url: "https://gmilrnnqwknggrufzvic.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtaWxybm5xd2tuZ2dydWZ6dmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxOTU3MjMsImV4cCI6MjEwODc3MTcyM30.ZJS1CHaZi6SkBYnutcjPnW2BaGZnKc1hztHw1OK6iz0"
};
