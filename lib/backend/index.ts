import { supabase } from '../supabase';
import { localBackend } from './local';
import { createSupabaseBackend } from './supabase';

export type { Backend } from './types';

export const backend = supabase ? createSupabaseBackend(supabase) : localBackend;
