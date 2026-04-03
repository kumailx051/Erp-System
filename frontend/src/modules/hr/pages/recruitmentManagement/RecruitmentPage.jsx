import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Briefcase,
  Users,
  UserPlus,
  CalendarClock,
  Search,
  ChevronRight,
  Sparkles,
  Plus,
  X
} from 'lucide-react';

const API_BASE = 'http://localhost:5000';

const STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Onboarding', 'Hired'];

const TabButton = ({ active, onClick, children, isDarkMode }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${
      active
        ? isDarkMode
          ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/30'
          : 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
        : isDarkMode
          ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }`}
  >
    {children}
  </button>
);

const StatusBadge = ({ status, isDarkMode }) => {
  const normalized = String(status || '').toLowerCase();
  const className = normalized === 'open'
    ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
    : normalized === 'interview'
      ? (isDarkMode ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' : 'bg-blue-50 text-blue-700 border-blue-200')
      : (isDarkMode ? 'bg-slate-500/10 text-slate-300 border-slate-500/20' : 'bg-gray-50 text-gray-700 border-gray-200');

  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}>{status}</span>;
};

const RecruitmentPage = () => {
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [openingFormError, setOpeningFormError] = useState('');
  const [candidateFormError, setCandidateFormError] = useState('');
  const [message, setMessage] = useState('');

  const [openings, setOpenings] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);

  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);

  const [openingForm, setOpeningForm] = useState({
    title: '',
    location: '',
    role_type: 'Full-time Job',
    salary_type: 'Paid',
    no_of_positions: 1,
    description: '',
    requirements: '',
    experience_required: '',
    skills: '',
    deadline: ''
  });

  const [candidateForm, setCandidateForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    roleId: '',
    experienceYears: '',
    score: '',
    stage: 'Applied'
  });

  const token = localStorage.getItem('erp_token');
  const navigate = useNavigate();
  const { isDarkMode = false } = useOutletContext() || {};

  const fetchData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError('');

      const [openingsRes, candidatesRes, organizationRes] = await Promise.all([
        fetch(`${API_BASE}/api/hr/current-openings`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/hr/candidates`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/hr/organization/options`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const openingsPayload = await openingsRes.json();
      const candidatesPayload = await candidatesRes.json();
      const organizationPayload = await organizationRes.json();

      if (!openingsRes.ok || !openingsPayload?.success) {
        throw new Error(openingsPayload?.message || 'Failed to fetch openings');
      }
      if (!candidatesRes.ok || !candidatesPayload?.success) {
        throw new Error(candidatesPayload?.message || 'Failed to fetch candidates');
      }
      if (!organizationRes.ok || !organizationPayload?.success) {
        throw new Error(organizationPayload?.message || 'Failed to fetch organization options');
      }

      setOpenings(openingsPayload?.data?.openings || []);
      setCandidates(candidatesPayload?.data?.candidates || []);
      setDepartments(organizationPayload?.data?.departments || []);
      setDesignations(organizationPayload?.data?.designations || []);
    } catch (fetchError) {
      setError(fetchError.message || 'Failed to fetch recruitment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredCandidates = useMemo(() => (
    candidates.filter((c) =>
      `${c.fullName} ${c.role} ${c.stage} ${c.email}`.toLowerCase().includes(search.toLowerCase())
    )
  ), [candidates, search]);

  const pipelineMap = useMemo(() => {
    const map = {};
    STAGES.forEach((stage) => { map[stage] = []; });

    candidates.forEach((candidate) => {
      if (!map[candidate.stage]) {
        map[candidate.stage] = [];
      }
      map[candidate.stage].push(candidate);
    });

    return map;
  }, [candidates]);

  const stats = useMemo(() => {
    const openRoles = openings.filter((opening) => opening.status === 'Open').length;
    const activeCandidates = candidates.filter((candidate) => candidate.stage !== 'Rejected').length;
    const interviews = candidates.filter((candidate) => candidate.stage === 'Interview').length;
    const offerTrack = candidates.filter((candidate) => ['Offer', 'Onboarding', 'Hired'].includes(candidate.stage));
    const hired = offerTrack.filter((candidate) => candidate.stage === 'Hired').length;
    const offerAcceptance = offerTrack.length === 0 ? 0 : Math.round((hired / offerTrack.length) * 100);

    return {
      openRoles,
      activeCandidates,
      interviews,
      offerAcceptance
    };
  }, [openings, candidates]);

  const resetOpeningForm = () => {
    setOpeningForm({
      title: '',
      location: '',
      role_type: 'Full-time Job',
      salary_type: 'Paid',
      no_of_positions: 1,
      description: '',
      requirements: '',
      experience_required: '',
      skills: '',
      deadline: ''
    });
  };

  const resetCandidateForm = () => {
    setCandidateForm({
      fullName: '',
      email: '',
      phone: '',
      roleId: '',
      experienceYears: '',
      score: '',
      stage: 'Applied'
    });
  };

  const handleAddOpening = async (event) => {
    event.preventDefault();
    if (!token) return;

    try {
      setSaving(true);
      setError('');
      setOpeningFormError('');
      setMessage('');

      const response = await fetch(`${API_BASE}/api/hr/current-openings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...openingForm,
          no_of_positions: Number(openingForm.no_of_positions),
          status: 'Open'
        })
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || payload?.message || 'Failed to add opening');
      }

      setMessage('Open role added successfully');
      setShowOpeningModal(false);
      resetOpeningForm();
      await fetchData();
    } catch (saveError) {
      setOpeningFormError(saveError.message || 'Failed to add opening');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCandidate = async (event) => {
    event.preventDefault();
    if (!token) return;

    try {
      setSaving(true);
      setError('');
      setCandidateFormError('');
      setMessage('');

      const response = await fetch(`${API_BASE}/api/hr/candidates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...candidateForm,
          roleId: Number(candidateForm.roleId),
          experienceYears: candidateForm.experienceYears === '' ? null : Number(candidateForm.experienceYears),
          score: candidateForm.score === '' ? 0 : Number(candidateForm.score)
        })
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || payload?.message || 'Failed to add candidate');
      }

      setMessage('Candidate added successfully');
      setShowCandidateModal(false);
      resetCandidateForm();
      await fetchData();
    } catch (saveError) {
      setCandidateFormError(saveError.message || 'Failed to add candidate');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Recruitment</h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Manage openings, candidates and onboarding flow</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setCandidateFormError('');
              setShowCandidateModal(true);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-semibold transition-colors ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-950/30' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            <UserPlus className="w-4 h-4" />
            Add Candidate
          </button>
          <button
            onClick={() => navigate('/dashboard/hr/recruitment/onboarding')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-semibold transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            <Sparkles className="w-4 h-4" />
            Onboarding
          </button>
        </div>
      </div>

      {error && <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>{error}</div>}
      {message && <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{message}</div>}

      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {['overview', 'openings', 'candidates', 'pipeline'].map((item) => (
          <TabButton key={item} active={tab === item} onClick={() => setTab(item)} isDarkMode={isDarkMode}>
            {item.charAt(0).toUpperCase() + item.slice(1)}
          </TabButton>
        ))}
      </div>

      {loading ? (
        <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Loading recruitment data...</div>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Open Roles', value: String(stats.openRoles), icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Active Candidates', value: String(stats.activeCandidates), icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Interviews In Pipeline', value: String(stats.interviews), icon: CalendarClock, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Offer Acceptance', value: `${stats.offerAcceptance}%`, icon: Sparkles, color: 'text-violet-600', bg: 'bg-violet-50' },
                ].map((card, i) => (
                  <motion.div key={card.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className={`rounded-2xl border shadow-sm p-5 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${isDarkMode ? 'bg-white/5' : card.bg}`}>
                      <card.icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                    <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{card.value}</div>
                    <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{card.label}</div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className={`lg:col-span-2 rounded-2xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
                  <div className={`px-5 py-4 border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                    <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Latest Candidates</h3>
                  </div>
                  <div className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-50'}`}>
                    {candidates.slice(0, 6).map((candidate) => (
                      <div key={candidate.id} className={`px-5 py-4 flex items-center justify-between ${isDarkMode ? 'hover:bg-slate-900/60' : 'hover:bg-gray-50/50'}`}>
                        <div>
                          <div className={`text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{candidate.fullName}</div>
                          <div className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{candidate.role}  Stage: {candidate.stage}</div>
                        </div>
                        <button
                          onClick={() => navigate(`/dashboard/hr/recruitment/candidate/${candidate.id}`)}
                          className={`inline-flex items-center gap-1 text-sm font-medium ${isDarkMode ? 'text-cyan-300 hover:text-cyan-200' : 'text-blue-600 hover:text-blue-700'}`}
                        >
                          View
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`rounded-2xl border shadow-sm p-6 space-y-3 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
                  <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Hiring Pipeline</h3>
                  {STAGES.map((stage) => (
                    <div key={stage}>
                      <div className={`flex justify-between text-xs mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        <span>{stage}</span>
                        <span>{pipelineMap[stage]?.length || 0}</span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
                        <div className="h-full bg-blue-300" style={{ width: `${Math.min(100, (pipelineMap[stage]?.length || 0) * 12)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'openings' && (
            <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
              <div className={`px-5 py-4 border-b flex justify-between items-center ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Current Open Roles</h3>
                <button
                  onClick={() => {
                    setOpeningFormError('');
                    setShowOpeningModal(true);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold ${isDarkMode ? 'bg-cyan-600 text-white hover:bg-cyan-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  <Plus className="w-4 h-4" />
                  Add Open Role
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                      <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Role</th>
                      <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Department</th>
                      <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Location</th>
                      <th className={`text-right px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Positions</th>
                      <th className={`text-right px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Applicants</th>
                      <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Status</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-50'}`}>
                    {openings.map((row) => (
                      <tr key={row.id} className={isDarkMode ? 'hover:bg-slate-900/60' : 'hover:bg-gray-50/50'}>
                        <td className={`px-5 py-3.5 text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{row.role}</td>
                        <td className={`px-5 py-3.5 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{row.department}</td>
                        <td className={`px-5 py-3.5 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{row.location}</td>
                        <td className={`px-5 py-3.5 text-sm text-right ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{row.no_of_positions ?? 1}</td>
                        <td className={`px-5 py-3.5 text-sm text-right ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{row.applicants}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={row.status} isDarkMode={isDarkMode} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'candidates' && (
            <div className="space-y-4">
              <div className={`flex items-center border rounded-xl px-3 py-2 w-full sm:w-80 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
                <Search className={`w-4 h-4 mr-2 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search candidates"
                  className={`bg-transparent outline-none text-sm w-full ${isDarkMode ? 'text-slate-200 placeholder-slate-500' : 'text-gray-700 placeholder-gray-400'}`}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCandidates.map((candidate) => (
                  <div key={candidate.id} className={`rounded-2xl border shadow-sm p-5 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{candidate.fullName}</h3>
                      <span className={`text-xs px-2 py-1 rounded-lg ${isDarkMode ? 'bg-slate-900 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>Score: {candidate.score}</span>
                    </div>
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{candidate.role}</p>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Current stage: {candidate.stage}</p>
                    <button
                      onClick={() => navigate(`/dashboard/hr/recruitment/candidate/${candidate.id}`)}
                      className={`mt-4 inline-flex items-center gap-1.5 text-sm font-medium ${isDarkMode ? 'text-cyan-300 hover:text-cyan-200' : 'text-blue-600 hover:text-blue-700'}`}
                    >
                      Open Profile
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'pipeline' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {STAGES.map((stage) => (
                <div key={stage} className={`rounded-2xl border shadow-sm p-4 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
                  <h3 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stage}</h3>
                  <div className="space-y-2">
                    {(pipelineMap[stage] || []).map((candidate) => (
                      <div key={candidate.id} className={`rounded-xl border p-3 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-gray-100 bg-gray-50'}`}>
                        <div className={`text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{candidate.fullName}</div>
                        <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{candidate.role}</div>
                      </div>
                    ))}
                    {(pipelineMap[stage] || []).length === 0 && (
                      <div className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>No candidates</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showOpeningModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden ${isDarkMode ? 'bg-gradient-to-br from-[#0d2230] to-[#0a1920] border-cyan-400/20' : 'bg-white border-gray-200'}`}
          >
            <div className={`px-8 py-6 border-b ${isDarkMode ? 'border-cyan-400/10 bg-gradient-to-r from-cyan-950/30 to-transparent' : 'border-gray-100 bg-gradient-to-r from-blue-50 to-transparent'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Add Open Role</h3>
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Create a new job opening for your career page</p>
                </div>
                <button 
                  onClick={() => {
                    setOpeningFormError('');
                    setShowOpeningModal(false);
                  }} 
                  className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleAddOpening} className="p-8">
              {openingFormError && (
                <div className={`rounded-xl border px-4 py-3 text-sm mb-5 ${isDarkMode ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
                  {openingFormError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pr-2">
                {/* Title - Full Width */}
                <div className="md:col-span-2">
                  <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-cyan-300' : 'text-blue-700'}`}>
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <input 
                    required 
                    value={openingForm.title} 
                    onChange={(e) => setOpeningForm((p) => ({ ...p, title: e.target.value }))} 
                    placeholder="e.g., Senior Full Stack Developer" 
                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm transition-all focus:ring-2 focus:ring-offset-2 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-cyan-500/30' : 'border-gray-200 text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/30'}`} 
                  />
                </div>

                {/* Location */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-cyan-300' : 'text-blue-700'}`}>
                    Location <span className="text-red-500">*</span>
                  </label>
                  <input 
                    required 
                    value={openingForm.location} 
                    onChange={(e) => setOpeningForm((p) => ({ ...p, location: e.target.value }))} 
                    placeholder="e.g., Remote / New York" 
                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm transition-all focus:ring-2 focus:ring-offset-2 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-cyan-500/30' : 'border-gray-200 text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/30'}`} 
                  />
                </div>

                {/* Role Type */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-cyan-300' : 'text-blue-700'}`}>
                    Role Type <span className="text-red-500">*</span>
                  </label>
                  <select 
                    required
                    value={openingForm.role_type} 
                    onChange={(e) => setOpeningForm((p) => ({ ...p, role_type: e.target.value }))} 
                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm transition-all focus:ring-2 focus:ring-offset-2 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-cyan-500 focus:ring-cyan-500/30' : 'border-gray-200 text-gray-700 focus:border-blue-500 focus:ring-blue-500/30'}`}
                  >
                    <option value="Full-time Job">Full-time Job</option>
                    <option value="Part-time Job">Part-time Job</option>
                    <option value="Internship">Internship</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>

                {/* Salary Type */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-cyan-300' : 'text-blue-700'}`}>
                    Salary Type <span className="text-red-500">*</span>
                  </label>
                  <select 
                    required
                    value={openingForm.salary_type} 
                    onChange={(e) => setOpeningForm((p) => ({ ...p, salary_type: e.target.value }))} 
                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm transition-all focus:ring-2 focus:ring-offset-2 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-cyan-500 focus:ring-cyan-500/30' : 'border-gray-200 text-gray-700 focus:border-blue-500 focus:ring-blue-500/30'}`}
                  >
                    <option value="Paid">💰 Paid</option>
                    <option value="Unpaid">Unpaid</option>
                  </select>
                </div>

                {/* Experience Required */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    Experience Required
                  </label>
                  <input 
                    value={openingForm.experience_required} 
                    onChange={(e) => setOpeningForm((p) => ({ ...p, experience_required: e.target.value }))} 
                    placeholder="e.g., 3-5 years, 0-1 years" 
                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm transition-all focus:ring-2 focus:ring-offset-2 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-cyan-500/30' : 'border-gray-200 text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/30'}`} 
                  />
                </div>

                {/* Number Of Positions */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-cyan-300' : 'text-blue-700'}`}>
                    No. of Positions <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={openingForm.no_of_positions}
                    onChange={(e) => setOpeningForm((p) => ({ ...p, no_of_positions: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm transition-all focus:ring-2 focus:ring-offset-2 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-cyan-500 focus:ring-cyan-500/30' : 'border-gray-200 text-gray-700 focus:border-blue-500 focus:ring-blue-500/30'}`}
                  />
                </div>

                {/* Skills */}
                <div className="md:col-span-2">
                  <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    Skills <span className="text-xs text-gray-500">(comma-separated)</span>
                  </label>
                  <input 
                    value={openingForm.skills} 
                    onChange={(e) => setOpeningForm((p) => ({ ...p, skills: e.target.value }))} 
                    placeholder="e.g., React, Node.js, PostgreSQL, AWS, Docker" 
                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm transition-all focus:ring-2 focus:ring-offset-2 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-cyan-500/30' : 'border-gray-200 text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/30'}`} 
                  />
                </div>

                {/* Description - Full Width */}
                <div className="md:col-span-2">
                  <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    Job Description
                  </label>
                  <textarea 
                    value={openingForm.description} 
                    onChange={(e) => setOpeningForm((p) => ({ ...p, description: e.target.value }))} 
                    placeholder="Describe the role, responsibilities, and what makes this position exciting..." 
                    rows="4"
                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm resize-none transition-all focus:ring-2 focus:ring-offset-2 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-cyan-500/30' : 'border-gray-200 text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/30'}`} 
                  />
                </div>

                {/* Requirements - Full Width */}
                <div className="md:col-span-2">
                  <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    Requirements
                  </label>
                  <textarea 
                    value={openingForm.requirements} 
                    onChange={(e) => setOpeningForm((p) => ({ ...p, requirements: e.target.value }))} 
                    placeholder="List the key requirements, qualifications, and must-have skills..." 
                    rows="4"
                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm resize-none transition-all focus:ring-2 focus:ring-offset-2 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-cyan-500/30' : 'border-gray-200 text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/30'}`} 
                  />
                </div>

                {/* Deadline */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    Application Deadline
                  </label>
                  <input 
                    type="date"
                    value={openingForm.deadline} 
                    onChange={(e) => setOpeningForm((p) => ({ ...p, deadline: e.target.value }))} 
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm transition-all focus:ring-2 focus:ring-offset-2 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-cyan-500 focus:ring-cyan-500/30' : 'border-gray-200 text-gray-700 focus:border-blue-500 focus:ring-blue-500/30'}`} 
                  />
                  <p className={`text-xs mt-1.5 ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>📅 Must be a future date</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className={`flex items-center justify-end gap-3 mt-8 pt-6 border-t ${isDarkMode ? 'border-cyan-400/10' : 'border-gray-200'}`}>
                <button 
                  type="button"
                  onClick={() => setShowOpeningModal(false)}
                  className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Cancel
                </button>
                <button 
                  disabled={saving} 
                  className={`px-8 py-3 rounded-xl text-sm font-semibold text-white transition-all inline-flex items-center gap-2 ${isDarkMode ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 shadow-lg shadow-cyan-900/30' : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-500/30'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Opening
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showCandidateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className={`w-full max-w-xl rounded-2xl border shadow-xl p-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Add Candidate</h3>
              <button onClick={() => setShowCandidateModal(false)} className={isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddCandidate} className="space-y-3">
              {candidateFormError && (
                <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
                  {candidateFormError}
                </div>
              )}
              <input required value={candidateForm.fullName} onChange={(e) => setCandidateForm((p) => ({ ...p, fullName: e.target.value }))} placeholder="Full name" className={`w-full px-3 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'border-gray-200 text-gray-700'}`} />
              <input required type="email" value={candidateForm.email} onChange={(e) => setCandidateForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className={`w-full px-3 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'border-gray-200 text-gray-700'}`} />
              <input value={candidateForm.phone} onChange={(e) => setCandidateForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" className={`w-full px-3 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'border-gray-200 text-gray-700'}`} />

              <select required value={candidateForm.roleId} onChange={(e) => setCandidateForm((p) => ({ ...p, roleId: e.target.value }))} className={`w-full px-3 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'border-gray-200 text-gray-700'}`}>
                <option value="">Select role from current openings</option>
                {openings.filter((opening) => opening.status !== 'Closed').map((opening) => (
                  <option key={opening.id} value={opening.id}>{opening.role} - {opening.department}</option>
                ))}
              </select>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="number" min="0" max="40" step="0.1" value={candidateForm.experienceYears} onChange={(e) => setCandidateForm((p) => ({ ...p, experienceYears: e.target.value }))} placeholder="Experience (years)" className={`w-full px-3 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'border-gray-200 text-gray-700'}`} />
                <input type="number" min="0" max="100" value={candidateForm.score} onChange={(e) => setCandidateForm((p) => ({ ...p, score: e.target.value }))} placeholder="Score (0-100)" className={`w-full px-3 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'border-gray-200 text-gray-700'}`} />
              </div>

              <select value={candidateForm.stage} onChange={(e) => setCandidateForm((p) => ({ ...p, stage: e.target.value }))} className={`w-full px-3 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'border-gray-200 text-gray-700'}`}>
                {STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
              </select>

              <button disabled={saving} className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-700'}`}>{saving ? 'Saving...' : 'Save Candidate'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruitmentPage;
