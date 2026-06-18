import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createSchedule, getSchedule, updateSchedule } from '../../api/schedulesApi';
import { localInputToISO, isoToLocalInput, durationMillis, formatDuration } from '../../utils/formatTime';
import RoleGuard from '../../components/RoleGuard';

export default function ScheduleForm() {
  return <RoleGuard allowedRoles={['admin']}><ScheduleFormInner /></RoleGuard>;
}

interface FormErrors { name?: string; start_time?: string; end_time?: string; }

function ScheduleFormInner() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setFetchLoading(true);
    getSchedule(id).then((sc) => { setName(sc.name); setStartTime(isoToLocalInput(sc.start_time)); setEndTime(isoToLocalInput(sc.end_time)); })
      .catch((e: Error) => setApiError(e.message)).finally(() => setFetchLoading(false));
  }, [id]);

  function validate(): boolean {
    const e: FormErrors = {};
    if (!name.trim()) e.name = 'Name is required.';
    if (!startTime) e.start_time = 'Start time is required.';
    if (!endTime) e.end_time = 'End time is required.';
    if (startTime && endTime && new Date(endTime) <= new Date(startTime)) e.end_time = 'End time must be after start time.';
    setErrors(e); return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); if (!validate()) return;
    setLoading(true); setApiError(null);
    try {
      const input = { name: name.trim(), start_time: localInputToISO(startTime), end_time: localInputToISO(endTime) };
      if (isEdit && id) await updateSchedule(id, input); else await createSchedule(input);
      navigate('/schedules');
    } catch (err) { setApiError((err as Error).message); }
    finally { setLoading(false); }
  }

  const previewMillis = startTime && endTime && new Date(endTime) > new Date(startTime)
    ? durationMillis(new Date(startTime).toISOString(), new Date(endTime).toISOString()) : null;

  if (fetchLoading) return <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>;

  return (
    <div style={{ maxWidth: '560px' }}>
      <div className="page-header">
        <h1 className="page-title">{isEdit ? 'Edit Schedule' : 'New Schedule'}</h1>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-field">
            <label className="form-label">Schedule Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={`form-input${errors.name ? ' error' : ''}`} placeholder="e.g. Morning Shift" />
            {errors.name && <span className="form-error-msg">{errors.name}</span>}
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label">Start Time *</label>
              <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={`form-input${errors.start_time ? ' error' : ''}`} />
              {errors.start_time && <span className="form-error-msg">{errors.start_time}</span>}
            </div>
            <div className="form-field">
              <label className="form-label">End Time *</label>
              <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={`form-input${errors.end_time ? ' error' : ''}`} />
              {errors.end_time && <span className="form-error-msg">{errors.end_time}</span>}
            </div>
          </div>

          {previewMillis !== null && (
            <div className="duration-pill">
              <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>Duration:</span>
              <strong>{formatDuration(previewMillis)}</strong>
              <span style={{ color: 'var(--text-tertiary)' }}>|</span>
              <strong style={{ fontFamily: 'monospace', fontSize: '13px' }}>{previewMillis.toLocaleString()} ms</strong>
            </div>
          )}

          {apiError && <p style={{ fontSize: '13px', color: 'var(--danger)' }}>{apiError}</p>}
          <div className="form-actions">
            <button type="button" onClick={() => navigate('/schedules')} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Saving...' : isEdit ? 'Update Schedule' : 'Create Schedule'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
