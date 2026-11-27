import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { fetchSubscriptionLifecycle } from '../utils/subscriptionLock';
import API_BASE_URL from '../config/api';

export default function ResultCardGenerator() {
  const [readOnly, setReadOnly] = useState(false);
  useEffect(() => {
    fetchSubscriptionLifecycle().then((life) => {
      if (life.softLock || life.expired || life.pastGrace || life.blocked) setReadOnly(true);
    });
  }, []);
  const [activeTemplate, setActiveTemplate] = useState(1);
  const [logoUrl, setLogoUrl] = useState(null);
  const [wmMode, setWmMode] = useState('text');
  const [wmLogoUrl, setWmLogoUrl] = useState(null);
  const handleWmLogoUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { setWmLogoUrl(r.result); setWmMode('logo'); };
    r.readAsDataURL(f);
  };

  const [meta, setMeta] = useState({
    schoolName: "BEACONHOUSE SCHOOL SYSTEM",
    examTitle: "Annual Examination Result Card 2026",
    studentName: "Muhammad Ali",
    fatherName: "Ahmed Hassan",
    rollNo: "1042",
    className: "Class 10 - Blue",
    attendance: "92%",
    remarks: "Excellent academic performance and consistent progress."
  });

  const [subjects, setSubjects] = useState([
    { name: "English", total: 100, obtained: 85 },
    { name: "Mathematics", total: 100, obtained: 92 },
    { name: "Physics", total: 85, obtained: 71 },
    { name: "Chemistry", total: 85, obtained: 68 },
    { name: "Computer Science", total: 100, obtained: 88 }
  ]);

  const [loadRoll, setLoadRoll] = useState('');
  const [loadMsg, setLoadMsg] = useState('');
  const [loadBusy, setLoadBusy] = useState(false);
  const [linkedStudentId, setLinkedStudentId] = useState('');
  const [linkedParentPhone, setLinkedParentPhone] = useState('');
  const [sendBusy, setSendBusy] = useState(false);

  const loadFromSystem = async () => {
    const schoolId = localStorage.getItem('schoolId');
    if (!schoolId) { setLoadMsg('Please login as school first.'); return; }
    if (!String(loadRoll || meta.rollNo || '').trim()) { setLoadMsg('Enter roll number first.'); return; }
    const roll = String(loadRoll || meta.rollNo).trim();
    setLoadBusy(true); setLoadMsg('');
    try {
      const { data } = await axios.get(`${API_BASE_URL}/exams/${schoolId}/student-report`, { params: { rollNumber: roll } });
      const st = data.student || {};
      setLinkedStudentId(st._id || st.id || data.studentId || '');
      setLinkedParentPhone(st.parentPhone || st.guardianPhone || st.phone || data.parentPhone || '');
      setMeta((m) => ({
        ...m,
        schoolName: data.schoolName || m.schoolName,
        studentName: st.name || '',
        fatherName: st.fatherName || st.guardianName || m.fatherName,
        rollNo: st.rollNumber || roll,
        className: st.className || '',
        attendance: data.attendance?.rate != null ? `${data.attendance.rate}%` : m.attendance,
        examTitle: data.subjects?.[0]?.examName ? `${data.subjects[0].examName} Result Card` : m.examTitle
      }));
      if (data.subjects?.length) {
        setSubjects(data.subjects.map((s) => ({ name: s.subject || 'Subject', total: Number(s.maximumMarks) || 100, obtained: Number(s.obtainedMarks) || 0 })));
        setLoadMsg(`Loaded ${data.subjects.length} subjects · Attendance ${data.attendance?.rate ?? 'n/a'}%`);
      } else {
        setSubjects([]);
        setLoadMsg('Student found but no marks yet. Use Exams & Results → Enter Marks first.');
      }
    } catch (err) {
      setLoadMsg(err.response?.data?.error || 'Unable to load student.');
    } finally { setLoadBusy(false); }
  };

  const handleMetaChange = (e) => setMeta({ ...meta, [e.target.name]: e.target.value });
  const handleLogoUpload = (e) => { if (e.target.files && e.target.files[0]) setLogoUrl(URL.createObjectURL(e.target.files[0])); };
  const handleSubjectChange = (index, field, value) => {
    const updated = [...subjects];
    updated[index][field] = field === 'name' ? value : Number(value);
    setSubjects(updated);
  };
  const addSubject = () => setSubjects([...subjects, { name: "New Subject", total: 100, obtained: 0 }]);
  const removeSubject = (index) => setSubjects(subjects.filter((_, i) => i !== index));
  const totalSum = subjects.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
  const obtainedSum = subjects.reduce((acc, curr) => acc + (Number(curr.obtained) || 0), 0);
  const percentage = totalSum > 0 ? ((obtainedSum / totalSum) * 100).toFixed(2) : "0.00";
  const getGrade = (perc) => {
    if (perc >= 80) return "A+";
    if (perc >= 70) return "A";
    if (perc >= 60) return "B";
    if (perc >= 50) return "C";
    if (perc >= 33) return "D";
    return "F";
  };
  const overallGrade = getGrade(percentage);

  const RESULT_KEY = 'vends_saved_results';
  const listSavedResults = () => { try { return JSON.parse(localStorage.getItem(RESULT_KEY) || '[]'); } catch { return []; } };
  const saveNamedResult = () => {
    if (readOnly) { alert('Plan ended — saving new result cards is locked. Load a saved card and print only.'); return; }
    const name = window.prompt('Save result card as (name):');
    if (!name || !name.trim()) return;
    const entry = { id: Date.now(), name: name.trim(), savedAt: new Date().toISOString(), payload: { meta, subjects, activeTemplate } };
    const all = listSavedResults().filter((r) => r.name !== entry.name);
    all.unshift(entry);
    localStorage.setItem(RESULT_KEY, JSON.stringify(all.slice(0, 20)));
    alert('Result saved: ' + entry.name);
  };
  const loadNamedResult = () => {
    const all = listSavedResults();
    if (!all.length) { alert('No saved results yet.'); return; }
    const names = all.map((r, i) => `${i + 1}. ${r.name}`).join('\n');
    const pick = window.prompt('Load result number:\n' + names);
    const idx = Number(pick) - 1;
    if (!all[idx]?.payload) { alert('Invalid selection'); return; }
    const p = all[idx].payload;
    if (p.meta) setMeta(p.meta);
    if (p.subjects) setSubjects(p.subjects);
    if (p.activeTemplate) setActiveTemplate(p.activeTemplate);
  };
  const buildResultMessage = () => {
    const subjectLines = subjects.length
      ? subjects.map((s) => `• ${s.name}: ${s.obtained}/${s.total}`)
      : ['• No subject marks on this card'];
    return [
      'Assalam o alaikum dear parents,',
      '',
      `Result card for ${meta.studentName || 'student'} (Roll ${meta.rollNo || '—'}).`,
      meta.className ? `Class: ${meta.className}` : '',
      meta.examTitle ? `Exam: ${meta.examTitle}` : '',
      meta.attendance ? `Attendance: ${meta.attendance}` : '',
      '',
      'Marks:',
      ...subjectLines,
      '',
      `Total: ${obtainedSum}/${totalSum} · ${percentage}% · Grade ${overallGrade}`,
      meta.remarks ? `Remarks: ${meta.remarks}` : '',
      '',
      '— School Admin (Synapse EduCore)',
    ].filter((x) => x !== '').join('\n');
  };

  const sendResultToParent = async () => {
    if (readOnly) {
      alert('Plan ended — sending is locked.');
      return;
    }
    if (!meta.studentName && !meta.rollNo) {
      alert('Load a student first (enter roll number and click Load).');
      return;
    }
    const lines = buildResultMessage();
    setSendBusy(true);
    try {
      const { data: contactsRes } = await axios.get(`${API_BASE_URL}/community/contacts`, { params: { type: 'parent' } });
      const contacts = Array.isArray(contactsRes) ? contactsRes : (contactsRes?.contacts || []);
      const phoneDigits = String(linkedParentPhone || '').replace(/\D/g, '');
      const studentName = (meta.studentName || '').trim();
      const roll = String(meta.rollNo || '').trim();
      const nameToken = studentName.toLowerCase().split(/\s+/)[0] || '';

      const match = contacts.find((c) => {
        const cPhone = String(c.phone || '').replace(/\D/g, '');
        if (phoneDigits && cPhone && (cPhone.endsWith(phoneDigits) || phoneDigits.endsWith(cPhone))) return true;
        if (linkedStudentId && (String(c.studentId || '') === String(linkedStudentId) || String(c.linkedStudentId || '') === String(linkedStudentId))) return true;
        const cName = (c.name || '').toLowerCase();
        const preview = (c.lastMessagePreview || '').toLowerCase();
        if (roll && (cName.includes(roll) || preview.includes(roll) || String(c.rollNumber || '') === roll)) return true;
        if (nameToken && nameToken.length > 2 && (cName.includes(nameToken) || preview.includes(nameToken))) return true;
        if (studentName && cName.includes(studentName.toLowerCase())) return true;
        return false;
      });

      if (!match) {
        sessionStorage.setItem('sePrefillMessage', lines);
        sessionStorage.setItem('sePrefillPhone', linkedParentPhone || '');
        sessionStorage.setItem('sePrefillStudentName', studentName);
        sessionStorage.setItem('sePrefillStudentId', linkedStudentId || '');
        sessionStorage.setItem('sePrefillAutoSend', '0');
        alert(
          `Parent contact not found automatically for "${studentName || roll}".\n` +
          `Opening Communication Center — select the correct parent and press Send.\n` +
          `(Class: ${meta.className || '—'} · Roll: ${roll || '—'})`
        );
        window.location.href = '/communication-center';
        return;
      }

      const openRes = await axios.post(`${API_BASE_URL}/community/conversations/open`, {
        participantType: match.participantType || 'parent',
        participantId: match.participantId,
      });
      const conversationId = openRes.data?.conversation?._id || openRes.data?.conversationId;
      if (!conversationId) throw new Error('Could not open conversation');

      await axios.post(`${API_BASE_URL}/community/conversations/${conversationId}/messages`, { text: lines });

      alert(
        `✅ Result card AUTO-SENT to parent.\n\n` +
        `Student: ${studentName || '—'}\n` +
        `Class: ${meta.className || '—'}\n` +
        `Roll: ${roll || '—'}\n` +
        `Parent chat: ${match.name || 'Parent'}`
      );
      sessionStorage.setItem('sePrefillMessage', '');
      sessionStorage.removeItem('sePrefillAutoSend');
      window.location.href = '/communication-center';
    } catch (err) {
      console.error(err);
      sessionStorage.setItem('sePrefillMessage', lines);
      sessionStorage.setItem('sePrefillPhone', linkedParentPhone || '');
      sessionStorage.setItem('sePrefillStudentName', meta.studentName || '');
      sessionStorage.setItem('sePrefillStudentId', linkedStudentId || '');
      alert(err.response?.data?.error || err.message || 'Auto-send failed. Opening chat with message ready — select parent and Send.');
      window.location.href = '/communication-center';
    } finally {
      setSendBusy(false);
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <style>{`
        .rc-watermark { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:0; overflow:hidden; }
        .rc-watermark span { font-size:36px; font-weight:800; color:rgba(15,23,42,0.07); transform:rotate(-28deg); white-space:nowrap; text-transform:uppercase; }
        .rc-watermark img { max-width:45%; max-height:45%; opacity:0.09; transform:rotate(-18deg); object-fit:contain; }
        .vends-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .vends-input { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; width: 100%; box-sizing: border-box; }
        .vends-label { font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 4px; display: block; }
        .template-thumb { border: 2px solid #e2e8f0; border-radius: 10px; padding: 12px; cursor: pointer; text-align: center; transition: all 0.2s; background: #fff; }
        .template-thumb.active { border-color: #0284c7; background: #e0f2fe; box-shadow: 0 0 0 2px #0284c7; }
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          html, body, #root, .app-container, .main-workspace, .grid-container { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; background: #ffffff !important; overflow: visible !important; }
          .no-print { display: none !important; }
          .printable-card-area { display: block !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; border: none !important; box-shadow: none !important; }
        }
      `}</style>
      <div className="no-print"><Sidebar /></div>
      <div className="main-workspace app-main" style={{ flex: 1, padding: '24px' }}>
        {readOnly && (
          <div className="no-print" style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10, padding: '10px 14px', marginBottom: 14, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#92400e' }}>
            Plan ended — read-only: load a previously saved result and print. New edits and saves are locked.
          </div>
        )}
        <div className="vends-card no-print">
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>🎨 Select Result Card Template Design</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            {[
              { n: 1, label: 'Classic Dark' },
              { n: 2, label: 'Modern Blue' },
              { n: 3, label: 'Elegant Maroon' },
              { n: 4, label: 'Minimal Clean' },
            ].map(({ n, label }) => (
              <div key={n} className={`template-thumb ${activeTemplate === n ? 'active' : ''}`} onClick={() => setActiveTemplate(n)}>
                <div style={{ fontWeight: '700', fontSize: '13px' }}>Template {n}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', alignItems: 'start' }}>
          <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="vends-card">
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#0f172a' }}>📝 Information & Logo</h4>
              <div className="vends-card no-print" style={{ marginBottom: 16, border: '1px solid #bae6fd', background: '#e0f2fe' }}>
                <div className="vends-label" style={{ marginBottom: 8 }}>Load from system (Exams marks + Attendance)</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="vends-input" placeholder="Roll number" value={loadRoll} onChange={(e) => setLoadRoll(e.target.value)} style={{ flex: 1 }} />
                  <button type="button" onClick={loadFromSystem} disabled={loadBusy} style={{ padding: '8px 14px', borderRadius: 8, background: '#0284c7', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{loadBusy ? 'Loading…' : 'Load'}</button>
                </div>
                {loadMsg ? <div style={{ fontSize: 12, marginTop: 8, color: '#0369a1' }}>{loadMsg}</div> : null}
              </div>
              <div><span className="vends-label">School Logo</span><input type="file" accept="image/*,.svg" onChange={handleLogoUpload} className="vends-input" /></div>
              <div style={{ marginTop: 10 }}>
                <span className="vends-label">Watermark</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 13, marginTop: 4 }}>
                  <label><input type="radio" checked={wmMode==='text'} onChange={() => setWmMode('text')} /> School name text</label>
                  <label><input type="radio" checked={wmMode==='logo'} onChange={() => setWmMode('logo')} /> Logo file</label>
                  <label><input type="radio" checked={wmMode==='off'} onChange={() => setWmMode('off')} /> Off</label>
                </div>
                {wmMode==='logo' && <input type="file" accept="image/*,.svg" onChange={handleWmLogoUpload} className="vends-input" style={{ marginTop: 6 }} />}
              </div>
              <div><span className="vends-label">School Name</span><input type="text" name="schoolName" value={meta.schoolName} onChange={handleMetaChange} className="vends-input" /></div>
              <div><span className="vends-label">Exam Title</span><input type="text" name="examTitle" value={meta.examTitle} onChange={handleMetaChange} className="vends-input" /></div>
              <div><span className="vends-label">Student Name</span><input type="text" name="studentName" value={meta.studentName} onChange={handleMetaChange} className="vends-input" /></div>
              <div><span className="vends-label">Father Name</span><input type="text" name="fatherName" value={meta.fatherName} onChange={handleMetaChange} className="vends-input" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div><span className="vends-label">Roll No</span><input type="text" name="rollNo" value={meta.rollNo} onChange={handleMetaChange} className="vends-input" /></div>
                <div><span className="vends-label">Class</span><input type="text" name="className" value={meta.className} onChange={handleMetaChange} className="vends-input" /></div>
              </div>
            </div>
            <div className="vends-card">
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0f172a' }}>📚 Subject Marks Entry</h4>
              {subjects.map((sub, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 30px', gap: '6px', marginBottom: '8px', alignItems: 'center' }}>
                  <input type="text" value={sub.name} onChange={(e) => handleSubjectChange(idx, 'name', e.target.value)} className="vends-input" placeholder="Subject" />
                  <input type="number" value={sub.total} onChange={(e) => handleSubjectChange(idx, 'total', e.target.value)} className="vends-input" placeholder="Total" />
                  <input type="number" value={sub.obtained} onChange={(e) => handleSubjectChange(idx, 'obtained', e.target.value)} className="vends-input" placeholder="Obt" />
                  <button onClick={() => removeSubject(idx)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '32px' }}>✕</button>
                </div>
              ))}
              <button onClick={() => { if (readOnly) return alert('Plan ended — editing is locked.'); addSubject(); }} disabled={readOnly} style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', width: '100%', cursor: readOnly ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '12px', marginTop: '6px', opacity: readOnly ? 0.5 : 1 }}>+ Add Subject</button>
            </div>
            <button onClick={() => window.print()} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>🖨️ Print Result Card</button>
            <button onClick={saveNamedResult} disabled={readOnly} className="no-print" style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '700', cursor: readOnly ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: readOnly ? 0.5 : 1 }}>💾 Save Result</button>
            <button onClick={loadNamedResult} className="no-print" style={{ background: '#0f766e', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>📂 Load Saved</button>
            <button onClick={sendResultToParent} disabled={sendBusy || readOnly} className="no-print" style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '700', cursor: sendBusy || readOnly ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: sendBusy || readOnly ? 0.6 : 1 }}>
              {sendBusy ? '⏳ Sending…' : '📤 Auto-Send to Parent (SE)'}
            </button>
          </div>
          <div className="printable-card-area" style={{ background: '#ffffff', padding: activeTemplate === 3 ? 0 : '24px', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '600px', position: 'relative', overflow: 'hidden' }}>
            {wmMode === 'text' && meta.schoolName && (<div className="rc-watermark" aria-hidden><span>{meta.schoolName}</span></div>)}
            {wmMode === 'logo' && wmLogoUrl && (<div className="rc-watermark" aria-hidden><img src={wmLogoUrl} alt="" /></div>)}
            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* ========== TEMPLATE 1: Classic Dark Header ========== */}
              {activeTemplate === 1 && (
                <>
                  <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px' }}>
                    {logoUrl && <img src={logoUrl} alt="Logo" style={{ maxHeight: '65px', marginBottom: '8px' }} />}
                    <h2 style={{ fontSize: '22px', color: '#1e3a8a', textTransform: 'uppercase', margin: 0, fontWeight: '800' }}>{meta.schoolName}</h2>
                    <p style={{ margin: '4px 0 0 0', fontWeight: '600', color: '#0284c7' }}>{meta.examTitle}</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px', fontSize: '13px' }}>
                    <div><strong>Student:</strong> {meta.studentName}</div>
                    <div><strong>Roll:</strong> {meta.rollNo}</div>
                    <div><strong>Father:</strong> {meta.fatherName}</div>
                    <div><strong>Class:</strong> {meta.className}</div>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#0f172a', color: '#fff' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>#</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Subject</th>
                        <th style={{ padding: '8px' }}>Max</th>
                        <th style={{ padding: '8px' }}>Obtained</th>
                        <th style={{ padding: '8px' }}>Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((s, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px' }}>{i + 1}</td>
                          <td style={{ padding: '8px' }}>{s.name}</td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>{s.total}</td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>{s.obtained}</td>
                          <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{getGrade(s.total ? (s.obtained / s.total) * 100 : 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700 }}>
                    <span>Total: {obtainedSum}/{totalSum}</span>
                    <span>{percentage}%</span>
                    <span>Grade: {overallGrade}</span>
                  </div>
                  {meta.remarks && <p style={{ marginTop: 12, fontSize: 13 }}><strong>Remarks:</strong> {meta.remarks}</p>}
                  <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <div style={{ textAlign: 'center' }}><div style={{ borderTop: '1px solid #0f172a', width: 140, margin: '0 auto 4px' }} />CLASS TEACHER</div>
                    <div style={{ textAlign: 'center' }}><div style={{ borderTop: '1px solid #0f172a', width: 140, margin: '0 auto 4px' }} />PRINCIPAL</div>
                  </div>
                </>
              )}

              {/* ========== TEMPLATE 2: Modern Blue Card ========== */}
              {activeTemplate === 2 && (
                <>
                  <div style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 20, textAlign: 'center' }}>
                    {logoUrl && <img src={logoUrl} alt="Logo" style={{ maxHeight: 56, marginBottom: 8, background: '#fff', borderRadius: 8, padding: 4 }} />}
                    <h2 style={{ fontSize: 20, margin: 0, fontWeight: 800, letterSpacing: 1 }}>{meta.schoolName}</h2>
                    <p style={{ margin: '6px 0 0', fontSize: 14, opacity: 0.95 }}>{meta.examTitle}</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18, fontSize: 13 }}>
                    <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 12px' }}><span style={{ color: '#64748b', fontSize: 11 }}>Student</span><br /><strong>{meta.studentName}</strong></div>
                    <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 12px' }}><span style={{ color: '#64748b', fontSize: 11 }}>Roll No</span><br /><strong>{meta.rollNo}</strong></div>
                    <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 12px' }}><span style={{ color: '#64748b', fontSize: 11 }}>Father</span><br /><strong>{meta.fatherName}</strong></div>
                    <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 12px' }}><span style={{ color: '#64748b', fontSize: 11 }}>Class</span><br /><strong>{meta.className}</strong></div>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, borderRadius: 8, overflow: 'hidden' }}>
                    <thead>
                      <tr style={{ background: '#0284c7', color: '#fff' }}>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>#</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Subject</th>
                        <th style={{ padding: '10px 8px' }}>Max</th>
                        <th style={{ padding: '10px 8px' }}>Obtained</th>
                        <th style={{ padding: '10px 8px' }}>Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((s, i) => (
                        <tr key={i} style={{ background: i % 2 ? '#f8fafc' : '#fff', borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '9px 8px' }}>{i + 1}</td>
                          <td style={{ padding: '9px 8px' }}>{s.name}</td>
                          <td style={{ padding: '9px 8px', textAlign: 'center' }}>{s.total}</td>
                          <td style={{ padding: '9px 8px', textAlign: 'center' }}>{s.obtained}</td>
                          <td style={{ padding: '9px 8px', textAlign: 'center', fontWeight: 700, color: '#0284c7' }}>{getGrade(s.total ? (s.obtained / s.total) * 100 : 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 18, display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <div style={{ background: '#0f172a', color: '#fff', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 14 }}>Total: {obtainedSum}/{totalSum}</div>
                    <div style={{ background: '#0284c7', color: '#fff', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 14 }}>{percentage}%</div>
                    <div style={{ background: '#16a34a', color: '#fff', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 14 }}>Grade: {overallGrade}</div>
                  </div>
                  {meta.remarks && <p style={{ marginTop: 14, fontSize: 13, background: '#f0fdf4', padding: '10px 12px', borderRadius: 8, borderLeft: '4px solid #16a34a' }}><strong>Remarks:</strong> {meta.remarks}</p>}
                  <div style={{ marginTop: 36, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <div style={{ textAlign: 'center' }}><div style={{ borderTop: '1px solid #0284c7', width: 140, margin: '0 auto 4px' }} />CLASS TEACHER</div>
                    <div style={{ textAlign: 'center' }}><div style={{ borderTop: '1px solid #0284c7', width: 140, margin: '0 auto 4px' }} />PRINCIPAL</div>
                  </div>
                </>
              )}

              {/* ========== TEMPLATE 3: Elegant Maroon / Formal ========== */}
              {activeTemplate === 3 && (
                <>
                  <div style={{ background: 'linear-gradient(90deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)', color: '#fef3c7', padding: '18px 24px', textAlign: 'center' }}>
                    {logoUrl && <img src={logoUrl} alt="Logo" style={{ maxHeight: 52, marginBottom: 6, border: '2px solid #fbbf24', borderRadius: 6 }} />}
                    <h2 style={{ fontSize: 20, margin: 0, fontWeight: 800, letterSpacing: 2, color: '#fef3c7' }}>{meta.schoolName}</h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#fde68a' }}>{meta.examTitle}</p>
                  </div>
                  <div style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, fontSize: 13, border: '1px solid #fecaca', borderRadius: 6, padding: 12, background: '#fffbeb' }}>
                      <div><strong style={{ color: '#7f1d1d' }}>Student:</strong> {meta.studentName}</div>
                      <div><strong style={{ color: '#7f1d1d' }}>Roll:</strong> {meta.rollNo}</div>
                      <div><strong style={{ color: '#7f1d1d' }}>Father:</strong> {meta.fatherName}</div>
                      <div><strong style={{ color: '#7f1d1d' }}>Class:</strong> {meta.className}</div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#7f1d1d', color: '#fef3c7' }}>
                          <th style={{ padding: '9px 8px', textAlign: 'left' }}>#</th>
                          <th style={{ padding: '9px 8px', textAlign: 'left' }}>Subject</th>
                          <th style={{ padding: '9px 8px' }}>Max</th>
                          <th style={{ padding: '9px 8px' }}>Obtained</th>
                          <th style={{ padding: '9px 8px' }}>Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjects.map((s, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #fecaca', background: i % 2 ? '#fffbeb' : '#fff' }}>
                            <td style={{ padding: '8px' }}>{i + 1}</td>
                            <td style={{ padding: '8px' }}>{s.name}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{s.total}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{s.obtained}</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: '#7f1d1d' }}>{getGrade(s.total ? (s.obtained / s.total) * 100 : 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#7f1d1d', color: '#fef3c7', borderRadius: 8, padding: '12px 16px', fontWeight: 700, fontSize: 14 }}>
                      <span>Total: {obtainedSum}/{totalSum}</span>
                      <span>{percentage}%</span>
                      <span>Grade: {overallGrade}</span>
                    </div>
                    {meta.remarks && <p style={{ marginTop: 12, fontSize: 13 }}><strong style={{ color: '#7f1d1d' }}>Remarks:</strong> {meta.remarks}</p>}
                    <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <div style={{ textAlign: 'center' }}><div style={{ borderTop: '1px solid #7f1d1d', width: 140, margin: '0 auto 4px' }} />CLASS TEACHER</div>
                      <div style={{ textAlign: 'center' }}><div style={{ borderTop: '1px solid #7f1d1d', width: 140, margin: '0 auto 4px' }} />PRINCIPAL</div>
                    </div>
                  </div>
                </>
              )}

              {/* ========== TEMPLATE 4: Minimal Clean ========== */}
              {activeTemplate === 4 && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    {logoUrl && <img src={logoUrl} alt="Logo" style={{ maxHeight: 60, marginBottom: 10 }} />}
                    <h2 style={{ fontSize: 18, color: '#0f172a', margin: 0, fontWeight: 700, letterSpacing: 0.5 }}>{meta.schoolName}</h2>
                    <div style={{ width: 60, height: 3, background: '#0ea5e9', margin: '8px auto' }} />
                    <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 500 }}>{meta.examTitle}</p>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 18, fontSize: 13, borderBottom: '1px solid #e2e8f0', paddingBottom: 14 }}>
                    <div><span style={{ color: '#94a3b8', fontSize: 11, display: 'block' }}>Student</span><strong>{meta.studentName}</strong></div>
                    <div><span style={{ color: '#94a3b8', fontSize: 11, display: 'block' }}>Roll</span><strong>{meta.rollNo}</strong></div>
                    <div><span style={{ color: '#94a3b8', fontSize: 11, display: 'block' }}>Father</span><strong>{meta.fatherName}</strong></div>
                    <div><span style={{ color: '#94a3b8', fontSize: 11, display: 'block' }}>Class</span><strong>{meta.className}</strong></div>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #0f172a' }}>
                        <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>#</th>
                        <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Subject</th>
                        <th style={{ padding: '8px 6px', fontWeight: 600, color: '#475569' }}>Max</th>
                        <th style={{ padding: '8px 6px', fontWeight: 600, color: '#475569' }}>Obtained</th>
                        <th style={{ padding: '8px 6px', fontWeight: 600, color: '#475569' }}>Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((s, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 6px', color: '#94a3b8' }}>{i + 1}</td>
                          <td style={{ padding: '10px 6px' }}>{s.name}</td>
                          <td style={{ padding: '10px 6px', textAlign: 'center' }}>{s.total}</td>
                          <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 600 }}>{s.obtained}</td>
                          <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 700 }}>{getGrade(s.total ? (s.obtained / s.total) * 100 : 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 24, fontSize: 14 }}>
                    <div><span style={{ color: '#94a3b8', fontSize: 11, display: 'block' }}>Total</span><strong>{obtainedSum}/{totalSum}</strong></div>
                    <div><span style={{ color: '#94a3b8', fontSize: 11, display: 'block' }}>Percentage</span><strong>{percentage}%</strong></div>
                    <div><span style={{ color: '#94a3b8', fontSize: 11, display: 'block' }}>Grade</span><strong style={{ color: '#0ea5e9' }}>{overallGrade}</strong></div>
                  </div>
                  {meta.remarks && <p style={{ marginTop: 14, fontSize: 13, color: '#475569' }}><strong>Remarks:</strong> {meta.remarks}</p>}
                  <div style={{ marginTop: 48, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                    <div style={{ textAlign: 'center' }}><div style={{ borderTop: '1px solid #cbd5e1', width: 120, margin: '0 auto 6px' }} />CLASS TEACHER</div>
                    <div style={{ textAlign: 'center' }}><div style={{ borderTop: '1px solid #cbd5e1', width: 120, margin: '0 auto 6px' }} />PRINCIPAL</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
