import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Briefcase, Clock3, Trophy, UserCheck } from 'lucide-react';

const API_BASE = 'http://localhost:5000';
const STAGE_ORDER = ['Applied', 'Screening', 'Interview', 'Offer', 'Onboarding', 'Hired'];

const statusClass = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'hired') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (normalized === 'rejected') return 'bg-red-100 text-red-700 border-red-200';
  if (normalized === 'interview' || normalized === 'offer' || normalized === 'onboarding') return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

const CandidateDashboardPage = () => {
  const navigate = useNavigate();
  const { isDarkMode = false } = useOutletContext() || {};
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({ applications: [], summary: { total: 0, interview: 0, offers: 0, hired: 0 } });

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('erp_user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const token = localStorage.getItem('erp_token');

  const fetchApplications = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError('');

      const response = await fetch(`${API_BASE}/api/hr/candidate/my-applications`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to load candidate dashboard');
      }

      setData({
        applications: Array.isArray(payload?.data?.applications) ? payload.data.applications : [],
        summary: payload?.data?.summary || { total: 0, interview: 0, offers: 0, hired: 0 }
      });
    } catch (fetchError) {
      setError(fetchError.message || 'Failed to load candidate dashboard');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!token || user?.role !== 'candidate') {
      navigate('/login');
      return;
    }

    fetchApplications(true);

    const intervalId = setInterval(() => {
      fetchApplications(false);
    }, 10000);

    const onFocus = () => fetchApplications(false);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [navigate, token, user?.role]);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-2xl p-6 lg:p-8 border ${
          isDarkMode
            ? 'bg-[linear-gradient(135deg,_rgba(34,211,238,0.16)_0%,_rgba(37,99,235,0.30)_45%,_rgba(6,182,212,0.24)_100%)] border-cyan-400/15 shadow-[0_10px_40px_rgba(8,21,31,0.32)]'
            : 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 border-blue-300/30'
        }`}
      >
        <div className="absolute top-0 right-0 w-52 h-52 bg-white/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/2 w-44 h-44 bg-white/10 rounded-full blur-3xl translate-y-1/2" />
        <header className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Candidate Dashboard</h1>
            <p className="text-sm text-white/80 mt-1">Track your job applications and hiring progress</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-2 rounded-xl text-sm ${isDarkMode ? 'bg-slate-950/45 border border-cyan-300/20 text-cyan-100' : 'bg-white/95 border border-blue-100 text-slate-700'}`}>
              Signed in as <span className="font-semibold">{user?.email || 'candidate'}</span>
            </div>
          </div>
        </header>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Applications', value: data.summary.total, icon: Briefcase },
            { label: 'Interviews', value: data.summary.interview, icon: Clock3 },
            { label: 'Offers', value: data.summary.offers, icon: UserCheck },
            { label: 'Hired', value: data.summary.hired, icon: Trophy }
          ].map((item) => (
            <div key={item.label} className={`rounded-2xl p-4 border ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/25 shadow-sm' : 'bg-white border-gray-100 shadow-sm'}`}>
              <item.icon className={`w-5 h-5 ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`} />
              <div className={`text-2xl font-bold mt-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.value}</div>
              <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.label}</div>
            </div>
          ))}
      </div>

      {loading && <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading applications...</div>}
      {error && <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>{error}</div>}

      {!loading && !error && (
        <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/25' : 'bg-white border-slate-200'}`}>
          <div className={`px-5 py-4 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <h2 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>My Applications</h2>
            </div>

            {data.applications.length === 0 ? (
              <div className={`px-5 py-8 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>No applications found for your account.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px]">
                  <thead>
                    <tr className={`border-b ${isDarkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50/80'}`}>
                      <th className={`px-5 py-3 text-left text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Role</th>
                      <th className={`px-5 py-3 text-left text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Department</th>
                      <th className={`px-5 py-3 text-left text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Application</th>
                      <th className={`px-5 py-3 text-left text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Hiring Stage</th>
                      <th className={`px-5 py-3 text-left text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Progress</th>
                      <th className={`px-5 py-3 text-left text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Submitted</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                    {data.applications.map((item) => {
                      const stageIndex = Math.max(0, STAGE_ORDER.indexOf(item.hiringStage));
                      const progress = Math.round(((stageIndex + 1) / STAGE_ORDER.length) * 100);

                      return (
                        <tr key={item.id} className={`${isDarkMode ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50/60'} cursor-pointer`} onClick={() => navigate(`/candidate/application/${item.id}`)}>
                          <td className={`px-5 py-3.5 text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(`/candidate/application/${item.id}`);
                              }}
                              className={`${isDarkMode ? 'text-cyan-300 hover:text-cyan-200' : 'text-blue-700 hover:text-blue-800'} underline text-left`}
                            >
                              {item.role}
                            </button>
                          </td>
                          <td className={`px-5 py-3.5 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{item.department}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs border ${statusClass(item.applicationStatus)}`}>
                              {item.applicationStatus}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs border ${statusClass(item.hiringStage)}`}>
                              {item.hiringStage}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 w-56">
                            <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                              <div className="h-full bg-blue-500" style={{ width: `${progress}%` }} />
                            </div>
                            <div className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{progress}%</div>
                          </td>
                          <td className={`px-5 py-3.5 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{new Date(item.submittedAt).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default CandidateDashboardPage;
