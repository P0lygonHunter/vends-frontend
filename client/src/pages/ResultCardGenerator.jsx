import React, { useState, useRef } from 'react';
import Sidebar from '../components/Sidebar';

export default function ResultCardGenerator() {
  const [activeTemplate, setActiveTemplate] = useState(2);
  const [logoUrl, setLogoUrl] = useState(null);

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

  const handleMetaChange = (e) => setMeta({ ...meta, [e.target.name]: e.target.value });

  const handleLogoUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setLogoUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

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

  return (
    <div className="app-container" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      
      {/* ISOLATED PRINT STYLES */}
      <style>{`
        .vends-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .vends-input { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; width: 100%; box-sizing: border-box; }
        .vends-label { font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 4px; display: block; }
        .template-thumb { border: 2px solid #e2e8f0; border-radius: 10px; padding: 12px; cursor: pointer; text-align: center; transition: all 0.2s; background: #fff; }
        .template-thumb.active { border-color: #4f46e5; background: #eef2ff; box-shadow: 0 0 0 2px #4f46e5; }

        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          
          /* FORCE OVERRIDE ALL PARENT FLEX & GRID LAYOUTS */
          html, body, #root, .app-container, .main-workspace, .grid-container {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
          }

          .no-print {
            display: none !important;
          }

          .printable-card-area {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* 1. SIDEBAR (HIDDEN ON PRINT) */}
      <div className="no-print">
        <Sidebar />
      </div>

      {/* 2. MAIN WORKSPACE */}
      <div className="main-workspace" style={{ marginLeft: '260px', flex: 1, padding: '24px', width: 'calc(100% - 260px)' }}>
        
        {/* TEMPLATE SELECTOR (HIDDEN ON PRINT) */}
        <div className="vends-card no-print">
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>🎨 Select Result Card Template Design</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div className={`template-thumb ${activeTemplate === 1 ? 'active' : ''}`} onClick={() => setActiveTemplate(1)}>
              <div style={{ fontWeight: '700', fontSize: '13px', color: '#1e3a8a' }}>Template 1</div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Standard College Report</span>
            </div>
            <div className={`template-thumb ${activeTemplate === 2 ? 'active' : ''}`} onClick={() => setActiveTemplate(2)}>
              <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>Template 2</div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Modern Header & Logo</span>
            </div>
            <div className={`template-thumb ${activeTemplate === 3 ? 'active' : ''}`} onClick={() => setActiveTemplate(3)}>
              <div style={{ fontWeight: '700', fontSize: '13px', color: '#1e3a8a' }}>Template 3</div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Traditional Board Style</span>
            </div>
            <div className={`template-thumb ${activeTemplate === 4 ? 'active' : ''}`} onClick={() => setActiveTemplate(4)}>
              <div style={{ fontWeight: '700', fontSize: '13px', color: '#6366f1' }}>Template 4</div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Minimalist Badges</span>
            </div>
          </div>
        </div>

        <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', alignItems: 'start' }}>
          
          {/* FORM EDITOR (HIDDEN ON PRINT) */}
          <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="vends-card">
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#0f172a' }}>📝 Information & Logo</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div><span className="vends-label">School Logo</span><input type="file" accept="image/*" onChange={handleLogoUpload} className="vends-input" /></div>
                <div><span className="vends-label">School Name</span><input type="text" name="schoolName" value={meta.schoolName} onChange={handleMetaChange} className="vends-input" /></div>
                <div><span className="vends-label">Exam Title</span><input type="text" name="examTitle" value={meta.examTitle} onChange={handleMetaChange} className="vends-input" /></div>
                <div><span className="vends-label">Student Name</span><input type="text" name="studentName" value={meta.studentName} onChange={handleMetaChange} className="vends-input" /></div>
                <div><span className="vends-label">Father Name</span><input type="text" name="fatherName" value={meta.fatherName} onChange={handleMetaChange} className="vends-input" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div><span className="vends-label">Roll No</span><input type="text" name="rollNo" value={meta.rollNo} onChange={handleMetaChange} className="vends-input" /></div>
                  <div><span className="vends-label">Class</span><input type="text" name="className" value={meta.className} onChange={handleMetaChange} className="vends-input" /></div>
                </div>
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
              <button onClick={addSubject} style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', width: '100%', cursor: 'pointer', fontWeight: '600', fontSize: '12px', marginTop: '6px' }}>+ Add Subject</button>
            </div>

            <button onClick={() => window.print()} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>🖨️ Print Result Card</button>
          </div>

          {/* PRINTABLE PREVIEW CONTAINER */}
          <div className="printable-card-area" style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '600px' }}>
            
            {/* TEMPLATE 1 */}
            {activeTemplate === 1 && (
              <div style={{ border: '2px solid #0f172a', padding: '24px', borderRadius: '8px' }}>
                <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px' }}>
                  {logoUrl && <img src={logoUrl} alt="Logo" style={{ maxHeight: '65px', marginBottom: '8px' }} />}
                  <h2 style={{ fontSize: '22px', color: '#1e3a8a', textTransform: 'uppercase', margin: 0, fontWeight: '800' }}>{meta.schoolName}</h2>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '600', color: '#475569', fontSize: '14px' }}>{meta.examTitle}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '20px', fontSize: '14px' }}>
                  <div><strong>Student Name:</strong> {meta.studentName}</div>
                  <div><strong>Roll No:</strong> {meta.rollNo}</div>
                  <div><strong>Father Name:</strong> {meta.fatherName}</div>
                  <div><strong>Class:</strong> {meta.className}</div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#1e3a8a', color: '#fff' }}>
                      <th style={{ border: '1px solid #cbd5e1', padding: '10px' }}>Sr.</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'left' }}>Subject</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '10px' }}>Total</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '10px' }}>Obtained</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '10px' }}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((s, i) => (
                      <tr key={i} style={{ textAlign: 'center' }}>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{i + 1}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left', fontWeight: '600' }}>{s.name}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{s.total}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{s.obtained}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: '700' }}>{getGrade((s.obtained/s.total)*100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center', background: '#f8fafc', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                  <div><span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>TOTAL / OBTAINED</span><div style={{ fontWeight: '800', fontSize: '15px' }}>{obtainedSum} / {totalSum}</div></div>
                  <div><span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>PERCENTAGE</span><div style={{ fontWeight: '800', fontSize: '15px', color: '#1e3a8a' }}>{percentage}%</div></div>
                  <div><span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>OVERALL GRADE</span><div style={{ fontWeight: '800', fontSize: '15px' }}>{overallGrade}</div></div>
                </div>
              </div>
            )}

            {/* TEMPLATE 2 (MODERN & STANDARD BOARD STYLE) */}
            {activeTemplate === 2 && (
              <div style={{ border: '2px solid #0f172a', padding: '24px', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '3px double #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
                  <div style={{ width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {logoUrl ? <img src={logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%' }} /> : <div style={{ border: '1px dashed #cbd5e1', padding: '8px', fontSize: '10px', color: '#94a3b8' }}>LOGO</div>}
                  </div>
                  <div style={{ textAlign: 'center', flexGrow: 1 }}>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0, textTransform: 'uppercase' }}>{meta.schoolName}</h1>
                    <p style={{ margin: '6px 0 0 0', color: '#2563eb', fontWeight: '700', fontSize: '15px' }}>{meta.examTitle}</p>
                  </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '14px', tableLayout: 'fixed' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: '700', background: '#f1f5f9', width: '20%' }}>Student Name:</td>
                      <td style={{ padding: '8px', border: '1px solid #cbd5e1', width: '30%' }}>{meta.studentName}</td>
                      <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: '700', background: '#f1f5f9', width: '20%' }}>Roll No:</td>
                      <td style={{ padding: '8px', border: '1px solid #cbd5e1', width: '30%' }}>{meta.rollNo}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: '700', background: '#f1f5f9' }}>Father Name:</td>
                      <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{meta.fatherName}</td>
                      <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: '700', background: '#f1f5f9' }}>Class:</td>
                      <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{meta.className}</td>
                    </tr>
                  </tbody>
                </table>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '14px', tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ background: '#0f172a', color: '#fff' }}>
                      <th style={{ padding: '10px', border: '1px solid #0f172a', width: '10%' }}>Sr.</th>
                      <th style={{ padding: '10px', border: '1px solid #0f172a', textAlign: 'left', width: '45%' }}>Subject</th>
                      <th style={{ padding: '10px', border: '1px solid #0f172a', width: '15%' }}>Max Marks</th>
                      <th style={{ padding: '10px', border: '1px solid #0f172a', width: '15%' }}>Obtained</th>
                      <th style={{ padding: '10px', border: '1px solid #0f172a', width: '15%' }}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((s, i) => (
                      <tr key={i} style={{ textAlign: 'center' }}>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{i + 1}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left', fontWeight: '600' }}>{s.name}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{s.total}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{s.obtained}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: '700' }}>{getGrade((s.obtained/s.total)*100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f1f5f9', padding: '12px 18px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: '700' }}>
                  <div>Total Obtained: <span style={{ color: '#2563eb' }}>{obtainedSum}/{totalSum}</span></div>
                  <div>Percentage: <span style={{ color: '#2563eb' }}>{percentage}%</span></div>
                  <div>Overall Grade: <span style={{ color: '#2563eb' }}>{overallGrade}</span></div>
                </div>
              </div>
            )}

            {/* TEMPLATE 3 */}
            {activeTemplate === 3 && (
              <div style={{ border: '4px double #1e3a8a', padding: '24px', fontFamily: 'serif' }}>
                <div style={{ textAlign: 'center', borderBottom: '2px solid #1e3a8a', paddingBottom: '12px', marginBottom: '16px' }}>
                  <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>{meta.schoolName}</h1>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', textDecoration: 'underline', marginTop: '6px' }}>{meta.examTitle}</div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '14px' }}>
                  <tbody>
                    <tr><td style={{ border: '1px solid #94a3b8', padding: '6px', fontWeight: 'bold', background: '#f8fafc' }}>Roll No:</td><td style={{ border: '1px solid #94a3b8', padding: '6px' }}>{meta.rollNo}</td><td style={{ border: '1px solid #94a3b8', padding: '6px', fontWeight: 'bold', background: '#f8fafc' }}>Class:</td><td style={{ border: '1px solid #94a3b8', padding: '6px' }}>{meta.className}</td></tr>
                    <tr><td style={{ border: '1px solid #94a3b8', padding: '6px', fontWeight: 'bold', background: '#f8fafc' }}>Name:</td><td style={{ border: '1px solid #94a3b8', padding: '6px' }}>{meta.studentName}</td><td style={{ border: '1px solid #94a3b8', padding: '6px', fontWeight: 'bold', background: '#f8fafc' }}>Father:</td><td style={{ border: '1px solid #94a3b8', padding: '6px' }}>{meta.fatherName}</td></tr>
                  </tbody>
                </table>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>
                  <thead>
                    <tr style={{ background: '#1e3a8a', color: '#fff' }}>
                      <th style={{ border: '1px solid #1e3a8a', padding: '8px' }}>Sr.</th>
                      <th style={{ border: '1px solid #1e3a8a', padding: '8px', textAlign: 'left' }}>Subject</th>
                      <th style={{ border: '1px solid #1e3a8a', padding: '8px' }}>Max</th>
                      <th style={{ border: '1px solid #1e3a8a', padding: '8px' }}>Obt</th>
                      <th style={{ border: '1px solid #1e3a8a', padding: '8px', fontWeight: 'bold' }}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((s, i) => (
                      <tr key={i}>
                        <td style={{ border: '1px solid #1e3a8a', padding: '8px' }}>{i + 1}</td>
                        <td style={{ border: '1px solid #1e3a8a', padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>{s.name}</td>
                        <td style={{ border: '1px solid #1e3a8a', padding: '8px' }}>{s.total}</td>
                        <td style={{ border: '1px solid #1e3a8a', padding: '8px' }}>{s.obtained}</td>
                        <td style={{ border: '1px solid #1e3a8a', padding: '8px', fontWeight: 'bold' }}>{getGrade((s.obtained/s.total)*100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ border: '1px solid #1e3a8a', padding: '12px', background: '#f8fafc', fontSize: '13px' }}>
                  <strong>Remarks:</strong> <i>{meta.remarks}</i>
                  <div style={{ marginTop: '8px', fontWeight: 'bold', fontSize: '14px' }}>Percentage: {percentage}% | Overall Grade: {overallGrade}</div>
                </div>
              </div>
            )}

            {/* TEMPLATE 4 */}
            {activeTemplate === 4 && (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                  {logoUrl && <img src={logoUrl} alt="Logo" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />}
                  <div>
                    <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#0f172a' }}>{meta.schoolName}</h1>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6366f1', fontWeight: '600' }}>{meta.examTitle}</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '10px', marginBottom: '24px', fontSize: '14px' }}>
                  <div>Name: <strong>{meta.studentName}</strong></div>
                  <div>Roll No: <strong>{meta.rollNo}</strong></div>
                  <div>Father: <strong>{meta.fatherName}</strong></div>
                  <div>Class: <strong>{meta.className}</strong></div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Subject</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Total</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Obtained</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', fontWeight: '600' }}>{s.name}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{s.total}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{s.obtained}</td>
                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: '700' }}>{getGrade((s.obtained/s.total)*100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>TOTAL OBTAINED</span>
                    <h4 style={{ margin: '4px 0 0 0', fontSize: '18px' }}>{obtainedSum} / {totalSum}</h4>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>PERCENTAGE</span>
                    <h4 style={{ margin: '4px 0 0 0', fontSize: '18px', color: '#6366f1' }}>{percentage}%</h4>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>GRADE</span>
                    <h4 style={{ margin: '4px 0 0 0', fontSize: '18px' }}>{overallGrade}</h4>
                  </div>
                </div>
              </div>
            )}

            {/* SIGNATURE FOOTER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px', paddingTop: '10px' }}>
              <div style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: '700', borderTop: '2px solid #000', width: '180px', textAlign: 'center', paddingTop: '6px' }}>Class Teacher Signature</div>
              <div style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: '700', borderTop: '2px solid #000', width: '180px', textAlign: 'center', paddingTop: '6px' }}>Principal Signature / Stamp</div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}