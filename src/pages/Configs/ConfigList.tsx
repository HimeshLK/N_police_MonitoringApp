import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getConfigs, deleteConfig, type DashboardConfig } from '../../api/configsApi';
import { useAuth } from '../../hooks/useAuth';

export default function ConfigList() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'admin';

  const [configs, setConfigs] = useState<DashboardConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  function showToast(msg: string, type: 'success' | 'error') { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); }

  async function load() {
    try { setError(null); setConfigs(await getConfigs()); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function handleDelete(cfg: DashboardConfig) {
    if (!confirm(`Delete config "${cfg.config_name}"?`)) return;
    setDeletingId(cfg.id);
    try { await deleteConfig(cfg.id); showToast('Config deleted.', 'success'); void load(); }
    catch (e) { showToast((e as Error).message, 'error'); }
    finally { setDeletingId(null); }
  }

  return (
    <div>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <div className="page-header">
        <h1 className="page-title">Dashboard Configs</h1>
        {isAdmin && <button onClick={() => navigate('/configs/new')} className="btn btn-primary">+ Add Config</button>}
      </div>

      {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>}
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {!loading && !error && (
        <div className="card table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Config Name</th><th>App Name</th><th>Version</th><th>Location</th><th>Status</th>{isAdmin && <th>Actions</th>}</tr>
            </thead>
            <tbody>
              {configs.length === 0 && <tr><td colSpan={isAdmin ? 6 : 5} className="table-empty">No configs found.</td></tr>}
              {configs.map((cfg) => (
                <tr key={cfg.id}>
                  <td><span className="code-tag">{cfg.config_name}</span></td>
                  <td style={{ fontWeight: 500 }}>{cfg.app_name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{cfg.config_version}</td>
                  <td>{cfg.location}</td>
                  <td><span className={`badge ${cfg.enabled ? 'badge-success' : 'badge-danger'}`}>{cfg.enabled ? 'Enabled' : 'Disabled'}</span></td>
                  {isAdmin && (
                    <td style={{ display: 'flex', gap: '8px' }}>
                      <Link to={`/configs/${cfg.id}/edit`} className="btn btn-sm btn-secondary">Edit</Link>
                      <button onClick={() => handleDelete(cfg)} disabled={deletingId === cfg.id} className="btn btn-sm btn-danger-ghost">
                        {deletingId === cfg.id ? '...' : 'Delete'}
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
