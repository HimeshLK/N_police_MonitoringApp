import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createOfficer, getOfficer, updateOfficer, RANKS } from '../../api/officersApi';
import { getDivisions, type Division } from '../../api/divisionsApi';
import RoleGuard from '../../components/RoleGuard';

export default function OfficerForm() {
  return <RoleGuard allowedRoles={['admin']}><OfficerFormInner /></RoleGuard>;
}

interface FormErrors { name?: string; phone_mob?: string; rank?: string; }

function OfficerFormInner() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [name, setName] = useState('');
  const [phoneMob, setPhoneMob] = useState('');
  const [phoneOffice, setPhoneOffice] = useState('');
  const [rank, setRank] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    void getDivisions().then(setDivisions).catch(() => {});
    if (!id) return;
    setFetchLoading(true);
    getOfficer(id).then((o) => { setName(o.name); setPhoneMob(o.phone_mob); setPhoneOffice(o.phone_office ?? ''); setRank(o.rank); setDivisionId(o.division_id ?? ''); })
      .catch((e: Error) => setApiError(e.message)).finally(() => setFetchLoading(false));
  }, [id]);

  function validate(): boolean {
    const e: FormErrors = {};
    if (!name.trim()) e.name = 'Name is required.';
    if (!phoneMob.trim()) e.phone_mob = 'Mobile phone is required.';
    if (!rank) e.rank = 'Rank is required.';
    setErrors(e); return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); if (!validate()) return;
    setLoading(true); setApiError(null);
    try {
      const input = { name: name.trim(), phone_mob: phoneMob.trim(), phone_office: phoneOffice.trim() || null, rank, division_id: divisionId || null };
      if (isEdit && id) await updateOfficer(id, input); else await createOfficer(input);
      navigate('/officers');
    } catch (err) { setApiError((err as Error).message); }
    finally { setLoading(false); }
  }

  if (fetchLoading) return <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>;

  return (
    <div style={{ maxWidth: '640px' }}>
      <div className="page-header">
        <h1 className="page-title">{isEdit ? 'Edit Officer' : 'New Officer'}</h1>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label">Full Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={`form-input${errors.name ? ' error' : ''}`} placeholder="Officer name" />
              {errors.name && <span className="form-error-msg">{errors.name}</span>}
            </div>
            <div className="form-field">
              <label className="form-label">Rank *</label>
              <select value={rank} onChange={(e) => setRank(e.target.value)} className={`form-input${errors.rank ? ' error' : ''}`}>
                <option value="">Select rank...</option>
                {RANKS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {errors.rank && <span className="form-error-msg">{errors.rank}</span>}
            </div>
            <div className="form-field">
              <label className="form-label">Mobile Phone *</label>
              <input type="tel" value={phoneMob} onChange={(e) => setPhoneMob(e.target.value)} className={`form-input${errors.phone_mob ? ' error' : ''}`} />
              {errors.phone_mob && <span className="form-error-msg">{errors.phone_mob}</span>}
            </div>
            <div className="form-field">
              <label className="form-label">Office Phone <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span></label>
              <input type="tel" value={phoneOffice} onChange={(e) => setPhoneOffice(e.target.value)} className="form-input" />
            </div>
            <div className="form-field form-grid-full">
              <label className="form-label">Division</label>
              <select value={divisionId} onChange={(e) => setDivisionId(e.target.value)} className="form-input">
                <option value="">No division assigned</option>
                {divisions.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.district}</option>)}
              </select>
            </div>
          </div>

          {apiError && <p style={{ fontSize: '13px', color: 'var(--danger)' }}>{apiError}</p>}
          <div className="form-actions">
            <button type="button" onClick={() => navigate('/officers')} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Saving...' : isEdit ? 'Update Officer' : 'Create Officer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
