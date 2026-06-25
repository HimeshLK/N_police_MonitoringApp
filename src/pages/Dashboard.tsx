import { useEffect, useMemo, useState } from 'react';
import { GoogleMap, MarkerF, useGoogleMap } from '@react-google-maps/api';
import {
  getDashboardCounts,
  type DashboardCounts,
} from '../api/dashboardApi';
import {
  getDashboardRoutes,
  type DashboardRoute,
} from '../api/routesApi';
import {
  getConfigs,
  getSelectedScreens,
  type ConfigScreenSelection,
  type DashboardConfig,
} from '../api/configsApi';
import {
  getOfficerLocationsByRange,
  type OfficerLocation,
} from '../api/officerLocationsApi';
import { calculateMidpoint } from '../utils/coordinates';
import { useGoogleMapsLoader } from '../hooks/useGoogleMapsLoader';

const defaultCenter = {
  lat: 6.927079,
  lng: 79.861244,
};

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '18px',
};

const OFFICER_LOCATION_LOOKBACK_SECONDS = 30 * 60;
const DEFAULT_OFFICER_REFRESH_MS = 15000;

function TrafficLayerOverlay({ enabled }: { enabled: boolean }) {
  const map = useGoogleMap();

  useEffect(() => {
    if (!map || !enabled || !window.google) return;

    const trafficLayer = new window.google.maps.TrafficLayer();
    trafficLayer.setMap(map);

    return () => {
      trafficLayer.setMap(null);
    };
  }, [map, enabled]);

  return null;
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '14px 16px',
        boxShadow: '0 8px 22px rgba(15, 23, 42, 0.06)',
        minHeight: '86px',
      }}
    >
      <div
        style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          fontWeight: 600,
          marginBottom: '6px',
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: '30px',
          lineHeight: 1,
          fontWeight: 800,
          color: 'var(--text)',
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          marginTop: '8px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {hint}
      </div>
    </div>
  );
}

