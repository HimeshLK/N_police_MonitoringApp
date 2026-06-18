import { useEffect, useMemo, useState } from 'react';
import {
  GoogleMap,
  MarkerF,
  PolylineF,
  useGoogleMap,
  useJsApiLoader,
} from '@react-google-maps/api';
import {
  getDashboardCounts,
  getDashboardRoutes,
  type DashboardCounts,
  type DashboardRoute,
} from '../api/dashboardApi';
import { calculateMidpoint } from '../utils/coordinates';

const defaultCenter = {
  lat: 6.927079,
  lng: 79.861244,
};

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '18px',
};

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

function getSingleValue<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value;
}

function isScheduleActiveNow(startTime?: string, endTime?: string): boolean {
  if (!startTime || !endTime) return false;

  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();

  if (startMinutes <= endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
  }

  return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
}

function formatTime(value?: string): string {
  if (!value) return '-';

  return new Date(value).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
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

export default function Dashboard() {
  const [routes, setRoutes] = useState<DashboardRoute[]>([]);
  const [counts, setCounts] = useState<DashboardCounts>({
    totalOfficers: 0,
    totalDivisions: 0,
    activeRoutes: 0,
    totalSchedules: 0,
  });

  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [trafficEnabled, setTrafficEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'police-dashboard-map',
    googleMapsApiKey,
  });

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setApiError(null);

      try {
        const [routeData, countData] = await Promise.all([
          getDashboardRoutes(),
          getDashboardCounts(),
        ]);

        setRoutes(routeData);
        setCounts(countData);

        if (routeData.length > 0) {
          setSelectedRouteId(routeData[0].id);
        }
      } catch (error) {
        setApiError((error as Error).message);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const selectedRoute = useMemo(() => {
    return routes.find((route) => route.id === selectedRouteId) || null;
  }, [routes, selectedRouteId]);

  const selectedSchedule = useMemo(() => {
    if (!selectedRoute) return null;
    return getSingleValue(selectedRoute.schedules);
  }, [selectedRoute]);

  const selectedAssignments = useMemo(() => {
    return selectedRoute?.route_officer_assignments || [];
  }, [selectedRoute]);

  const selectedOnDutyOfficers = useMemo(() => {
    return selectedAssignments.filter((assignment) => {
      return assignment.status === 'on_duty';
    });
  }, [selectedAssignments]);

  const totalOnDutyOfficers = useMemo(() => {
    const officerIds = new Set<string>();

    routes.forEach((route) => {
      route.route_officer_assignments?.forEach((assignment) => {
        if (assignment.status === 'on_duty') {
          officerIds.add(assignment.officer_id);
        }
      });
    });

    return officerIds.size;
  }, [routes]);

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

  const routePath =
    startPoint && endPoint
      ? [
          {
            lat: startPoint.lat,
            lng: startPoint.lng,
          },
          {
            lat: endPoint.lat,
            lng: endPoint.lng,
          },
        ]
      : [];

  const selectedRouteActive = selectedSchedule
    ? isScheduleActiveNow(selectedSchedule.start_time, selectedSchedule.end_time)
    : false;

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
            One-glance view of active routes, duty strength, and live traffic.
          </p>
        </div>

        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            textAlign: 'right',
          }}
        >
          Live traffic layer:{' '}
          <strong style={{ color: trafficEnabled ? '#15803d' : '#b91c1c' }}>
            {trafficEnabled ? 'ON' : 'OFF'}
          </strong>
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: '12px',
        }}
      >
        <KpiCard
          label="Officers On Duty"
          value={totalOnDutyOfficers}
          hint="Assigned to active route screens today"
        />

        <KpiCard
          label="Selected Route Duty"
          value={selectedOnDutyOfficers.length}
          hint={selectedRoute?.title || 'No route selected'}
        />

        <KpiCard
          label="Active Routes"
          value={counts.activeRoutes}
          hint="Enabled route allocations"
        />

        <KpiCard
          label="Total Officers"
          value={counts.totalOfficers}
          hint={`${counts.totalDivisions} divisions registered`}
        />

        <KpiCard
          label="Route Status"
          value={selectedRouteActive ? 'Active' : 'Idle'}
          hint={
            selectedSchedule
              ? `${formatTime(selectedSchedule.start_time)} - ${formatTime(
                  selectedSchedule.end_time
                )}`
              : 'No schedule'
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
            >
              {routes.length === 0 ? (
                <option value="">No enabled routes found</option>
              ) : (
                routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.screen_id} - {route.title}
                  </option>
                ))
              )}
            </select>

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
              Officers on Selected Route
            </h3>

            {selectedOnDutyOfficers.length === 0 ? (
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  margin: 0,
                }}
              >
                No officers assigned as on duty for this route today.
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
                {selectedOnDutyOfficers.map((assignment) => {
                  const officer = getSingleValue(assignment.officers);

                  return (
                    <div
                      key={assignment.id}
                      style={{
                        padding: '9px 10px',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        fontSize: '13px',
                      }}
                    >
                      <strong>{officer?.name || 'Unknown Officer'}</strong>
                      <div
                        style={{
                          color: 'var(--text-secondary)',
                          fontSize: '12px',
                          marginTop: '2px',
                        }}
                      >
                        {officer?.rank || 'Rank not set'} | On duty
                      </div>
                    </div>
                  );
                })}
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
          ) : !selectedRoute ? (
            <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>
              No route selected.
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

              {routePath.length === 2 && (
                <PolylineF
                  path={routePath}
                  options={{
                    strokeOpacity: 0.6,
                    strokeWeight: 1,
                  }}
                />
              )}
            </GoogleMap>
          )}
        </div>
      </div>
    </div>
  );
}