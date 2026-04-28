import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Database,
  FileSpreadsheet,
  FileUp,
  GripVertical,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';

/* ───────────────────── Field definitions ───────────────────── */

const EMPLOYEE_FIELD_DEFINITIONS = [
  { key: 'firstName', label: 'First Name', required: true, aliases: ['first name', 'first_name', 'firstname', 'given name', 'forename'] },
  { key: 'lastName', label: 'Last Name', required: true, aliases: ['last name', 'last_name', 'lastname', 'surname', 'family name'] },
  { key: 'fullName', label: 'Full Name', required: false, aliases: ['full name', 'fullname', 'employee name', 'name'] },
  { key: 'email', label: 'Email', required: true, aliases: ['email', 'email address', 'work email'] },
  { key: 'phone', label: 'Phone', required: false, aliases: ['phone', 'mobile', 'mobile number', 'contact', 'contact number'] },
  { key: 'dob', label: 'Date of Birth', required: false, aliases: ['dob', 'date of birth', 'birth date', 'birthday'] },
  { key: 'gender', label: 'Gender', required: false, aliases: ['gender', 'sex'] },
  { key: 'address', label: 'Address', required: false, aliases: ['address', 'street address', 'home address'] },
  { key: 'city', label: 'City', required: false, aliases: ['city', 'town'] },
  { key: 'state', label: 'State', required: false, aliases: ['state', 'province', 'region'] },
  { key: 'zipCode', label: 'Zip Code', required: false, aliases: ['zip', 'zip code', 'postal code', 'postcode'] },
  { key: 'department', label: 'Department', required: true, aliases: ['department', 'dept', 'division'] },
  { key: 'designation', label: 'Designation', required: true, aliases: ['designation', 'job title', 'title', 'position'] },
  { key: 'managerId', label: 'Manager ID', required: false, aliases: ['manager id', 'manager', 'reporting manager', 'supervisor'] },
  { key: 'joinDate', label: 'Join Date', required: true, aliases: ['join date', 'joining date', 'date of joining', 'hire date', 'start date'] },
  { key: 'employmentType', label: 'Employment Type', required: false, aliases: ['employment type', 'employment', 'worker type', 'contract type'] },
  { key: 'baseSalary', label: 'Base Salary', required: false, aliases: ['base salary', 'salary', 'ctc', 'compensation'] },
  { key: 'shiftId', label: 'Shift ID', required: false, aliases: ['shift id', 'shift', 'shift code'] },
];

const REQUIRED_KEYS = new Set(
  EMPLOYEE_FIELD_DEFINITIONS.filter((f) => f.required && f.key !== 'fullName').map((f) => f.key)
);

const EMPLOYMENT_TYPES = new Set(['full_time', 'part_time', 'contract', 'intern']);

/* ───────────────────── CSV helpers ───────────────────── */

const normalizeLabel = (v = '') =>
  String(v).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const FIELD_LABEL_MAP = Object.fromEntries(
  EMPLOYEE_FIELD_DEFINITIONS.map((f) => [f.key, f])
);

const FIELD_ORDER_MAP = Object.fromEntries(
  EMPLOYEE_FIELD_DEFINITIONS.map((f, i) => [f.key, i])
);

const FIELD_ALIAS_SET = new Set(
  EMPLOYEE_FIELD_DEFINITIONS.flatMap((f) => [f.label, ...(f.aliases || [])].map((a) => normalizeLabel(a)))
);

const looksLikeDataValue = (value = '') => {
  const v = String(value).trim();
  if (!v) return false;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return true;
  if (/^\d+(\.\d+)?$/.test(v)) return true;
  if (/^\+?[0-9\s()\-]{7,}$/.test(v)) return true;
  if (/^\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}$/.test(v)) return true;
  return false;
};

const detectHeaderRow = (lines, delimiter) => {
  const first = parseCsvLine(lines[0], delimiter);
  if (first.length === 0) return true;

  const aliasMatches = first.filter((cell) => FIELD_ALIAS_SET.has(normalizeLabel(cell))).length;
  if (aliasMatches >= 2) return true;

  const firstDataLike = first.filter((cell) => looksLikeDataValue(cell)).length;
  if (firstDataLike >= Math.max(2, Math.ceil(first.length * 0.35))) return false;

  if (lines.length > 1) {
    const second = parseCsvLine(lines[1], delimiter);
    const secondDataLike = second.filter((cell) => looksLikeDataValue(cell)).length;
    if (secondDataLike > firstDataLike) return true;
  }

  return true;
};

