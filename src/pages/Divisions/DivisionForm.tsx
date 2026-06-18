import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createDivision, getDivision, updateDivision } from '../../api/divisionsApi';
import RoleGuard from '../../components/RoleGuard';

export default function DivisionForm() {
  return <RoleGuard allowedRoles={['admin']}><DivisionFormInner /></RoleGuard>;
}

function DivisionFormInner() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [errors, setErrors] = useState<{ name?: string; district?: string }>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setFetchLoading(true);
    getDivision(id).then((d) => { setName(d.name); setDistrict(d.district); })
      .catch((e: Error) => setApiError(e.message)).finally(() => setFetchLoading(false));
  }, [id]);

  function validate() {
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Name is required.';
    if (!district.trim()) e.district = 'District is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true); setApiError(null);
    try {
      if (isEdit && id) await updateDivision(id, { name: name.trim(), district: district.trim() });
      else await createDivision({ name: name.trim(), district: district.trim() });
      navigate('/divisions');
    } catch (err) { setApiError((err as Error).message); }
    finally { setLoading(false); }
  }

  if (fetchLoading) return <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>;

  return (
    <div style={{ maxWidth: '520px' }}>
      <div className="page-header">
        <h1 className="page-title">{isEdit ? 'Edit Division' : 'New Division'}</h1>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-field">
            <label className="form-label">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className={`form-input${errors.name ? ' error' : ''}`} placeholder="e.g. Colombo Central" />
            {errors.name && <span className="form-error-msg">{errors.name}</span>}
          </div>

          <div className="form-field">
            <label className="form-label">District *</label>
            <input value={district} onChange={(e) => setDistrict(e.target.value)}
              className={`form-input${errors.district ? ' error' : ''}`} placeholder="e.g. Western" />
            {errors.district && <span className="form-error-msg">{errors.district}</span>}
          </div>

          {apiError && <p style={{ fontSize: '13px', color: 'var(--danger)' }}>{apiError}</p>}

          <div className="form-actions">
            <button type="button" onClick={() => navigate('/divisions')} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Saving...' : isEdit ? 'Update Division' : 'Create Division'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
