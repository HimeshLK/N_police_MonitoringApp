import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  GoogleMap,
  Marker,
  Polyline,
  useGoogleMap,
} from '@react-google-maps/api';
import { createRoute, getRoute, updateRoute } from '../../api/routesApi';
import { getSchedules, type Schedule } from '../../api/schedulesApi';
import {
  calculateMidpoint,
  isValidLat,
  isValidLng,
  parseLatLng,
} from '../../utils/coordinates';
import RoleGuard from '../../components/RoleGuard';
import { useGoogleMapsLoader } from '../../hooks/useGoogleMapsLoader';

const MAP_CENTER_DEFAULT = { lat: 6.9271, lng: 79.8612 };

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
  borderRadius: 'var(--r-md)',
};

function generateScreenUuid() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function TrafficLayerOverlay() {
  const map = useGoogleMap();

  useEffect(() => {
    if (!map || !window.google) return;

    const trafficLayer = new window.google.maps.TrafficLayer();
    trafficLayer.setMap(map);

    return () => {
      trafficLayer.setMap(null);
    };
  }, [map]);

  return null;
}

export default function RouteForm() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <RouteFormInner />
    </RoleGuard>
  );
}

type PickMode = 'start' | 'end' | null;

interface Coords {
  lat: number;
  lng: number;
}

interface FormErrors {
  title?: string;
  location_name?: string;
  schedule_id?: string;
  start?: string;
  end?: string;
  zoom_level?: string;
  update_frequency_ms?: string;
}

