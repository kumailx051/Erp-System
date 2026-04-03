import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Briefcase, CalendarClock, CheckCircle2, FileText, Download } from 'lucide-react';

const API_BASE = 'http://localhost:5000';

const timelineStages = ['Applied', 'Screening', 'Interview', 'Offer', 'Onboarding', 'Hired'];

const CandidateProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isDarkMode = false } = useOutletContext() || {};
  const token = localStorage.getItem('erp_token');

  const [candidate, setCandidate] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCandidate = async () => {
      if (!token || !id) return;

      try {
        setLoading(true);
        setError('');

        const response = await fetch(`${API_BASE}/api/hr/candidates/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || 'Failed to fetch candidate profile');
        }

        setCandidate(payload?.data?.candidate || null);
      } catch (fetchError) {
        setError(fetchError.message || 'Failed to fetch candidate profile');
      } finally {
        setLoading(false);
      }
    };

    fetchCandidate();
  }, [id, token]);

  const timeline = useMemo(() => {
    if (!candidate) return [];
    const currentIndex = timelineStages.indexOf(candidate.stage);

    return timelineStages.map((stage, idx) => ({
      title: stage,
      status: idx < currentIndex ? 'done' : idx === currentIndex ? 'active' : 'pending'
    }));
  }, [candidate]);

  const resolvedCvUrl = useMemo(() => {
    if (!candidate?.cvFileUrl) {
      return '';
    }

    if (String(candidate.cvFileUrl).startsWith('http://') || String(candidate.cvFileUrl).startsWith('https://')) {
      return candidate.cvFileUrl;
    }

    return `${API_BASE}${candidate.cvFileUrl}`;
  }, [candidate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/dashboard/hr/recruitment')} className={`p-2 rounded-xl ${isDarkMode ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Candidate Profile</h1>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Detailed profile and interview journey for candidate #{id}</p>
        </div>
      </div>

      {error && <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>{error}</div>}
      {loading && <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Loading candidate profile...</div>}

      {candidate && (
        <>
          <div className={`rounded-2xl border shadow-sm p-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 text-white text-xl font-bold flex items-center justify-center">
                {candidate.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{candidate.fullName}</h2>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{candidate.role}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
              {[
                { icon: Mail, label: 'Email', value: candidate.email || '--' },
                { icon: Phone, label: 'Phone', value: candidate.phone || '--' },
                { icon: Briefcase, label: 'Experience', value: candidate.experienceYears !== null && candidate.experienceYears !== undefined ? `${candidate.experienceYears} Years` : '--' },
                { icon: CalendarClock, label: 'Current Stage', value: candidate.stage || '--' },
              ].map((item) => (
                <div key={item.label} className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-gray-100 bg-gray-50'}`}>
                  <item.icon className={`w-4 h-4 mb-2 ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`} />
                  <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{item.label}</div>
                  <div className={`text-sm font-medium mt-0.5 break-all ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{item.value}</div>
                </div>
              ))}
            </div>

            <div className={`mt-5 rounded-xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900/70' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
                <div className="flex items-start gap-3">
                  <FileText className={`w-5 h-5 mt-0.5 ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`} />
                  <div>
                    <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>Candidate CV</p>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      {resolvedCvUrl ? 'HR can view or download the uploaded CV.' : 'No CV found for this candidate application.'}
                    </p>
                  </div>
                </div>

                {resolvedCvUrl && (
                  <div className="flex items-center gap-2">
                    <a
                      href={resolvedCvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isDarkMode ? 'bg-cyan-600 text-white hover:bg-cyan-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                      <FileText className="w-4 h-4" />
                      View CV
                    </a>
                    <a
                      href={resolvedCvUrl}
                      download
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'}`}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={`rounded-2xl border shadow-sm p-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
            <h3 className={`text-base font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Interview Timeline</h3>
            <div className="space-y-4">
              {timeline.map((step) => (
                <div key={step.title} className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {step.status === 'done' ? (
                      <CheckCircle2 className={`w-5 h-5 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-600'}`} />
                    ) : step.status === 'active' ? (
                      <div className={`w-5 h-5 rounded-full ${isDarkMode ? 'bg-cyan-400 ring-4 ring-cyan-500/20' : 'bg-blue-600 ring-4 ring-blue-100'}`} />
                    ) : (
                      <div className={`w-5 h-5 rounded-full border-2 ${isDarkMode ? 'border-slate-600' : 'border-gray-300'}`} />
                    )}
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{step.title}</div>
                    <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      {step.status === 'done' ? 'Completed' : step.status === 'active' ? 'Current stage' : 'Pending'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CandidateProfile;
