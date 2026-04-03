import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, Laptop, Building2, ShieldCheck, AlertTriangle } from 'lucide-react';

const API_BASE = 'http://localhost:5000';

const stageOrder = ['Applied', 'Screening', 'Interview', 'Offer', 'Onboarding', 'Hired'];

const getTimelineRows = (stage) => {
  const currentIndex = stageOrder.indexOf(stage);

  return stageOrder.map((title, idx) => ({
    title,
    status: idx < currentIndex ? 'Completed' : idx === currentIndex ? 'In Progress' : 'Pending'
  }));
};

const getNextStage = (currentStage) => {
  const index = stageOrder.indexOf(currentStage);
  if (index === -1 || index >= stageOrder.length - 1) return null;
  return stageOrder[index + 1];
};

const toAbsoluteAssetUrl = (url) => {
  if (!url) return '';
  if (String(url).startsWith('http://') || String(url).startsWith('https://')) return url;
  return `${API_BASE}${url}`;
};

const formatPublishedDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const OnboardingPage = () => {
  const { isDarkMode = false } = useOutletContext() || {};
  const token = localStorage.getItem('erp_token');

  const [candidates, setCandidates] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [interviewSlots, setInterviewSlots] = useState([
    { date: '', time: '' },
    { date: '', time: '' },
    { date: '', time: '' }
  ]);
  const [offerLetterFile, setOfferLetterFile] = useState(null);
  const [onboardingPackageFile, setOnboardingPackageFile] = useState(null);
  const [onboardingNotes, setOnboardingNotes] = useState('');

  const fetchCandidates = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE}/api/hr/candidates`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to fetch candidates');
      }

      const fetched = payload?.data?.candidates || [];
      setCandidates(fetched);

      if (!selectedId && fetched.length > 0) {
        setSelectedId(String(fetched[0].id));
      }
    } catch (fetchError) {
      setError(fetchError.message || 'Failed to fetch candidates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => String(candidate.id) === String(selectedId)) || null,
    [candidates, selectedId]
  );

  const isInterviewSlotsPublished = Boolean(selectedCandidate?.interviewSlotsPublishedAt);
  const publishedDateLabel = formatPublishedDate(selectedCandidate?.interviewSlotsPublishedAt);

  useEffect(() => {
    const existingSlots = Array.isArray(selectedCandidate?.interviewSlots) ? selectedCandidate.interviewSlots.slice(0, 3) : [];
    if (existingSlots.length === 0) {
      setInterviewSlots([
        { date: '', time: '' },
        { date: '', time: '' },
        { date: '', time: '' }
      ]);
      return;
    }

    const normalized = [...existingSlots];
    while (normalized.length < 3) {
      normalized.push({ date: '', time: '' });
    }

    setInterviewSlots(
      normalized.map((slot) => ({
        date: String(slot?.date || ''),
        time: String(slot?.time || '')
      }))
    );
  }, [selectedCandidate?.id, selectedCandidate?.interviewSlots]);

  const checklist = getTimelineRows(selectedCandidate?.stage || 'Applied');

  const statusStyle = {
    Completed: isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'In Progress': isDarkMode ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' : 'bg-blue-50 text-blue-700 border-blue-200',
    Pending: isDarkMode ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200',
  };

  const moveToNextStage = async () => {
    if (!token || !selectedCandidate) return;

    const nextStage = getNextStage(selectedCandidate.stage);
    if (!nextStage) return;

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const response = await fetch(`${API_BASE}/api/hr/candidates/${selectedCandidate.id}/stage`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ stage: nextStage })
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to update candidate stage');
      }

      const atsScore = payload?.data?.ats?.total;
      if (nextStage === 'Screening' && typeof atsScore === 'number') {
        setMessage(`Candidate moved to ${nextStage}. ATS score: ${atsScore}/100`);
      } else {
        setMessage(`Candidate moved to ${nextStage}`);
      }
      await fetchCandidates();
    } catch (updateError) {
      setError(updateError.message || 'Failed to update candidate stage');
    } finally {
      setSaving(false);
    }
  };

  const rejectCandidate = async () => {
    if (!token || !selectedCandidate) return;

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const response = await fetch(`${API_BASE}/api/hr/candidates/${selectedCandidate.id}/stage`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          stage: 'Rejected',
          reason: 'Sorry, your profile does not match the requirements for this role at this stage.'
        })
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to reject candidate');
      }

      setMessage('Candidate rejected successfully');
      await fetchCandidates();
    } catch (updateError) {
      setError(updateError.message || 'Failed to reject candidate');
    } finally {
      setSaving(false);
    }
  };

  const publishInterviewSlots = async () => {
    if (!token || !selectedCandidate) return;

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const response = await fetch(`${API_BASE}/api/hr/candidates/${selectedCandidate.id}/interview-slots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          slots: interviewSlots.map((slot, index) => ({
            date: slot.date,
            time: slot.time,
            label: `Slot ${index + 1}`
          }))
        })
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to publish interview slots');
      }

      setMessage('Interview slots shared with candidate');
      await fetchCandidates();
    } catch (slotError) {
      setError(slotError.message || 'Failed to publish interview slots');
    } finally {
      setSaving(false);
    }
  };

  const uploadOfferLetter = async () => {
    if (!token || !selectedCandidate || !offerLetterFile) return;

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const formData = new FormData();
      formData.append('offerLetter', offerLetterFile);

      const response = await fetch(`${API_BASE}/api/hr/candidates/${selectedCandidate.id}/offer-letter`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to upload offer letter');
      }

      setMessage('Offer letter uploaded and visible to candidate');
      setOfferLetterFile(null);
      await fetchCandidates();
    } catch (uploadError) {
      setError(uploadError.message || 'Failed to upload offer letter');
    } finally {
      setSaving(false);
    }
  };

  const uploadOnboardingPackage = async () => {
    if (!token || !selectedCandidate) return;

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const formData = new FormData();
      if (onboardingPackageFile) {
        formData.append('onboardingPackage', onboardingPackageFile);
      }
      formData.append('notes', onboardingNotes || '');

      const response = await fetch(`${API_BASE}/api/hr/candidates/${selectedCandidate.id}/onboarding-package`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to upload onboarding package');
      }

      setMessage('Onboarding package shared with candidate');
      setOnboardingPackageFile(null);
      await fetchCandidates();
    } catch (uploadError) {
      setError(uploadError.message || 'Failed to upload onboarding package');
    } finally {
      setSaving(false);
    }
  };

  const onboardingPool = candidates.filter(
    (candidate) => candidate.stage !== 'Rejected' || candidate.offerDecision === 'rejected'
  );
  const newJoineesThisMonth = candidates.filter((candidate) => {
    if (!candidate.createdAt) return false;
    const d = new Date(candidate.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const completionPercent = selectedCandidate?.stage === 'Hired' ? 100 : selectedCandidate?.stage === 'Onboarding' ? 78 : selectedCandidate?.stage === 'Offer' ? 52 : 35;
  const pendingChecklistCount = checklist.filter((item) => item.status !== 'Completed').length;

  return (
    <div className="space-y-6">
      <div>
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Onboarding</h1>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Track pre-joining and day-1 onboarding tasks</p>
        </div>
      </div>

      {error && <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>{error}</div>}
      {message && <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{message}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'New Joinees This Month', value: String(newJoineesThisMonth), icon: Building2, bg: 'bg-blue-50', color: 'text-blue-600' },
          { label: 'Checklist Completion', value: `${completionPercent}%`, icon: ClipboardCheck, bg: 'bg-emerald-50', color: 'text-emerald-600' },
          { label: 'Pending Checklist Items', value: String(pendingChecklistCount), icon: Laptop, bg: 'bg-amber-50', color: 'text-amber-600' },
        ].map((card) => (
          <div key={card.label} className={`rounded-2xl border shadow-sm p-5 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${isDarkMode ? 'bg-white/5' : card.bg}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{card.value}</div>
            <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{card.label}</div>
          </div>
        ))}
      </div>

      <div className={`rounded-2xl border shadow-sm p-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <ShieldCheck className={`w-4 h-4 ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`} />
            <h3 className="text-base font-semibold">Onboarding Checklist</h3>
          </div>

          <div className="w-full sm:w-auto sm:min-w-[270px]">
            <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Select User
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'border-gray-200 text-gray-700'}`}
            >
              {onboardingPool.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.fullName} - {candidate.stage}
                  {candidate.offerDecision === 'accepted' ? ' (Offer Accepted)' : ''}
                  {candidate.offerDecision === 'rejected' ? ' (Offer Rejected)' : ''}
                  {candidate.stage === 'Onboarding' && candidate.onboardingDecision === 'accepted' ? ' (Onboarding Acknowledged)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!loading && onboardingPool.length === 0 && (
          <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>No onboarding candidates available.</div>
        )}

        {selectedCandidate && (
          <>
            <div className={`text-sm mb-3 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
              Candidate: <span className={`font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{selectedCandidate.fullName}</span>  Role: {selectedCandidate.role}  Stage: {selectedCandidate.stage}
            </div>

            {(selectedCandidate.stage === 'Offer' || selectedCandidate.offerDecision === 'accepted' || selectedCandidate.offerDecision === 'rejected') && (
              <div
                className={`mb-4 rounded-xl border px-4 py-3 ${
                  selectedCandidate.offerDecision === 'accepted'
                    ? (isDarkMode
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700')
                    : selectedCandidate.offerDecision === 'rejected'
                      ? (isDarkMode
                        ? 'border-red-500/30 bg-red-500/10 text-red-200'
                        : 'border-red-200 bg-red-50 text-red-700')
                      : (isDarkMode
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                        : 'border-amber-200 bg-amber-50 text-amber-700')
                }`}
              >
                {selectedCandidate.offerDecision === 'accepted' ? (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">Offer accepted by candidate</p>
                      <p className="text-xs opacity-90 mt-0.5">Candidate has accepted the offer. You can proceed to onboarding.</p>
                    </div>
                  </div>
                ) : selectedCandidate.offerDecision === 'rejected' ? (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">Offer rejected by candidate</p>
                      <p className="text-xs opacity-90 mt-0.5">
                        {selectedCandidate.candidateRejectionReason || 'Candidate declined the offer.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">Waiting for candidate response</p>
                      <p className="text-xs opacity-90 mt-0.5">Offer is shared. Response from candidate is pending.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedCandidate.stage === 'Onboarding' && (
              <div
                className={`mb-4 rounded-xl border px-4 py-3 ${
                  selectedCandidate.onboardingDecision === 'accepted'
                    ? (isDarkMode
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700')
                    : (isDarkMode
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                      : 'border-amber-200 bg-amber-50 text-amber-700')
                }`}
              >
                {selectedCandidate.onboardingDecision === 'accepted' ? (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">Onboarding acknowledged by candidate</p>
                      <p className="text-xs opacity-90 mt-0.5">Candidate has reviewed and acknowledged the onboarding package. All set for day-1 onboarding.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">Waiting for candidate acknowledgment</p>
                      <p className="text-xs opacity-90 mt-0.5">Onboarding package shared. Awaiting candidate confirmation.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_520px] gap-5 items-start">
              <div>
                {selectedCandidate.stage === 'Interview' && selectedCandidate.selectedInterviewSlot && (
                  <div className={`rounded-xl border px-3 py-2 text-sm mb-3 ${isDarkMode ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                    Candidate selected interview slot: {selectedCandidate.selectedInterviewSlot.date} at {selectedCandidate.selectedInterviewSlot.time}
                  </div>
                )}

                <div className="space-y-4">
                  {checklist.map((row) => (
                    <div key={row.title} className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {row.status === 'Completed' ? (
                          <CheckCircle2 className={`w-5 h-5 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-600'}`} />
                        ) : row.status === 'In Progress' ? (
                          <div className={`w-5 h-5 rounded-full ${isDarkMode ? 'bg-cyan-400 ring-4 ring-cyan-500/20' : 'bg-blue-600 ring-4 ring-blue-100'}`} />
                        ) : (
                          <div className={`w-5 h-5 rounded-full border-2 ${isDarkMode ? 'border-slate-600' : 'border-gray-300'}`} />
                        )}
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{row.title}</div>
                        <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{row.status === 'In Progress' ? 'Current stage' : row.status}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {selectedCandidate.stage !== 'Hired' && selectedCandidate.stage !== 'Rejected' && (
                    <button
                      onClick={rejectCandidate}
                      disabled={saving}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 ${isDarkMode ? 'bg-red-600 hover:bg-red-500' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                      Reject Candidate
                    </button>
                  )}
                  <button
                    onClick={moveToNextStage}
                    disabled={saving || selectedCandidate.stage === 'Hired' || selectedCandidate.stage === 'Rejected'}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-950/30' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {selectedCandidate.stage === 'Offer' ? 'Continue to Onboarding' : selectedCandidate.stage === 'Onboarding' ? 'Continue to Hired' : selectedCandidate.stage === 'Hired' ? 'Onboarding Completed' : 'Move to Next Stage'}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {selectedCandidate.stage === 'Screening' && (
                  <div className={`rounded-xl border p-6 ${isDarkMode ? 'border-slate-800 bg-slate-900/70' : 'border-gray-200 bg-gray-50'}`}>
                    <p className={`text-base font-semibold mb-4 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>Screening Details</p>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <p className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Email</p>
                        <p className={`font-medium break-all ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{selectedCandidate.email || '--'}</p>
                      </div>
                      <div>
                        <p className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Phone</p>
                        <p className={`font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{selectedCandidate.phone || '--'}</p>
                      </div>
                      <div>
                        <p className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Experience</p>
                        <p className={`font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{selectedCandidate.experienceYears ?? '--'} years</p>
                      </div>
                      <div>
                        <p className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>ATS Score</p>
                        <p className={`font-semibold ${isDarkMode ? 'text-cyan-300' : 'text-blue-700'}`}>{Number(selectedCandidate.score || 0)}/100</p>
                      </div>
                    </div>

                    {selectedCandidate.cvFileUrl && (
                      <div className="mb-4 flex items-center gap-2">
                        <a
                          href={toAbsoluteAssetUrl(selectedCandidate.cvFileUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                          View CV
                        </a>
                        <a
                          href={toAbsoluteAssetUrl(selectedCandidate.cvFileUrl)}
                          download
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${isDarkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'}`}
                        >
                          Download CV
                        </a>
                      </div>
                    )}

                    {selectedCandidate.coverLetter && (
                      <div className="mb-4">
                        <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Cover Letter</p>
                        <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{selectedCandidate.coverLetter}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Education</p>
                        {(selectedCandidate.educationEntries || []).length === 0 ? (
                          <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>No education entries</p>
                        ) : (
                          <ul className={`text-xs space-y-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                            {selectedCandidate.educationEntries.slice(0, 3).map((item, index) => (
                              <li key={`edu-${index}`}>{item.degree || '--'} - {item.institution || '--'} ({item.year || '--'})</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Experience</p>
                        {(selectedCandidate.experienceEntries || []).length === 0 ? (
                          <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>No experience entries</p>
                        ) : (
                          <ul className={`text-xs space-y-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                            {selectedCandidate.experienceEntries.slice(0, 3).map((item, index) => (
                              <li key={`exp-${index}`}>{item.title || '--'} @ {item.company || '--'} ({item.duration || '--'})</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {selectedCandidate.stage === 'Interview' && (
                  <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900/70' : 'border-gray-200 bg-gray-50'}`}>
                    <p className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>Share 3 Interview Slots</p>
                    {isInterviewSlotsPublished && (
                      <div className={`rounded-lg border px-3 py-2 text-xs mb-3 ${isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                        Interview slots already published{publishedDateLabel ? ` on ${publishedDateLabel}` : ''}.
                      </div>
                    )}
                    {selectedCandidate.selectedInterviewSlot && (
                      <div className={`rounded-lg border px-3 py-2 text-xs mb-3 ${isDarkMode ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                        Candidate picked: {selectedCandidate.selectedInterviewSlot.label || 'Selected Slot'} ({selectedCandidate.selectedInterviewSlot.date} at {selectedCandidate.selectedInterviewSlot.time})
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-3">
                      {interviewSlots.map((slot, index) => (
                        <div key={`slot-${index}`} className="space-y-2">
                          <input
                            type="date"
                            value={slot.date}
                            disabled={saving || isInterviewSlotsPublished}
                            onChange={(event) => {
                              const next = [...interviewSlots];
                              next[index] = { ...next[index], date: event.target.value };
                              setInterviewSlots(next);
                            }}
                            className={`w-full px-3 py-2 rounded-lg text-sm border ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
                          />
                          <input
                            type="time"
                            value={slot.time}
                            disabled={saving || isInterviewSlotsPublished}
                            onChange={(event) => {
                              const next = [...interviewSlots];
                              next[index] = { ...next[index], time: event.target.value };
                              setInterviewSlots(next);
                            }}
                            className={`w-full px-3 py-2 rounded-lg text-sm border ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={saving || isInterviewSlotsPublished}
                      onClick={publishInterviewSlots}
                      className={`mt-3 px-4 py-2 rounded-lg text-sm font-semibold text-white ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-60`}
                    >
                      {isInterviewSlotsPublished ? 'Interview Slots Published' : 'Publish Interview Slots'}
                    </button>
                  </div>
                )}

                {selectedCandidate.stage === 'Offer' && (
                  <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900/70' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>Upload Offer Letter</p>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Candidate can view this file on the Offer stage screen.</p>
                      </div>
                      {selectedCandidate.offerLetterUrl && (
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${isDarkMode ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                          Uploaded
                        </span>
                      )}
                    </div>

                    {selectedCandidate.offerLetterUrl && (
                      <div className={`rounded-lg border p-3 mb-3 ${isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50'}`}>
                        <p className={`text-xs mb-2 ${isDarkMode ? 'text-emerald-200' : 'text-emerald-700'}`}>Current offer letter is available</p>
                        <div className="flex items-center gap-2">
                          <a
                            href={toAbsoluteAssetUrl(selectedCandidate.offerLetterUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-700'}`}
                          >
                            View
                          </a>
                          <a
                            href={toAbsoluteAssetUrl(selectedCandidate.offerLetterUrl)}
                            download
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${isDarkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'}`}
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    )}

                    <label className={`block rounded-lg border border-dashed px-3 py-3 cursor-pointer ${isDarkMode ? 'border-slate-600 hover:border-cyan-500/60 bg-slate-900/60' : 'border-gray-300 hover:border-blue-400 bg-white'}`}>
                      <span className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Choose file (.pdf, .doc, .docx)</span>
                      <span className={`block text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{offerLetterFile?.name || 'No file selected'}</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(event) => setOfferLetterFile(event.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      disabled={saving || !offerLetterFile}
                      onClick={uploadOfferLetter}
                      className={`mt-3 px-4 py-2 rounded-lg text-sm font-semibold text-white ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-60`}
                    >
                      {selectedCandidate.offerLetterUrl ? 'Replace Offer Letter' : 'Upload Offer Letter'}
                    </button>
                  </div>
                )}

                {selectedCandidate.stage === 'Onboarding' && (
                  <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900/70' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>Share Onboarding Package</p>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Send welcome details, docs, and onboarding instructions to candidate.</p>
                      </div>
                      {selectedCandidate.onboardingPackageUrl && (
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${isDarkMode ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                          Shared
                        </span>
                      )}
                    </div>

                    {selectedCandidate.onboardingPackageUrl && (
                      <div className={`rounded-lg border p-3 mb-3 ${isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50'}`}>
                        <p className={`text-xs mb-2 ${isDarkMode ? 'text-emerald-200' : 'text-emerald-700'}`}>Current onboarding package is available</p>
                        <div className="flex items-center gap-2">
                          <a
                            href={toAbsoluteAssetUrl(selectedCandidate.onboardingPackageUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-700'}`}
                          >
                            View
                          </a>
                          <a
                            href={toAbsoluteAssetUrl(selectedCandidate.onboardingPackageUrl)}
                            download
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${isDarkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'}`}
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    )}

                    <label className={`block rounded-lg border border-dashed px-3 py-3 cursor-pointer mb-3 ${isDarkMode ? 'border-slate-600 hover:border-cyan-500/60 bg-slate-900/60' : 'border-gray-300 hover:border-blue-400 bg-white'}`}>
                      <span className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Choose file (.pdf, .doc, .docx)</span>
                      <span className={`block text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{onboardingPackageFile?.name || 'No file selected'}</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(event) => setOnboardingPackageFile(event.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>

                    <textarea
                      rows={3}
                      value={onboardingNotes}
                      onChange={(event) => setOnboardingNotes(event.target.value)}
                      placeholder="Add onboarding instructions or welcome notes"
                      className={`w-full px-3 py-2 rounded-lg text-sm border mb-3 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'}`}
                    />

                    <button
                      type="button"
                      disabled={saving}
                      onClick={uploadOnboardingPackage}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-60`}
                    >
                      {selectedCandidate.onboardingPackageUrl ? 'Update Onboarding Package' : 'Share Onboarding Package'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
