import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, CalendarClock, CheckCircle2, Download, FileText, Trophy } from 'lucide-react';

const API_BASE = 'http://localhost:5000';

const badgeClass = (value, isDarkMode) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'hired') return isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (normalized === 'rejected') return isDarkMode ? 'bg-red-500/10 text-red-300 border-red-500/20' : 'bg-red-50 text-red-700 border-red-200';
  if (normalized === 'interview' || normalized === 'offer' || normalized === 'onboarding' || normalized === 'shortlisted' || normalized === 'reviewed') {
    return isDarkMode ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' : 'bg-blue-50 text-blue-700 border-blue-200';
  }
  return isDarkMode ? 'bg-slate-500/10 text-slate-300 border-slate-500/20' : 'bg-slate-100 text-slate-700 border-slate-200';
};

const CandidateApplicationDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isDarkMode = false } = useOutletContext() || {};

  const token = localStorage.getItem('erp_token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [application, setApplication] = useState(null);

  const loadApplication = async (showLoading = false) => {
    if (!token || !id) {
      navigate('/candidate/dashboard');
      return;
    }

    try {
      if (showLoading) {
        setLoading(true);
      }
      setError('');

      const response = await fetch(`${API_BASE}/api/hr/candidate/my-applications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to fetch application details');
      }

      setApplication(payload?.data?.application || null);
    } catch (fetchError) {
      setError(fetchError.message || 'Failed to fetch application details');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadApplication(true);
  }, [id, token]);

  useEffect(() => {
    if (!token || !id) return undefined;

    const intervalId = setInterval(() => {
      loadApplication(false);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [id, token]);

  const doAction = async (url, payload) => {
    try {
      setActionLoading(true);
      setActionMessage('');
      setError('');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Action failed');
      }

      setActionMessage(result?.message || 'Action completed');
      await loadApplication(false);
    } catch (actionError) {
      setError(actionError.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const cvUrl = useMemo(() => {
    if (!application?.cvFileUrl) return '';
    if (application.cvFileUrl.startsWith('http://') || application.cvFileUrl.startsWith('https://')) {
      return application.cvFileUrl;
    }
    return `${API_BASE}${application.cvFileUrl}`;
  }, [application]);

  const offerLetterUrl = useMemo(() => {
    if (!application?.offerLetterUrl) return '';
    if (application.offerLetterUrl.startsWith('http://') || application.offerLetterUrl.startsWith('https://')) {
      return application.offerLetterUrl;
    }
    return `${API_BASE}${application.offerLetterUrl}`;
  }, [application]);

  const onboardingPackageUrl = useMemo(() => {
    if (!application?.onboardingPackageUrl) return '';
    if (application.onboardingPackageUrl.startsWith('http://') || application.onboardingPackageUrl.startsWith('https://')) {
      return application.onboardingPackageUrl;
    }
    return `${API_BASE}${application.onboardingPackageUrl}`;
  }, [application]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/candidate/dashboard')}
          className={`p-2 rounded-xl ${isDarkMode ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Application Progress</h1>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Detailed progress similar to HR timeline</p>
        </div>
      </div>

      {loading && <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Loading details...</div>}
      {error && <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>{error}</div>}
      {actionMessage && <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{actionMessage}</div>}

      {application && (
        <>
          {application.hiringStage === 'Hired' && (
            <div className={`rounded-2xl border p-6 ${isDarkMode ? 'border-emerald-500/20 bg-[linear-gradient(135deg,_rgba(16,185,129,0.15)_0%,_rgba(34,197,94,0.10)_100%)]' : 'border-emerald-200 bg-[linear-gradient(135deg,_rgba(16,185,129,0.1)_0%,_rgba(34,197,94,0.05)_100%)]'}`}>
              <div className="flex items-start gap-3">
                <div className={`text-3xl`}>🎉</div>
                <div className="flex-1">
                  <p className={`text-lg font-bold ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>Congratulations! You are Hired!</p>
                  <p className={`text-sm mt-2 ${isDarkMode ? 'text-emerald-200/80' : 'text-emerald-700'}`}>
                    Welcome aboard! Your account has been created and is ready for day-1 onboarding.
                  </p>
                  <p className={`text-sm font-semibold mt-3 ${isDarkMode ? 'text-emerald-100' : 'text-emerald-800'}`}>
                    📧 Login Info:
                  </p>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-emerald-200/70' : 'text-emerald-700'}`}>
                    Email: <span className="font-mono font-semibold">{application.applicationStatus === 'Hired' ? 'Use your registered email' : 'Check your registered email'}</span>
                  </p>
                  <p className={`text-xs ${isDarkMode ? 'text-emerald-200/70' : 'text-emerald-700'}`}>
                    Password: Your password is same also
                  </p>
                </div>
              </div>
            </div>
          )}
          {application.hiringStage === 'Rejected' && (
            <div className={`rounded-2xl border p-5 ${isDarkMode ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
              <p className="text-lg font-semibold">We are sorry, your profile does not match the requirements.</p>
              <p className="text-sm mt-1 opacity-90">{application.rejectionReason || 'Your application was rejected after review. You can apply for other relevant openings.'}</p>
            </div>
          )}

          <div className={`rounded-2xl border shadow-sm p-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{application.role}</h2>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{application.department} • {application.location}</p>
              </div>
              <div className={`inline-flex px-2.5 py-1 rounded-full text-xs border ${badgeClass(application.hiringStage, isDarkMode)}`}>
                {application.hiringStage}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
              <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-gray-100 bg-gray-50'}`}>
                <Briefcase className={`w-4 h-4 mb-2 ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`} />
                <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Application Status</div>
                <div className={`text-sm font-medium mt-0.5 ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{application.applicationStatus}</div>
              </div>
              <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-gray-100 bg-gray-50'}`}>
                <CalendarClock className={`w-4 h-4 mb-2 ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`} />
                <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Submitted</div>
                <div className={`text-sm font-medium mt-0.5 ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{new Date(application.submittedAt).toLocaleDateString()}</div>
              </div>
              <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-gray-100 bg-gray-50'}`}>
                <Trophy className={`w-4 h-4 mb-2 ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`} />
                <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>ATS Score</div>
                <div className={`text-sm font-medium mt-0.5 ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{application.score ?? 0}/100</div>
              </div>
              <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-gray-100 bg-gray-50'}`}>
                <FileText className={`w-4 h-4 mb-2 ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`} />
                <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>CV</div>
                {cvUrl ? (
                  <div className="flex items-center gap-2 mt-1.5">
                    <a href={cvUrl} target="_blank" rel="noopener noreferrer" className={`text-xs underline ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`}>View</a>
                    <a href={cvUrl} download className={`text-xs underline ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`}>
                      <Download className="w-3.5 h-3.5 inline mr-1" />
                      Download
                    </a>
                  </div>
                ) : (
                  <div className={`text-sm font-medium mt-0.5 ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>Not available</div>
                )}
              </div>
            </div>
          </div>

          {application.hiringStage === 'Interview' && Array.isArray(application.interviewSlots) && application.interviewSlots.length > 0 && (
            <div className={`rounded-2xl border shadow-sm p-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
              <h3 className={`text-base font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Interview Slots Shared by HR</h3>
              {Number.isInteger(application.selectedSlotIndex) && (
                <div className={`rounded-lg border px-3 py-2 text-xs mb-3 ${isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                  Your interview slot is confirmed. Slot change is disabled.
                </div>
              )}
              <div className="space-y-3">
                {application.interviewSlots.map((slot, index) => {
                  const selected = application.selectedSlotIndex === index;
                  const hasSelectedSlot = Number.isInteger(application.selectedSlotIndex);
                  return (
                    <div key={`${slot.date}-${slot.time}-${index}`} className={`rounded-xl border p-3 flex items-center justify-between ${selected ? (isDarkMode ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-blue-300 bg-blue-50') : (isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-gray-50')}`}>
                      <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{slot.label || `Slot ${index + 1}`}</p>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{slot.date} at {slot.time}</p>
                      </div>
                      {!selected && !hasSelectedSlot && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => doAction(`${API_BASE}/api/hr/candidate/my-applications/${application.id}/select-slot`, { slotIndex: index })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-60`}
                        >
                          Select This Slot
                        </button>
                      )}
                      {selected && <span className={`text-xs font-semibold ${isDarkMode ? 'text-cyan-300' : 'text-blue-700'}`}>Selected</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {application.hiringStage === 'Offer' && (
            <div className={`rounded-2xl border shadow-sm p-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
              <h3 className={`text-base font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Offer Letter</h3>
              {offerLetterUrl ? (
                <div className="flex flex-wrap items-center gap-2">
                  <a href={offerLetterUrl} target="_blank" rel="noopener noreferrer" className={`px-3 py-2 rounded-lg text-sm font-medium text-white ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-700'}`}>View Offer</a>
                  <a href={offerLetterUrl} download className={`px-3 py-2 rounded-lg text-sm font-medium ${isDarkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'}`}>Download Offer</a>
                  <button
                    type="button"
                    disabled={actionLoading || application.offerDecision === 'accepted'}
                    onClick={() => doAction(`${API_BASE}/api/hr/candidate/my-applications/${application.id}/offer-response`, { decision: 'accept' })}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold text-white ${isDarkMode ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-700'} disabled:opacity-60`}
                  >
                    Accept Offer
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading || application.offerDecision === 'rejected'}
                    onClick={() => doAction(`${API_BASE}/api/hr/candidate/my-applications/${application.id}/offer-response`, { decision: 'reject' })}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold text-white ${isDarkMode ? 'bg-red-600 hover:bg-red-500' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-60`}
                  >
                    Reject Offer
                  </button>
                </div>
              ) : (
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>HR has not uploaded the offer letter yet.</p>
              )}
            </div>
          )}

          {application.hiringStage === 'Onboarding' && (
            <div className={`rounded-2xl border shadow-sm p-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
              <h3 className={`text-base font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Onboarding Package</h3>
              {onboardingPackageUrl ? (
                <div className="flex flex-wrap items-center gap-2">
                  <a href={onboardingPackageUrl} target="_blank" rel="noopener noreferrer" className={`px-3 py-2 rounded-lg text-sm font-medium text-white ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-700'}`}>View Package</a>
                  <a href={onboardingPackageUrl} download className={`px-3 py-2 rounded-lg text-sm font-medium ${isDarkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'}`}>Download</a>
                  <button
                    type="button"
                    disabled={actionLoading || application.onboardingDecision === 'accepted'}
                    onClick={() => doAction(`${API_BASE}/api/hr/candidate/my-applications/${application.id}/onboarding-response`, { decision: 'accept' })}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold text-white ${isDarkMode ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-700'} disabled:opacity-60`}
                  >
                    Acknowledge Onboarding
                  </button>
                </div>
              ) : (
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>HR has not shared onboarding files yet.</p>
              )}
              {application.onboardingNotes && (
                <p className={`text-sm mt-3 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{application.onboardingNotes}</p>
              )}
            </div>
          )}

          <div className={`rounded-2xl border shadow-sm p-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
            <h3 className={`text-base font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Hiring Timeline</h3>
            <div className="space-y-4">
              {(application.timeline || []).map((step) => (
                <div key={step.title} className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {step.status === 'Completed' ? (
                      <CheckCircle2 className={`w-5 h-5 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-600'}`} />
                    ) : step.status === 'Current stage' ? (
                      <div className={`w-5 h-5 rounded-full ${isDarkMode ? 'bg-cyan-400 ring-4 ring-cyan-500/20' : 'bg-blue-600 ring-4 ring-blue-100'}`} />
                    ) : (
                      <div className={`w-5 h-5 rounded-full border-2 ${isDarkMode ? 'border-slate-600' : 'border-gray-300'}`} />
                    )}
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{step.title}</div>
                    <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{step.status}</div>
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

export default CandidateApplicationDetailPage;
