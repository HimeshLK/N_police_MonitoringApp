import { supabase } from './supabase';

export interface DashboardConfig {
  id: string;
  config_name: string;
  app_name: string;
  config_version: string;
  location: string;
  api_key: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardConfigInput {
  config_name: string;
  app_name: string;
  config_version: string;
  location: string;
  api_key: string | null;
  enabled: boolean;
}

export async function getConfigs(): Promise<DashboardConfig[]> {
  const { data, error } = await supabase
    .from('dashboard_configs')
    .select('*')
    .order('config_name');

  if (error) throw new Error(error.message);
  return (data ?? []) as DashboardConfig[];
}

export async function getConfig(id: string): Promise<DashboardConfig> {
  const { data, error } = await supabase
    .from('dashboard_configs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data as DashboardConfig;
}

export async function createConfig(input: DashboardConfigInput): Promise<DashboardConfig> {
  const { data, error } = await supabase
    .from('dashboard_configs')
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as DashboardConfig;
}

export async function updateConfig(id: string, input: DashboardConfigInput): Promise<DashboardConfig> {
  const { data, error } = await supabase
    .from('dashboard_configs')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as DashboardConfig;
}

export async function deleteConfig(id: string): Promise<void> {
  const { error } = await supabase.from('dashboard_configs').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
