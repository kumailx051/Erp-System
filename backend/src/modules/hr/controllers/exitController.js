const { sequelize } = require('../../../core/database/connection');
const ExitRequest = require('../models/ExitRequest');
const { Employee } = require('../models/Employee');

function isPrivilegedRole(role) {
  return ['hr', 'admin'].includes(String(role || '').toLowerCase());
}

function titleCase(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function toDateOnly(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

async function getEmployeeForRequester(req, transaction) {
  const email = String(req.user?.email || '').trim().toLowerCase();
  if (!email) return null;

  return Employee.findOne({
    where: { email, is_active: true },
    transaction
  });
}

async function generateExitCode() {
  const count = await ExitRequest.count();
  return `EXIT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
}

function formatExitRecord(record, employee) {
  return {
    id: record.id,
    exitCode: record.exit_code,
    employeeId: record.employee_id,
    employeeName: `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim() || 'Unknown Employee',
    department: employee?.department || '--',
    designation: employee?.designation || '--',
    exitType: titleCase(record.exit_type),
    reason: record.reason,
    attachmentName: record.attachment_name || '',
    lastDay: record.last_working_date,
    status: titleCase(record.status),
    stage: String(record.workflow_stage || '').replaceAll('_', ' '),
    stageKey: record.workflow_stage,
    clearanceStatus: titleCase(record.clearance_status),
    interviewStatus: titleCase(record.interview_status),
    decisionNotes: record.decision_notes || '',
    hrNotes: record.hr_notes || '',
    reviewedAt: record.reviewed_at,
    createdAt: record.created_at
  };
}

exports.getExitRequests = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!isPrivilegedRole(role) && role !== 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access exit requests'
      });
    }

    const where = { is_active: true };

    if (role === 'employee') {
      const employee = await getEmployeeForRequester(req);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee profile not found for authenticated user'
        });
      }
      where.employee_id = employee.id;
    }

    const exits = await ExitRequest.findAll({
      where,
      order: [['created_at', 'DESC']]
    });

    const employeeIds = Array.from(new Set(exits.map((item) => item.employee_id)));
    const employees = employeeIds.length > 0
      ? await Employee.findAll({
          where: { id: employeeIds },
          attributes: ['id', 'first_name', 'last_name', 'department', 'designation']
        })
      : [];

    const employeeById = new Map();
    employees.forEach((employee) => employeeById.set(employee.id, employee));

    const records = exits.map((row) => formatExitRecord(row, employeeById.get(row.employee_id)));

    const summary = {
      openExits: records.filter((row) => row.status !== 'Rejected' && row.stageKey !== 'completed').length,
      clearancePending: records.filter((row) => row.status === 'Approved' && row.clearanceStatus !== 'Completed').length,
      interviewsDone: records.filter((row) => row.interviewStatus === 'Done').length
    };

    return res.status(200).json({
      success: true,
      data: {
        summary,
        records
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch exit requests',
      error: error.message
    });
  }
};

exports.createExitRequest = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'employee') {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only employees can submit resignation requests'
      });
    }

    const employee = await getEmployeeForRequester(req, transaction);
    if (!employee) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Employee profile not found for authenticated user'
      });
    }

    const exitType = String(req.body?.exitType || 'resignation').trim().toLowerCase();
    const reason = String(req.body?.reason || '').trim();
    const attachmentName = String(req.body?.attachmentName || '').trim() || null;
    const lastDay = toDateOnly(req.body?.lastDay);

    if (!['resignation', 'termination'].includes(exitType)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'exitType must be resignation or termination'
      });
    }

    if (!reason || !lastDay) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'reason and lastDay are required'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(lastDay) < today) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Last working day cannot be in the past'
      });
    }

    const existingOpen = await ExitRequest.findOne({
      where: {
        employee_id: employee.id,
        is_active: true,
        status: ['pending', 'approved']
      },
      transaction
    });

    if (existingOpen) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: 'An open resignation workflow already exists for this employee'
      });
    }

    const exitCode = await generateExitCode();
    const created = await ExitRequest.create({
      exit_code: exitCode,
      employee_id: employee.id,
      exit_type: exitType,
      reason,
      attachment_name: attachmentName,
      last_working_date: lastDay,
      status: 'pending',
      workflow_stage: 'resignations'
    }, { transaction });

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: 'Resignation request submitted successfully',
      data: {
        id: created.id,
        exitCode: created.exit_code,
        status: titleCase(created.status)
      }
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      success: false,
      message: 'Failed to submit resignation request',
      error: error.message
    });
  }
};

