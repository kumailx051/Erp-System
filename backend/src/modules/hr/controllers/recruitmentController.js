const { fn, col, where, Op } = require('sequelize');
const CurrentOpening = require('../models/CurrentOpening');
const Candidate = require('../models/Candidate');
const JobApplication = require('../models/JobApplication');
const RecruitmentWorkflow = require('../models/RecruitmentWorkflow');
const User = require('../../admin/models/User');

const ALLOWED_STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Onboarding', 'Hired', 'Rejected'];

function toNumberOrNull(value) {
  if (value === '' || value === undefined || value === null) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseArrayField(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function toWordSet(text) {
  return new Set(
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9+\s]/g, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 1)
  );
}

function parseRequiredExperienceYears(value) {
  const match = String(value || '').match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isNaN(parsed) ? null : parsed;
}

function computeAtsScore({ opening, application, candidate }) {
  const openingSkills = String(opening?.skills || '')
    .split(',')
    .map((skill) => skill.trim().toLowerCase())
    .filter(Boolean);

  const candidateText = [
    String(application?.cover_letter || ''),
    String(opening?.requirements || ''),
    ...(Array.isArray(application?.education_entries) ? application.education_entries.map((entry) => `${entry?.degree || ''} ${entry?.institution || ''}`) : []),
    ...(Array.isArray(application?.experience_entries) ? application.experience_entries.map((entry) => `${entry?.company || ''} ${entry?.title || ''} ${entry?.duration || ''}`) : [])
  ].join(' ');

  const wordSet = toWordSet(candidateText);
  const matchedSkills = openingSkills.filter((skill) => {
    const parts = skill.split(/\s+/).filter(Boolean);
    return parts.every((part) => wordSet.has(part));
  });

  const skillsScore = openingSkills.length === 0
    ? 60
    : Math.round((matchedSkills.length / openingSkills.length) * 60);

  const requiredExp = parseRequiredExperienceYears(opening?.experience_required);
  const candidateExp = toNumberOrNull(candidate?.experience_years ?? application?.experience_years) || 0;
  let experienceScore = 15;
  if (requiredExp !== null) {
    const ratio = requiredExp <= 0 ? 1 : Math.min(1, candidateExp / requiredExp);
    experienceScore = Math.round(ratio * 25);
  }

  const educationCount = Array.isArray(application?.education_entries) ? application.education_entries.length : 0;
  const experienceCount = Array.isArray(application?.experience_entries) ? application.experience_entries.length : 0;
  const hasCoverLetter = Boolean(String(application?.cover_letter || '').trim());
  const hasCv = Boolean(String(application?.cv_file_url || '').trim());
  const completenessPoints = [
    hasCv ? 5 : 0,
    hasCoverLetter ? 3 : 0,
    educationCount > 0 ? 3 : 0,
    experienceCount > 0 ? 4 : 0
  ].reduce((sum, value) => sum + value, 0);

  const total = Math.max(0, Math.min(100, skillsScore + experienceScore + completenessPoints));

  return {
    total,
    breakdown: {
      skillsScore,
      experienceScore,
      completenessScore: completenessPoints,
      matchedSkills,
      openingSkills,
      candidateExperienceYears: candidateExp,
      requiredExperienceYears: requiredExp
    }
  };
}

async function ensureWorkflowForCandidate(candidate, jobApplication) {
  if (!candidate || !jobApplication) {
    return null;
  }

  const [workflow] = await RecruitmentWorkflow.findOrCreate({
    where: { candidate_id: candidate.id },
    defaults: {
      candidate_id: candidate.id,
      job_application_id: jobApplication.id,
      current_opening_id: candidate.current_opening_id,
      email: String(candidate.email || '').toLowerCase()
    }
  });

  const needsSync =
    workflow.job_application_id !== jobApplication.id
    || workflow.current_opening_id !== candidate.current_opening_id
    || String(workflow.email || '').toLowerCase() !== String(candidate.email || '').toLowerCase();

  if (needsSync) {
    await workflow.update({
      job_application_id: jobApplication.id,
      current_opening_id: candidate.current_opening_id,
      email: String(candidate.email || '').toLowerCase()
    });
  }

  return workflow;
}

exports.getCurrentOpenings = async (req, res) => {
  try {
    const openings = await CurrentOpening.findAll({
      where: { is_active: true },
      order: [['created_at', 'DESC']]
    });

    const mapped = await Promise.all(openings.map(async (opening) => {
      const applicants = await Candidate.count({
        where: {
          current_opening_id: opening.id,
          is_active: true
        }
      });

      return {
        id: opening.id,
        role: opening.role,
        department: opening.department,
        location: opening.location,
        no_of_positions: opening.no_of_positions,
        status: opening.status,
        applicants
      };
    }));

    return res.status(200).json({
      success: true,
      data: { openings: mapped }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch current openings',
      error: error.message
    });
  }
};

