import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDivisions, deleteDivision, type Division } from '../../api/divisionsApi';
import { useAuth } from '../../hooks/useAuth';

export default function DivisionList() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'admin';

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    try { setError(null); setDivisions(await getDivisions()); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function handleDelete(div: Division) {
    if ((div.officer_count ?? 0) > 0) { showToast('Cannot delete: division has linked officers.', 'error'); return; }
    if (!confirm(`Delete division "${div.name}"?`)) return;
    setDeletingId(div.id);
    try { await deleteDivision(div.id); showToast('Division deleted.', 'success'); void load(); }
    catch (e) { showToast((e as Error).message, 'error'); }
    finally { setDeletingId(null); }
  }

  return (
    <div>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <div className="page-header">
        <h1 className="page-title">Divisions</h1>
        {isAdmin && <button onClick={() => navigate('/divisions/new')} className="btn btn-primary">+ Add Division</button>}
      </div>

      {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>}
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {!loading && !error && (
        <div className="card table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>District</th>
                <th>Officers</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {divisions.length === 0 && (
                <tr><td colSpan={isAdmin ? 4 : 3} className="table-empty">No divisions found.</td></tr>
              )}
              {divisions.map((div) => (
                <tr key={div.id}>
                  <td style={{ fontWeight: 500 }}>{div.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{div.district}</td>
                  <td>
                    <span className="badge badge-neutral">{div.officer_count ?? 0}</span>
                  </td>
                  {isAdmin && (
                    <td style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Link to={`/divisions/${div.id}/edit`} className="btn btn-sm btn-secondary">Edit</Link>
                      <button onClick={() => handleDelete(div)} disabled={deletingId === div.id} className="btn btn-sm btn-danger-ghost">
                        {deletingId === div.id ? '...' : 'Delete'}
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
