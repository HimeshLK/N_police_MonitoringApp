import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createConfig, getConfig, updateConfig } from '../../api/configsApi';
import RoleGuard from '../../components/RoleGuard';

export default function ConfigForm() {
  return <RoleGuard allowedRoles={['admin']}><ConfigFormInner /></RoleGuard>;
}

interface FormErrors { config_name?: string; app_name?: string; config_version?: string; location?: string; }

function ConfigFormInner() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [configName, setConfigName] = useState('');
  const [appName, setAppName] = useState('');
  const [configVersion, setConfigVersion] = useState('');
  const [location, setLocation] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setFetchLoading(true);
    getConfig(id).then((cfg) => { setConfigName(cfg.config_name); setAppName(cfg.app_name); setConfigVersion(cfg.config_version); setLocation(cfg.location); setApiKey(cfg.api_key ?? ''); setEnabled(cfg.enabled); })
      .catch((e: Error) => setApiError(e.message)).finally(() => setFetchLoading(false));
  }, [id]);

  function validate(): boolean {
    const e: FormErrors = {};
    if (!configName.trim()) e.config_name = 'Config name is required.';
    if (!appName.trim()) e.app_name = 'App name is required.';
    if (!configVersion.trim()) e.config_version = 'Version is required.';
    if (!location.trim()) e.location = 'Location is required.';
    setErrors(e); return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); if (!validate()) return;
    setLoading(true); setApiError(null);
    try {
      const input = { config_name: configName.trim(), app_name: appName.trim(), config_version: configVersion.trim(), location: location.trim(), api_key: apiKey.trim() || null, enabled };
      if (isEdit && id) await updateConfig(id, input); else await createConfig(input);
      navigate('/configs');
    } catch (err) {
      const msg = (err as Error).message;
      setApiError(msg.includes('unique') || msg.includes('duplicate') ? 'A config with this name already exists.' : msg);
    }
    finally { setLoading(false); }
  }

  if (fetchLoading) return <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>;

  return (
    <div style={{ maxWidth: '640px' }}>
      <div className="page-header">
        <h1 className="page-title">{isEdit ? 'Edit Config' : 'New Config'}</h1>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label">Config Name *</label>
              <input value={configName} onChange={(e) => setConfigName(e.target.value)} disabled={isEdit}
                className={`form-input${errors.config_name ? ' error' : ''}`} placeholder="cmb_pilot_config" />
              {isEdit && <span className="form-hint">Cannot be changed after creation.</span>}
              {errors.config_name && <span className="form-error-msg">{errors.config_name}</span>}
            </div>
            <div className="form-field">
              <label className="form-label">App Name *</label>
              <input value={appName} onChange={(e) => setAppName(e.target.value)} className={`form-input${errors.app_name ? ' error' : ''}`} placeholder="sl_dashboard" />
              {errors.app_name && <span className="form-error-msg">{errors.app_name}</span>}
            </div>
            <div className="form-field">
              <label className="form-label">Config Version *</label>
              <input value={configVersion} onChange={(e) => setConfigVersion(e.target.value)} className={`form-input${errors.config_version ? ' error' : ''}`} placeholder="0.01v" />
              {errors.config_version && <span className="form-error-msg">{errors.config_version}</span>}
            </div>
            <div className="form-field">
              <label className="form-label">Location *</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} className={`form-input${errors.location ? ' error' : ''}`} placeholder="colombo" />
              {errors.location && <span className="form-error-msg">{errors.location}</span>}
            </div>
            <div className="form-field form-grid-full">
              <label className="form-label">API Key <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span></label>
              <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="form-input" placeholder="Leave blank if not required" />
            </div>
            <div className="form-field form-grid-full">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }} />
                Enabled
              </label>
            </div>
          </div>

          {apiError && <p style={{ fontSize: '13px', color: 'var(--danger)' }}>{apiError}</p>}
          <div className="form-actions">
            <button type="button" onClick={() => navigate('/configs')} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Saving...' : isEdit ? 'Update Config' : 'Create Config'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