exports.updateExitDecision = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!isPrivilegedRole(role)) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only HR/Admin can approve or reject resignation requests'
      });
    }

    const exitId = Number(req.params?.id);
    const decision = String(req.body?.decision || '').trim().toLowerCase();
    const decisionNotes = String(req.body?.decisionNotes || '').trim() || null;

    if (!exitId || !['approved', 'rejected'].includes(decision)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Valid exit id and decision (approved/rejected) are required'
      });
    }

    const request = await ExitRequest.findByPk(exitId, { transaction });
    if (!request || !request.is_active) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Exit request not found'
      });
    }

    const currentStatus = String(request.status || '').toLowerCase();
    if (currentStatus !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Only pending requests can be approved or rejected'
      });
    }

    await request.update({
      status: decision,
      workflow_stage: decision === 'approved' ? 'approvals' : 'resignations',
      decision_notes: decisionNotes,
      reviewed_by: Number(req.user?.sub) || null,
      reviewed_at: new Date()
    }, { transaction });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: `Exit request ${decision} successfully`,
      data: {
        id: request.id,
        status: titleCase(request.status),
        stageKey: request.workflow_stage
      }
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      success: false,
      message: 'Failed to update exit decision',
      error: error.message
    });
  }
};

exports.updateExitWorkflow = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!isPrivilegedRole(role)) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only HR/Admin can update exit workflow stages'
      });
    }

    const exitId = Number(req.params?.id);
    if (!exitId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Valid exit id is required'
      });
    }

    const request = await ExitRequest.findByPk(exitId, { transaction });
    if (!request || !request.is_active) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Exit request not found'
      });
    }

    const allowedStages = new Set(['resignations', 'approvals', 'clearance', 'exit_interviews', 'completed']);
    const allowedStepStatus = new Set(['pending', 'in_progress', 'completed']);
    const allowedInterviewStatus = new Set(['pending', 'scheduled', 'done', 'waived']);

    const nextStage = req.body?.workflowStage ? String(req.body.workflowStage).trim().toLowerCase() : request.workflow_stage;
    const nextClearance = req.body?.clearanceStatus ? String(req.body.clearanceStatus).trim().toLowerCase() : request.clearance_status;
    const nextInterview = req.body?.interviewStatus ? String(req.body.interviewStatus).trim().toLowerCase() : request.interview_status;
    const hrNotes = req.body?.hrNotes !== undefined
      ? String(req.body.hrNotes || '').trim() || null
      : request.hr_notes;

    if (!allowedStages.has(nextStage)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Invalid workflowStage' });
    }
    if (!allowedStepStatus.has(nextClearance)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Invalid clearanceStatus' });
    }
    if (!allowedInterviewStatus.has(nextInterview)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Invalid interviewStatus' });
    }

    if (String(request.status || '').toLowerCase() !== 'approved') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Workflow can be moved only after approval'
      });
    }

    await request.update({
      workflow_stage: nextStage,
      clearance_status: nextClearance,
      interview_status: nextInterview,
      hr_notes: hrNotes,
      reviewed_by: Number(req.user?.sub) || request.reviewed_by,
      reviewed_at: new Date()
    }, { transaction });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: 'Exit workflow updated successfully',
      data: {
        id: request.id,
        stageKey: request.workflow_stage,
        clearanceStatus: titleCase(request.clearance_status),
        interviewStatus: titleCase(request.interview_status)
      }
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      success: false,
      message: 'Failed to update exit workflow',
      error: error.message
    });
  }
};