function formatDateTime(value?: string | number): string {
  if (!value) return '-';

  const date =
    typeof value === 'number'
      ? new Date(value * 1000)
      : new Date(value);

  return date.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function getOfficerDisplayName(officer: OfficerLocation): string {
  const name = `${officer.user?.fname || ''} ${
    officer.user?.lname || ''
  }`.trim();

  return name || officer.user?.id || 'Unknown Officer';
}

export default function Dashboard() {
  const [routes, setRoutes] = useState<DashboardRoute[]>([]);
  const [configs, setConfigs] = useState<DashboardConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState('');
  const [selectedConfigScreens, setSelectedConfigScreens] = useState<
    ConfigScreenSelection[]
  >([]);

  const [counts, setCounts] = useState<DashboardCounts>({
    totalOfficers: 0,
    totalDivisions: 0,
    activeRoutes: 0,
    totalSchedules: 0,
  });

  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [trafficEnabled, setTrafficEnabled] = useState(true);
  const [officerLayerEnabled, setOfficerLayerEnabled] = useState(true);

  const [officerLocations, setOfficerLocations] = useState<OfficerLocation[]>(
    []
  );
  const [officerLocationsLoading, setOfficerLocationsLoading] = useState(false);
  const [officerLocationError, setOfficerLocationError] = useState<string | null>(
    null
  );
  const [lastOfficerRefreshAt, setLastOfficerRefreshAt] = useState<string | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [configScreensLoading, setConfigScreensLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { googleMapsApiKey, isLoaded, loadError } = useGoogleMapsLoader();

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setApiError(null);

      try {
        const [routeData, countData, configData] = await Promise.all([
          getDashboardRoutes(),
          getDashboardCounts(),
          getConfigs(),
        ]);

        const enabledConfigs = configData.filter((config) => config.enabled);
        const defaultConfig = enabledConfigs[0] || configData[0] || null;

        setRoutes(routeData);
        setCounts(countData);
        setConfigs(configData);
        setSelectedConfigId(defaultConfig?.id || '');
      } catch (error) {
        setApiError((error as Error).message);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadConfigScreens() {
      if (!selectedConfigId) {
        setSelectedConfigScreens([]);
        setSelectedRouteId('');
        setOfficerLocations([]);
        return;
      }

      setConfigScreensLoading(true);
      setApiError(null);
      setOfficerLocations([]);
      setOfficerLocationError(null);
      setLastOfficerRefreshAt(null);

      try {
        const screens = await getSelectedScreens(selectedConfigId);

        if (!cancelled) {
          setSelectedConfigScreens(screens);
        }
      } catch (error) {
        if (!cancelled) {
          setSelectedConfigScreens([]);
          setSelectedRouteId('');
          setApiError((error as Error).message);
        }
      } finally {
        if (!cancelled) {
          setConfigScreensLoading(false);
        }
      }
    }

    loadConfigScreens();

    return () => {
      cancelled = true;
    };
  }, [selectedConfigId]);

  const selectedConfig = useMemo(() => {
    return configs.find((config) => config.id === selectedConfigId) || null;
  }, [configs, selectedConfigId]);

  const selectedTrackingConfigName = selectedConfig?.config_name || '';

  const selectedScreenIntervalMap = useMemo(() => {
    return new Map(
      selectedConfigScreens.map((screen) => [
        screen.route_allocation_id,
        screen.interval_ms,
      ])
    );
  }, [selectedConfigScreens]);

  const configRoutes = useMemo(() => {
    if (!selectedConfig) return [];

    const selectedRouteIds = new Set(
      selectedConfigScreens.map((screen) => screen.route_allocation_id)
    );

    return routes.filter((route) => selectedRouteIds.has(route.id));
  }, [routes, selectedConfig, selectedConfigScreens]);

  useEffect(() => {
    if (configScreensLoading) return;

    if (configRoutes.length === 0) {
      setSelectedRouteId('');
      return;
    }

    const selectedRouteExists = configRoutes.some(
      (route) => route.id === selectedRouteId
    );

    if (!selectedRouteExists) {
      setSelectedRouteId(configRoutes[0].id);
    }
  }, [configRoutes, configScreensLoading, selectedRouteId]);

  const selectedRoute = useMemo(() => {
    return configRoutes.find((route) => route.id === selectedRouteId) || null;
  }, [configRoutes, selectedRouteId]);

  const midpoint = useMemo(() => {
    if (!selectedRoute) return defaultCenter;

    return calculateMidpoint(
      Number(selectedRoute.start_lat),
      Number(selectedRoute.start_lng),
      Number(selectedRoute.end_lat),
      Number(selectedRoute.end_lng)
    );
  }, [selectedRoute]);

  const startPoint = selectedRoute
    ? {
        lat: Number(selectedRoute.start_lat),
        lng: Number(selectedRoute.start_lng),
      }
    : null;

  const endPoint = selectedRoute
    ? {
        lat: Number(selectedRoute.end_lat),
        lng: Number(selectedRoute.end_lng),
      }
    : null;

  const officerRefreshMs = useMemo(() => {
    if (selectedRoute) {
      const configInterval = Number(
        selectedScreenIntervalMap.get(selectedRoute.id)
      );

      if (Number.isFinite(configInterval) && configInterval >= 1000) {
        return configInterval;
      }

      const routeRefresh = Number(selectedRoute.update_frequency_ms);

      if (Number.isFinite(routeRefresh) && routeRefresh >= 5000) {
        return routeRefresh;
      }
    }

    return DEFAULT_OFFICER_REFRESH_MS;
  }, [selectedRoute, selectedScreenIntervalMap]);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | undefined;

    async function loadOfficerLocations() {
      if (!selectedRoute || !selectedTrackingConfigName || !officerLayerEnabled) {
        setOfficerLocations([]);
        setOfficerLocationError(null);
        return;
      }

      setOfficerLocationsLoading(true);
      setOfficerLocationError(null);

      try {
        const nowSeconds = Math.floor(Date.now() / 1000);
        const startSeconds = nowSeconds - OFFICER_LOCATION_LOOKBACK_SECONDS;

        const locations = await getOfficerLocationsByRange({
          reference: selectedRoute.screen_id,
          configName: selectedTrackingConfigName,
          start: startSeconds,
          end: nowSeconds,
        });

        if (!cancelled) {
          setOfficerLocations(locations);
          setLastOfficerRefreshAt(new Date().toISOString());
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Unable to load officer layer:', error);
          setOfficerLocations([]);
          setOfficerLocationError((error as Error).message);
        }
      } finally {
        if (!cancelled) {
          setOfficerLocationsLoading(false);
        }
      }
    }

    loadOfficerLocations();

    if (selectedRoute && selectedTrackingConfigName && officerLayerEnabled) {
      intervalId = window.setInterval(loadOfficerLocations, officerRefreshMs);
    }

    return () => {
      cancelled = true;

      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [
    selectedRoute,
    selectedTrackingConfigName,
    officerLayerEnabled,
    officerRefreshMs,
  ]);

  const latestOfficerLocations = useMemo(() => {
    const latestByOfficer = new Map<string, OfficerLocation>();

    officerLocations.forEach((location) => {
      const officerId = location.user?.id;

      if (!officerId) return;

      const existing = latestByOfficer.get(officerId);

      if (!existing || Number(location.createdAt) > Number(existing.createdAt)) {
        latestByOfficer.set(officerId, location);
      }
    });

    return Array.from(latestByOfficer.values());
  }, [officerLocations]);

  if (loading) {
    return <p style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</p>;
  }

  return (
    <div
      style={{
        height: 'calc(100vh - 48px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <h1
            className="page-title"
            style={{
              margin: 0,
              fontSize: '26px',
            }}
          >
            Traffic Command Dashboard
          </h1>

          <p
            style={{
              color: 'var(--text-secondary)',
              margin: '4px 0 0',
              fontSize: '13px',
            }}
          >
            One-glance view of active routes, live traffic, and officer GPS
            layer.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '16px',
          }}
        >
          <div style={{ minWidth: '320px', textAlign: 'left' }}>
            <label className="form-label">Dashboard Config</label>
            <select
              className="form-input"
              value={selectedConfigId}
              onChange={(event) => setSelectedConfigId(event.target.value)}
            >
              {configs.length === 0 ? (
                <option value="">No configs found</option>
              ) : (
                configs.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.config_name} - {config.location}
                    {!config.enabled ? ' (Disabled)' : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              textAlign: 'right',
              lineHeight: 1.7,
              paddingBottom: '2px',
              minWidth: '120px',
            }}
          >
            <div>
              Live traffic:{' '}
              <strong style={{ color: trafficEnabled ? '#15803d' : '#b91c1c' }}>
                {trafficEnabled ? 'ON' : 'OFF'}
              </strong>
            </div>

            <div>
              Officer layer:{' '}
              <strong
                style={{
                  color: officerLayerEnabled ? '#15803d' : '#b91c1c',
                }}
              >
                {officerLayerEnabled ? 'ON' : 'OFF'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {apiError && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.08)',
            color: 'var(--danger)',
            fontSize: '13px',
          }}
        >
          {apiError}
        </div>
      )}

      {officerLocationError && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.08)',
            color: 'var(--danger)',
            fontSize: '13px',
          }}
        >
          Officer layer error: {officerLocationError}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: '12px',
        }}
      >
        <KpiCard
          label="Tracked Officers"
          value={latestOfficerLocations.length}
          hint={
            selectedRoute
              ? `Latest positions for ${selectedRoute.screen_id}`
              : selectedConfig
                ? 'No route selected'
                : 'No config selected'
          }
        />

        <KpiCard
          label="Officer Events"
          value={officerLocations.length}
          hint="Events from last 30 minutes"
        />

        <KpiCard
          label="Config Routes"
          value={configRoutes.length}
          hint={
            selectedConfig
              ? `Routes linked to ${selectedConfig.config_name}`
              : 'No config selected'
          }
        />

        <KpiCard
          label="Total Officers"
          value={counts.totalOfficers}
          hint={`${counts.totalDivisions} divisions registered`}
        />

        <KpiCard
          label="Layer Refresh"
          value={`${Math.round(officerRefreshMs / 1000)}s`}
          hint={
            lastOfficerRefreshAt
              ? `Last refresh ${formatDateTime(lastOfficerRefreshAt)}`
              : 'Waiting for first refresh'
          }
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: '14px',
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minHeight: 0,
          }}
        >
          <div className="form-card" style={{ padding: '16px' }}>
            <label className="form-label">Route Screen</label>

            <select
              className="form-input"
              value={selectedRouteId}
              onChange={(event) => setSelectedRouteId(event.target.value)}
              disabled={!selectedConfig || configRoutes.length === 0}
            >
              {!selectedConfig ? (
                <option value="">Select a config first</option>
              ) : configScreensLoading ? (
                <option value="">Loading config screens...</option>
              ) : configRoutes.length === 0 ? (
                <option value="">No routes linked to this config</option>
              ) : (
                configRoutes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.screen_id} - {route.title}
                  </option>
                ))
              )}
            </select>

            {selectedConfig && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                }}
              >
                <div>
                  <strong style={{ color: 'var(--text)' }}>Selected config:</strong>{' '}
                  {selectedConfig.config_name}
                </div>

                <div>
                  <strong style={{ color: 'var(--text)' }}>App:</strong>{' '}
                  {selectedConfig.app_name}
                </div>

                <div>
                  <strong style={{ color: 'var(--text)' }}>Version:</strong>{' '}
                  {selectedConfig.config_version}
                </div>
              </div>
            )}

            {selectedRoute && (
              <div
                style={{
                  marginTop: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: '17px',
                    color: 'var(--text)',
                  }}
                >
                  {selectedRoute.title}
                </h3>

                <div
                  style={{
                    padding: '10px',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    lineHeight: 1.6,
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--text)' }}>Screen:</strong>{' '}
                    {selectedRoute.screen_id}
                  </div>

                  <div>
                    <strong style={{ color: 'var(--text)' }}>Tracking ref:</strong>{' '}
                    {selectedRoute.screen_id}
                  </div>

                  <div>
                    <strong style={{ color: 'var(--text)' }}>Config:</strong>{' '}
                    {selectedTrackingConfigName || '-'}
                  </div>

                  <div>
                    <strong style={{ color: 'var(--text)' }}>Location:</strong>{' '}
                    {selectedRoute.location_name}
                  </div>

                  <div>
                    <strong style={{ color: 'var(--text)' }}>Start:</strong>{' '}
                    {Number(selectedRoute.start_lat).toFixed(6)},{' '}
                    {Number(selectedRoute.start_lng).toFixed(6)}
                  </div>

                  <div>
                    <strong style={{ color: 'var(--text)' }}>End:</strong>{' '}
                    {Number(selectedRoute.end_lat).toFixed(6)},{' '}
                    {Number(selectedRoute.end_lng).toFixed(6)}
                  </div>

                  <div>
                    <strong style={{ color: 'var(--text)' }}>Midpoint:</strong>{' '}
                    {midpoint.lat.toFixed(6)}, {midpoint.lng.toFixed(6)}
                  </div>
                </div>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={trafficEnabled}
                    onChange={(event) =>
                      setTrafficEnabled(event.target.checked)
                    }
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: 'var(--accent)',
                    }}
                  />
                  Show live traffic
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={officerLayerEnabled}
                    onChange={(event) =>
                      setOfficerLayerEnabled(event.target.checked)
                    }
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: 'var(--accent)',
                    }}
                  />
                  Show officer layer
                </label>
              </div>
            )}
          </div>

          <div
            className="form-card"
            style={{
              padding: '16px',
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <h3
              style={{
                margin: '0 0 10px',
                fontSize: '15px',
              }}
            >
              Tracked Officers
            </h3>

            {officerLocationsLoading && (
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  margin: '0 0 10px',
                }}
              >
                Loading officer locations...
              </p>
            )}

            {!selectedConfig ? (
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  margin: 0,
                }}
              >
                Select a config to load officer locations.
              </p>
            ) : !selectedRoute ? (
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  margin: 0,
                }}
              >
                No route selected for this config.
              </p>
            ) : !officerLayerEnabled ? (
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  margin: 0,
                }}
              >
                Officer layer is disabled.
              </p>
            ) : latestOfficerLocations.length === 0 ? (
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  margin: 0,
                }}
              >
                No recent officer GPS events found for this screen and config.
              </p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  overflowY: 'auto',
                  maxHeight: '100%',
                }}
              >
                {latestOfficerLocations.map((officer) => (
                  <div
                    key={officer.user.id}
                    style={{
                      padding: '9px 10px',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      fontSize: '13px',
                    }}
                  >
                    <strong>{getOfficerDisplayName(officer)}</strong>

                    <div
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: '12px',
                        marginTop: '2px',
                        lineHeight: 1.5,
                      }}
                    >
                      ID: {officer.user.id}
                      <br />
                      Last: {formatDateTime(officer.createdAt)}
                      <br />
                      GPS: {Number(officer.coordinates.lat).toFixed(6)},{' '}
                      {Number(officer.coordinates.lng).toFixed(6)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          className="form-card"
          style={{
            padding: '14px',
            minHeight: 0,
          }}
        >
          {!googleMapsApiKey ? (
            <div style={{ padding: '20px', color: 'var(--danger)' }}>
              Missing VITE_GOOGLE_MAPS_API_KEY.
            </div>
          ) : loadError ? (
            <div style={{ padding: '20px', color: 'var(--danger)' }}>
              Failed to load Google Maps.
            </div>
          ) : !isLoaded ? (
            <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>
              Loading map...
            </div>
          ) : !selectedConfig ? (
            <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>
              Select a config to load the dashboard.
            </div>
          ) : !selectedRoute ? (
            <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>
              No route selected for this config.
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={midpoint}
              zoom={selectedRoute.zoom_level || 15}
              options={{
                streetViewControl: false,
                mapTypeControl: true,
                fullscreenControl: true,
                clickableIcons: true,
              }}
            >
              <TrafficLayerOverlay enabled={trafficEnabled} />

              {startPoint && (
                <MarkerF
                  position={startPoint}
                  label="S"
                  title={selectedRoute.start_label || 'Start Point'}
                />
              )}

              {endPoint && (
                <MarkerF
                  position={endPoint}
                  label="E"
                  title={selectedRoute.end_label || 'End Point'}
                />
              )}

              <MarkerF position={midpoint} label="M" title="Route midpoint" />

              {officerLayerEnabled &&
                latestOfficerLocations.map((officer) => (
                  <MarkerF
                    key={officer.user.id}
                    position={{
                      lat: Number(officer.coordinates.lat),
                      lng: Number(officer.coordinates.lng),
                    }}
                    label="P"
                    title={`${getOfficerDisplayName(officer)} | ${
                      officer.user.id
                    }`}
                  />
                ))}
            </GoogleMap>
          )}
        </div>
      </div>
    </div>
  );
}