import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import Layout from '../../Components/Layout';
import ChartCard from '../../Components/ChartCard';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Tooltip,
    Legend,
    Filler,
);

const ExamResults = ({ user, results, allResults, years = [], filters = {} }) => {
    // localStorage key prefix
    const STORAGE_KEY = 'examResults_filters';

    // Helper function to get from localStorage
    const getStoredValue = (key, defaultValue) => {
        try {
            const stored = localStorage.getItem(`${STORAGE_KEY}_${key}`);
            return stored !== null ? JSON.parse(stored) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    };

    // Helper function to save to localStorage
    const saveToStorage = (key, value) => {
        try {
            localStorage.setItem(`${STORAGE_KEY}_${key}`, JSON.stringify(value));
        } catch (e) {
            console.error('Error saving to localStorage:', e);
        }
    };

    // Initialize states from localStorage or props/defaults
    const [selectedExam, setSelectedExam] = useState(() => {
        return filters.exam || getStoredValue('selectedExam', '');
    });
    const [selectedStatus, setSelectedStatus] = useState(() => {
        return filters.status || getStoredValue('selectedStatus', '');
    });
    const [selectedYear, setSelectedYear] = useState(() => {
        return filters.year || getStoredValue('selectedYear', '');
    });
    const [includeArchived, setIncludeArchived] = useState(() => {
        return filters.include_archived !== undefined ? !!filters.include_archived : getStoredValue('includeArchived', false);
    });
    const [selectedDate, setSelectedDate] = useState(() => {
        return filters.date || getStoredValue('selectedDate', '');
    });
    const [startDate, setStartDate] = useState(() => {
        return filters.start_date || getStoredValue('startDate', '');
    });
    const [endDate, setEndDate] = useState(() => {
        return filters.end_date || getStoredValue('endDate', '');
    });
    const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);

    const formatDate = (d) => {
        try {
            const pad = (n) => String(n).padStart(2, '0');
            const yyyy = d.getFullYear();
            const mm = pad(d.getMonth() + 1);
            const dd = pad(d.getDate());
            return `${yyyy}-${mm}-${dd}`;
        } catch (_) { return ''; }
    };

    const applyQuickRange = (type) => {
        const now = new Date();
        let s = '', e = '';
        if (type === 'today') {
            s = formatDate(now);
            e = formatDate(now);
        } else if (type === 'last7') {
            const past = new Date(now);
            past.setDate(now.getDate() - 6); // inclusive of today
            s = formatDate(past);
            e = formatDate(now);
        } else if (type === 'thisMonth') {
            const first = new Date(now.getFullYear(), now.getMonth(), 1);
            const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            s = formatDate(first);
            e = formatDate(last);
        }
        setStartDate(s);
        setEndDate(e);
    };
    const [itemsPerPage, setItemsPerPage] = useState(() => {
        return getStoredValue('itemsPerPage', 20);
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [tableSearchText, setTableSearchText] = useState(() => {
        return getStoredValue('tableSearchText', '');
    });
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');
    const [detailData, setDetailData] = useState(null);
    const [answerFilter, setAnswerFilter] = useState('all'); // all | correct | incorrect
    const [searchText, setSearchText] = useState('');
    const [compactView, setCompactView] = useState(() => {
        // Load from localStorage, default to false if not found
        const saved = localStorage.getItem('examResults_compactView');
        return saved !== null ? JSON.parse(saved) : false;
    });
    const [popover, setPopover] = useState({ open: false, x: 0, y: 0, loading: false, data: null });
    const [coursesExpanded, setCoursesExpanded] = useState(() => {
        // Load from localStorage, default to false if not found
        const saved = localStorage.getItem('examResults_coursesExpanded');
        return saved !== null ? JSON.parse(saved) : false;
    });
    const [showDownloadModal, setShowDownloadModal] = useState(false);

    // Handle compactView state change and save to localStorage
    const handleCompactViewChange = (isCompact) => {
        setCompactView(isCompact);
        localStorage.setItem('examResults_compactView', JSON.stringify(isCompact));
    };

    // Handle coursesExpanded state change and save to localStorage
    const handleCoursesExpandedChange = (isExpanded) => {
        setCoursesExpanded(isExpanded);
        localStorage.setItem('examResults_coursesExpanded', JSON.stringify(isExpanded));
    };

    const openPersonalityPopover = async (event, type) => {
        try {
            const rect = event.currentTarget.getBoundingClientRect();
            setPopover({ open: true, x: rect.right + 8, y: rect.top + window.scrollY, loading: true, data: null });
            const { data } = await axios.get(`/guidance/personality-types/${encodeURIComponent(type)}`);
            setPopover(prev => ({ ...prev, loading: false, data: data?.data || { type, title: type, description: '' } }));
        } catch (e) {
            setPopover(prev => ({ ...prev, loading: false, data: { type, title: type, description: 'No description found.' } }));
        }
    };
    const closePopover = () => setPopover({ open: false, x: 0, y: 0, loading: false, data: null });

    // Helper: derive MBTI (e.g., ENTJ) from EI/SN/TF/JP fields if present
    const derivePersonality = (obj) => {
        if (!obj || typeof obj !== 'object') return '';
        const src = obj.personality_result || obj.personality || obj;
        const ei = (src.EI || src.ei || '').toString().toUpperCase().trim();
        const sn = (src.SN || src.sn || '').toString().toUpperCase().trim();
        const tf = (src.TF || src.tf || '').toString().toUpperCase().trim();
        const jp = (src.JP || src.jp || '').toString().toUpperCase().trim();
        const letters = [ei, sn, tf, jp].filter(Boolean).join('');
        return letters && letters.length === 4 ? letters : '';
    };

    const openDetails = async (resultId) => {
        setDetailOpen(true);
        setDetailLoading(true);
        setDetailError('');
        setDetailData(null);
        try {
            const { data } = await axios.get(`/guidance/exam-results/${resultId}/details`);
            if (data?.success) {
                setDetailData(data.data);
            } else {
                setDetailError(data?.message || 'Failed to load details');
            }
        } catch (e) {
            setDetailError('Failed to load details');
        } finally {
            setDetailLoading(false);
        }
    };

    const handleDownload = async (result) => {
        try {
            const { data } = await axios.get(`/guidance/exam-results/${result.resultId || result.id}/details`);
            const d = data?.data || {};
            const studentName = result.examinee?.full_name || d?.examinee?.full_name || 'Student';
            const examRef = result.exam?.['exam-ref-no'] || d?.exam_ref_no || 'Exam';
            const semester = d.semester || result.semester || '';

            const answersRows = (d.answers || [])
                .map(a => `<tr>
                    <td>${a.no}</td>
                    <td>${a.question?.replace(/</g, '&lt;')}</td>
                    <td>${a.student_answer ?? ''}</td>
                    <td>${a.correct_answer ?? ''}</td>
                    <td>${a.is_correct ? '✔' : '✖'}</td>
                </tr>`).join('');

            const recCourses = (d.recommended_courses || result.recommended_courses || [])
                .map((c) => `<li><b>${c.course_code || ''}</b> ${c.course_name || ''}</li>`)
                .join('');

            // Extract category breakdown
            let categoryBreakdown = d.category_breakdown || result.category_breakdown || [];
            if (typeof categoryBreakdown === 'string') {
                try { categoryBreakdown = JSON.parse(categoryBreakdown); } catch (_) { categoryBreakdown = []; }
            }
            const categoryRows = Array.isArray(categoryBreakdown) && categoryBreakdown.length > 0
                ? categoryBreakdown.map(c => {
                    const pct = c.total > 0 ? Math.round((c.correct / c.total) * 100) : 0;
                    return `<tr>
                        <td>${c.category || 'Uncategorized'}</td>
                        <td>${c.correct}/${c.total}</td>
                        <td>${pct}%</td>
                    </tr>`;
                }).join('')
                : '';

            const styles = `
                @media print { @page { margin: 16mm; } }
                body { font-family: Inter, Arial, sans-serif; color:#111827; }
                .header { display:flex; align-items:center; gap:12px; }
                .logo { height:56px; width:56px; }
                .muted { color:#6b7280; }
                .badge { display:inline-block; padding:2px 8px; background:#eef2ff; color:#3730a3; border-radius:999px; font-size:12px; }
                .card { border:1px solid #e5e7eb; border-radius:8px; padding:12px; }
                .grid { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:12px; }
                table { width:100%; border-collapse:collapse; font-size:12px; }
                th, td { border:1px solid #e5e7eb; padding:6px; text-align:left; }
                thead th { background:#f9fafb; }
            `;

            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${studentName} - ${examRef} Result</title>
                <style>${styles}</style></head>
                <body>
                    <div class="header">
                        <img src="/OCC logo.png" alt="OCC" class="logo"/>
                        <div>
                            <div style="font-size:18px; font-weight:700;">Opol Community College</div>
                            <div class="muted" style="font-size:13px;">Guidance Office • Examination Result</div>
                        </div>
                    </div>
                    <hr style="margin:12px 0; border:none; border-top:1px solid #e5e7eb;"/>

                    <div class="grid">
                        <div class="card"><div class="muted">Student</div><div style="font-weight:700;">${studentName}</div></div>
                        <div class="card"><div class="muted">Exam Ref</div><div style="font-weight:700;">${examRef}</div></div>
                        <div class="card"><div class="muted">Date</div><div style="font-weight:700;">${new Date(d.created_at || result.created_at).toLocaleString()}</div></div>
                    </div>

                    <div class="grid" style="margin-top:12px;">
                        <div class="card"><div class="muted">Score</div><div style="font-weight:700;">${Math.round((d.score ?? result.score ?? result.percentage ?? 0) * 10) / 10}%</div></div>
                        <div class="card"><div class="muted">Correct</div><div style="font-weight:700;">${(result.correct_answers ?? d.correct_answers ?? result.correct ?? '-')}/${result.total_questions ?? d.total_questions ?? result.total_items ?? '-'}</div></div>
                        <div class="card"><div class="muted">Time</div><div style="font-weight:700;">${d.time_taken_seconds ? (Math.floor(d.time_taken_seconds / 60) + ":" + String(d.time_taken_seconds % 60).padStart(2, '0')) : 'N/A'}</div></div>
                    </div>

                    ${semester ? `<div style="margin-top:8px;" class="badge">Semester: ${semester}</div>` : ''}

                    ${categoryRows ? `<div style="margin-top:16px;" class="card">
                        <div style="font-weight:600; margin-bottom:6px;">Category Breakdown</div>
                        <table style="font-size:12px;">
                            <thead><tr>
                                <th>Category</th>
                                <th>Correct / Total</th>
                                <th>Score</th>
                            </tr></thead>
                            <tbody>${categoryRows}</tbody>
                        </table>
                    </div>` : ''}

                    ${recCourses ? `<div style="margin-top:16px;" class="card"><div style="font-weight:600; margin-bottom:6px;">Recommended Courses</div><ul>${recCourses}</ul></div>` : ''}

                    ${answersRows ? `<div style="margin-top:16px;">
                        <div style="font-weight:600; margin-bottom:6px;">Answers</div>
                        <table>
                            <thead><tr>
                                <th>#</th>
                                <th>Question</th>
                                <th>Your Answer</th>
                                <th>Correct</th>
                                <th>Result</th>
                            </tr></thead>
                            <tbody>${answersRows}</tbody>
                        </table>
                    </div>` : ''}

                    <div class="muted" style="margin-top:12px;font-size:11px;">Generated • ${new Date().toLocaleString()}</div>
                </body></html>`;

            const w = window.open('', '_blank');
            if (!w) { window?.showAlert?.('Popup blocked. Please allow popups to export PDF.', 'error'); return; }
            w.document.open();
            w.document.write(html);
            w.document.close();
            w.onload = () => { w.focus(); w.print(); };
        } catch (e) {
            window?.showAlert?.('Failed to download result', 'error');
        }
    };

    const handleDownloadAllPdf = () => {
        // Use the already filtered results (respects date filter)
        const items = allFilteredResults;
        const total = items.length;
        const pass = items.filter(r => (r.score ?? 0) >= 10).length;
        const fail = Math.max(total - pass, 0);
        const avg = total > 0 ? Math.round(items.reduce((s, r) => s + (r.score ?? 0), 0) / total) : 0;

        const rows = items.map((r, idx) => {
            const recs = (r.recommended_courses || []).map(c => `${c.course_code || ''} ${c.course_name || ''}`.trim()).filter(Boolean).join(', ');

            // Parse category breakdown
            let categoryBreakdown = r.category_breakdown || [];
            if (typeof categoryBreakdown === 'string') {
                try { categoryBreakdown = JSON.parse(categoryBreakdown); } catch (_) { categoryBreakdown = []; }
            }

            // Extract scores for each category (flexible match: "Math" matches "Mathematics", "MATH", etc.)
            const getCategory = (names) => {
                const namesList = Array.isArray(names) ? names : [names];
                if (!Array.isArray(categoryBreakdown)) return '—';
                for (const n of namesList) {
                    const cat = categoryBreakdown.find(c => c.category && String(c.category).toLowerCase().includes(String(n).toLowerCase()));
                    if (cat) return `${cat.correct}/${cat.total}`;
                }
                return '—';
            };

            return `<tr>
                <td style="padding:6px;border:1px solid #e5e7eb;text-align:center;">${idx + 1}</td>
                <td style="padding:6px;border:1px solid #e5e7eb;">${(r.examinee?.full_name || '—').replace(/</g, '&lt;')}</td>
                <td style=\"padding:6px;border:1px solid #e5e7eb;\">${r.semester || '—'}</td>
                <td style="padding:6px;border:1px solid #e5e7eb;text-align:center;">${r.school_year || '—'}</td>
                <td style="padding:6px;border:1px solid #e5e7eb;text-align:center;">${getCategory(['English'])}</td>
                <td style="padding:6px;border:1px solid #e5e7eb;text-align:center;">${getCategory(['Math', 'Mathematics'])}</td>
                <td style="padding:6px;border:1px solid #e5e7eb;text-align:center;">${getCategory(['Filipino'])}</td>
                <td style="padding:6px;border:1px solid #e5e7eb;text-align:center;">${getCategory(['Science'])}</td>
                <td style="padding:6px;border:1px solid #e5e7eb;text-align:center;">${getCategory(['Abstract Reasoning', 'Abstract'])}</td>
                <td style="padding:6px;border:1px solid #e5e7eb;text-align:center;">${r.correct_answers ?? r.correct ?? '-'}/${r.total_questions ?? r.total_items ?? '-'}</td>
                <td style="padding:6px;border:1px solid #e5e7eb;text-align:center;">${(r.time_taken ? (Math.floor(r.time_taken / 60) + ":" + String(r.time_taken % 60).padStart(2, '0')) : 'N/A')}</td>
                <td style="padding:6px;border:1px solid #e5e7eb;text-align:center;">${r.finished_at ? (() => {
                    let datePart;
                    if (r.finished_at.includes('T')) {
                        datePart = r.finished_at.split('T')[0];
                    } else {
                        datePart = r.finished_at.split(' ')[0];
                    }
                    const [year, month, day] = datePart.split('-');
                    return `${month}/${day}/${year}`;
                })() : (r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A')}</td>
                <td style="padding:6px;border:1px solid #e5e7eb;">${recs}</td>
            </tr>`;
        }).join('');

        const reportTitle = selectedDate ? `OCC Guidance - Exam Results Report (${new Date(selectedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })})` : 'OCC Guidance - Exam Results Report';
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${reportTitle}</title>
            <style>
                @media print { 
                    @page { 
                        margin: 10mm; 
                        size: landscape;
                    } 
                }
                body { font-family: Arial, sans-serif; color:#111827; font-size: 11px; }
                .muted { color:#6b7280; }
                .card { border:1px solid #e5e7eb; border-radius:8px; padding:12px; }
                .grid { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:12px; }
                .table { border-collapse: collapse; width:100%; font-size:10px; }
                .table th { text-align:left; background:#f9fafb; border:1px solid #e5e7eb; padding:4px; font-weight:600; }
                .table td { padding:4px; }
            </style>
        </head>
        <body>
            <div style="display:flex; align-items:center; gap:12px;">
                <img src="/OCC logo.png" alt="OCC" style="height:56px;width:56px;"/>
                <div>
                    <div style="font-size:18px; font-weight:700;">Opol Community College</div>
                    <div class="muted" style="font-size:13px;">Guidance Office • Examination Results Report${selectedDate ? ` (${new Date(selectedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })})` : ''}</div>
                </div>
            </div>
            <hr style="margin:12px 0; border:none; border-top:1px solid #e5e7eb;"/>

            <div class="grid" style="margin-bottom:12px;">
                <div class="card"><div class="muted">Total Results</div><div style="font-size:20px;font-weight:700;">${total}</div></div>
                <div class="card"><div class="muted">Passed (≥10%)</div><div style="font-size:20px;font-weight:700;color:#10B981;">${pass}</div></div>
                <div class="card"><div class="muted">Average Score</div><div style="font-size:20px;font-weight:700;color:#5439F7;">${avg}%</div></div>
            </div>

            <h3 style="margin:6px 0 8px;">Detailed Results with Category Breakdown</h3>
            <table class="table"> 
                <thead>
                    <tr>
                        <th style="text-align:center;">#</th>
                        <th>Student</th>
                        <th>Semester</th>
                        <th style="text-align:center;">Academic Year</th>
                        <th style="text-align:center;">English</th>
                        <th style="text-align:center;">Math</th>
                        <th style="text-align:center;">Filipino</th>
                        <th style="text-align:center;">Science</th>
                        <th style="text-align:center;">Abstract Reasoning</th>
                        <th style="text-align:center;">Total Correct</th>
                        <th style="text-align:center;">Time</th>
                        <th style="text-align:center;">Date</th>
                        <th>Recommended Courses</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>

            <div class="muted" style="margin-top:12px;font-size:11px;">Generated by OCC Guidance Office • ${new Date().toLocaleString()}</div>
        </body></html>`;

        const w = window.open('', '_blank');
        if (!w) { window?.showAlert?.('Popup blocked. Please allow popups to export PDF.', 'error'); return; }
        w.document.open();
        w.document.write(html);
        w.document.close();
        // Defer print to allow images to load
        w.onload = () => { w.focus(); w.print(); };
    };

    const handleDownloadModalOpen = () => {
        setShowDownloadModal(true);
    };

    const handleDownloadModalClose = () => {
        setShowDownloadModal(false);
    };

    const handleDownloadReport = (reportType) => {
        setShowDownloadModal(false);
        if (reportType === 'summarized') {
            handleDownloadSummarizedReport();
        } else if (reportType === 'detailed') {
            handleDownloadAllPdf();
        } else if (reportType === 'examinee_info') {
            window.location.href = '/guidance/exam-results/export-examinee-info';
        }
    };

    const handleDownloadSummarizedReport = async () => {
        // Use the already filtered results (respects date filter)
        const items = allFilteredResults;

        if (!items.length) {
            window?.showAlert?.('No student data found for summarized report', 'error');
            return;
        }

        // Open the output window synchronously to avoid popup blocking
        const w = window.open('', '_blank');
        if (!w) { window?.showAlert?.('Popup blocked. Please allow popups to export PDF.', 'error'); return; }
        w.document.open();
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Summarized Exam Results</title>
            <style>body{font-family:Arial, sans-serif; padding:24px; color:#111827}</style>
        </head><body>
            <div style="text-align:center; margin-top:40px;">
                <div style="font-weight:700;">Preparing summarized reports…</div>
                <div style="color:#6b7280; font-size:12px;">Please wait</div>
            </div>
        </body></html>`);
        w.document.close();

        try {
            // Build payload for batch endpoint (preserves Blade design server-side)
            const itemsPayload = items.map((it) => {
                let breakdown = it.category_breakdown || [];
                if (typeof breakdown === 'string') { try { breakdown = JSON.parse(breakdown); } catch (_) { breakdown = []; } }
                const getScore = (names) => {
                    if (!Array.isArray(breakdown)) return 0;
                    for (const n of names) { const c = breakdown.find(x => x.category && x.category.toLowerCase().includes(n.toLowerCase())); if (c) return c.correct || 0; }
                    return 0;
                };
                const englishScore = getScore(['English']);
                const filipinoScore = getScore(['Filipino']);
                const mathScore = getScore(['Math', 'Mathematics']);
                const scienceScore = getScore(['Science']);
                const abstractScore = getScore(['Abstract', 'Abstract Reasoning']);
                const totalScore = englishScore + filipinoScore + mathScore + scienceScore + abstractScore;
                const qualifiedPrograms = totalScore <= 60 ? ['BSBA', 'BSIT'] : ['EDUC', 'BSBA', 'BSIT'];

                // Include semester information for summarized report
                const semester = it.semester || '';

                return {
                    studentName: it.examinee?.full_name || 'Unknown Student',
                    studentAddress: it.examinee?.address || 'Address not provided',
                    semester,
                    examDate: it.finished_at ? (() => {
                        // Use finished_at directly without timezone conversion
                        let datePart;
                        if (it.finished_at.includes('T')) {
                            datePart = it.finished_at.split('T')[0];
                        } else {
                            datePart = it.finished_at.split(' ')[0];
                        }
                        const [year, month, day] = datePart.split('-');
                        return `${month}/${day}/${year}`;
                    })() : (it.created_at ? new Date(it.created_at).toLocaleDateString() : new Date().toLocaleDateString()),
                    englishScore,
                    filipinoScore,
                    mathScore,
                    scienceScore,
                    abstractScore,
                    totalScore,
                    qualifiedPrograms,
                    preferredCourse: it.examinee?.preferred_course || '',
                };
            });

            const { data } = await axios.post('/guidance/summarized-report/batch', { items: itemsPayload });

            w.document.open();
            w.document.write(data);
            w.document.close();
            w.onload = () => { w.focus(); w.print(); };
        } catch (error) {
            console.error('Error generating summarized reports:', error);
            window?.showAlert?.('Failed to generate summarized reports', 'error');
        }
    };

    const allFilteredResults = (allResults || results.data).filter(result => {
        if (selectedExam && result.exam && result.exam['exam-ref-no'] !== selectedExam) {
            return false;
        }
        if (selectedStatus && result.status !== selectedStatus) {
            return false;
        }
        if (selectedDate) {
            // Extract date from finished_at ONLY (matching database query logic)
            if (!result.finished_at) {
                return false; // Skip if no finished_at
            }
            try {
                // Handle both formats: "2025-10-27 17:07:01" and "2025-10-27T17:07:01.000000Z"
                let dateOnly;
                if (result.finished_at.includes('T')) {
                    // ISO format: "2025-10-27T17:07:01.000000Z"
                    dateOnly = result.finished_at.split('T')[0];
                } else {
                    // Standard format: "2025-10-27 17:07:01"
                    dateOnly = result.finished_at.split(' ')[0];
                }
                if (dateOnly !== selectedDate) {
                    return false;
                }
            } catch (e) {
                console.error('Error parsing date:', result.finished_at, e);
                return false;
            }
        }
        // Live search filter - search in student name, exam ref number, school year, semester
        if (tableSearchText.trim()) {
            const searchLower = tableSearchText.toLowerCase().trim();
            const studentName = (result.examinee?.full_name || '').toLowerCase();
            const examRef = (result.exam?.['exam-ref-no'] || '').toLowerCase();
            const schoolYear = (result.school_year || '').toLowerCase();
            const semester = (result.semester || '').toLowerCase();
            const personalityType = (result.personality_type || result.personality?.type || '').toLowerCase();
            
            if (!studentName.includes(searchLower) && 
                !examRef.includes(searchLower) && 
                !schoolYear.includes(searchLower) && 
                !semester.includes(searchLower) &&
                !personalityType.includes(searchLower)) {
                return false;
            }
        }
        return true;
    });

    // Paginate the filtered results
    const totalPages = Math.ceil(allFilteredResults.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const filteredResults = allFilteredResults.slice(startIndex, endIndex);

    // Save filter states to localStorage whenever they change
    useEffect(() => {
        saveToStorage('selectedExam', selectedExam);
    }, [selectedExam]);

    useEffect(() => {
        saveToStorage('selectedStatus', selectedStatus);
    }, [selectedStatus]);

    useEffect(() => {
        saveToStorage('selectedYear', selectedYear);
    }, [selectedYear]);

    useEffect(() => {
        saveToStorage('includeArchived', includeArchived);
    }, [includeArchived]);

    useEffect(() => {
        saveToStorage('selectedDate', selectedDate);
    }, [selectedDate]);

    useEffect(() => {
        saveToStorage('startDate', startDate);
    }, [startDate]);

    useEffect(() => {
        saveToStorage('endDate', endDate);
    }, [endDate]);

    useEffect(() => {
        saveToStorage('itemsPerPage', itemsPerPage);
    }, [itemsPerPage]);

    useEffect(() => {
        saveToStorage('tableSearchText', tableSearchText);
    }, [tableSearchText]);

    // Reset to page 1 when itemsPerPage changes
    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedExam, selectedStatus, selectedDate, startDate, endDate, tableSearchText]);

    const uniqueExams = [...new Set((allResults || results.data).map(result => result.exam ? result.exam['exam-ref-no'] : null).filter(Boolean))];
    const statuses = ['completed', 'in_progress', 'pending'];

    // Extract unique dates from finished_at ONLY (matching database query: DATE(finished_at))
    const dateExtractionDebug = [];
    const uniqueDates = [...new Set(
        (allResults || results.data)
            .filter(result => result.finished_at) // Only include results with finished_at
            .map(result => {
                try {
                    // Handle both formats: "2025-10-27 17:07:01" and "2025-10-27T17:07:01.000000Z"
                    let dateOnly;
                    if (result.finished_at.includes('T')) {
                        // ISO format: "2025-10-27T17:07:01.000000Z"
                        dateOnly = result.finished_at.split('T')[0];
                    } else {
                        // Standard format: "2025-10-27 17:07:01"
                        dateOnly = result.finished_at.split(' ')[0];
                    }

                    // Debug: collect sample data
                    if (dateExtractionDebug.length < 5) {
                        dateExtractionDebug.push({
                            original: result.finished_at,
                            extracted: dateOnly,
                            method: result.finished_at.includes('T') ? 'split_T' : 'split_space'
                        });
                    }

                    return dateOnly;
                } catch (e) {
                    console.error('Error parsing date:', result.finished_at, e);
                    return null;
                }
            })
            .filter(Boolean)
    )].sort((a, b) => new Date(b) - new Date(a)); // Sort descending (newest first)

    // Debug: Show date extraction samples
    if (dateExtractionDebug.length > 0) {
        console.log('[ExamResults] Date extraction samples:', dateExtractionDebug);
    }

    // Count results per date for display (matching database: COUNT(*) GROUP BY DATE(finished_at))
    const dateCount = {};
    (allResults || results.data).forEach(result => {
        if (result.finished_at) {
            try {
                // Handle both formats: "2025-10-27 17:07:01" and "2025-10-27T17:07:01.000000Z"
                let dateOnly;
                if (result.finished_at.includes('T')) {
                    // ISO format: "2025-10-27T17:07:01.000000Z"
                    dateOnly = result.finished_at.split('T')[0];
                } else {
                    // Standard format: "2025-10-27 17:07:01"
                    dateOnly = result.finished_at.split(' ')[0];
                }
                dateCount[dateOnly] = (dateCount[dateOnly] || 0) + 1;
            } catch (e) {
                console.error('Error parsing date:', result.finished_at, e);
            }
        }
    });

    // Debug: Log date counts to verify they match database
    console.log('[ExamResults] Date filtering debug:', {
        totalResults: (allResults || results.data).length,
        resultsWithFinishedAt: (allResults || results.data).filter(r => r.finished_at).length,
        uniqueDatesFound: uniqueDates.length,
        uniqueDates: uniqueDates,
        dateCount: dateCount,
        dateCountEntries: Object.entries(dateCount).map(([date, count]) => `${date}: ${count}`),
        selectedDate: selectedDate,
        filteredCount: filteredResults.length
    });

    // Additional debug: Show raw finished_at values for dates we're looking for
    const target27 = (allResults || results.data).filter(r => r.finished_at && r.finished_at.includes('2025-10-27'));
    const target28 = (allResults || results.data).filter(r => r.finished_at && r.finished_at.includes('2025-10-28'));
    const target29 = (allResults || results.data).filter(r => r.finished_at && r.finished_at.includes('2025-10-29'));
    console.log('[ExamResults] Target dates check:', {
        '2025-10-27_count': target27.length,
        '2025-10-27_samples': target27.slice(0, 3).map(r => r.finished_at),
        '2025-10-28_count': target28.length,
        '2025-10-28_samples': target28.slice(0, 3).map(r => r.finished_at),
        '2025-10-29_count': target29.length,
        '2025-10-29_samples': target29.slice(0, 3).map(r => r.finished_at)
    });

    // Debug: Show ALL unique finished_at dates in the data
    const allFinishedAtDates = (allResults || results.data)
        .filter(r => r.finished_at)
        .map(r => r.finished_at)
        .sort();
    console.log('[ExamResults] ALL finished_at dates in data:', allFinishedAtDates);

    // Charts data
    const passCount = filteredResults.filter(r => (r.score || 0) >= 10).length;
    const failCount = Math.max(filteredResults.length - passCount, 0);
    const averageScore = filteredResults.length > 0
        ? Math.round(filteredResults.reduce((sum, r) => sum + (r.score || 0), 0) / filteredResults.length)
        : 0;

    const passFailData = {
        labels: ['Passed', 'Failed'],
        datasets: [
            {
                label: 'Results',
                data: [passCount, failCount],
                backgroundColor: ['#1447E6', '#1D293D'],
                borderColor: ['#1447E6', '#1D293D'],
                borderWidth: 1,
            },
        ],
    };

    const recent = filteredResults.slice(0, 20).reverse();
    const lineData = {
        labels: recent.map(r => r.exam ? r.exam['exam-ref-no'] : 'Exam'),
        datasets: [
            {
                label: 'Score (Correct Answers)',
                data: recent.map(r => r.correct_answers || r.correct || 0),
                borderColor: '#1447E6',
                backgroundColor: 'rgba(20, 71, 230, 0.15)',
                fill: true,
                tension: 0.3,
                pointRadius: 3,
            },
        ],
    };

    // Score buckets for distribution chart (based on correct answers)
    const bucketLabels = ['0-5', '6-10', '11-15', '16-20', '21-25'];
    const bucketCounts = [0, 0, 0, 0, 0];
    filteredResults.forEach(r => {
        const correctAnswers = r.correct_answers || r.correct || 0;
        if (correctAnswers <= 5) bucketCounts[0]++;
        else if (correctAnswers <= 10) bucketCounts[1]++;
        else if (correctAnswers <= 15) bucketCounts[2]++;
        else if (correctAnswers <= 20) bucketCounts[3]++;
        else bucketCounts[4]++;
    });
    const distributionData = {
        labels: bucketLabels,
        datasets: [
            {
                label: 'Count',
                data: bucketCounts,
                backgroundColor: '#1447E6',
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12 } },
            tooltip: { mode: 'index', intersect: false },
        },
        scales: {
            y: { beginAtZero: true },
        },
    };

    console.log('[ExamResults] Chart data', { passCount, failCount, averageScore, bucketCounts, total: filteredResults.length });

    const handleProcessResults = () => {
        router.post('/guidance/process-results', {}, {
            onSuccess: () => {
                window.showAlert('Results processed and recommendations generated successfully', 'success');
            },
            onError: (errors) => {
                window.showAlert('Failed to process results', 'error');
            }
        });
    };

    const applyServerFilters = (yearValue = selectedYear, include = includeArchived, start = startDate, end = endDate) => {
        router.get('/guidance/exam-results', {
            year: yearValue || undefined,
            include_archived: include ? 'true' : 'false',
            start_date: start || undefined,
            end_date: end || undefined,
        }, { preserveState: true, preserveScroll: true });
    };

    const handleArchiveAll = async () => {
        try {
            await axios.post('/guidance/exam-results/archive-all');
            window.showAlert('All results archived', 'success');
            applyServerFilters(selectedYear, includeArchived);
        } catch (e) {
            window.showAlert('Failed to archive all results', 'error');
        }
    };

    const handleArchive = (id) => {
        router.post('/guidance/exam-results/archive', { id }, {
            preserveScroll: true,
            onSuccess: () => {
                window.showAlert?.('Result archived', 'success');
            },
            onError: () => {
                window.showAlert?.('Failed to archive result', 'error');
            }
        });
    };

    // Unarchive-by-year moved to Archived page

    return (
        <Layout user={user}>
            <div className="min-h-screen bg-slate-50 animate-up" style={{ animationDelay: '60ms' }}>
                <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-up" style={{ animationDelay: '120ms' }}>
                    {/* Modern Header Section */}
                    <div className="mb-8 rounded-3xl border border-[#1D293D] bg-[#1D293D] text-white shadow-sm overflow-hidden animate-up" style={{ animationDelay: '180ms' }}>
                        <div className="px-8 py-8 animate-up" style={{ animationDelay: '220ms' }}>
                            <div className="flex items-center justify-between animate-up" style={{ animationDelay: '260ms' }}>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-white/10 border border-white/15 rounded-2xl flex items-center justify-center">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-bold text-white">Exam Results Dashboard</h1>
                                        <p className="text-white/80 mt-1">Comprehensive analysis of student exam performance and outcomes</p>
                                        {!compactView && (
                                            <div className="mt-4 flex items-center space-x-6">
                                                <div className="flex items-center">
                                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span className="text-sm text-white/80">Total Results: {results.total || 0}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                                    </svg>
                                                    <span className="text-sm text-white/80">Pass Rate: {results.data.length > 0 ? Math.round((results.data.filter(r => r.score >= 10).length / results.data.length) * 100) : 0}%</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {!compactView && (
                                    <div className="text-right hidden md:block">
                                        <div className="text-3xl font-bold text-white">{results.data.length > 0 ? Math.round(results.data.reduce((sum, r) => sum + r.score, 0) / results.data.length) : 0}%</div>
                                        <div className="text-white/80 text-sm">Average Score</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Stats Cards */}
                        {!compactView && (
                            <div className="px-8 pb-8 animate-up" style={{ animationDelay: '300ms' }}>
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
                                    <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md animate-up" style={{ animationDelay: '340ms' }}>
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-semibold text-[#1D293D] text-sm">Total Examinees</h3>
                                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                            </div>
                                        </div>
                                        <p className="text-2xl font-bold text-[#1D293D]">{results.total || 0}</p>
                                        <p className="text-xs text-slate-500 mt-1">Students tested</p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md animate-up" style={{ animationDelay: '380ms' }}>
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-semibold text-[#1D293D] text-sm">Passed (≥10%)</h3>
                                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                        </div>
                                        <p className="text-2xl font-bold text-[#1D293D]">{results.data.filter(r => r.score >= 10).length}</p>
                                        <p className="text-xs text-slate-500 mt-1">Successful candidates</p>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md animate-up" style={{ animationDelay: '420ms' }}>
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-semibold text-[#1D293D] text-sm">Average Score</h3>
                                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                            </div>
                                        </div>
                                        <p className="text-2xl font-bold text-[#1D293D]">{results.data.length > 0 ? Math.round(results.data.reduce((sum, r) => sum + r.score, 0) / results.data.length) : 0}%</p>
                                        <p className="text-xs text-slate-500 mt-1">Overall performance</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Modern Filters and Actions */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8 animate-up" style={{ animationDelay: '320ms' }}>
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 animate-up" style={{ animationDelay: '340ms' }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-[#1447E6]/10 rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-[#1D293D]">Filters & Actions</h3>
                                        <p className="text-sm text-slate-600">Customize your view and manage results</p>

                                        <label className="flex items-center gap-2 text-sm text-slate-700 bg-white px-3 py-2 rounded-lg border border-slate-200 mt-2">
                                            <input type="checkbox" className="h-4 w-4 text-[#1447E6] focus:ring-[#1447E6] border-slate-300 rounded" checked={compactView} onChange={(e) => handleCompactViewChange(e.target.checked)} />
                                            <span className="font-medium">Compact View</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 animate-up" style={{ animationDelay: '360ms' }}>
                            <div className="flex flex-col gap-4">
                                {/* Row 1: Primary Filters */}
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
                                        {/* Group: Search Filters */}
                                        <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-full sm:w-auto">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-600">Exam</span>
                                                <select value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)} className="border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-[#1447E6] focus:border-[#1447E6] min-w-[150px] px-3 py-2 text-sm text-[#1D293D]">
                                                    <option value="">All Exams</option>
                                                    {Array.from(new Set(results.data.map(r => r.exam ? r.exam['exam-ref-no'] : null).filter(Boolean))).map(ex => (
                                                        <option key={ex} value={ex}>{ex}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-600">Status</span>
                                                <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-[#1447E6] focus:border-[#1447E6] min-w-[150px] px-3 py-2 text-sm text-[#1D293D]">
                                                    <option value="">All Statuses</option>
                                                    {['completed', 'in_progress', 'pending'].map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-600">Date</span>
                                                <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-[#1447E6] focus:border-[#1447E6] min-w-[180px] px-3 py-2 text-sm text-[#1D293D]">
                                                    <option value="">All Dates</option>
                                                    {uniqueDates.map(date => (
                                                        <option key={date} value={date}>
                                                            {new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} ({dateCount[date] || 0})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Group: Pagination */}
                                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                                            <span className="text-xs text-slate-600">Items</span>
                                            <select value={itemsPerPage} onChange={(e) => setItemsPerPage(parseInt(e.target.value))} className="border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-[#1447E6] focus:border-[#1447E6] min-w-[120px] px-3 py-2 text-sm text-[#1D293D]">
                                                <option value={10}>10 items</option>
                                                <option value={20}>20 items</option>
                                                <option value={30}>30 items</option>
                                                <option value={40}>40 items</option>
                                                <option value={50}>50 items</option>
                                                <option value={500}>500 items</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Row 2: Year / Archived / Range / Actions */}
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
                                        {/* Group: Year & Archived */}
                                        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-600">Year</span>
                                                <select value={selectedYear} onChange={(e) => { setSelectedYear(e.target.value); applyServerFilters(e.target.value, includeArchived); }} className="border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-[#1447E6] focus:border-[#1447E6] min-w-[120px] px-3 py-2 text-sm text-[#1D293D]">
                                                    <option value="">All Years</option>
                                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                                </select>
                                            </div>
                                            <label className="flex items-center gap-2 text-sm text-slate-700 bg-white px-3 py-2 rounded-lg border border-slate-200">
                                                <input type="checkbox" className="h-4 w-4 text-[#1447E6] focus:ring-[#1447E6] border-slate-300 rounded" checked={includeArchived} onChange={(e) => { setIncludeArchived(e.target.checked); applyServerFilters(selectedYear, e.target.checked); }} />
                                                <span className="font-medium">Include Archived</span>
                                            </label>
                                        </div>

                                        {/* Group: From / To */}
                                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-600">From</span>
                                                <select value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-[#1447E6] focus:border-[#1447E6] min-w-[180px] px-3 py-2 text-sm text-[#1D293D]">
                                                    <option value="">Select From</option>
                                                    {uniqueDates.map(date => (
                                                        <option key={`from-${date}`} value={date}>{new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} ({dateCount[date] || 0})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-600">To</span>
                                                <select value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-[#1447E6] focus:border-[#1447E6] min-w-[180px] px-3 py-2 text-sm text-[#1D293D]">
                                                    <option value="">Select To</option>
                                                    {uniqueDates.map(date => (
                                                        <option key={`to-${date}`} value={date}>{new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} ({dateCount[date] || 0})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Group: Apply / Clear */}
                                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                                            <button onClick={() => { 
                                                setSelectedDate(''); 
                                                let s = startDate || ''; 
                                                let e = endDate || ''; 
                                                if (s && e && s > e) { const tmp = s; s = e; e = tmp; }
                                                console.log('[ExamResults] Applying date range', { year: selectedYear, includeArchived, start: s || undefined, end: e || undefined });
                                                applyServerFilters(selectedYear, includeArchived, s, e); 
                                            }} className="border border-[#1447E6] bg-[#1447E6] text-white px-3 py-2 rounded-xl hover:bg-[#1240d0] text-sm font-semibold transition-colors duration-200 shadow-sm">Apply</button>
                                            <button onClick={() => { setStartDate(''); setEndDate(''); setSelectedDate(''); applyServerFilters(selectedYear, includeArchived, '', ''); }} className="border border-slate-300 bg-white text-slate-600 px-3 py-2 rounded-xl hover:border-[#1447E6] hover:text-[#1447E6] text-sm font-semibold transition-colors duration-200 shadow-sm">Clear</button>
                                        </div>
                                    </div>

                                    {/* Right-side Actions */}
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <button onClick={handleDownloadModalOpen} className="border border-[#1447E6] bg-[#1447E6] text-white px-4 py-2 rounded-xl hover:bg-[#1240d0] text-sm font-semibold transition-colors duration-200 shadow-sm">
                                                <span className="flex items-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    Download Reports
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </span>
                                            </button>
                                            {showDownloadModal && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={handleDownloadModalClose} aria-hidden="true" />
                                                    <div className="absolute right-0 bottom-full mb-2 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 animate-fadeIn">
                                                        <div className="text-xs text-slate-500 mb-3">Reports use current filters</div>
                                                        <div className="space-y-2">
                                                            <button
                                                                onClick={() => handleDownloadReport('summarized')}
                                                                className="w-full border border-[#1447E6] bg-[#1447E6] text-white px-4 py-3 rounded-xl hover:bg-[#1240d0] text-sm font-semibold transition-colors duration-200 flex items-center justify-between"
                                                            >
                                                                <span className="flex items-center gap-2">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                                    Summarized Report
                                                                </span>
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownloadReport('detailed')}
                                                                className="w-full bg-[#1D293D] text-white px-4 py-3 rounded-xl hover:bg-[#1240d0] text-sm font-semibold transition-colors duration-200 flex items-center justify-between"
                                                            >
                                                                <span className="flex items-center gap-2">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                                                    Detailed Report
                                                                </span>
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownloadReport('examinee_info')}
                                                                className="w-full border border-[#217346] bg-[#217346] text-white px-4 py-3 rounded-xl hover:bg-[#1a5c38] text-sm font-semibold transition-colors duration-200 flex items-center justify-between"
                                                            >
                                                                <span className="flex items-center gap-2">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                                    Download Examinee Info
                                                                </span>
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <a href="/guidance/exam-results/archived" className="border border-slate-300 bg-white text-slate-600 px-4 py-2 rounded-xl hover:border-[#1447E6] hover:text-[#1447E6] text-sm font-semibold transition-colors duration-200 shadow-sm">
                                            <span className="flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                                </svg>
                                                View Archived
                                            </span>
                                        </a>
                                        <button onClick={handleArchiveAll} className="border border-slate-300 bg-white text-slate-600 px-4 py-2 rounded-xl hover:border-[#1447E6] hover:text-[#1447E6] text-sm font-semibold transition-colors duration-200 shadow-sm">
                                            <span className="flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                                </svg>
                                                Archive All
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* Modern Charts Section */}
                    {!compactView && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8 animate-up" style={{ animationDelay: '380ms' }}>
                            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 animate-up" style={{ animationDelay: '400ms' }}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-[#1447E6]/10 rounded-xl flex items-center justify-center">
                                            <svg className="w-5 h-5 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-[#1D293D]">Performance Analytics</h3>
                                            <p className="text-sm text-slate-600">Visual insights into exam results and trends</p>
                                        </div>
                                    </div>
                                   
                                </div>
                            </div>
                            <div className="p-6 animate-up" style={{ animationDelay: '420ms' }}>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="rounded-xl p-6 border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white shadow-sm">
                                        <div className="mb-4">
                                            <h4 className="text-lg font-semibold text-[#1D293D] mb-1">Pass vs Fail</h4>
                                            <p className="text-sm text-slate-600">Filtered ({filteredResults.length})</p>
                                        </div>
                                        <div style={{ height: 260 }}>
                                            <Doughnut data={passFailData} options={{ ...chartOptions, scales: {} }} />
                                        </div>
                                    </div>
                                    <div className="rounded-xl p-6 border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white shadow-sm">
                                        <div className="mb-4">
                                            <h4 className="text-lg font-semibold text-[#1D293D] mb-1">Recent Scores</h4>
                                            <p className="text-sm text-slate-600">Last 20 entries (Correct answers)</p>
                                        </div>
                                        <div style={{ height: 260 }}>
                                            <Line data={lineData} options={chartOptions} />
                                        </div>
                                    </div>
                                    <div className="rounded-xl p-6 border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white shadow-sm">
                                        <div className="mb-4">
                                            <h4 className="text-lg font-semibold text-[#1D293D] mb-1">Score Distribution</h4>
                                            <p className="text-sm text-slate-600">Correct answers by range</p>
                                        </div>
                                        <div style={{ height: 260 }}>
                                            <Bar data={distributionData} options={chartOptions} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modern Results Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-up" style={{ animationDelay: '440ms' }}>
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 animate-up" style={{ animationDelay: '460ms' }}>
                            <div className="flex flex-col gap-4 animate-up" style={{ animationDelay: '480ms' }}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-[#1447E6]/10 rounded-xl flex items-center justify-center">
                                            <svg className="w-5 h-5 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-[#1D293D]">Exam Results</h3>
                                            <p className="text-sm text-slate-600">{compactView ? 'Compact list view' : 'Detailed examination performance data'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-[#1D293D]">
                                            Showing {filteredResults.length} of {allFilteredResults.length} results
                                        </p>
                                        <p className="text-xs text-slate-500">Filtered view</p>
                                    </div>
                                </div>
                                
                                {/* Live Search Bar */}
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        value={tableSearchText}
                                        onChange={(e) => setTableSearchText(e.target.value)}
                                        placeholder="Search by student name, exam ref, school year, semester, or personality type..."
                                        className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1447E6] focus:border-[#1447E6] transition-all duration-200 bg-white shadow-sm text-[#1D293D]"
                                    />
                                    {tableSearchText && (
                                        <button
                                            onClick={() => setTableSearchText('')}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="w-full">
                            <table className="w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4">
                                            <span className="flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                Student
                                            </span>
                                        </th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/6">
                                            <span className="flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Exam & Details
                                            </span>
                                        </th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/8">
                                            <span className="flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                Academic Year
                                            </span>
                                        </th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/6">
                                            <span className="flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                                Score
                                            </span>
                                        </th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/6">
                                            <span className="flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Correct
                                            </span>
                                        </th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/6">
                                            <span className="flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                Date
                                            </span>
                                        </th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/6">
                                            <span className="flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                                Status
                                            </span>
                                        </th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/6">
                                            <span className="flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                Actions
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {filteredResults.map((result, index) => (
                                        <tr key={result.id || result.resultId || `result-${index}`} className="bg-white hover:bg-[#1447E6]/10 transition-colors duration-200 animate-up" style={{ animationDelay: `${160 + index * 60}ms` }}>
                                            <td className="px-3 py-3 text-sm text-[#1D293D]">
                                                <div className="flex items-center">
                                                    <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                                                        <span className="text-slate-700 text-xs font-medium">
                                                            {result.examinee?.full_name ? result.examinee.full_name.charAt(0).toUpperCase() : 'U'}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-medium truncate">{result.examinee ? result.examinee.full_name : 'Unknown Student'}</div>
                                                        {/* Semester and Year Indicators */}
                                                        {(() => {
                                                            const semester = result.semester || '';
                                                            const year = result.year || result.academic_year || '';

                                                            // Check for first semester
                                                            const isFirstSem = semester.toLowerCase().includes('1st') ||
                                                                semester.toLowerCase().includes('first') ||
                                                                semester === '1' ||
                                                                semester.toLowerCase().includes('semester 1');

                                                            // Check for second semester
                                                            const isSecondSem = semester.toLowerCase().includes('2nd') ||
                                                                semester.toLowerCase().includes('second') ||
                                                                semester === '2' ||
                                                                semester.toLowerCase().includes('semester 2');

                                                            return (
                                                                <div className="flex items-center gap-1 mt-1">
                                                                    {/* Semester and Year Indicators */}
                                                                    {isFirstSem && (
                                                                        <>
                                                                            <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-300/20">
                                                                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                                </svg>
                                                                                1st Sem
                                                                            </span>
                                                                            {year && (
                                                                                <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-300/20">
                                                                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                                    </svg>
                                                                                    {year}
                                                                                </span>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                    {isSecondSem && (
                                                                        <>
                                                                            <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-[#1447E6]/10 text-[#1447E6] border border-[#1447E6]/20">
                                                                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                                </svg>
                                                                                2nd Sem
                                                                            </span>
                                                                            {year && (
                                                                                <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-300/20">
                                                                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                                    </svg>
                                                                                    {year}
                                                                                </span>
                                                                            )}
                                                                        </>
                                                                    )}

                                                                    {/* Year only (if no semester detected) */}
                                                                    {!isFirstSem && !isSecondSem && year && (
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-300/20">
                                                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                            </svg>
                                                                            {year}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-slate-500">
                                                <div className="space-y-1">
                                                    <div className="flex items-center">
                                                        <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center mr-1 flex-shrink-0">
                                                            <span className="text-xs font-bold text-slate-500">#</span>
                                                        </div>
                                                        <span className="font-medium truncate">{result.exam ? result.exam['exam-ref-no'] : 'N/A'}</span>
                                                    </div>
                                                    {/* Personality Type badge */}
                                                    {(() => {
                                                        const pType = result.personality_type
                                                            || (result.personality && (result.personality.type || result.personality))
                                                            || result.personalityType
                                                            || derivePersonality(result);
                                                        if (!pType) return null;
                                                        return (
                                                            <button onClick={(e) => openPersonalityPopover(e, pType)} className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-[#1447E6]/10 text-[#1447E6] border border-[#1447E6]/20 hover:bg-[#1447E6]/20">
                                                                {pType}
                                                            </button>
                                                        );
                                                    })()}
                                                    {Array.isArray(result.recommended_courses) && result.recommended_courses.length > 0 && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {result.recommended_courses.slice(0, 2).map((c, idx) => (
                                                                <span key={c.course_id || c.id || `course-${idx}`} className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-300/20">
                                                                    {c.course_code || c.course_name}
                                                                </span>
                                                            ))}
                                                            {result.recommended_courses.length > 2 && (
                                                                <span className="text-xs text-slate-500">+{result.recommended_courses.length - 2} more</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-slate-500">
                                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                                    {result.school_year || '—'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-slate-500">
                                                <div className="text-xs">
                                                    <div className={`font-semibold ${result.score >= 10 ? 'text-slate-700' : 'text-slate-700'}`}>
                                                        {result.correct_answers || result.correct}/{result.total_questions || result.total_items}
                                                    </div>
                                                    <div className="text-slate-400">
                                                        ({result.score}%)
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-slate-500">
                                                <div className="text-xs">
                                                    <div className="font-medium">{result.correct_answers}/{result.total_questions}</div>
                                                    <div className="text-slate-400">
                                                        {result.time_taken ? `${Math.floor(result.time_taken / 60)}:${String(result.time_taken % 60).padStart(2, '0')}` : 'N/A'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-slate-500">
                                                <div className="text-xs">
                                                    <div className="font-medium">
                                                        {result.finished_at && typeof result.finished_at === 'string' ? (() => {
                                                            // Handle both formats: "2025-10-28 18:40:16" and "2025-10-28T18:40:16.000000Z"
                                                            let datePart;
                                                            if (result.finished_at.includes('T')) {
                                                                // ISO format: "2025-10-28T18:40:16.000000Z"
                                                                datePart = result.finished_at.split('T')[0];
                                                            } else {
                                                                // Standard format: "2025-10-28 18:40:16"
                                                                datePart = result.finished_at.split(' ')[0];
                                                            }
                                                            const [year, month, day] = datePart.split('-');
                                                            return `${month}/${day}/${year}`;
                                                        })() :
                                                            result.created_at && typeof result.created_at === 'string' ? (() => {
                                                                let datePart;
                                                                if (result.created_at.includes('T')) {
                                                                    datePart = result.created_at.split('T')[0];
                                                                } else {
                                                                    datePart = result.created_at.split(' ')[0];
                                                                }
                                                                const [year, month, day] = datePart.split('-');
                                                                return `${month}/${day}/${year}`;
                                                            })() :
                                                                result.date && typeof result.date === 'string' ? (() => {
                                                                    let datePart;
                                                                    if (result.date.includes('T')) {
                                                                        datePart = result.date.split('T')[0];
                                                                    } else {
                                                                        datePart = result.date.split(' ')[0];
                                                                    }
                                                                    const [year, month, day] = datePart.split('-');
                                                                    return `${month}/${day}/${year}`;
                                                                })() :
                                                                    result.exam_date && typeof result.exam_date === 'string' ? (() => {
                                                                        let datePart;
                                                                        if (result.exam_date.includes('T')) {
                                                                            datePart = result.exam_date.split('T')[0];
                                                                        } else {
                                                                            datePart = result.exam_date.split(' ')[0];
                                                                        }
                                                                        const [year, month, day] = datePart.split('-');
                                                                        return `${month}/${day}/${year}`;
                                                                    })() :
                                                                        'N/A'}
                                                    </div>
                                                    <div className="text-slate-400">
                                                        {result.finished_at && typeof result.finished_at === 'string' ? (() => {
                                                            let timePart;
                                                            if (result.finished_at.includes('T')) {
                                                                // ISO format: "2025-10-28T18:40:16.000000Z"
                                                                timePart = result.finished_at.split('T')[1].split('.')[0]; // Remove milliseconds and Z
                                                            } else {
                                                                // Standard format: "2025-10-28 18:40:16"
                                                                timePart = result.finished_at.split(' ')[1];
                                                            }
                                                            if (!timePart) return 'N/A';
                                                            const [hours, minutes, seconds] = timePart.split(':');
                                                            const hour12 = hours > 12 ? hours - 12 : hours;
                                                            const ampm = hours >= 12 ? 'PM' : 'AM';
                                                            return `${hour12}:${minutes} ${ampm}`;
                                                        })() :
                                                            result.created_at && typeof result.created_at === 'string' ? (() => {
                                                                let timePart;
                                                                if (result.created_at.includes('T')) {
                                                                    timePart = result.created_at.split('T')[1].split('.')[0];
                                                                } else {
                                                                    timePart = result.created_at.split(' ')[1];
                                                                }
                                                                if (!timePart) return 'N/A';
                                                                const [hours, minutes, seconds] = timePart.split(':');
                                                                const hour12 = hours > 12 ? hours - 12 : hours;
                                                                const ampm = hours >= 12 ? 'PM' : 'AM';
                                                                return `${hour12}:${minutes} ${ampm}`;
                                                            })() :
                                                                result.date && typeof result.date === 'string' ? (() => {
                                                                    let timePart;
                                                                    if (result.date.includes('T')) {
                                                                        timePart = result.date.split('T')[1].split('.')[0];
                                                                    } else {
                                                                        timePart = result.date.split(' ')[1];
                                                                    }
                                                                    if (!timePart) return 'N/A';
                                                                    const [hours, minutes, seconds] = timePart.split(':');
                                                                    const hour12 = hours > 12 ? hours - 12 : hours;
                                                                    const ampm = hours >= 12 ? 'PM' : 'AM';
                                                                    return `${hour12}:${minutes} ${ampm}`;
                                                                })() :
                                                                    result.exam_date && typeof result.exam_date === 'string' ? (() => {
                                                                        let timePart;
                                                                        if (result.exam_date.includes('T')) {
                                                                            timePart = result.exam_date.split('T')[1].split('.')[0];
                                                                        } else {
                                                                            timePart = result.exam_date.split(' ')[1];
                                                                        }
                                                                        if (!timePart) return 'N/A';
                                                                        const [hours, minutes, seconds] = timePart.split(':');
                                                                        const hour12 = hours > 12 ? hours - 12 : hours;
                                                                        const ampm = hours >= 12 ? 'PM' : 'AM';
                                                                        return `${hour12}:${minutes} ${ampm}`;
                                                                    })() :
                                                                        'N/A'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-sm">
                                                <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${result.status === 'completed' ? 'bg-slate-100 text-slate-700' :
                                                    result.status === 'in_progress' ? 'bg-slate-100 text-slate-700' :
                                                        'bg-slate-100 text-slate-700'
                                                    }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full mr-1 bg-slate-500`}></div>
                                                    {result.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <a href={`/guidance/exam-results/${result.resultId || result.id}/preview`} className="inline-flex items-center px-3 py-2 border border-[#1447E6] bg-[#1447E6] text-white text-sm rounded-lg hover:bg-[#1240d0] transition-colors duration-200 shadow-sm" title="View Details">
                                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                        View
                                                    </a>
                                                    <button onClick={() => handleDownload(result)} className="inline-flex items-center px-3 py-2 bg-[#1D293D] text-white text-sm rounded-lg hover:bg-[#1240d0] transition-all duration-200 shadow-sm hover:shadow-md" title="Download">
                                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        Download
                                                    </button>
                                                    <button onClick={() => handleArchive(result.resultId || result.id)} className="inline-flex items-center px-3 py-2 border border-slate-300 bg-white text-slate-600 hover:border-[#1447E6] hover:text-[#1447E6] text-sm rounded-lg transition-colors duration-200 shadow-sm" title="Archive Result">
                                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                                        </svg>
                                                        Archive
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {results.data.length === 0 && (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                                                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-[#1D293D] mb-2">No exam results found</h3>
                                                        <p className="text-slate-500">No results match the current filter criteria.</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {allFilteredResults.length > 0 && (
                            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="text-sm text-slate-600">
                                        Showing <span className="font-semibold text-[#1447E6]">{startIndex + 1}</span> to{' '}
                                        <span className="font-semibold text-[#1447E6]">{Math.min(endIndex, allFilteredResults.length)}</span> of{' '}
                                        <span className="font-semibold text-[#1447E6]">{allFilteredResults.length}</span> results
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className={`px-3 py-2 text-sm font-semibold rounded-xl border transition-colors duration-150 ${
                                                currentPage === 1
                                                    ? 'border-slate-300 bg-white text-slate-400 cursor-not-allowed'
                                                    : 'border-slate-300 bg-white text-slate-600 hover:border-[#1447E6] hover:text-[#1447E6]'
                                            }`}
                                        >
                                            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                            </svg>
                                            Previous
                                        </button>
                                        
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let pageNum;
                                                if (totalPages <= 5) {
                                                    pageNum = i + 1;
                                                } else if (currentPage <= 3) {
                                                    pageNum = i + 1;
                                                } else if (currentPage >= totalPages - 2) {
                                                    pageNum = totalPages - 4 + i;
                                                } else {
                                                    pageNum = currentPage - 2 + i;
                                                }
                                                
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        className={`min-w-[40px] px-3 py-2 text-sm font-semibold rounded-xl border transition-colors duration-150 ${
                                                            currentPage === pageNum
                                                                ? 'border-[#1447E6] bg-[#1447E6] text-white'
                                                                : 'border-slate-300 bg-white text-slate-600 hover:border-[#1447E6] hover:text-[#1447E6]'
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                            className={`px-3 py-2 text-sm font-semibold rounded-xl border transition-colors duration-150 ${
                                                currentPage === totalPages
                                                    ? 'border-slate-300 bg-white text-slate-400 cursor-not-allowed'
                                                    : 'border-slate-300 bg-white text-slate-600 hover:border-[#1447E6] hover:text-[#1447E6]'
                                            }`}
                                        >
                                            Next
                                            <svg className="w-4 h-4 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Modern Details Drawer */}
                    {detailOpen && (
                        <div className="fixed inset-0 z-50">
                            <div className="absolute inset-0 bg-clear bg-opacity-20 backdrop-blur-sm flex" onClick={() => setDetailOpen(false)} />
                            <div className="absolute top-0 right-0 h-full w-full sm:w-[520px] bg-white shadow-2xl flex flex-col animate-slideInRight border border-slate-200">
                                <div className="bg-[#1D293D] px-6 py-4 border-b border-slate-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-white">Exam Details</h3>
                                                {detailData && (
                                                    <div className="space-y-1">
                                                        <p className="text-xs text-white/90">
                                                            {detailData.examinee?.full_name} • {detailData.exam_ref_no} • {new Date(detailData.created_at).toLocaleString()}
                                                        </p>
                                                        <p className="text-xs text-white/90">
                                                            Score: <span className="font-medium text-white">{detailData.score?.toFixed(1)}%</span>
                                                            {detailData.time_taken_seconds && (
                                                                <span className="ml-3">
                                                                    Time: <span className="font-medium text-white">{Math.floor(detailData.time_taken_seconds / 60)}:{String(detailData.time_taken_seconds % 60).padStart(2, '0')}</span>
                                                                </span>
                                                            )}
                                                        </p>
                                                        {(() => {
                                                            const pType = detailData.personality_type
                                                                || (detailData.personality && (detailData.personality.type || detailData.personality))
                                                                || derivePersonality(detailData);
                                                            if (!pType) return null;
                                                            return (
                                                                <p className="text-xs text-white/90">
                                                                    Personality: <button onClick={(e) => openPersonalityPopover(e, pType)} className="font-medium text-white hover:text-white/80 underline">{pType}</button>
                                                                </p>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all duration-200" onClick={() => setDetailOpen(false)}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Recommended Courses Section */}
                                {detailData?.recommended_courses && detailData.recommended_courses.length > 0 && (
                                    <div className="px-6 py-4 bg-[#1447E6]/10 border-b border-slate-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-semibold text-[#1447E6] flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                </svg>
                                                Recommended Courses
                                            </h4>
                                            <button
                                                onClick={() => handleCoursesExpandedChange(!coursesExpanded)}
                                                className="inline-flex items-center px-2 py-1 text-xs font-medium text-[#1447E6] bg-[#1447E6]/10 rounded-md hover:bg-[#1447E6]/20 transition-colors duration-200"
                                                title={coursesExpanded ? "Minimize" : "Expand"}
                                            >
                                                <svg className={`w-3 h-3 transition-transform duration-200 ${coursesExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                </svg>
                                                <span className="ml-1">{coursesExpanded ? 'Minimize' : 'Expand'}</span>
                                            </button>
                                        </div>
                                        {coursesExpanded && (
                                            <div className="space-y-3">
                                                {detailData.recommended_courses.map((course, index) => (
                                                    <div key={course.course_id || index} className="bg-white rounded-lg p-3 border border-[#1447E6]/20 shadow-sm">
                                                        <div className="font-semibold text-[#1447E6] text-sm">{course.course_name}</div>
                                                        <div className="text-[#1447E6] text-xs mt-1">{course.course_description}</div>
                                                        <div className="text-[#1447E6] text-xs mt-2 flex items-center gap-4">
                                                            <span>Score Range: {course.score_range}</span>
                                                            <span>Passing Rate: {course.passing_rate}%</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <select value={answerFilter} onChange={(e) => setAnswerFilter(e.target.value)} className="border-2 border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1447E6] focus:border-[#1447E6]">
                                            <option value="all">All Answers</option>
                                            <option value="correct">Correct Only</option>
                                            <option value="incorrect">Incorrect Only</option>
                                        </select>
                                        <input
                                            value={searchText}
                                            onChange={(e) => setSearchText(e.target.value)}
                                            placeholder="Search question..."
                                            className="flex-1 border-2 border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1447E6] focus:border-[#1447E6]"
                                        />
                                        {detailData && (
                                            <div className="bg-white px-3 py-2 rounded-lg border border-slate-200">
                                                <span className="text-xs text-slate-500">Score: <span className="font-semibold text-[#1447E6]">{detailData.score}%</span></span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto">
                                    {detailLoading && (
                                        <div className="p-8 text-center">
                                            <div className="w-12 h-12 bg-[#1447E6]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <svg className="w-6 h-6 text-[#1447E6] animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                            </div>
                                            <p className="text-slate-500 text-sm">Loading exam details...</p>
                                        </div>
                                    )}
                                    {detailError && (
                                        <div className="p-8 text-center">
                                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </div>
                                            <p className="text-slate-700 text-sm">{detailError}</p>
                                        </div>
                                    )}
                                    {detailData && (
                                        <div className="p-6 space-y-4">
                                            {detailData.answers
                                                .filter(a => answerFilter === 'all' ? true : answerFilter === 'correct' ? a.is_correct : !a.is_correct)
                                                .filter(a => a.question.toLowerCase().includes(searchText.toLowerCase()))
                                                .map((a, idx) => (
                                                    <div key={a.question_id || a.no || `answer-${idx}`} className={`border-2 rounded-xl p-4 shadow-sm ${a.is_correct ? 'border-slate-300/20 bg-slate-50' : 'border-slate-300/20 bg-slate-50'}`}>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="text-xs font-semibold text-slate-500 bg-white px-2 py-1 rounded-full border">Question {a.no}</div>
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center bg-slate-500`}>
                                                                {a.is_correct ? (
                                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-sm font-medium text-[#1D293D] mb-3 leading-relaxed">{a.question}</div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div className="bg-white rounded-lg p-3 border border-slate-200">
                                                                <div className="text-xs text-slate-500 mb-1">Your Answer</div>
                                                                <div className={`font-semibold ${a.is_correct ? 'text-slate-700' : 'text-slate-700'}`}>{a.student_answer || '—'}</div>
                                                            </div>
                                                            <div className="bg-white rounded-lg p-3 border border-slate-200">
                                                                <div className="text-xs text-slate-500 mb-1">Correct Answer</div>
                                                                <div className="font-semibold text-[#1D293D]">{a.correct_answer}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modern Personality Popover */}
                {popover.open && (
                    <div onClick={closePopover} className="fixed inset-0 z-40" style={{ background: 'transparent' }} />
                )}
                {popover.open && (
                    <div className="absolute z-50 bg-white border-2 border-slate-200 rounded-xl shadow-2xl p-4 w-80" style={{ top: popover.y, left: popover.x }}>
                        {popover.loading ? (
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 bg-[#1447E6]/10 rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-[#1447E6] animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </div>
                                <span className="text-sm text-slate-500">Loading personality details...</span>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 bg-[#1447E6] rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-[#1D293D]">{popover.data?.title || popover.data?.type}</div>
                                        <div className="text-xs text-slate-500">Type: {popover.data?.type}</div>
                                    </div>
                                </div>
                                <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-200">
                                    {popover.data?.description || 'No description available.'}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <style>{`
        @keyframes slideInRight {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
        }
        .animate-slideInRight {
            animation: slideInRight 0.3s ease-out;
                }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .animate-fadeIn {
                        animation: fadeIn 0.3s ease-out;
                }
            `}</style>
            </div>
        </Layout>
    );
};

export default ExamResults;