function RouteFormInner() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const { isLoaded, loadError } = useGoogleMapsLoader();

  const [screenId, setScreenId] = useState(() => generateScreenUuid());
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('colombo');
  const [scheduleId, setScheduleId] = useState('');
  const [zoomLevel, setZoomLevel] = useState(15);
  const [updateFreqMs, setUpdateFreqMs] = useState(18000);
  const [enabled, setEnabled] = useState(true);

  const [startCoords, setStartCoords] = useState<Coords | null>(null);
  const [endCoords, setEndCoords] = useState<Coords | null>(null);
  const [startLabel, setStartLabel] = useState('');
  const [endLabel, setEndLabel] = useState('');
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [startInputError, setStartInputError] = useState('');
  const [endInputError, setEndInputError] = useState('');
  const [pickMode, setPickMode] = useState<PickMode>(null);
  const [mapCenter, setMapCenter] = useState<Coords>(MAP_CENTER_DEFAULT);

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [apiError, setApiError] = useState<string | null>(null);

  const midpoint =
    startCoords && endCoords
      ? calculateMidpoint(
          startCoords.lat,
          startCoords.lng,
          endCoords.lat,
          endCoords.lng
        )
      : null;

  const polylinePath = startCoords && endCoords ? [startCoords, endCoords] : [];

  useEffect(() => {
    async function loadBaseData() {
      try {
        const scheduleData = await getSchedules();
        setSchedules(scheduleData);
      } catch {
        setSchedules([]);
      }
    }

    loadBaseData();
  }, []);

  useEffect(() => {
    if (!id) {
      setFetchLoading(false);
      return;
    }

    async function loadRoute() {
      setFetchLoading(true);
      setApiError(null);

      try {
        const route = await getRoute(id as any);

        setScreenId(route.screen_id || generateScreenUuid());
        setTitle(route.title);
        setDescription(route.description ?? '');
        setLocationName(route.location_name);
        setScheduleId(route.schedule_id);
        setZoomLevel(route.zoom_level);
        setUpdateFreqMs(route.update_frequency_ms);
        setEnabled(route.enabled);

        setStartLabel(route.start_label ?? '');
        setEndLabel(route.end_label ?? '');

        const start = {
          lat: route.start_lat,
          lng: route.start_lng,
        };

        const end = {
          lat: route.end_lat,
          lng: route.end_lng,
        };

        setStartCoords(start);
        setEndCoords(end);
        setStartInput(`${route.start_lat}, ${route.start_lng}`);
        setEndInput(`${route.end_lat}, ${route.end_lng}`);
        setMapCenter({
          lat: route.center_lat,
          lng: route.center_lng,
        });
      } catch (error) {
        setApiError((error as Error).message);
      } finally {
        setFetchLoading(false);
      }
    }

    loadRoute();
  }, [id]);

  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (!pickMode || !event.latLng) return;

      const coords = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      };

      if (pickMode === 'start') {
        setStartCoords(coords);
        setStartInput(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
        setStartInputError('');
        setMapCenter(coords);
      } else {
        setEndCoords(coords);
        setEndInput(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
        setEndInputError('');
      }

      setPickMode(null);
    },
    [pickMode]
  );

  function applyStartInput() {
    const parsed = parseLatLng(startInput);

    if (!parsed) {
      setStartInputError('Enter valid coordinates as lat, lng');
      return;
    }

    setStartInputError('');
    setStartCoords(parsed);
    setMapCenter(parsed);
  }

  function applyEndInput() {
    const parsed = parseLatLng(endInput);

    if (!parsed) {
      setEndInputError('Enter valid coordinates as lat, lng');
      return;
    }

    setEndInputError('');
    setEndCoords(parsed);
  }

  function validate(): boolean {
    const e: FormErrors = {};

    if (!title.trim()) {
      e.title = 'Title is required.';
    }

    if (!locationName.trim()) {
      e.location_name = 'Location is required.';
    }

    if (!scheduleId) {
      e.schedule_id = 'Schedule is required.';
    }

    if (
      !startCoords ||
      !isValidLat(startCoords.lat) ||
      !isValidLng(startCoords.lng)
    ) {
      e.start = 'Valid start coordinates are required.';
    }

    if (
      !endCoords ||
      !isValidLat(endCoords.lat) ||
      !isValidLng(endCoords.lng)
    ) {
      e.end = 'Valid end coordinates are required.';
    }

    if (!Number.isInteger(zoomLevel) || zoomLevel < 1 || zoomLevel > 20) {
      e.zoom_level = 'Zoom must be between 1 and 20.';
    }

    if (!Number.isInteger(updateFreqMs) || updateFreqMs <= 0) {
      e.update_frequency_ms = 'Must be a positive integer.';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!validate() || !startCoords || !endCoords || !midpoint) return;

    setLoading(true);
    setApiError(null);

    try {
      const input = {
        screen_id: screenId || generateScreenUuid(),
        title: title.trim(),
        description: description.trim() || null,
        location_name: locationName.trim(),
        schedule_id: scheduleId,
        start_lat: startCoords.lat,
        start_lng: startCoords.lng,
        end_lat: endCoords.lat,
        end_lng: endCoords.lng,
        start_label: startLabel.trim() || null,
        end_label: endLabel.trim() || null,
        center_lat: midpoint.lat,
        center_lng: midpoint.lng,
        zoom_level: zoomLevel,
        enabled,
        map_params: [],
        update_frequency_ms: updateFreqMs,
      };

      if (isEdit && id) {
        await updateRoute(id, input);
      } else {
        await createRoute(input);
      }

      navigate('/routes');
    } catch (error) {
      const message = (error as Error).message;

      setApiError(
        message.includes('unique') || message.includes('duplicate')
          ? 'A route with this generated Screen ID already exists. Please try again.'
          : message
      );
    } finally {
      setLoading(false);
    }
  }

  if (fetchLoading) {
    return <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          {isEdit ? 'Edit Route Allocation' : 'Add Route Allocation'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(520px, 1fr) minmax(620px, 1fr)',
            gap: '20px',
            alignItems: 'stretch',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-card">
              <h3
                style={{
                  margin: '0 0 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--text)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Screen Info
              </h3>

              <div className="form-grid-2">
                <div className="form-field form-grid-full">
                  <label className="form-label">Location *</label>
                  <input
                    value={locationName}
                    onChange={(event) => setLocationName(event.target.value)}
                    placeholder="colombo"
                    className={`form-input${
                      errors.location_name ? ' error' : ''
                    }`}
                  />
                  {errors.location_name && (
                    <span className="form-error-msg">
                      {errors.location_name}
                    </span>
                  )}
                </div>

                <div className="form-field form-grid-full">
                  <label className="form-label">Title *</label>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className={`form-input${errors.title ? ' error' : ''}`}
                  />
                  {errors.title && (
                    <span className="form-error-msg">{errors.title}</span>
                  )}
                </div>

                <div className="form-field form-grid-full">
                  <label className="form-label">Description</label>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={2}
                    className="form-input"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Schedule *</label>
                  <select
                    value={scheduleId}
                    onChange={(event) => setScheduleId(event.target.value)}
                    className={`form-input${
                      errors.schedule_id ? ' error' : ''
                    }`}
                  >
                    <option value="">Select schedule...</option>
                    {schedules.map((schedule) => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.name}
                      </option>
                    ))}
                  </select>
                  {errors.schedule_id && (
                    <span className="form-error-msg">
                      {errors.schedule_id}
                    </span>
                  )}
                </div>

                <div className="form-field">
                  <label className="form-label">Zoom Level 1-20</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={zoomLevel}
                    onChange={(event) => setZoomLevel(Number(event.target.value))}
                    className={`form-input${errors.zoom_level ? ' error' : ''}`}
                  />
                  {errors.zoom_level && (
                    <span className="form-error-msg">
                      {errors.zoom_level}
                    </span>
                  )}
                </div>

                <div className="form-field">
                  <label className="form-label">Update Frequency ms</label>
                  <input
                    type="number"
                    min={1}
                    value={updateFreqMs}
                    onChange={(event) =>
                      setUpdateFreqMs(Number(event.target.value))
                    }
                    className={`form-input${
                      errors.update_frequency_ms ? ' error' : ''
                    }`}
                  />
                  {errors.update_frequency_ms && (
                    <span className="form-error-msg">
                      {errors.update_frequency_ms}
                    </span>
                  )}
                </div>

                <div className="form-field">
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
                      onChange={(event) => setEnabled(event.target.checked)}
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
            </div>

            <div className="form-card">
              <h3
                style={{
                  margin: '0 0 8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--text)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Coordinates
              </h3>

              <p
                style={{
                  margin: '0 0 12px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                }}
              >
                Click a button then click the map, or type{' '}
                <code style={{ fontFamily: 'monospace' }}>lat, lng</code>.
              </p>

              <div
                style={{
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--r-sm)',
                  padding: '12px',
                  marginBottom: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: 'var(--success)',
                      flexShrink: 0,
                    }}
                  />

                  <strong
                    style={{
                      fontSize: '13px',
                      flex: 1,
                      color: 'var(--text)',
                    }}
                  >
                    Start Point
                  </strong>

                  <button
                    type="button"
                    onClick={() =>
                      setPickMode(pickMode === 'start' ? null : 'start')
                    }
                    className={`btn btn-sm ${
                      pickMode === 'start' ? 'btn-primary' : 'btn-secondary'
                    }`}
                  >
                    {pickMode === 'start' ? 'Click map...' : 'Pick on map'}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="6.927079, 79.861244"
                    value={startInput}
                    onChange={(event) => setStartInput(event.target.value)}
                    onBlur={applyStartInput}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        applyStartInput();
                      }
                    }}
                    className={`form-input${
                      errors.start || startInputError ? ' error' : ''
                    }`}
                    style={{ flex: 1 }}
                  />

                  <button
                    type="button"
                    onClick={applyStartInput}
                    className="btn btn-sm btn-secondary"
                  >
                    Apply
                  </button>
                </div>

                {(errors.start || startInputError) && (
                  <span className="form-error-msg">
                    {errors.start ?? startInputError}
                  </span>
                )}

                <input
                  type="text"
                  placeholder="Start label or address optional"
                  value={startLabel}
                  onChange={(event) => setStartLabel(event.target.value)}
                  className="form-input"
                  style={{ marginTop: '8px' }}
                />
              </div>

              <div
                style={{
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--r-sm)',
                  padding: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: 'var(--danger)',
                      flexShrink: 0,
                    }}
                  />

                  <strong
                    style={{
                      fontSize: '13px',
                      flex: 1,
                      color: 'var(--text)',
                    }}
                  >
                    End Point
                  </strong>

                  <button
                    type="button"
                    onClick={() =>
                      setPickMode(pickMode === 'end' ? null : 'end')
                    }
                    className={`btn btn-sm ${
                      pickMode === 'end' ? 'btn-primary' : 'btn-secondary'
                    }`}
                  >
                    {pickMode === 'end' ? 'Click map...' : 'Pick on map'}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="6.920000, 79.870000"
                    value={endInput}
                    onChange={(event) => setEndInput(event.target.value)}
                    onBlur={applyEndInput}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        applyEndInput();
                      }
                    }}
                    className={`form-input${
                      errors.end || endInputError ? ' error' : ''
                    }`}
                    style={{ flex: 1 }}
                  />

                  <button
                    type="button"
                    onClick={applyEndInput}
                    className="btn btn-sm btn-secondary"
                  >
                    Apply
                  </button>
                </div>

                {(errors.end || endInputError) && (
                  <span className="form-error-msg">
                    {errors.end ?? endInputError}
                  </span>
                )}

                <input
                  type="text"
                  placeholder="End label or address optional"
                  value={endLabel}
                  onChange={(event) => setEndLabel(event.target.value)}
                  className="form-input"
                  style={{ marginTop: '8px' }}
                />
              </div>

              {midpoint && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '12px',
                    padding: '8px 12px',
                    background: 'var(--accent-light)',
                    borderRadius: 'var(--r-sm)',
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      flexShrink: 0,
                    }}
                  />

                  <span style={{ fontSize: '13px', color: 'var(--text)' }}>
                    Center:{' '}
                    <strong>
                      {midpoint.lat.toFixed(6)}, {midpoint.lng.toFixed(6)}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              position: 'sticky',
              top: '16px',
              height: 'calc(100vh - 150px)',
              minHeight: '640px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '4px',
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '14px',
                  color: 'var(--text)',
                }}
              >
                Map Preview
              </span>

              {pickMode && (
                <span
                  className="badge badge-neutral"
                  style={{
                    background: '#FEF3C7',
                    color: '#92400E',
                  }}
                >
                  Picking {pickMode} - click map
                </span>
              )}
            </div>

            {loadError && (
              <div
                style={{
                  padding: '16px',
                  background: 'var(--danger-bg)',
                  borderRadius: 'var(--r-md)',
                  color: 'var(--danger-text)',
                  fontSize: '14px',
                }}
              >
                Failed to load Google Maps: {loadError.message}
              </div>
            )}

            {!loadError && isLoaded && (
              <div style={{ flex: 1, minHeight: 0 }}>
                <GoogleMap
                  mapContainerStyle={{
                    ...MAP_CONTAINER_STYLE,
                    cursor: pickMode ? 'crosshair' : 'default',
                  }}
                  center={mapCenter}
                  zoom={zoomLevel}
                  onClick={handleMapClick}
                  options={{
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                  }}
                >
                  <TrafficLayerOverlay />

                  {startCoords && (
                    <Marker
                      position={startCoords}
                      label={{
                        text: 'S',
                        color: '#fff',
                        fontWeight: 'bold',
                      }}
                      icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: '#34C759',
                        fillOpacity: 1,
                        strokeColor: '#fff',
                        strokeWeight: 2,
                      }}
                    />
                  )}

                  {endCoords && (
                    <Marker
                      position={endCoords}
                      label={{
                        text: 'E',
                        color: '#fff',
                        fontWeight: 'bold',
                      }}
                      icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: '#FF3B30',
                        fillOpacity: 1,
                        strokeColor: '#fff',
                        strokeWeight: 2,
                      }}
                    />
                  )}

                  {midpoint && (
                    <Marker
                      position={midpoint}
                      icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 7,
                        fillColor: '#0071E3',
                        fillOpacity: 1,
                        strokeColor: '#fff',
                        strokeWeight: 2,
                      }}
                    />
                  )}

                  {polylinePath.length === 2 && (
                    <Polyline
                      path={polylinePath}
                      options={{
                        strokeColor: '#0071E3',
                        strokeWeight: 3,
                        strokeOpacity: 0.8,
                      }}
                    />
                  )}
                </GoogleMap>
              </div>
            )}

            {!loadError && !isLoaded && (
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg)',
                  borderRadius: 'var(--r-md)',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                }}
              >
                Loading map...
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: '16px',
                padding: '8px 12px',
                background: 'var(--card)',
                borderRadius: 'var(--r-sm)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {[
                { color: '#34C759', label: 'Start' },
                { color: '#FF3B30', label: 'End' },
                { color: '#0071E3', label: 'Center' },
              ].map(({ color, label }) => (
                <span
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: color,
                      display: 'inline-block',
                    }}
                  />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {apiError && (
          <p
            style={{
              fontSize: '13px',
              color: 'var(--danger)',
              marginTop: '12px',
            }}
          >
            {apiError}
          </p>
        )}

        <div className="form-actions" style={{ marginTop: '16px' }}>
          <button
            type="button"
            onClick={() => navigate('/routes')}
            className="btn btn-secondary"
          >
            Cancel
          </button>

          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Saving...' : isEdit ? 'Update Route' : 'Create Route'}
          </button>
        </div>
      </form>
    </div>
  );
}