// Public endpoint for career page (no auth required)
exports.getPublicCurrentOpenings = async (req, res) => {
  try {
    const openings = await CurrentOpening.findAll({
      where: { 
        is_active: true,
        status: 'Open' // Only show open positions on career page
      },
      order: [['date_published', 'DESC']]
    });

    const mapped = openings.map((opening) => {
      // Calculate days since published
      const now = new Date();
      const published = new Date(opening.date_published);
      const diffTime = Math.abs(now - published);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let datePublishedText = '';
      if (diffDays === 0) {
        datePublishedText = 'Today';
      } else if (diffDays === 1) {
        datePublishedText = '1 day ago';
      } else if (diffDays < 7) {
        datePublishedText = `${diffDays} days ago`;
      } else if (diffDays < 14) {
        datePublishedText = '1 week ago';
      } else {
        const weeks = Math.floor(diffDays / 7);
        datePublishedText = `${weeks} weeks ago`;
      }

      // Calculate deadline text
      let deadlineText = '';
      if (opening.deadline) {
        const deadline = new Date(opening.deadline);
        const diffDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
        if (diffDeadline > 0) {
          deadlineText = `${diffDeadline} days left`;
        } else {
          deadlineText = 'Expired';
        }
      }

      // Parse skills from text to array
      let skillsArray = [];
      if (opening.skills) {
        skillsArray = opening.skills.split(',').map(s => s.trim()).filter(s => s);
      }

      return {
        id: opening.id,
        title: opening.title,
        role: opening.role,
        location: opening.location,
        role_type: opening.role_type,
        salary_type: opening.salary_type,
        no_of_positions: opening.no_of_positions,
        description: opening.description,
        requirements: opening.requirements,
        experience: opening.experience_required,
        skills: skillsArray,
        date_published: datePublishedText,
        deadline: deadlineText,
        status: opening.status
      };
    });

    return res.status(200).json({
      success: true,
      data: { openings: mapped }
    });
  } catch (error) {
    console.error('Error fetching public openings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch current openings',
      error: error.message
    });
  }
};

exports.createCurrentOpening = async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim();
    const department = String(req.body?.department || 'General').trim() || 'General';
    const location = String(req.body?.location || '').trim();
    const role_type = String(req.body?.role_type || '').trim();
    const salary_type = String(req.body?.salary_type || '').trim();
    const description = req.body?.description ? String(req.body.description).trim() : null;
    const requirements = req.body?.requirements ? String(req.body.requirements).trim() : null;
    const experience_required = req.body?.experience_required ? String(req.body.experience_required).trim() : null;
    const skills = req.body?.skills ? String(req.body.skills).trim() : null;
    const deadline = req.body?.deadline || null;
    const status = String(req.body?.status || 'Open').trim();
    const no_of_positions = Number(req.body?.no_of_positions);

    if (!title || !location || !role_type || !salary_type) {
      return res.status(400).json({
        success: false,
        message: 'title, location, role_type and salary_type are required'
      });
    }

    if (!['Open', 'Interview', 'Closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'status must be Open, Interview or Closed'
      });
    }

    if (!['Internship', 'Full-time Job', 'Part-time Job', 'Contract'].includes(role_type)) {
      return res.status(400).json({
        success: false,
        message: 'role_type must be Internship, Full-time Job, Part-time Job, or Contract'
      });
    }

    if (!['Paid', 'Unpaid'].includes(salary_type)) {
      return res.status(400).json({
        success: false,
        message: 'salary_type must be Paid or Unpaid'
      });
    }

    if (!Number.isInteger(no_of_positions) || no_of_positions < 1) {
      return res.status(400).json({
        success: false,
        message: 'no_of_positions must be an integer greater than 0'
      });
    }

    // Validate deadline is in the future
    if (deadline) {
      const deadlineDate = new Date(deadline);
      if (deadlineDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Deadline must be a future date'
        });
      }
    }

    const created = await CurrentOpening.create({
      role: title, // Use title as role for backward compatibility
      title,
      department,
      location,
      role_type,
      salary_type,
      no_of_positions,
      description,
      requirements,
      experience_required,
      skills,
      deadline,
      status,
      is_active: true
    });

    return res.status(201).json({
      success: true,
      message: 'Current opening created successfully',
      data: {
        id: created.id,
        title: created.title,
        department: created.department,
        location: created.location,
        role_type: created.role_type,
        salary_type: created.salary_type,
        no_of_positions: created.no_of_positions,
        status: created.status,
        applicants: 0
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create current opening',
      error: error.message
    });
  }
};

