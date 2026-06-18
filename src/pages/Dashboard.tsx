import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../api/supabase';
import { useAuth } from '../hooks/useAuth';
import { formatTime } from '../utils/formatTime';

interface Stats {
  divisions: number;
  officers: number;
  schedules: number;
  routes: number;
  configs: number;
  activeRoutes: number;
}

interface RecentRoute {
  id: string;
  screen_id: string;
  title: string;
  location_name: string;
  enabled: boolean;
  center_lat: number;
  center_lng: number;
}

interface ActiveSchedule {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentRoutes, setRecentRoutes] = useState<RecentRoute[]>([]);
  const [schedules, setSchedules] = useState<ActiveSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [
        { count: divisions },
        { count: officers },
        { count: scheduleCount },
        { count: routes },
        { count: configs },
        { count: activeRoutes },
        { data: recentRoutesData },
        { data: schedulesData },
      ] = await Promise.all([
        supabase.from('divisions').select('*', { count: 'exact', head: true }),
        supabase.from('officers').select('*', { count: 'exact', head: true }),
        supabase.from('schedules').select('*', { count: 'exact', head: true }),
        supabase.from('route_allocations').select('*', { count: 'exact', head: true }),
        supabase.from('dashboard_configs').select('*', { count: 'exact', head: true }),
        supabase.from('route_allocations').select('*', { count: 'exact', head: true }).eq('enabled', true),
        supabase.from('route_allocations').select('id, screen_id, title, location_name, enabled, center_lat, center_lng').order('created_at', { ascending: false }).limit(5),
        supabase.from('schedules').select('id, name, start_time, end_time').order('start_time').limit(4),
      ]);
      setStats({
        divisions: divisions ?? 0,
        officers: officers ?? 0,
        schedules: scheduleCount ?? 0,
        routes: routes ?? 0,
        configs: configs ?? 0,
        activeRoutes: activeRoutes ?? 0,
      });
      setRecentRoutes((recentRoutesData as RecentRoute[]) ?? []);
      setSchedules((schedulesData as ActiveSchedule[]) ?? []);
      setLoading(false);
    }
    void load();
  }, []);

  const statCards = stats ? [
    { label: 'Divisions', value: stats.divisions, icon: DivisionIcon, to: '/divisions', color: '#162447', accent: 'var(--police-gold)' },
    { label: 'Officers', value: stats.officers, icon: OfficerIcon, to: '/officers', color: '#0D2137', accent: '#34C759' },
    { label: 'Active Routes', value: stats.activeRoutes, sub: `of ${stats.routes} total`, icon: RouteIcon, to: '/routes', color: '#0D1B3E', accent: '#0A84FF' },
    { label: 'Schedules', value: stats.schedules, icon: ScheduleIcon, to: '/schedules', color: '#1A2744', accent: '#FF9F0A' },
    { label: 'Configs', value: stats.configs, icon: ConfigIcon, to: '/configs', color: '#122040', accent: '#BF5AF2' },
  ] : [];

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
          {/* Police badge small */}
          <div style={{
            width: '40px', height: '40px', flexShrink: 0,
            background: 'linear-gradient(145deg, var(--police-navy), var(--police-navy2))',
            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--police-gold-bg)',
            boxShadow: '0 2px 8px rgba(13,27,62,0.2)',
          }}>
            <svg width="22" height="22" viewBox="0 0 46 46" fill="none">
              <polygon points="23,3 27.5,16 41,16 30.5,24.5 34.5,38 23,30 11.5,38 15.5,24.5 5,16 18.5,16"
                fill="var(--police-gold)" strokeLinejoin="round" />
              <circle cx="23" cy="22" r="8" stroke="var(--police-navy)" strokeWidth="2.5" fill="none" />
              <circle cx="23" cy="22" r="3" fill="var(--police-navy)" />
            </svg>
          </div>
          <div>
            <h1 className="page-title" style={{ marginBottom: '2px' }}>Operations Dashboard</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Sri Lanka Police — Traffic Division &nbsp;·&nbsp; {profile?.full_name ?? profile?.role ?? 'Officer'}
            </p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card" style={{ height: '110px', background: 'var(--border-light)', animation: 'pulse 1.5s ease infinite' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {statCards.map((c) => (
            <Link key={c.label} to={c.to} style={{ textDecoration: 'none' }}>
              <div style={{
                background: c.color,
                borderRadius: 'var(--r-lg)',
                padding: '20px',
                border: `1px solid rgba(255,255,255,0.06)`,
                boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.28)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.18)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <c.icon color={c.accent} />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: c.accent, opacity: 0.8, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>View →</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1, marginBottom: '4px' }}>{c.value}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{c.label}</div>
                {c.sub && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{c.sub}</div>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Bottom 2-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Recent route allocations */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>Recent Route Allocations</h2>
            <Link to="/routes" style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>View all →</Link>
          </div>
          {loading ? (
            <div style={{ padding: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>Loading…</div>
          ) : recentRoutes.length === 0 ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>No routes configured yet.</div>
          ) : (
            <div>
              {recentRoutes.map((r, i) => (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 20px',
                  borderBottom: i < recentRoutes.length - 1 ? '1px solid var(--border-light)' : 'none',
                }}>
                  <div style={{
                    width: '36px', height: '36px', flexShrink: 0, borderRadius: '8px',
                    background: r.enabled ? 'var(--police-gold-bg)' : 'var(--border-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: r.enabled ? 'var(--police-gold)' : 'var(--text-tertiary)' }}>{r.screen_id}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{r.location_name} &nbsp;·&nbsp; {r.center_lat.toFixed(4)}, {r.center_lng.toFixed(4)}</div>
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: 'var(--r-pill)',
                    background: r.enabled ? 'var(--success-bg)' : 'var(--danger-bg)',
                    color: r.enabled ? 'var(--success-text)' : 'var(--danger-text)',
                  }}>{r.enabled ? 'Active' : 'Off'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Schedules */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>Duty Schedules</h2>
            <Link to="/schedules" style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>View all →</Link>
          </div>
          {loading ? (
            <div style={{ padding: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>Loading…</div>
          ) : schedules.length === 0 ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>No schedules added yet.</div>
          ) : (
            <div>
              {schedules.map((sc, i) => {
                const start = new Date(sc.start_time);
                const end = new Date(sc.end_time);
                const durationH = Math.round((end.getTime() - start.getTime()) / 3_600_000);
                return (
                  <div key={sc.id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px 20px',
                    borderBottom: i < schedules.length - 1 ? '1px solid var(--border-light)' : 'none',
                  }}>
                    <div style={{
                      width: '36px', height: '36px', flexShrink: 0, borderRadius: '8px',
                      background: 'rgba(255,159,10,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="#FF9F0A" strokeWidth="2"/>
                        <path d="M12 7v5l3 3" stroke="#FF9F0A" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sc.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        {formatTime(start)} — {formatTime(end)}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: 'var(--r-pill)',
                      background: 'rgba(255,159,10,0.12)', color: '#92400E',
                    }}>{durationH}h</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Banner */}
      <div style={{
        marginTop: '20px', padding: '16px 20px',
        background: 'linear-gradient(135deg, var(--police-navy) 0%, var(--police-navy2) 100%)',
        borderRadius: 'var(--r-lg)', display: 'flex', alignItems: 'center', gap: '14px',
        border: '1px solid rgba(200,169,81,0.2)',
      }}>
        <svg width="28" height="28" viewBox="0 0 46 46" fill="none" style={{ flexShrink: 0 }}>
          <polygon points="23,3 27.5,16 41,16 30.5,24.5 34.5,38 23,30 11.5,38 15.5,24.5 5,16 18.5,16"
            fill="var(--police-gold)" strokeLinejoin="round" />
          <circle cx="23" cy="22" r="8" stroke="var(--police-navy)" strokeWidth="2.5" fill="none" />
          <circle cx="23" cy="22" r="3" fill="var(--police-navy)" />
        </svg>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--police-gold)', marginBottom: '2px' }}>Sri Lanka Police — Traffic Division</p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Officer Monitoring &amp; Route Allocation System &nbsp;·&nbsp; Authorised Access Only</p>
        </div>
      </div>
    </div>
  );
}

/* ── Inline icon components ── */
function DivisionIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="2"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="2"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth="2"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth="2"/>
    </svg>
  );
}
function OfficerIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function RouteIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="5" cy="12" r="2.5" stroke={color} strokeWidth="2"/>
      <circle cx="19" cy="12" r="2.5" stroke={color} strokeWidth="2"/>
      <path d="M7.5 12h9" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 5v14" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3"/>
    </svg>
  );
}
function ScheduleIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2"/>
      <path d="M12 7v5l3 3" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function ConfigIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2"/>
      <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"
        stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
