import { supabase } from './supabase';

export type DashboardConfig = {
  id: string;
  config_name: string;
  app_name: string;
  config_version: string;
  location: string;
  api_key: string | null;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
};

export type DashboardConfigPayload = {
  config_name: string;
  app_name: string;
  config_version: string;
  location: string;
  api_key?: string | null;
  enabled: boolean;
};

export type ScreenOption = {
  id: string;
  screen_id: string;
  title: string;
  location_name: string;
  enabled: boolean;
};

export async function getConfigs(): Promise<DashboardConfig[]> {
  const { data, error } = await supabase
    .from('dashboard_configs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function getConfig(configId: string): Promise<DashboardConfig> {
  const { data, error } = await supabase
    .from('dashboard_configs')
    .select('*')
    .eq('id', configId)
    .single();

  if (error) throw error;

  return data;
}

export async function createConfig(
  payload: DashboardConfigPayload
): Promise<DashboardConfig> {
  const { data, error } = await supabase
    .from('dashboard_configs')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;

  return data;
}

export async function updateConfig(
  configId: string,
  payload: DashboardConfigPayload
): Promise<DashboardConfig> {
  const { data, error } = await supabase
    .from('dashboard_configs')
    .update(payload)
    .eq('id', configId)
    .select('*')
    .single();

  if (error) throw error;

  return data;
}

export async function deleteConfig(configId: string): Promise<void> {
  const { error } = await supabase
    .from('dashboard_configs')
    .delete()
    .eq('id', configId);

  if (error) throw error;
}

export async function getScreenOptions(): Promise<ScreenOption[]> {
  const { data, error } = await supabase
    .from('route_allocations')
    .select('id, screen_id, title, location_name, enabled')
    .order('screen_id', { ascending: true });

  if (error) throw error;

  return data || [];
}
export async function getSelectedScreenIds(configId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('dashboard_config_screens')
    .select('route_allocation_id')
    .eq('dashboard_config_id', configId)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  return (data || []).map((item) => item.route_allocation_id);
}

export async function replaceConfigScreens(
  configId: string,
  screenIds: string[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('dashboard_config_screens')
    .delete()
    .eq('dashboard_config_id', configId);

  if (deleteError) throw deleteError;

  if (screenIds.length === 0) return;

  const rows = screenIds.map((routeAllocationId, index) => ({
    dashboard_config_id: configId,
    route_allocation_id: routeAllocationId,
    sort_order: index,
    enabled: true,
  }));

  const { error: insertError } = await supabase
    .from('dashboard_config_screens')
    .insert(rows);

  if (insertError) throw insertError;
}

export async function createConfigWithScreens(
  payload: DashboardConfigPayload,
  screenIds: string[]
): Promise<DashboardConfig> {
  const config = await createConfig(payload);

  try {
    await replaceConfigScreens(config.id, screenIds);
    return config;
  } catch (error) {
    await deleteConfig(config.id).catch(() => undefined);
    throw error;
  }
}

export async function updateConfigWithScreens(
  configId: string,
  payload: DashboardConfigPayload,
  screenIds: string[]
): Promise<DashboardConfig> {
  const config = await updateConfig(configId, payload);
  await replaceConfigScreens(configId, screenIds);
  return config;
}