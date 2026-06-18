import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getOfficers, deleteOfficer, type Officer, type OfficerFilters, RANKS } from '../../api/officersApi';
import { getDivisions, type Division } from '../../api/divisionsApi';
import { useAuth } from '../../hooks/useAuth';

export default function OfficerList() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'admin';

  const [officers, setOfficers] = useState<Officer[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [nameSearch, setNameSearch] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [rankFilter, setRankFilter] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async (filters: OfficerFilters) => {
    try { setError(null); setOfficers(await getOfficers(filters)); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void getDivisions().then(setDivisions).catch(() => {}); void load({}); }, [load]);

  function handleSearch() {
    setLoading(true);
    void load({ name: nameSearch || undefined, phone: phoneSearch || undefined, rank: rankFilter || undefined, division_id: divisionFilter || undefined });
  }

  function handleReset() {
    setNameSearch(''); setPhoneSearch(''); setRankFilter(''); setDivisionFilter('');
    setLoading(true); void load({});
  }

  async function handleDelete(o: Officer) {
    if (!confirm(`Delete officer "${o.name}"?`)) return;
    setDeletingId(o.id);
    try {
      await deleteOfficer(o.id); showToast('Officer deleted.', 'success');
      void load({ name: nameSearch || undefined, phone: phoneSearch || undefined, rank: rankFilter || undefined, division_id: divisionFilter || undefined });
    } catch (e) { showToast((e as Error).message, 'error'); }
    finally { setDeletingId(null); }
  }

  return (
    <div>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <div className="page-header">
        <h1 className="page-title">Officers</h1>
        {isAdmin && <button onClick={() => navigate('/officers/new')} className="btn btn-primary">+ Add Officer</button>}
      </div>

      <div className="filter-bar">
        <input type="text" placeholder="Search name..." value={nameSearch} onChange={(e) => setNameSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="form-input" style={{ maxWidth: '180px' }} />
        <input type="text" placeholder="Search phone..." value={phoneSearch} onChange={(e) => setPhoneSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="form-input" style={{ maxWidth: '160px' }} />
        <select value={rankFilter} onChange={(e) => setRankFilter(e.target.value)} className="form-input" style={{ maxWidth: '180px' }}>
          <option value="">All Ranks</option>
          {RANKS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={divisionFilter} onChange={(e) => setDivisionFilter(e.target.value)} className="form-input" style={{ maxWidth: '180px' }}>
          <option value="">All Divisions</option>
          {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button onClick={handleSearch} className="btn btn-primary btn-sm">Search</button>
        <button onClick={handleReset} className="btn btn-secondary btn-sm">Reset</button>
      </div>

      {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>}
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {!loading && !error && (
        <div className="card table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th><th>Rank</th><th>Mobile</th><th>Office Phone</th><th>Division</th><th>District</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {officers.length === 0 && <tr><td colSpan={isAdmin ? 7 : 6} className="table-empty">No officers found.</td></tr>}
              {officers.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 500 }}>{o.name}</td>
                  <td><span className="badge badge-neutral">{o.rank}</span></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{o.phone_mob}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{o.phone_office ?? '—'}</td>
                  <td>{o.divisions?.name ?? '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{o.divisions?.district ?? '—'}</td>
                  {isAdmin && (
                    <td style={{ display: 'flex', gap: '8px' }}>
                      <Link to={`/officers/${o.id}/edit`} className="btn btn-sm btn-secondary">Edit</Link>
                      <button onClick={() => handleDelete(o)} disabled={deletingId === o.id} className="btn btn-sm btn-danger-ghost">
                        {deletingId === o.id ? '...' : 'Delete'}
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