const isEmailLike = (v = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
const isPhoneLike = (v = '') => /^\+?[0-9\s()\-]{7,}$/.test(String(v).trim());
const isDateLike = (v = '') => Boolean(parseDateValue(v));
const isNumericLike = (v = '') => !Number.isNaN(Number(String(v).replace(/[^0-9.-]/g, '')));

const scoreValueForField = (fieldKey, value) => {
  const raw = String(value || '').trim();
  if (!raw) return 0;
  const norm = normalizeLabel(raw);

  switch (fieldKey) {
    case 'email':
      return isEmailLike(raw) ? 1 : 0;
    case 'phone':
      return isPhoneLike(raw) ? 1 : 0;
    case 'dob':
    case 'joinDate':
      return isDateLike(raw) ? 1 : 0;
    case 'employmentType':
      return ['full time', 'full_time', 'part time', 'part_time', 'contract', 'intern'].some((t) => norm === t) ? 1 : 0;
    case 'baseSalary':
      return isNumericLike(raw) ? 1 : 0;
    case 'shiftId':
      return Number.isInteger(Number(raw)) ? 1 : 0;
    case 'zipCode':
      return /^\d{3,10}$/.test(raw.replace(/\s+/g, '')) ? 1 : 0.4;
    case 'gender':
      return ['male', 'female', 'm', 'f', 'other'].includes(norm) ? 1 : 0;
    case 'managerId':
      return /[a-z]/i.test(raw) && /\d/.test(raw) ? 1 : 0.25;
    case 'firstName':
      return /^[a-zA-Z]+(?:[\-'][a-zA-Z]+)?$/.test(raw) ? 1 : 0;
    case 'lastName':
      return /^[a-zA-Z]+(?:[\-'][a-zA-Z]+)?$/.test(raw) ? 1 : 0;
    case 'fullName': {
      const parts = raw.split(/\s+/).filter(Boolean);
      return parts.length >= 2 ? 1 : 0;
    }
    case 'address':
      return raw.length >= 6 ? 0.8 : 0.2;
    case 'city':
    case 'state':
    case 'department':
    case 'designation':
      return /[a-z]/i.test(raw) ? 0.7 : 0.1;
    default:
      return /[a-z]/i.test(raw) ? 0.5 : 0;
  }
};

const scoreColumnForField = (sampleValues, fieldKey) => {
  const values = sampleValues.map((v) => String(v || '').trim()).filter(Boolean);
  if (values.length === 0) return 0;
  const total = values.reduce((sum, v) => sum + scoreValueForField(fieldKey, v), 0);
  return total / values.length;
};

const detectHeaderlessSequence = (headers, rows) => {
  const fields = EMPLOYEE_FIELD_DEFINITIONS;
  const limit = Math.min(headers.length, fields.length);
  if (limit === 0) return false;

  let comparableColumns = 0;
  let alignedColumns = 0;

  for (let i = 0; i < limit; i++) {
    const header = headers[i];
    const samples = rows.slice(0, 12).map((r) => r[header]).filter((v) => String(v || '').trim().length > 0);
    if (samples.length === 0) continue;

    comparableColumns += 1;
    const expectedKey = fields[i].key;
    const expectedScore = scoreColumnForField(samples, expectedKey);

    let bestScore = 0;
    for (let j = 0; j < fields.length; j++) {
      const s = scoreColumnForField(samples, fields[j].key);
      if (s > bestScore) bestScore = s;
    }

    const isAligned = expectedScore >= 0.55 && expectedScore >= (bestScore - 0.15);
    if (isAligned) alignedColumns += 1;
  }

  if (comparableColumns === 0) return false;
  const alignmentRatio = alignedColumns / comparableColumns;
  return comparableColumns >= 4 && alignmentRatio >= 0.65;
};

const detectDelimiter = (line = '') => {
  const ds = [',', '\t', ';', '|'];
  return ds.map((d) => ({ d, c: line.split(d).length })).sort((a, b) => b.c - a.c)[0]?.d || ',';
};

const parseCsvLine = (line, del) => {
  const vals = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else { inQ = !inQ; }
      continue;
    }
    if (ch === del && !inQ) { vals.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  vals.push(cur.trim());
  return vals;
};

const parseCsvText = (text) => {
  const norm = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!norm) return { headers: [], rows: [], hasHeaderRow: true };
  const lines = norm.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [], hasHeaderRow: true };

  const del = detectDelimiter(lines[0]);
  const hasHeaderRow = detectHeaderRow(lines, del);

  if (hasHeaderRow) {
    const headers = parseCsvLine(lines[0], del).map((h, i) => h || `Column ${i + 1}`);
    const rows = lines.slice(1).map((line) => {
      const v = parseCsvLine(line, del);
      return headers.reduce((acc, h, i) => { acc[h] = v[i] ?? ''; return acc; }, {});
    });
    return { headers, rows, hasHeaderRow };
  }

  const parsedRows = lines.map((line) => parseCsvLine(line, del));
  const maxCols = parsedRows.reduce((m, r) => Math.max(m, r.length), 0);
  const headers = Array.from({ length: maxCols }, (_, i) => `Column ${i + 1}`);
  const rows = parsedRows.map((vals) => headers.reduce((acc, h, i) => {
    acc[h] = vals[i] ?? '';
    return acc;
  }, {}));

  return { headers, rows, hasHeaderRow };
};

/* ───────────────────── Field matching ───────────────────── */

const scoreHeaderMatch = (header, alias) => {
  const nh = normalizeLabel(header);
  const na = normalizeLabel(alias);
  if (!nh || !na) return 0;
  if (nh === na) return 100;
  if (nh.replace(/\s+/g, '') === na.replace(/\s+/g, '')) return 95;
  if (nh.includes(na) || na.includes(nh)) return 70;
  const ht = nh.split(' ');
  const at = na.split(' ');
  const ov = at.filter((t) => ht.includes(t)).length;
  return ov > 0 ? 40 + ov * 10 : 0;
};

const resolveMatchedField = (headers, fd) => {
  let best = null;
  headers.forEach((h, i) => {
    [fd.label, ...(fd.aliases || [])].forEach((alias) => {
      const s = scoreHeaderMatch(h, alias);
      if (s > 0 && (!best || s > best.score)) best = { header: h, index: i, score: s };
    });
  });
  return best;
};

const createColumnState = (headers) => {
  const matched = [];
  EMPLOYEE_FIELD_DEFINITIONS.forEach((fd) => {
    const m = resolveMatchedField(headers, fd);
    if (!m) return;
    matched.push({
      key: `field_${fd.key}`, label: fd.label, sourceHeader: m.header,
      mappedFieldKey: fd.key,
      sourceIndex: m.index, required: fd.required, collapsed: false,
      hidden: false, isDerivedName: fd.key === 'fullName',
    });
  });
  const order = EMPLOYEE_FIELD_DEFINITIONS
    .map((f) => `field_${f.key}`)
    .filter((k) => matched.some((c) => c.key === k));
  return order.map((k) => matched.find((c) => c.key === k));
};

const createHeaderlessColumnState = (headers) => {
  return headers.map((header, index) => ({
    key: `col_${index + 1}`,
    label: `Unassigned`,
    sourceHeader: header,
    mappedFieldKey: null,
    sourceIndex: index,
    required: false,
    collapsed: false,
    hidden: false,
    isDerivedName: false,
  }));
};

const sortColumnsByMappedOrder = (cols) => {
  return [...cols].sort((a, b) => {
    const ai = a.mappedFieldKey ? (FIELD_ORDER_MAP[a.mappedFieldKey] ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
    const bi = b.mappedFieldKey ? (FIELD_ORDER_MAP[b.mappedFieldKey] ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;

    const as = Number.isFinite(a.sourceIndex) ? a.sourceIndex : Number.MAX_SAFE_INTEGER;
    const bs = Number.isFinite(b.sourceIndex) ? b.sourceIndex : Number.MAX_SAFE_INTEGER;
    if (as !== bs) return as - bs;

    return String(a.key).localeCompare(String(b.key));
  });
};

/* ───────────────────── Value transforms ───────────────────── */

const parseDateValue = (v) => {
  const raw = String(v || '').trim();
  if (!raw) return '';
  const n = raw.replace(/\./g, '-').replace(/\//g, '-');
  const p = n.split('-').map((s) => s.trim()).filter(Boolean);
  if (p.length !== 3) { const fb = new Date(raw); return Number.isNaN(fb.getTime()) ? '' : fb.toISOString().slice(0, 10); }
  const [a, b, c] = p;
  if (/^\d{4}$/.test(a)) return `${a.padStart(4, '0')}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
  if (/^\d{4}$/.test(c)) {
    const na = Number(a); const yr = c.padStart(4, '0');
    const mo = na > 12 ? b.padStart(2, '0') : a.padStart(2, '0');
    const dy = na > 12 ? a.padStart(2, '0') : b.padStart(2, '0');
    return `${yr}-${mo}-${dy}`;
  }
  const fb = new Date(raw);
  return Number.isNaN(fb.getTime()) ? '' : fb.toISOString().slice(0, 10);
};

const parseEmploymentType = (v) => {
  const n = normalizeLabel(v);
  if (/part/.test(n)) return 'part_time';
  if (/contract/.test(n)) return 'contract';
  if (/intern/.test(n)) return 'intern';
  return 'full_time';
};

const parseNumberValue = (v) => {
  const raw = String(v || '').trim();
  if (!raw) return '';
  const cleaned = raw.replace(/[^0-9.-]/g, '');
  return cleaned && !Number.isNaN(Number(cleaned)) ? cleaned : '';
};

const splitName = (v) => {
  const parts = String(v || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

const buildEmployeePayload = (row, columns) => {
  const byFieldKey = {};
  columns.forEach((c) => {
    if (c.hidden || !c.mappedFieldKey) return;
    byFieldKey[c.mappedFieldKey] = String(row[c.sourceHeader] ?? '').trim();
  });
  const g = (key) => String(byFieldKey[key] ?? '').trim();
  const dn = g('fullName');
  const { firstName: dfn, lastName: dln } = splitName(dn);
  return {
    firstName: g('firstName') || dfn, lastName: g('lastName') || dln,
    email: g('email').toLowerCase(), phone: g('phone'),
    dob: parseDateValue(g('dob')), gender: g('gender').toLowerCase(),
    address: g('address'), city: g('city'), state: g('state'), zipCode: g('zipCode'),
    department: g('department'), designation: g('designation'), managerId: g('managerId'),
    joinDate: parseDateValue(g('joinDate')), employmentType: parseEmploymentType(g('employmentType')),
    baseSalary: parseNumberValue(g('baseSalary')), shiftId: parseNumberValue(g('shiftId')),
  };
};

const validateImportedEmployee = (p) => {
  const issues = [];
  if (!p.firstName) issues.push('First name');
  if (!p.lastName) issues.push('Last name');
  if (!p.email) issues.push('Email');
  if (!p.department) issues.push('Department');
  if (!p.designation) issues.push('Designation');
  if (!p.joinDate) issues.push('Join date');
  if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) issues.push('Valid email');
  if (p.baseSalary && Number.isNaN(Number(p.baseSalary))) issues.push('Valid salary');
  if (p.shiftId && !Number.isInteger(Number(p.shiftId))) issues.push('Valid shift id');
  if (p.employmentType && !EMPLOYMENT_TYPES.has(p.employmentType)) issues.push('Employment type');
  return issues;
};

/* ───────────────────── Column Card ───────────────────── */

const ImportColumnCard = ({
  column,
  previewRows,
  onDragStart,
  onDragOver,
  onDrop,
  onToggleCollapse,
  onHide,
  onMove,
  isDarkMode,
  rowNumberOffset,
}) => {
  const rows = previewRows.slice(0, 6).map((r) => ({
    rowIndex: r.rowIndex,
    value: String(r.raw[column.sourceHeader] ?? '').trim(),
  }));

  return (
    <motion.div
      draggable={!column.hidden}
      onDragStart={(e) => onDragStart(e, column.key)}
      onDragOver={(e) => onDragOver(e, column.key)}
      onDrop={(e) => onDrop(e, column.key)}
      style={{ width: '100%', minWidth: 0, maxWidth: '100%' }}
      className={`group relative min-w-0 rounded-2xl border transition-all ${
        isDarkMode
          ? 'border-cyan-400/10 bg-[#0d2230] shadow-black/10 hover:border-cyan-400/30'
          : 'border-gray-100 bg-white shadow-sm hover:border-blue-200'
      }`}
    >
      <div className={`px-3 py-3 border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <div className="mt-1 cursor-grab active:cursor-grabbing text-slate-400">
              <GripVertical className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-semibold truncate ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{column.label}</p>
              <p className={`text-[11px] truncate ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>From: {column.sourceHeader}</p>
              {!column.mappedFieldKey && (
                <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                  Drop a field label here
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => onToggleCollapse(column.key)}
              className={`rounded-md p-1.5 transition-colors ${isDarkMode ? 'text-cyan-300 hover:bg-slate-800' : 'text-blue-600 hover:bg-blue-50'}`}>
              {column.collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
            <button type="button" onClick={() => onMove(column.key, -1)}
              className={`rounded-md p-1.5 opacity-0 group-hover:opacity-100 transition-all ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => onMove(column.key, 1)}
              className={`rounded-md p-1.5 opacity-0 group-hover:opacity-100 transition-all ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => onHide(column.key)}
              className={`rounded-md p-1.5 opacity-0 group-hover:opacity-100 transition-all ${isDarkMode ? 'text-rose-300 hover:bg-rose-500/10' : 'text-rose-600 hover:bg-rose-50'}`}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      {!column.collapsed && (
        <div className="px-3 py-2 space-y-1.5">
          {rows.map((r) => (
            <div key={`${column.key}-${r.rowIndex}`}
              className={`rounded-lg px-2.5 py-2 text-xs ${isDarkMode ? 'bg-slate-900/80 text-slate-200' : 'bg-gray-50 text-gray-700'}`}>
              <p className={`text-[10px] mb-0.5 ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>Row {r.rowIndex + rowNumberOffset}</p>
              <p className="truncate">{r.value || '—'}</p>
            </div>
          ))}
        </div>
      )}
      {column.collapsed && (
        <div className={`px-3 py-2 text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>Column collapsed</div>
      )}
    </motion.div>
  );
};

/* ───────────────────── Main Component ───────────────────── */

const EmployeeImportPage = () => {
  const navigate = useNavigate();
  const { isDarkMode = false } = useOutletContext() || {};
  const fileInputRef = useRef(null);

  const [sourceFileName, setSourceFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [hiddenColumns, setHiddenColumns] = useState([]);
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [canApplyToAll, setCanApplyToAll] = useState(false);
  const [draggedKey, setDraggedKey] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [previewLimit, setPreviewLimit] = useState(8);

  const visibleColumns = useMemo(() => columns.filter((c) => !c.hidden), [columns]);

  const previewRows = useMemo(() => csvRows.map((row, i) => {
    const payload = buildEmployeePayload(row, columns);
    const issues = validateImportedEmployee(payload);
    return { rowIndex: i, raw: row, payload, issues, isReady: issues.length === 0 };
  }), [csvRows, columns]);

  const readyRows = previewRows.filter((r) => r.isReady);
  const blockedRows = previewRows.filter((r) => !r.isReady);
  const rowNumberOffset = hasHeaderRow ? 2 : 1;

  const usedFieldKeys = useMemo(
    () => new Set(columns.filter((c) => c.mappedFieldKey).map((c) => c.mappedFieldKey)),
    [columns]
  );

  const requiredMissing = useMemo(() => {
    if (columns.length === 0) return [];
    const mappedKeys = new Set(
      columns.filter((c) => !c.hidden && c.mappedFieldKey).map((c) => c.mappedFieldKey)
    );
    const hasFullName = mappedKeys.has('fullName');
    return Array.from(REQUIRED_KEYS).filter((k) => {
      if ((k === 'firstName' || k === 'lastName') && hasFullName) return false;
      return !mappedKeys.has(k);
    });
  }, [columns]);

  /* ── File handling ── */

  const resetImportState = () => {
    setSourceFileName(''); setCsvHeaders([]); setCsvRows([]);
    setColumns([]); setHiddenColumns([]); setDraggedKey('');
    setHasHeaderRow(true);
    setCanApplyToAll(false);
    setErrorMessage(''); setInfoMessage(''); setImportResults(null); setPreviewLimit(8);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const loadCsvData = (text, fileName) => {
    const { headers, rows, hasHeaderRow: detectedHeaderRow } = parseCsvText(text);
    if (headers.length === 0 || rows.length === 0) {
      setErrorMessage('The CSV file does not contain readable rows.');
      return;
    }

    const detected = (detectedHeaderRow ? createColumnState(headers) : createHeaderlessColumnState(headers)).map((c) => ({
      ...c,
      sampleValues: rows.slice(0, 3).map((r) => String(r[c.sourceHeader] ?? '').trim()).filter(Boolean),
    }));

    setSourceFileName(fileName);
    setCsvHeaders(headers);
    setCsvRows(rows);
    setHasHeaderRow(detectedHeaderRow);
    const sequenceDetected = !detectedHeaderRow && detectHeaderlessSequence(headers, rows);
    setCanApplyToAll(sequenceDetected);
    setColumns(detected);
    setHiddenColumns([]);
    setErrorMessage('');
    setImportResults(null);
    if (!detectedHeaderRow) {
      setInfoMessage(sequenceDetected
        ? `No header row detected. Created ${headers.length} unlabeled columns from ${rows.length} rows. Sequence detected, so Apply to all is available.`
        : `No header row detected. Created ${headers.length} unlabeled columns from ${rows.length} rows. Drag field labels onto cards to map them.`);
    } else {
      setInfoMessage(detected.length > 0
        ? `Detected ${detected.length} relevant columns from ${rows.length} employee rows.`
        : 'No employee columns were matched automatically.');
    }
  };

  const loadCsvFile = async (file) => {
    if (!file) return;
    if (!/\.(csv|txt)$/i.test(file.name)) { setErrorMessage('Please upload a CSV file.'); return; }
    const text = await file.text();
    loadCsvData(text, file.name);
  };

  const handleFileSelect = (e) => { void loadCsvFile(e.target.files?.[0]); };

  /* ── Column operations ── */

  const moveColumn = (key, dir) => {
    setColumns((cur) => {
      const i = cur.findIndex((c) => c.key === key);
      if (i < 0) return cur;
      const ni = i + dir;
      if (ni < 0 || ni >= cur.length) return cur;
      const next = [...cur];
      const [moved] = next.splice(i, 1);
      next.splice(ni, 0, moved);
      return next;
    });
  };

  const handleDragStart = (e, key) => {
    setDraggedKey(key);
    e.dataTransfer.setData('application/x-column-key', key);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleFieldDragStart = (e, fieldKey) => {
    e.dataTransfer.setData('application/x-field-key', fieldKey);
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragOver = (e) => e.preventDefault();

  const assignFieldToColumn = (columnKey, fieldKey) => {
    const field = FIELD_LABEL_MAP[fieldKey];
    if (!field) return;

    setColumns((cur) => {
      const next = cur.map((c) => {
        if (c.mappedFieldKey === fieldKey && c.key !== columnKey) {
          return { ...c, mappedFieldKey: null, label: 'Unassigned', required: false };
        }
        if (c.key === columnKey) {
          return { ...c, mappedFieldKey: field.key, label: field.label, required: field.required };
        }
        return c;
      });
      return sortColumnsByMappedOrder(next);
    });
  };

  const unassignFieldFromCard = (fieldKey) => {
    setColumns((cur) => {
      const next = cur.map((c) => {
        if (c.mappedFieldKey !== fieldKey) return c;
        return { ...c, mappedFieldKey: null, label: 'Unassigned', required: false };
      });
      return sortColumnsByMappedOrder(next);
    });
  };

  const applyLabelsToAll = () => {
    if (!canApplyToAll) return;
    setColumns((cur) => {
      const next = cur.map((c, idx) => {
        const fd = EMPLOYEE_FIELD_DEFINITIONS[idx];
        if (!fd) return { ...c, mappedFieldKey: null, label: 'Unassigned', required: false };
        return { ...c, mappedFieldKey: fd.key, label: fd.label, required: fd.required };
      });
      return sortColumnsByMappedOrder(next);
    });
  };

  const handleDrop = (e, targetKey) => {
    e.preventDefault();

    const droppedFieldKey = e.dataTransfer.getData('application/x-field-key');
    if (droppedFieldKey) {
      assignFieldToColumn(targetKey, droppedFieldKey);
      return;
    }

    const droppedColumnKey = e.dataTransfer.getData('application/x-column-key') || draggedKey;
    setColumns((cur) => {
      const di = cur.findIndex((c) => c.key === droppedColumnKey);
      const ti = cur.findIndex((c) => c.key === targetKey);
      if (di < 0 || ti < 0 || di === ti) return cur;
      const next = [...cur];
      const [moved] = next.splice(di, 1);
      next.splice(ti, 0, moved);
      return next;
    });
    setDraggedKey('');
  };

  const toggleCollapse = (key) => {
    setColumns((cur) => cur.map((c) => (c.key === key ? { ...c, collapsed: !c.collapsed } : c)));
  };

  const hideColumn = (key) => {
    setColumns((cur) => {
      const next = cur.map((c) => (c.key === key ? { ...c, hidden: true } : c));
      const hidden = next.find((c) => c.key === key);
      if (hidden) setHiddenColumns((prev) => [...prev.filter((x) => x.key !== key), hidden]);
      return next;
    });
  };

  const restoreColumn = (key) => {
    setColumns((cur) => cur.map((c) => (c.key === key ? { ...c, hidden: false } : c)));
    setHiddenColumns((prev) => prev.filter((c) => c.key !== key));
  };

  /* ── Import ── */

  const createEmployees = async () => {
    if (readyRows.length === 0) { setErrorMessage('No valid employee rows are ready to import.'); return; }
    const token = localStorage.getItem('erp_token');
    if (!token) { navigate('/login'); return; }

    setIsImporting(true); setErrorMessage(''); setInfoMessage('Creating employee accounts and profiles...');
    const results = [];

    for (let i = 0; i < readyRows.length; i++) {
      const row = readyRows[i];
      const formData = new FormData();
      Object.entries(row.payload).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim() !== '') formData.append(k, String(v));
      });
      try {
        const resp = await fetch('http://localhost:5000/api/hr/employees', {
          method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
        });
        const data = await resp.json();
        if (!resp.ok || !data?.success) throw new Error(data?.message || `Failed row ${row.rowIndex + rowNumberOffset}`);
        results.push({ rowIndex: row.rowIndex, status: 'success', message: data.message || 'Created', employee: data?.data || null });
      } catch (err) {
        results.push({ rowIndex: row.rowIndex, status: 'failed', message: err.message || 'Failed' });
      }
      setImportResults({
        total: readyRows.length, completed: results.length,
        successes: results.filter((r) => r.status === 'success').length,
        failures: results.filter((r) => r.status === 'failed').length,
        rows: [...results],
      });
    }

    setIsImporting(false);
    setImportResults({
      total: readyRows.length, completed: results.length,
      successes: results.filter((r) => r.status === 'success').length,
      failures: results.filter((r) => r.status === 'failed').length,
      rows: [...results],
    });

    if (results.some((r) => r.status === 'success')) {
      setInfoMessage('Import finished. Review the summary below, then return to employee management.');
    } else {
      setErrorMessage('No employees were created. Check the failed rows and try again.');
    }
  };

  /* ───────────────────── RENDER ───────────────────── */

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-3 pb-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className={`rounded-3xl border p-6 shadow-sm ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <button type="button" onClick={() => navigate('/dashboard/hr/employee/new')}
              className={`inline-flex items-center gap-2 text-sm font-medium ${isDarkMode ? 'text-cyan-300 hover:text-cyan-200' : 'text-blue-600 hover:text-blue-700'}`}>
              <ArrowLeft className="w-4 h-4" /> Back to Add Employee
            </button>
            <div>
              <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Import Employees from CSV</h1>
              <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Upload a CSV file, reorder columns by dragging, hide any field you do not want to import, then create employee accounts in bulk.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${isDarkMode ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/30 hover:bg-cyan-500' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700'}`}>
              <FileUp className="w-4 h-4" /> Upload CSV
            </button>
            <button type="button" onClick={resetImportState}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileSelect} />

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); void loadCsvFile(e.dataTransfer.files?.[0]); }}
          className={`mt-6 rounded-3xl border-2 border-dashed p-6 text-center transition-all ${isDarkMode ? 'border-slate-700 bg-slate-950/30 hover:border-cyan-500/40 hover:bg-cyan-500/5' : 'border-gray-200 bg-gray-50/70 hover:border-blue-300 hover:bg-blue-50/40'}`}
        >
          <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-slate-900 text-cyan-300' : 'bg-white text-blue-600 shadow-sm'}`}>
            <Upload className="h-7 w-7" />
          </div>
          <p className={`text-base font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>Drop your CSV file here</p>
          <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>
            The importer will automatically match CSV headers to the employee form fields, even when the columns are in a different order.
          </p>
          <p className={`mt-2 text-xs ${isDarkMode ? 'text-slate-600' : 'text-gray-400'}`}>
            Supported fields include personal details, work details, and optional data like salary, shift, and manager.
          </p>
        </div>

        {(sourceFileName || infoMessage || errorMessage) && (
          <div className="mt-4 space-y-3">
            {sourceFileName && (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${isDarkMode ? 'border-slate-800 bg-slate-900/70 text-slate-200' : 'border-gray-100 bg-gray-50 text-gray-700'}`}>
                Loaded file: <span className="font-semibold">{sourceFileName}</span>
              </div>
            )}
            {infoMessage && (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${isDarkMode ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-100' : 'border-blue-200 bg-blue-50 text-blue-800'}`}>
                {infoMessage}
              </div>
            )}
            {errorMessage && (
              <div className={`rounded-2xl border px-4 py-3 text-sm flex items-center gap-2 ${isDarkMode ? 'border-red-500/20 bg-red-500/10 text-red-100' : 'border-red-200 bg-red-50 text-red-800'}`}>
                <AlertCircle className="h-4 w-4" /> {errorMessage}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Matched Columns + Import Summary */}
      {csvHeaders.length > 0 && (
        <div className="space-y-6">
          <div className={`rounded-3xl border p-6 shadow-sm ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Matched Columns</h2>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  {hasHeaderRow
                    ? 'Columns are shown in a wrapped spreadsheet-style grid. Drag to reorder, and use hover actions to move, collapse, or delete.'
                    : 'No header row detected. Drag a field label and drop it on each unassigned column card.'}
                </p>
              </div>
              <div className={`rounded-full px-3 py-1.5 text-xs font-medium ${isDarkMode ? 'bg-slate-900 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                {visibleColumns.length} visible / {columns.length} matched
              </div>
            </div>

            {!hasHeaderRow && (
              <div className={`mt-4 rounded-2xl border px-4 py-3 ${isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>Field labels</p>
                  {canApplyToAll && (
                    <button
                      type="button"
                      onClick={applyLabelsToAll}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${isDarkMode ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                    >
                      Apply to all
                    </button>
                  )}
                </div>
                <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                  {canApplyToAll
                    ? 'Drag any label chip and drop it on an unassigned column card. Double-click a blue chip to unassign it.'
                    : 'Drag any label chip and drop it on an unassigned column card. Double-click a blue chip to unassign it. Apply to all is hidden because CSV column order does not look sequential.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {EMPLOYEE_FIELD_DEFINITIONS.map((field) => {
                    const isUsed = usedFieldKeys.has(field.key);
                    return (
                      <button
                        key={field.key}
                        type="button"
                        draggable
                        onDragStart={(e) => handleFieldDragStart(e, field.key)}
                        onDoubleClick={() => { if (isUsed) unassignFieldFromCard(field.key); }}
                        title={isUsed ? 'Double-click to unassign this label from its card' : 'Drag and drop this label'}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-grab active:cursor-grabbing ${isUsed
                          ? (isDarkMode ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200' : 'border-blue-200 bg-blue-50 text-blue-700')
                          : (isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50')}`}
                      >
                        {field.label}{field.required ? ' *' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {requiredMissing.length > 0 && (
              <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${isDarkMode ? 'border-amber-500/20 bg-amber-500/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                {hasHeaderRow
                  ? `Some required fields were not matched automatically: ${requiredMissing.join(', ')}.`
                  : `Some required fields are still not mapped: ${requiredMissing.join(', ')}.`}
              </div>
            )}

            {/* ════════ Wrapped spreadsheet columns view ════════ */}
            <div className={`mt-5 rounded-2xl border ${isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-gray-200 bg-gray-50/60'}`}>
              <div className={`px-4 py-2.5 text-xs border-b ${isDarkMode ? 'text-slate-400 border-slate-800' : 'text-gray-600 border-gray-200'}`}>
                Spreadsheet columns view
              </div>
              <div className="overflow-x-auto p-2 sm:p-3">
                <div className="grid min-w-[900px] grid-cols-2 gap-2 sm:gap-3 lg:min-w-0 lg:grid-cols-4">
                  {visibleColumns.map((col) => (
                    <ImportColumnCard
                      key={col.key} column={col} previewRows={previewRows}
                      onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop}
                      onToggleCollapse={toggleCollapse} onHide={hideColumn} onMove={moveColumn}
                      isDarkMode={isDarkMode}
                      rowNumberOffset={rowNumberOffset}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Hidden columns */}
            {hiddenColumns.length > 0 && (
              <div className={`mt-5 rounded-2xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>Hidden columns</p>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>Restore any hidden column if you need it back in the preview.</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {hiddenColumns.map((col) => (
                    <button key={col.key} type="button" onClick={() => restoreColumn(col.key)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>
                      <RotateCcw className="w-3.5 h-3.5" /> {col.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ════════ Preview rows ════════ */}
            <div className={`mt-6 rounded-2xl border ${isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-center justify-between gap-3 border-b border-inherit px-4 py-3">
                <div>
                  <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>Preview rows</p>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                    Showing the first {Math.min(previewLimit, previewRows.length)} of {previewRows.length} rows.
                  </p>
                </div>
                {previewRows.length > previewLimit && (
                  <button type="button" onClick={() => setPreviewLimit((v) => v + 8)}
                    className={`text-xs font-medium ${isDarkMode ? 'text-cyan-300 hover:text-cyan-200' : 'text-blue-600 hover:text-blue-700'}`}>
                    Show more
                  </button>
                )}
              </div>

              {/* Desktop preview table */}
              <div className="hidden md:block px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
                <div className="overflow-x-auto">
                  <table className="w-max min-w-full divide-y divide-inherit text-sm">
                    <thead>
                      <tr>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>Row</th>
                        {visibleColumns.map((col) => (
                          <th key={col.key} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                            <div className="flex items-center gap-2">
                              <span>{col.label}</span>
                              {col.collapsed && (
                                <span className={`rounded-full px-2 py-0.5 text-[10px] ${isDarkMode ? 'bg-slate-900 text-slate-400' : 'bg-gray-200 text-gray-500'}`}>Collapsed</span>
                              )}
                            </div>
                          </th>
                        ))}
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>Status</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-100'}`}>
                      {previewRows.slice(0, previewLimit).map((row) => (
                        <tr key={row.rowIndex} className={isDarkMode ? 'hover:bg-slate-900/40' : 'hover:bg-white'}>
                          <td className={`px-4 py-3 text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{row.rowIndex + rowNumberOffset}</td>
                          {visibleColumns.map((col) => {
                            const val = String(row.raw[col.sourceHeader] ?? '').trim();
                            return (
                              <td key={`${row.rowIndex}-${col.key}`} className={`px-4 py-3 ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                                <span className={`inline-flex max-w-[220px] truncate rounded-lg px-2 py-1 text-xs ${col.collapsed ? (isDarkMode ? 'bg-slate-900 text-slate-500' : 'bg-gray-100 text-gray-500') : (isDarkMode ? 'bg-slate-900/70 text-slate-200' : 'bg-gray-50 text-gray-700')}`}>
                                  {col.collapsed ? 'Collapsed' : (val || '—')}
                                </span>
                              </td>
                            );
                          })}
                          <td className={`px-4 py-3 text-xs font-medium ${row.isReady ? (isDarkMode ? 'text-emerald-300' : 'text-emerald-700') : (isDarkMode ? 'text-amber-300' : 'text-amber-700')}`}>
                            {row.isReady ? 'Ready' : row.issues.join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile preview cards */}
              <div className="md:hidden space-y-3 p-4">
                {previewRows.slice(0, previewLimit).map((row) => (
                  <div key={row.rowIndex} className={`rounded-2xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-950/70' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>Row {row.rowIndex + rowNumberOffset}</p>
                        <p className={`mt-1 text-sm font-medium ${row.isReady ? (isDarkMode ? 'text-emerald-300' : 'text-emerald-700') : (isDarkMode ? 'text-amber-300' : 'text-amber-700')}`}>
                          {row.isReady ? 'Ready' : row.issues.join(', ')}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${row.isReady ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700') : (isDarkMode ? 'bg-amber-500/10 text-amber-300' : 'bg-amber-50 text-amber-700')}`}>
                        {row.isReady ? 'OK' : 'Fix'}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {visibleColumns.map((col) => {
                        const val = String(row.raw[col.sourceHeader] ?? '').trim();
                        return (
                          <div key={`${row.rowIndex}-${col.key}`} className={`rounded-xl px-3 py-2 ${isDarkMode ? 'bg-slate-900/70' : 'bg-gray-50'}`}>
                            <p className={`text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>{col.label}</p>
                            <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>
                              {col.collapsed ? 'Collapsed' : (val || '—')}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Import Summary */}
          <div className="space-y-6">
            <div className={`rounded-3xl border p-6 shadow-sm ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Import Summary</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { label: 'CSV rows', value: csvRows.length },
                  { label: 'Ready to import', value: readyRows.length },
                  { label: 'Need fixes', value: blockedRows.length },
                  { label: 'Visible columns', value: visibleColumns.length },
                ].map((item) => (
                  <div key={item.label} className={`rounded-2xl p-4 ${isDarkMode ? 'bg-slate-900/80' : 'bg-gray-50'}`}>
                    <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.value}</div>
                    <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{item.label}</div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={createEmployees} disabled={isImporting || readyRows.length === 0}
                className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${isDarkMode ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/30 hover:bg-cyan-500' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700'}`}>
                {isImporting ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Database className="h-4 w-4" />}
                {isImporting ? 'Creating employees...' : 'Create Employees'}
              </button>
            </div>

            {importResults && (
              <div className={`rounded-3xl border p-6 shadow-sm ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Results</h2>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Created', value: importResults.successes },
                    { label: 'Failed', value: importResults.failures },
                    { label: 'Processed', value: importResults.completed },
                  ].map((item) => (
                    <div key={item.label} className={`rounded-2xl p-4 ${isDarkMode ? 'bg-slate-900/80' : 'bg-gray-50'}`}>
                      <div className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.value}</div>
                      <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{item.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2 max-h-[320px] overflow-auto pr-1">
                  {importResults.rows.map((row) => (
                    <div key={`${row.rowIndex}-${row.status}`}
                      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${row.status === 'success'
                        ? isDarkMode ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : isDarkMode ? 'border-red-500/20 bg-red-500/10 text-red-100' : 'border-red-200 bg-red-50 text-red-800'
                      }`}>
                      {row.status === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />}
                      <div>
                        <p className="font-medium">Row {row.rowIndex + rowNumberOffset}: {row.message}</p>
                        {row.employee?.temporaryPassword && (
                          <p className="mt-1 text-xs opacity-90">Temporary password: {row.employee.temporaryPassword}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {csvHeaders.length === 0 && (
        <div className={`rounded-3xl border p-10 text-center shadow-sm ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-slate-900 text-cyan-300' : 'bg-blue-50 text-blue-600'}`}>
            <FileSpreadsheet className="h-8 w-8" />
          </div>
          <h2 className={`mt-4 text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No CSV loaded yet</h2>
          <p className={`mt-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Upload a file to see matched employee columns, reorder them, and create user accounts in bulk.
          </p>
        </div>
      )}
    </div>
  );
};

export default EmployeeImportPage;