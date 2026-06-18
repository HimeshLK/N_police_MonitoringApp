import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getRoutes, deleteRoute, type RouteAllocation } from '../../api/routesApi';
import { useAuth } from '../../hooks/useAuth';

export default function RouteList() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'admin';

  const [routes, setRoutes] = useState<RouteAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  function showToast(msg: string, type: 'success' | 'error') { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); }

  async function load() {
    try { setError(null); setRoutes(await getRoutes()); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function handleDelete(route: RouteAllocation) {
    if (!confirm(`Delete route "${route.title}"?`)) return;
    setDeletingId(route.id);
    try { await deleteRoute(route.id); showToast('Route deleted.', 'success'); void load(); }
    catch (e) { showToast((e as Error).message, 'error'); }
    finally { setDeletingId(null); }
  }

  return (
    <div>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <div className="page-header">
        <h1 className="page-title">Route Allocations</h1>
        {isAdmin && <button onClick={() => navigate('/routes/new')} className="btn btn-primary">+ Add Route</button>}
      </div>

      {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>}
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {!loading && !error && (
        <div className="card table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Screen ID</th><th>Title</th><th>Location</th><th>Schedule</th>
                <th>Center</th><th>Zoom</th><th>Status</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {routes.length === 0 && <tr><td colSpan={isAdmin ? 8 : 7} className="table-empty">No routes found.</td></tr>}
              {routes.map((r) => (
                <tr key={r.id}>
                  <td><span className="code-tag">{r.screen_id}</span></td>
                  <td style={{ fontWeight: 500 }}>{r.title}</td>
                  <td>{r.location_name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{r.schedules?.name ?? '-'}</td>
                  <td style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {r.center_lat.toFixed(5)}, {r.center_lng.toFixed(5)}
                  </td>
                  <td>{r.zoom_level}</td>
                  <td><span className={`badge ${r.enabled ? 'badge-success' : 'badge-danger'}`}>{r.enabled ? 'Enabled' : 'Disabled'}</span></td>
                  {isAdmin && (
                    <td style={{ display: 'flex', gap: '8px' }}>
                      <Link to={`/routes/${r.id}/edit`} className="btn btn-sm btn-secondary">Edit</Link>
                      <button onClick={() => handleDelete(r)} disabled={deletingId === r.id} className="btn btn-sm btn-danger-ghost">
                        {deletingId === r.id ? '...' : 'Delete'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