exports.getCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.findAll({
      where: { is_active: true },
      include: [
        {
          model: CurrentOpening,
          as: 'opening',
          attributes: ['id', 'role', 'department', 'location', 'status']
        },
        {
          model: RecruitmentWorkflow,
          as: 'workflow',
          attributes: [
            'interview_slots',
            'selected_interview_slot',
            'offer_letter_url',
            'onboarding_package_url',
            'offer_decision',
            'onboarding_decision',
            'hr_rejection_reason',
            'candidate_rejection_reason'
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    const candidateEmails = [...new Set(candidates.map((candidate) => String(candidate.email || '').toLowerCase()).filter(Boolean))];
    const openingIds = [...new Set(candidates.map((candidate) => candidate.current_opening_id).filter(Boolean))];

    const applications = candidateEmails.length > 0 && openingIds.length > 0
      ? await JobApplication.findAll({
        where: {
          is_active: true,
          email: { [Op.in]: candidateEmails },
          current_opening_id: { [Op.in]: openingIds }
        },
        order: [['created_at', 'DESC']]
      })
      : [];

    const applicationByKey = new Map();
    applications.forEach((application) => {
      const key = `${String(application.email || '').toLowerCase()}::${application.current_opening_id}`;
      if (!applicationByKey.has(key)) {
        applicationByKey.set(key, application);
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        candidates: candidates.map((candidate) => {
          const applicationKey = `${String(candidate.email || '').toLowerCase()}::${candidate.current_opening_id}`;
          const application = applicationByKey.get(applicationKey);

          return {
          id: candidate.id,
          fullName: candidate.full_name,
          email: candidate.email,
          phone: candidate.phone,
          roleId: candidate.current_opening_id,
          role: candidate.opening?.role || '--',
          department: candidate.opening?.department || '--',
          location: candidate.opening?.location || '--',
          score: candidate.score,
          stage: candidate.stage,
          experienceYears: candidate.experience_years,
          interviewSlots: candidate.workflow?.interview_slots || [],
          selectedInterviewSlot: candidate.workflow?.selected_interview_slot || null,
          interviewSlotsPublishedAt: Array.isArray(candidate.workflow?.interview_slots) && candidate.workflow.interview_slots.length > 0
            ? candidate.workflow.interview_slots[0]?.publishedAt || null
            : null,
          offerLetterUrl: candidate.workflow?.offer_letter_url || null,
          onboardingPackageUrl: candidate.workflow?.onboarding_package_url || null,
          offerDecision: candidate.workflow?.offer_decision || 'pending',
          onboardingDecision: candidate.workflow?.onboarding_decision || 'pending',
          hrRejectionReason: candidate.workflow?.hr_rejection_reason || null,
          candidateRejectionReason: candidate.workflow?.candidate_rejection_reason || null,
          cvFileUrl: application?.cv_file_url || null,
          coverLetter: application?.cover_letter || null,
          educationEntries: application?.education_entries || [],
          experienceEntries: application?.experience_entries || [],
          applicationStatus: application?.status || null,
          createdAt: candidate.created_at
          };
        })
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch candidates',
      error: error.message
    });
  }
};

exports.getCandidateById = async (req, res) => {
  try {
    const candidateId = Number(req.params?.id);
    if (!candidateId) {
      return res.status(400).json({
        success: false,
        message: 'Valid candidate id is required'
      });
    }

    const candidate = await Candidate.findOne({
      where: { id: candidateId, is_active: true },
      include: [
        {
          model: CurrentOpening,
          as: 'opening',
          attributes: ['id', 'role', 'department', 'location', 'status']
        }
      ]
    });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    const jobApplication = await JobApplication.findOne({
      where: {
        email: String(candidate.email || '').toLowerCase(),
        current_opening_id: candidate.current_opening_id,
        is_active: true
      },
      order: [['created_at', 'DESC']]
    });

    const workflow = jobApplication
      ? await ensureWorkflowForCandidate(candidate, jobApplication)
      : null;

    return res.status(200).json({
      success: true,
      data: {
        candidate: {
          id: candidate.id,
          fullName: candidate.full_name,
          email: candidate.email,
          phone: candidate.phone,
          roleId: candidate.current_opening_id,
          role: candidate.opening?.role || '--',
          department: candidate.opening?.department || '--',
          location: candidate.opening?.location || '--',
          score: candidate.score,
          stage: candidate.stage,
          experienceYears: candidate.experience_years,
          createdAt: candidate.created_at,
          cvFileUrl: jobApplication?.cv_file_url || null,
          applicationId: jobApplication?.id || null,
          applicationStatus: jobApplication?.status || null,
          applicationSubmittedAt: jobApplication?.created_at || null,
          interviewSlots: workflow?.interview_slots || [],
          selectedInterviewSlot: workflow?.selected_interview_slot || null,
          interviewSlotsPublishedAt: Array.isArray(workflow?.interview_slots) && workflow.interview_slots.length > 0
            ? workflow.interview_slots[0]?.publishedAt || null
            : null,
          offerLetterUrl: workflow?.offer_letter_url || null,
          onboardingPackageUrl: workflow?.onboarding_package_url || null,
          offerDecision: workflow?.offer_decision || 'pending',
          onboardingDecision: workflow?.onboarding_decision || 'pending',
          hrRejectionReason: workflow?.hr_rejection_reason || null,
          candidateRejectionReason: workflow?.candidate_rejection_reason || null
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch candidate profile',
      error: error.message
    });
  }
};

exports.createCandidate = async (req, res) => {
  try {
    const fullName = String(req.body?.fullName || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const phone = String(req.body?.phone || '').trim() || null;
    const roleId = Number(req.body?.roleId);
    const stage = String(req.body?.stage || 'Applied').trim();
    const score = toNumberOrNull(req.body?.score);
    const experienceYears = toNumberOrNull(req.body?.experienceYears);

    if (!fullName || !email || !roleId) {
      return res.status(400).json({
        success: false,
        message: 'fullName, email and roleId are required'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    if (!ALLOWED_STAGES.includes(stage)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid stage value'
      });
    }

    const opening = await CurrentOpening.findOne({
      where: { id: roleId, is_active: true }
    });

    if (!opening) {
      return res.status(404).json({
        success: false,
        message: 'Selected role not found in current openings'
      });
    }

    const existing = await Candidate.findOne({
      where: where(fn('LOWER', col('email')), email)
    });

    if (existing && existing.is_active) {
      return res.status(409).json({
        success: false,
        message: 'Candidate with this email already exists'
      });
    }

    const created = await Candidate.create({
      full_name: fullName,
      email,
      phone,
      current_opening_id: roleId,
      experience_years: experienceYears,
      score: Number.isInteger(score) ? score : 0,
      stage,
      is_active: true
    });

    return res.status(201).json({
      success: true,
      message: 'Candidate added successfully',
      data: {
        id: created.id,
        fullName: created.full_name,
        stage: created.stage
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create candidate',
      error: error.message
    });
  }
};

exports.applyToCurrentOpening = async (req, res) => {
  try {
    const fullName = String(req.body?.fullName || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const phone = String(req.body?.phone || '').trim() || null;
    const roleId = Number(req.body?.roleId);
    const experienceYears = toNumberOrNull(req.body?.experienceYears);
    const coverLetter = String(req.body?.coverLetter || '').trim() || null;
    const educationEntries = parseArrayField(req.body?.educationEntries)
      .map((entry) => ({
        degree: String(entry?.degree || '').trim(),
        institution: String(entry?.institution || '').trim(),
        year: String(entry?.year || '').trim()
      }))
      .filter((entry) => entry.degree || entry.institution || entry.year);
    const experienceEntries = parseArrayField(req.body?.experienceEntries)
      .map((entry) => ({
        company: String(entry?.company || '').trim(),
        title: String(entry?.title || '').trim(),
        duration: String(entry?.duration || '').trim()
      }))
      .filter((entry) => entry.company || entry.title || entry.duration);

    if (!fullName || !email || !roleId) {
      return res.status(400).json({
        success: false,
        message: 'fullName, email and roleId are required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'CV file is required'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    const opening = await CurrentOpening.findOne({
      where: { id: roleId, is_active: true, status: 'Open' }
    });

    if (!opening) {
      return res.status(404).json({
        success: false,
        message: 'Selected role not found or is no longer open'
      });
    }

    const existing = await JobApplication.findOne({
      where: {
        current_opening_id: roleId,
        email,
        is_active: true
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'You have already applied for this role with this email'
      });
    }

    const createdApplication = await JobApplication.create({
      full_name: fullName,
      email,
      phone,
      current_opening_id: roleId,
      cv_file_url: `/uploads/${req.file.filename}`,
      cover_letter: coverLetter,
      experience_years: experienceYears,
      education_entries: educationEntries,
      experience_entries: experienceEntries,
      status: 'Submitted',
      is_active: true
    });

    let candidateForWorkflow = await Candidate.findOne({
      where: {
        current_opening_id: roleId,
        email,
        is_active: true
      }
    });

    if (!candidateForWorkflow) {
      candidateForWorkflow = await Candidate.create({
        full_name: fullName,
        email,
        phone,
        current_opening_id: roleId,
        experience_years: experienceYears,
        score: 0,
        stage: 'Applied',
        is_active: true
      });
    }

    await ensureWorkflowForCandidate(candidateForWorkflow, createdApplication);

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        id: createdApplication.id,
        fullName: createdApplication.full_name,
        role: opening.role,
        stage: 'Applied',
        cvFileName: req.file.originalname
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to submit application',
      error: error.message
    });
  }
};

exports.updateCandidateStage = async (req, res) => {
  try {
    const candidateId = Number(req.params?.id);
    const stage = String(req.body?.stage || '').trim();
    const reason = String(req.body?.reason || '').trim();

    if (!candidateId || !ALLOWED_STAGES.includes(stage)) {
      return res.status(400).json({
        success: false,
        message: 'Valid candidate id and stage are required'
      });
    }

    const candidate = await Candidate.findOne({
      where: { id: candidateId, is_active: true }
    });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    const opening = await CurrentOpening.findByPk(candidate.current_opening_id);
    const jobApplication = await JobApplication.findOne({
      where: {
        email: String(candidate.email || '').toLowerCase(),
        current_opening_id: candidate.current_opening_id,
        is_active: true
      },
      order: [['created_at', 'DESC']]
    });

    const workflow = jobApplication
      ? await ensureWorkflowForCandidate(candidate, jobApplication)
      : null;

    let ats = null;
    const updates = { stage };

    if (stage === 'Screening' && opening && jobApplication) {
      ats = computeAtsScore({
        opening,
        application: jobApplication,
        candidate
      });
      updates.score = ats.total;
    }

    await candidate.update(updates);

    if (jobApplication) {
      let applicationStatus = jobApplication.status;
      if (stage === 'Screening') applicationStatus = 'Reviewed';
      else if (stage === 'Interview') applicationStatus = 'Shortlisted';
      else if (stage === 'Rejected') applicationStatus = 'Rejected';
      else if (stage === 'Hired') applicationStatus = 'Hired';

      if (applicationStatus !== jobApplication.status) {
        await jobApplication.update({ status: applicationStatus });
      }
    }

    if (workflow) {
      const workflowUpdates = {};

      if (stage === 'Screening' && ats) {
        workflowUpdates.ats_breakdown = ats.breakdown;
      }

      if (stage === 'Rejected') {
        workflowUpdates.hr_rejection_reason = reason || 'Sorry, your profile does not match the requirements for this role at this stage.';
      }

      await workflow.update(workflowUpdates);
    }

    if (stage === 'Hired') {
      const linkedUser = await User.findOne({
        where: {
          email: String(candidate.email || '').toLowerCase(),
          is_active: true
        }
      });

      if (linkedUser && linkedUser.role === 'candidate') {
        await linkedUser.update({ role: 'employee' });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Candidate stage updated successfully',
      data: {
        id: candidate.id,
        stage: candidate.stage,
        score: candidate.score,
        ats,
        rejectionReason: stage === 'Rejected' ? (reason || 'Sorry, your profile does not match the requirements for this role at this stage.') : null
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update candidate stage',
      error: error.message
    });
  }
};

exports.setInterviewSlots = async (req, res) => {
  try {
    const candidateId = Number(req.params?.id);
    const slots = Array.isArray(req.body?.slots) ? req.body.slots : [];

    if (!candidateId) {
      return res.status(400).json({ success: false, message: 'Valid candidate id is required' });
    }

    const candidate = await Candidate.findOne({ where: { id: candidateId, is_active: true } });
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    if (candidate.stage !== 'Interview') {
      return res.status(400).json({ success: false, message: 'Interview slots can be set only at Interview stage' });
    }

    const publishedAt = new Date().toISOString();
    const cleanedSlots = slots
      .map((slot) => ({
        date: String(slot?.date || '').trim(),
        time: String(slot?.time || '').trim(),
        label: String(slot?.label || '').trim(),
        publishedAt
      }))
      .filter((slot) => slot.date && slot.time)
      .slice(0, 3);

    if (cleanedSlots.length !== 3) {
      return res.status(400).json({ success: false, message: 'Please provide exactly 3 valid interview slots' });
    }

    const application = await JobApplication.findOne({
      where: {
        email: String(candidate.email || '').toLowerCase(),
        current_opening_id: candidate.current_opening_id,
        is_active: true
      },
      order: [['created_at', 'DESC']]
    });

    if (!application) {
      return res.status(404).json({ success: false, message: 'Job application not found for candidate' });
    }

    const workflow = await ensureWorkflowForCandidate(candidate, application);
    await workflow.update({
      interview_slots: cleanedSlots,
      selected_slot_index: null,
      selected_interview_slot: null
    });

    return res.status(200).json({
      success: true,
      message: 'Interview slots shared with candidate',
      data: {
        candidateId: candidate.id,
        slots: workflow.interview_slots,
        publishedAt
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to set interview slots', error: error.message });
  }
};

exports.uploadOfferLetter = async (req, res) => {
  try {
    const candidateId = Number(req.params?.id);
    if (!candidateId) {
      return res.status(400).json({ success: false, message: 'Valid candidate id is required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Offer letter file is required' });
    }

    const candidate = await Candidate.findOne({ where: { id: candidateId, is_active: true } });
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    const application = await JobApplication.findOne({
      where: {
        email: String(candidate.email || '').toLowerCase(),
        current_opening_id: candidate.current_opening_id,
        is_active: true
      },
      order: [['created_at', 'DESC']]
    });

    if (!application) {
      return res.status(404).json({ success: false, message: 'Job application not found for candidate' });
    }

    const workflow = await ensureWorkflowForCandidate(candidate, application);
    await workflow.update({
      offer_letter_url: `/uploads/${req.file.filename}`,
      offer_decision: 'pending'
    });

    return res.status(200).json({
      success: true,
      message: 'Offer letter uploaded successfully',
      data: {
        offerLetterUrl: workflow.offer_letter_url
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to upload offer letter', error: error.message });
  }
};

exports.uploadOnboardingPackage = async (req, res) => {
  try {
    const candidateId = Number(req.params?.id);
    const notes = String(req.body?.notes || '').trim();
    if (!candidateId) {
      return res.status(400).json({ success: false, message: 'Valid candidate id is required' });
    }

    const candidate = await Candidate.findOne({ where: { id: candidateId, is_active: true } });
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    const application = await JobApplication.findOne({
      where: {
        email: String(candidate.email || '').toLowerCase(),
        current_opening_id: candidate.current_opening_id,
        is_active: true
      },
      order: [['created_at', 'DESC']]
    });

    if (!application) {
      return res.status(404).json({ success: false, message: 'Job application not found for candidate' });
    }

    const workflow = await ensureWorkflowForCandidate(candidate, application);
    await workflow.update({
      onboarding_package_url: req.file ? `/uploads/${req.file.filename}` : workflow.onboarding_package_url,
      onboarding_notes: notes || workflow.onboarding_notes,
      onboarding_decision: 'pending'
    });

    return res.status(200).json({
      success: true,
      message: 'Onboarding package shared with candidate',
      data: {
        onboardingPackageUrl: workflow.onboarding_package_url,
        onboardingNotes: workflow.onboarding_notes
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to share onboarding package', error: error.message });
  }
};

exports.selectInterviewSlot = async (req, res) => {
  try {
    if (req.user?.role !== 'candidate') {
      return res.status(403).json({ success: false, message: 'Candidate access required' });
    }

    const email = String(req.user?.email || '').trim().toLowerCase();
    const applicationId = Number(req.params?.id);
    const slotIndex = Number(req.body?.slotIndex);

    if (!email || !applicationId || !Number.isInteger(slotIndex)) {
      return res.status(400).json({ success: false, message: 'Valid application id and slot index are required' });
    }

    const application = await JobApplication.findOne({
      where: { id: applicationId, email, is_active: true }
    });

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const candidate = await Candidate.findOne({
      where: {
        email,
        current_opening_id: application.current_opening_id,
        is_active: true
      }
    });

    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate profile not found' });
    }

    const workflow = await ensureWorkflowForCandidate(candidate, application);
    const slots = Array.isArray(workflow.interview_slots) ? workflow.interview_slots : [];

    if (Number.isInteger(workflow.selected_slot_index) || workflow.selected_interview_slot) {
      return res.status(400).json({
        success: false,
        message: 'Interview slot is already selected and cannot be changed'
      });
    }

    if (!slots[slotIndex]) {
      return res.status(400).json({ success: false, message: 'Selected slot is invalid' });
    }

    await workflow.update({
      selected_slot_index: slotIndex,
      selected_interview_slot: slots[slotIndex]
    });

    return res.status(200).json({
      success: true,
      message: 'Interview slot selected successfully',
      data: {
        selectedInterviewSlot: workflow.selected_interview_slot
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to select interview slot', error: error.message });
  }
};

exports.respondOffer = async (req, res) => {
  try {
    if (req.user?.role !== 'candidate') {
      return res.status(403).json({ success: false, message: 'Candidate access required' });
    }

    const email = String(req.user?.email || '').trim().toLowerCase();
    const applicationId = Number(req.params?.id);
    const decision = String(req.body?.decision || '').trim().toLowerCase();
    const reason = String(req.body?.reason || '').trim();

    if (!email || !applicationId || !['accept', 'reject'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Valid application id and decision are required' });
    }

    const application = await JobApplication.findOne({
      where: { id: applicationId, email, is_active: true }
    });

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const candidate = await Candidate.findOne({
      where: { email, current_opening_id: application.current_opening_id, is_active: true }
    });

    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate profile not found' });
    }

    const workflow = await ensureWorkflowForCandidate(candidate, application);

    if (decision === 'reject') {
      await candidate.update({ stage: 'Rejected' });
      await application.update({ status: 'Rejected' });
      await workflow.update({
        offer_decision: 'rejected',
        candidate_rejection_reason: reason || 'Candidate rejected the offer.'
      });
    } else {
      await workflow.update({ offer_decision: 'accepted' });
    }

    return res.status(200).json({
      success: true,
      message: decision === 'accept' ? 'Offer accepted' : 'Offer rejected',
      data: {
        stage: candidate.stage,
        offerDecision: workflow.offer_decision
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to submit offer response', error: error.message });
  }
};

exports.respondOnboarding = async (req, res) => {
  try {
    if (req.user?.role !== 'candidate') {
      return res.status(403).json({ success: false, message: 'Candidate access required' });
    }

    const email = String(req.user?.email || '').trim().toLowerCase();
    const applicationId = Number(req.params?.id);
    const decision = String(req.body?.decision || '').trim().toLowerCase();

    if (!email || !applicationId || !['accept', 'reject'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Valid application id and decision are required' });
    }

    const application = await JobApplication.findOne({
      where: { id: applicationId, email, is_active: true }
    });

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const candidate = await Candidate.findOne({
      where: { email, current_opening_id: application.current_opening_id, is_active: true }
    });

    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate profile not found' });
    }

    const workflow = await ensureWorkflowForCandidate(candidate, application);

    if (decision === 'reject') {
      await candidate.update({ stage: 'Rejected' });
      await application.update({ status: 'Rejected' });
      await workflow.update({ onboarding_decision: 'rejected' });
    } else {
      await workflow.update({ onboarding_decision: 'accepted' });
    }

    return res.status(200).json({
      success: true,
      message: decision === 'accept' ? 'Onboarding acknowledged' : 'Onboarding declined',
      data: {
        stage: candidate.stage,
        onboardingDecision: workflow.onboarding_decision
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to submit onboarding response', error: error.message });
  }
};

exports.getMyApplicationById = async (req, res) => {
  try {
    if (req.user?.role !== 'candidate') {
      return res.status(403).json({
        success: false,
        message: 'Candidate access required'
      });
    }

    const email = String(req.user?.email || '').trim().toLowerCase();
    const applicationId = Number(req.params?.id);

    if (!email || !applicationId) {
      return res.status(400).json({
        success: false,
        message: 'Valid application id is required'
      });
    }

    const application = await JobApplication.findOne({
      where: {
        id: applicationId,
        email,
        is_active: true
      },
      include: [
        {
          model: CurrentOpening,
          as: 'opening',
          attributes: ['id', 'role', 'title', 'department', 'location', 'role_type', 'description', 'requirements', 'experience_required', 'skills', 'status']
        },
        {
          model: RecruitmentWorkflow,
          as: 'workflow',
          attributes: [
            'interview_slots',
            'selected_slot_index',
            'selected_interview_slot',
            'offer_letter_url',
            'onboarding_package_url',
            'onboarding_notes',
            'offer_decision',
            'onboarding_decision',
            'hr_rejection_reason',
            'candidate_rejection_reason',
            'ats_breakdown'
          ]
        }
      ]
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    const candidate = await Candidate.findOne({
      where: {
        email,
        current_opening_id: application.current_opening_id,
        is_active: true
      }
    });

    const stage = candidate?.stage || 'Applied';
    const score = Number(candidate?.score || 0);
    const timelineBase = ALLOWED_STAGES
      .filter((s) => s !== 'Rejected')
      .map((s) => {
        const currentIndex = ALLOWED_STAGES.indexOf(stage);
        const stepIndex = ALLOWED_STAGES.indexOf(s);
        return {
          title: s,
          status: stepIndex < currentIndex ? 'Completed' : stepIndex === currentIndex ? 'Current stage' : 'Pending'
        };
      });
    const timeline = stage === 'Rejected'
      ? [...timelineBase, { title: 'Rejected', status: 'Current stage' }]
      : timelineBase;

    return res.status(200).json({
      success: true,
      data: {
        application: {
          id: application.id,
          roleId: application.current_opening_id,
          role: application.opening?.title || application.opening?.role || 'N/A',
          department: application.opening?.department || 'N/A',
          location: application.opening?.location || 'N/A',
          roleType: application.opening?.role_type || 'N/A',
          description: application.opening?.description || '',
          requirements: application.opening?.requirements || '',
          applicationStatus: application.status,
          openingStatus: application.opening?.status || 'N/A',
          hiringStage: stage,
          score,
          submittedAt: application.created_at,
          updatedAt: candidate?.updated_at || application.updated_at,
          cvFileUrl: application.cv_file_url,
          timeline,
          interviewSlots: application.workflow?.interview_slots || [],
          selectedSlotIndex: application.workflow?.selected_slot_index,
          selectedInterviewSlot: application.workflow?.selected_interview_slot || null,
          offerLetterUrl: application.workflow?.offer_letter_url || null,
          onboardingPackageUrl: application.workflow?.onboarding_package_url || null,
          onboardingNotes: application.workflow?.onboarding_notes || null,
          offerDecision: application.workflow?.offer_decision || 'pending',
          onboardingDecision: application.workflow?.onboarding_decision || 'pending',
          rejectionReason: application.workflow?.hr_rejection_reason || application.workflow?.candidate_rejection_reason || null,
          atsBreakdown: application.workflow?.ats_breakdown || null
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch application details',
      error: error.message
    });
  }
};

// Public endpoint to check if email has applied for a specific role
exports.checkEmailAvailability = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const roleId = Number(req.body?.roleId);

    if (!email || !roleId) {
      return res.status(400).json({
        success: false,
        message: 'Email and roleId are required'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    const existingApplication = await JobApplication.findOne({
      where: {
        email,
        current_opening_id: roleId,
        is_active: true
      }
    });

    return res.status(200).json({
      success: true,
      exists: !!existingApplication,
      message: existingApplication ? 'Email has already applied for this role' : 'Email is available'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to check email availability',
      error: error.message
    });
  }
};

exports.getMyApplications = async (req, res) => {
  try {
    if (req.user?.role !== 'candidate') {
      return res.status(403).json({
        success: false,
        message: 'Candidate access required'
      });
    }

    const email = String(req.user?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Candidate email not found in token'
      });
    }

    const [applications, candidates] = await Promise.all([
      JobApplication.findAll({
        where: { email, is_active: true },
        include: [
          {
            model: CurrentOpening,
            as: 'opening',
            attributes: ['id', 'role', 'title', 'department', 'location', 'role_type', 'status']
          },
          {
            model: RecruitmentWorkflow,
            as: 'workflow',
            attributes: [
              'interview_slots',
              'selected_interview_slot',
              'offer_letter_url',
              'onboarding_package_url',
              'onboarding_notes',
              'offer_decision',
              'onboarding_decision',
              'hr_rejection_reason',
              'candidate_rejection_reason'
            ]
          }
        ],
        order: [['created_at', 'DESC']]
      }),
      Candidate.findAll({
        where: { email, is_active: true },
        attributes: ['current_opening_id', 'stage', 'score', 'updated_at']
      })
    ]);

    const stageByOpeningId = new Map();
    candidates.forEach((candidate) => {
      stageByOpeningId.set(candidate.current_opening_id, {
        stage: candidate.stage,
        score: candidate.score,
        lastUpdated: candidate.updated_at
      });
    });

    const mappedApplications = applications.map((application) => {
      const progress = stageByOpeningId.get(application.current_opening_id) || {
        stage: 'Applied',
        score: 0,
        lastUpdated: application.updated_at
      };

      return {
        id: application.id,
        roleId: application.current_opening_id,
        role: application.opening?.title || application.opening?.role || 'N/A',
        department: application.opening?.department || 'N/A',
        location: application.opening?.location || 'N/A',
        roleType: application.opening?.role_type || 'N/A',
        openingStatus: application.opening?.status || 'N/A',
        applicationStatus: application.status,
        hiringStage: progress.stage,
        score: progress.score,
        submittedAt: application.created_at,
        lastUpdatedAt: progress.lastUpdated,
        cvFileUrl: application.cv_file_url,
        interviewSlots: application.workflow?.interview_slots || [],
        selectedInterviewSlot: application.workflow?.selected_interview_slot || null,
        offerLetterUrl: application.workflow?.offer_letter_url || null,
        onboardingPackageUrl: application.workflow?.onboarding_package_url || null,
        onboardingNotes: application.workflow?.onboarding_notes || null,
        offerDecision: application.workflow?.offer_decision || 'pending',
        onboardingDecision: application.workflow?.onboarding_decision || 'pending',
        rejectionReason: application.workflow?.hr_rejection_reason || application.workflow?.candidate_rejection_reason || null
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        applications: mappedApplications,
        summary: {
          total: mappedApplications.length,
          interview: mappedApplications.filter((item) => item.hiringStage === 'Interview').length,
          offers: mappedApplications.filter((item) => item.hiringStage === 'Offer').length,
          hired: mappedApplications.filter((item) => item.hiringStage === 'Hired').length
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch candidate applications',
      error: error.message
    });
  }
};
