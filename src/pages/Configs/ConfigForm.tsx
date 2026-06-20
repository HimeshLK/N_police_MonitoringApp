import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createConfigWithScreens,
  getConfig,
  getScreenOptions,
  getSelectedScreens,
  updateConfigWithScreens,
  type ConfigScreenSelection,
  type ScreenOption,
} from '../../api/configsApi';
import RoleGuard from '../../components/RoleGuard';

const DEFAULT_INTERVAL_MS = 18000;
const MIN_INTERVAL_MS = 1000;

export default function ConfigForm() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <ConfigFormInner />
    </RoleGuard>
  );
}

interface FormErrors {
  config_name?: string;
  app_name?: string;
  config_version?: string;
  location?: string;
  screens?: string;
}

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

  const [screenOptions, setScreenOptions] = useState<ScreenOption[]>([]);

  // key = route_allocation_id, value = interval_ms
  const [selectedScreens, setSelectedScreens] = useState<Record<string, number>>(
    {}
  );

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [screensLoading, setScreensLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    async function loadScreens() {
      setScreensLoading(true);
      setApiError(null);

      try {
        const screens = await getScreenOptions();
        setScreenOptions(screens);
      } catch (e) {
        setApiError((e as Error).message);
      } finally {
        setScreensLoading(false);
      }
    }

    loadScreens();
  }, []);

  useEffect(() => {
    if (!id) {
      setFetchLoading(false);
      return;
    }

    async function loadConfig() {
      setFetchLoading(true);
      setApiError(null);

      try {
        const cfg = await getConfig(id as any);

        setConfigName(cfg.config_name);
        setAppName(cfg.app_name);
        setConfigVersion(cfg.config_version);
        setLocation(cfg.location);
        setApiKey(cfg.api_key ?? '');
        setEnabled(cfg.enabled);

        const selected = await getSelectedScreens(id as any);

        const selectedMap = selected.reduce<Record<string, number>>(
          (acc, item) => {
            acc[item.route_allocation_id] =
              item.interval_ms && item.interval_ms > 0
                ? item.interval_ms
                : DEFAULT_INTERVAL_MS;

            return acc;
          },
          {}
        );

        setSelectedScreens(selectedMap);
      } catch (e) {
        setApiError((e as Error).message);
      } finally {
        setFetchLoading(false);
      }
    }

    loadConfig();
  }, [id]);

  function validate(): boolean {
    const e: FormErrors = {};

    if (!configName.trim()) {
      e.config_name = 'Config name is required.';
    }

    if (!appName.trim()) {
      e.app_name = 'App name is required.';
    }

    if (!configVersion.trim()) {
      e.config_version = 'Version is required.';
    }

    if (!location.trim()) {
      e.location = 'Location is required.';
    }

    const selectedScreenEntries = Object.entries(selectedScreens);

    if (selectedScreenEntries.length === 0) {
      e.screens = 'Select at least one related screen.';
    }

    const hasInvalidInterval = selectedScreenEntries.some(([, interval]) => {
      return !Number.isFinite(interval) || interval < MIN_INTERVAL_MS;
    });

    if (hasInvalidInterval) {
      e.screens = `Each selected screen must have an interval of at least ${MIN_INTERVAL_MS} ms.`;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function toggleScreen(screenId: string, checked: boolean) {
    setSelectedScreens((prev) => {
      const next = { ...prev };

      if (checked) {
        next[screenId] = next[screenId] || DEFAULT_INTERVAL_MS;
      } else {
        delete next[screenId];
      }

      return next;
    });
  }

  function updateScreenInterval(screenId: string, value: string) {
    const interval = Number(value);

    setSelectedScreens((prev) => ({
      ...prev,
      [screenId]: Number.isFinite(interval) ? interval : 0,
    }));
  }

  function selectAllScreens() {
    setSelectedScreens((prev) => {
      const next = { ...prev };

      screenOptions.forEach((screen) => {
        next[screen.id] = next[screen.id] || DEFAULT_INTERVAL_MS;
      });

      return next;
    });
  }

  function clearAllScreens() {
    setSelectedScreens({});
  }

  function buildSelectedScreenPayload(): ConfigScreenSelection[] {
    return screenOptions
      .filter((screen) =>
        Object.prototype.hasOwnProperty.call(selectedScreens, screen.id)
      )
      .map((screen) => ({
        route_allocation_id: screen.id,
        interval_ms: selectedScreens[screen.id] || DEFAULT_INTERVAL_MS,
      }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setApiError(null);

    try {
      const input = {
        config_name: configName.trim(),
        app_name: appName.trim(),
        config_version: configVersion.trim(),
        location: location.trim(),
        api_key: apiKey.trim() || null,
        enabled,
      };

      const selectedScreenPayload = buildSelectedScreenPayload();

      if (isEdit && id) {
        await updateConfigWithScreens(id, input, selectedScreenPayload);
      } else {
        await createConfigWithScreens(input, selectedScreenPayload);
      }

      navigate('/configs');
    } catch (err) {
      const msg = (err as Error).message;

      setApiError(
        msg.includes('unique') || msg.includes('duplicate')
          ? 'A config with this name already exists.'
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  if (fetchLoading || screensLoading) {
    return <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>;
  }

  return (
    <div style={{ maxWidth: '860px' }}>
      <div className="page-header">
        <h1 className="page-title">{isEdit ? 'Edit Config' : 'New Config'}</h1>
      </div>

      <div className="form-card">
        <form
          onSubmit={handleSubmit}
          noValidate
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label">Config Name *</label>
              <input
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                disabled={isEdit}
                className={`form-input${errors.config_name ? ' error' : ''}`}
                placeholder="cmb_pilot_config"
              />
              {isEdit && (
                <span className="form-hint">
                  Cannot be changed after creation.
                </span>
              )}
              {errors.config_name && (
                <span className="form-error-msg">{errors.config_name}</span>
              )}
            </div>

            <div className="form-field">
              <label className="form-label">App Name *</label>
              <input
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className={`form-input${errors.app_name ? ' error' : ''}`}
                placeholder="sl_dashboard"
              />
              {errors.app_name && (
                <span className="form-error-msg">{errors.app_name}</span>
              )}
            </div>

            <div className="form-field">
              <label className="form-label">Config Version *</label>
              <input
                value={configVersion}
                onChange={(e) => setConfigVersion(e.target.value)}
                className={`form-input${errors.config_version ? ' error' : ''}`}
                placeholder="0.01v"
              />
              {errors.config_version && (
                <span className="form-error-msg">
                  {errors.config_version}
                </span>
              )}
            </div>

            <div className="form-field">
              <label className="form-label">Location *</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={`form-input${errors.location ? ' error' : ''}`}
                placeholder="colombo"
              />
              {errors.location && (
                <span className="form-error-msg">{errors.location}</span>
              )}
              <span className="form-hint">
                Used only as config metadata. It does not filter screens.
              </span>
            </div>

            <div className="form-field form-grid-full">
              <label className="form-label">
                API Key{' '}
                <span
                  style={{
                    color: 'var(--text-tertiary)',
                    fontWeight: 400,
                  }}
                >
                  (optional)
                </span>
              </label>
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="form-input"
                placeholder="Leave blank if not required"
              />
            </div>

            <div className="form-field form-grid-full">
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--text)',
                }}
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: 'var(--accent)',
                  }}
                />
                Enabled
              </label>
            </div>
          </div>

          <div className="form-field">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '8px',
              }}
            >
              <div>
                <label className="form-label">Related Screens *</label>
                <span className="form-hint">
                  Select screens and configure each screen refresh interval.
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={selectAllScreens}
                  disabled={screenOptions.length === 0}
                >
                  Select All
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={clearAllScreens}
                  disabled={Object.keys(selectedScreens).length === 0}
                >
                  Clear
                </button>
              </div>
            </div>

            {screenOptions.length === 0 ? (
              <div
                style={{
                  padding: '14px',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                }}
              >
                No route allocation screens found. Create route allocations
                first.
              </div>
            ) : (
              <div
                style={{
                  border: `1px solid ${
                    errors.screens ? 'var(--danger)' : 'var(--border)'
                  }`,
                  borderRadius: '10px',
                  overflow: 'hidden',
                }}
              >
                {screenOptions.map((screen, index) => {
                  const checked = Object.prototype.hasOwnProperty.call(
                    selectedScreens,
                    screen.id
                  );
                  const isLast = index === screenOptions.length - 1;

                  return (
                    <div
                      key={screen.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: checked ? '1fr 220px' : '1fr',
                        gap: '12px',
                        alignItems: 'center',
                        padding: '12px 14px',
                        borderBottom: isLast
                          ? 'none'
                          : '1px solid var(--border)',
                        background: checked
                          ? 'rgba(59, 130, 246, 0.08)'
                          : 'transparent',
                      }}
                    >
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            toggleScreen(screen.id, e.target.checked)
                          }
                          style={{
                            width: '16px',
                            height: '16px',
                            accentColor: 'var(--accent)',
                          }}
                        />

                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color: 'var(--text)',
                            }}
                          >
                            {screen.screen_id} - {screen.title}
                          </span>

                          <span
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            Location: {screen.location_name} | Status:{' '}
                            {screen.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </label>

                      {checked && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '8px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-secondary)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Interval
                          </span>

                          <input
                            type="number"
                            min={MIN_INTERVAL_MS}
                            step={1000}
                            value={selectedScreens[screen.id] ?? DEFAULT_INTERVAL_MS}
                            onChange={(e) =>
                              updateScreenInterval(screen.id, e.target.value)
                            }
                            className="form-input"
                            style={{
                              width: '110px',
                              height: '36px',
                            }}
                          />

                          <span
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            ms
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {errors.screens && (
              <span className="form-error-msg">{errors.screens}</span>
            )}
          </div>

          {apiError && (
            <p
              style={{
                fontSize: '13px',
                color: 'var(--danger)',
              }}
            >
              {apiError}
            </p>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/configs')}
              className="btn btn-secondary"
            >
              Cancel
            </button>

            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading
                ? 'Saving...'
                : isEdit
                  ? 'Update Config'
                  : 'Create Config'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}