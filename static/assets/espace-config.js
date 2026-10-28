// Connexion à Supabase pour l'espace client.
// Supabase > Project Settings > API : copier « Project URL » et la clé « anon public ».
// La clé « anon » est faite pour être publique : les règles d'accès (supabase/schema.sql) protègent les données.
window.ACHA_SUPABASE = {
  url: "",
  anonKey: ""
};
