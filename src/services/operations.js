import { supabase } from "../lib/supabase";

export async function fetchSites() {
  try {
    const { data, error } = await supabase.from('sites').select('*').order('code');
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn("Erreur chargement sites:", err.message);
    return [];
  }
}

export async function fetchOperations() {
  try {
    const { data, error } = await supabase
      .from('operations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Erreur chargement opérations:", err.message);
    return [];
  }
}

export async function createOperation(payload) {
  const { data, error } = await supabase.from('operations').insert([payload]);
  if (error) throw error;
  return data;
}

export async function deleteOperation(id) {
  const { error } = await supabase.from('operations').delete().eq('id', id);
  if (error) throw error;
}