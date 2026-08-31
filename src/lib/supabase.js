import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://cgoyrvzborlduyvkcccg.supabase.co";
const supabaseAnonKey = "sb_publishable_wlxJhb1lJB1cm90xWr9SHw_MrIQ-UJm";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);