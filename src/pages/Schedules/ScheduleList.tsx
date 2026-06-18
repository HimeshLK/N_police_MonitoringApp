import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getSchedules, deleteSchedule, type Schedule } from '../../api/schedulesApi';
import { formatTime, durationMillis, formatDuration } from '../../utils/formatTime';
import { useAuth } from '../../hooks/useAuth';

export default function ScheduleList() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'admin';

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  function showToast(msg: string, type: 'success' | 'error') { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); }

  async function load() {
    try { setError(null); setSchedules(await getSchedules()); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function handleDelete(sc: Schedule) {
    if (!confirm(`Delete schedule "${sc.name}"?`)) return;
    setDeletingId(sc.id);
    try { await deleteSchedule(sc.id); showToast('Schedule deleted.', 'success'); void load(); }
    catch (e) {
      const msg = (e as Error).message;
      showToast(msg.includes('restrict') ? 'Cannot delete: schedule is linked to routes.' : msg, 'error');
    }
    finally { setDeletingId(null); }
  }

  return (
    <div>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <div className="page-header">
        <h1 className="page-title">Schedules</h1>
        {isAdmin && <button onClick={() => navigate('/schedules/new')} className="btn btn-primary">+ Add Schedule</button>}
      </div>

      {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>}
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {!loading && !error && (
        <div className="card table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Start</th><th>End</th><th>Duration</th><th>Milliseconds</th>{isAdmin && <th>Actions</th>}</tr>
            </thead>
            <tbody>
              {schedules.length === 0 && <tr><td colSpan={isAdmin ? 6 : 5} className="table-empty">No schedules found.</td></tr>}
              {schedules.map((sc) => {
                const ms = durationMillis(sc.start_time, sc.end_time);
                return (
                  <tr key={sc.id}>
                    <td style={{ fontWeight: 500 }}>{sc.name}</td>
                    <td>{formatTime(new Date(sc.start_time))}</td>
                    <td>{formatTime(new Date(sc.end_time))}</td>
                    <td><span className="badge badge-neutral">{formatDuration(ms)}</span></td>
                    <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '13px' }}>{ms.toLocaleString()} ms</td>
                    {isAdmin && (
                      <td style={{ display: 'flex', gap: '8px' }}>
                        <Link to={`/schedules/${sc.id}/edit`} className="btn btn-sm btn-secondary">Edit</Link>
                        <button onClick={() => handleDelete(sc)} disabled={deletingId === sc.id} className="btn btn-sm btn-danger-ghost">
                          {deletingId === sc.id ? '...' : 'Delete'}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
