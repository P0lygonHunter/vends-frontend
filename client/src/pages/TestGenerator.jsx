import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar'; // Layout wrapper integration here

export default function TestGenerator() {
    const [sections, setSections] = useState(() => {
        const saved = localStorage.getItem('vends_paper_sections');
        return saved ? JSON.parse(saved) : [
            { id: 1, type: 'mcq', heading: 'Q1. Choose the correct option.', attemptCount: '', items: [] },
            { id: 2, type: 'short', heading: 'Q2. Answer the following short questions.', attemptCount: '', items: [] },
            { id: 3, type: 'long', heading: 'Q3. Answer the following long questions.', items: [] }
        ];
    });

    const [meta, setMeta] = useState({
        schoolName: 'Vends EduCore GROUP OF COLLEGES',
        examName: 'Class Test Series 2026',
        subjectName: 'Physics',
        className: '12th / F.Sc',
        timeAllowed: '45 Minutes'
    });

    const [selectedSectionId, setSelectedSectionId] = useState(1);
    const [mcqInput, setMcqInput] = useState({ stmt: '', a: '', b: '', c: '', d: '' });
    const [shortInput, setShortInput] = useState('');
    const [longInput, setLongInput] = useState({ stmt: '', ptA: '', marksA: '', ptB: '', marksB: '' });
    const [examDate] = useState(new Date().toLocaleDateString('en-GB'));

    useEffect(() => {
        localStorage.setItem('vends_paper_sections', JSON.stringify(sections));
    }, [sections]);

    const handleMetaChange = (e) => {
        setMeta({ ...meta, [e.target.name]: e.target.value });
    };

    const addNewSection = (type) => {
        const nextId = sections.length > 0 ? Math.max(...sections.map(s => s.id)) + 1 : 1;
        let defaultHeading = `Q${nextId}. `;
        if (type === 'mcq') defaultHeading += 'Choose the correct option.';
        if (type === 'short') defaultHeading += 'Answer the following short questions.';
        if (type === 'long') defaultHeading += 'Answer the following long questions.';

        const newSec = { id: nextId, type, heading: defaultHeading, attemptCount: '', items: [] };
        setSections([...sections, newSec]);
        setSelectedSectionId(nextId);
    };

    const removeSection = (id) => {
        if (sections.length <= 1) return alert("At least one section must remain active.");
        if (window.confirm("Delete this section completely?")) {
            setSections(sections.filter(s => s.id !== id));
        }
    };

    const updateSectionMeta = (id, field, value) => {
        setSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const addItemToSection = () => {
        setSections(sections.map(sec => {
            if (sec.id !== parseInt(selectedSectionId)) return sec;

            if (sec.type === 'mcq') {
                if (!mcqInput.stmt || !mcqInput.a) return sec;
                const updated = { ...sec, items: [...sec.items, mcqInput] };
                setMcqInput({ stmt: '', a: '', b: '', c: '', d: '' });
                return updated;
            }
            if (sec.type === 'short') {
                if (!shortInput) return sec;
                const updated = { ...sec, items: [...sec.items, shortInput] };
                setShortInput('');
                return updated;
            }
            if (sec.type === 'long') {
                if (!longInput.stmt) return sec;
                const updated = {
                    ...sec,
                    items: [...sec.items, {
                        stmt: longInput.stmt,
                        ptA: longInput.ptA,
                        marksA: parseInt(longInput.marksA) || 0,
                        ptB: longInput.ptB,
                        marksB: parseInt(longInput.marksB) || 0
                    }]
                };
                setLongInput({ stmt: '', ptA: '', marksA: '', ptB: '', marksB: '' });
                return updated;
            }
            return sec;
        }));
    };

    const clearAllData = () => {
        if (window.confirm("Reset entire canvas? This will clear all items.")) {
            setSections([
                { id: 1, type: 'mcq', heading: 'Q1. Choose the correct option.', attemptCount: '', items: [] },
                { id: 2, type: 'short', heading: 'Q2. Answer the following short questions.', attemptCount: '', items: [] },
                { id: 3, type: 'long', heading: 'Q3. Answer the following long questions.', items: [] }
            ]);
            setSelectedSectionId(1);
        }
    };

    let aggregateScore = 0;
    const computedSections = sections.map(sec => {
        let sectionMarks = 0;
        if (sec.type === 'mcq') {
            sectionMarks = sec.items.length * 1;
        } else if (sec.type === 'short') {
            let attempt = parseInt(sec.attemptCount);
            if (isNaN(attempt) || attempt <= 0 || attempt > sec.items.length) {
                attempt = sec.items.length;
            }
            sectionMarks = attempt * 2;
        } else if (sec.type === 'long') {
            sectionMarks = sec.items.reduce((sum, item) => sum + (item.marksA || 0) + (item.marksB || 0), 0);
        }
        aggregateScore += sectionMarks;
        return { ...sec, calculatedMarks: sectionMarks };
    });

    const currentActiveType = sections.find(s => s.id === parseInt(selectedSectionId))?.type || 'mcq';

    // Baki saara logical code upar waise hi rahega, bas return block ko is se replace karein:
return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', color: '#1e293b', fontFamily: 'Inter, system-ui, sans-serif' }}>
        
        {/* Sidebar wrapper configuration to prevent overlapping */}
        <div className="no-print" style={{ width: '260px', flexShrink: 0 }}>
            <Sidebar />
        </div>

        <style>{`
            @media print {
                .no-print { display: none !important; }
                body { background: #fff !important; padding: 0 !important; }
                .sheet-container { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
                .printable-paper-area { border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; }
            }
            .vends-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); padding: 16px; margin-bottom: 16px; }
            .vends-input { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; width: 100%; box-sizing: border-box; transition: border 0.2s; background: #fff; color: #000; }
            .vends-input:focus { border-color: #4f46e5; outline: none; }
            .vends-label { font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px; display: block; }
            .vends-btn { background: #4f46e5; color: #fff; padding: 8px 14px; border: none; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; transition: background 0.2s; }
            .vends-btn:hover { background: #4338ca; }
            .question-row-line { display: flex; justify-content: space-between; border-bottom: 1px solid #000; padding-bottom: 2px; font-size: 13px; font-weight: bold; margin-top: 20px; text-transform: uppercase; color: #000; }
        `}</style>

        {/* Main Workspace - Controlled sizing layout */}
        <div className="sheet-container" style={{ flexGrow: 1, padding: '20px', maxWidth: 'calc(100vw - 260px)', boxSizing: 'border-box', overflowY: 'auto' }}>
            
            <div className="no-print">
                <div className="vends-card" style={{ borderLeft: '5px solid #4f46e5' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>📄 Real Web Paper Configuration Panel</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                        <div><span className="vends-label">School/College Name</span><input type="text" name="schoolName" value={meta.schoolName} onChange={handleMetaChange} className="vends-input" /></div>
                        <div><span className="vends-label">Exam Title</span><input type="text" name="examName" value={meta.examName} onChange={handleMetaChange} className="vends-input" /></div>
                        <div><span className="vends-label">Subject</span><input type="text" name="subjectName" value={meta.subjectName} onChange={handleMetaChange} className="vends-input" /></div>
                        <div><span className="vends-label">Class Target</span><input type="text" name="className" value={meta.className} onChange={handleMetaChange} className="vends-input" /></div>
                        <div><span className="vends-label">Allowed Time Duration</span><input type="text" name="timeAllowed" value={meta.timeAllowed} onChange={handleMetaChange} className="vends-input" /></div>
                        <div><span className="vends-label" style={{ color: '#4f46e5' }}>Total Computed Marks</span><input type="text" value={aggregateScore} readOnly className="vends-input" style={{ background: '#f1f5f9', fontWeight: '700', color: '#4f46e5' }} /></div>
                    </div>
                </div>

                <div className="vends-card">
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0f172a' }}>🗂️ Step 1: Manage Board Paper Sections</h4>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        <button onClick={() => addNewSection('mcq')} className="vends-btn" style={{ background: '#0284c7' }}>+ Add MCQ Section</button>
                        <button onClick={() => addNewSection('short')} className="vends-btn" style={{ background: '#0d9488' }}>+ Add Short Section</button>
                        <button onClick={() => addNewSection('long')} className="vends-btn" style={{ background: '#ea580c' }}>+ Add Long Section</button>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <span className="vends-label">Select Active Section to Edit & Customize Instruction Heading Line:</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {sections.map((sec) => (
                                <div key={sec.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                    <input type="radio" checked={parseInt(selectedSectionId) === sec.id} onChange={() => setSelectedSectionId(sec.id)} name="activeSectionRadio" />
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', minWidth: '60px', textTransform: 'uppercase', color: '#475569' }}>[{sec.type}]</span>
                                    <input type="text" value={sec.heading} onChange={(e) => updateSectionMeta(sec.id, 'heading', e.target.value)} className="vends-input" style={{ fontSize: '12px', padding: '5px 8px' }} />
                                    
                                    {sec.type === 'short' && (
                                        <input type="number" value={sec.attemptCount} onChange={(e) => updateSectionMeta(sec.id, 'attemptCount', e.target.value)} placeholder="Questions" className="vends-input" style={{ width: '100px', fontSize: '12px', padding: '5px 8px' }} />
                                    )}
                                    <button onClick={() => removeSection(sec.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>Remove</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                    <div className="vends-card">
                        <h4 style={{ margin: '0 0 12px 0', color: '#4f46e5' }}>✍️ Step 2: Insert Question Content into Selected Section</h4>
                        <p style={{ margin: '-8px 0 15px 0', fontSize: '13px', color: '#64748b' }}>
                            Currently inserting items into: <strong>{sections.find(s => s.id === parseInt(selectedSectionId))?.heading || 'None Selected'}</strong>
                        </p>

                        {currentActiveType === 'mcq' && (
                            <div>
                                <input type="text" placeholder="Objective Question Statement Text" value={mcqInput.stmt} onChange={(e) => setMcqInput({...mcqInput, stmt: e.target.value})} className="vends-input" style={{ marginBottom: '8px' }} />
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '10px' }}>
                                    <input type="text" placeholder="Option (A)" value={mcqInput.a} onChange={(e) => setMcqInput({...mcqInput, a: e.target.value})} className="vends-input" />
                                    <input type="text" placeholder="Option (B)" value={mcqInput.b} onChange={(e) => setMcqInput({...mcqInput, b: e.target.value})} className="vends-input" />
                                    <input type="text" placeholder="Option (C)" value={mcqInput.c} onChange={(e) => setMcqInput({...mcqInput, c: e.target.value})} className="vends-input" />
                                    <input type="text" placeholder="Option (D)" value={mcqInput.d} onChange={(e) => setMcqInput({...mcqInput, d: e.target.value})} className="vends-input" />
                                </div>
                            </div>
                        )}

                        {currentActiveType === 'short' && (
                            <div style={{ marginBottom: '10px' }}>
                                <input type="text" placeholder="Enter Short Question Statement Text..." value={shortInput} onChange={(e) => setShortInput(e.target.value)} className="vends-input" />
                            </div>
                        )}

                        {currentActiveType === 'long' && (
                            <div>
                                <input type="text" placeholder="Main Long Topic Context/Statement" value={longInput.stmt} onChange={(e) => setLongInput({...longInput, stmt: e.target.value})} className="vends-input" style={{ marginBottom: '8px' }} />
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1fr', gap: '8px', marginBottom: '10px' }}>
                                    <input type="text" placeholder="Part (a) Text Content" value={longInput.ptA} onChange={(e) => setLongInput({...longInput, ptA: e.target.value})} className="vends-input" />
                                    <input type="number" placeholder="Marks" value={longInput.marksA} onChange={(e) => setLongInput({...longInput, marksA: e.target.value})} className="vends-input" />
                                    <input type="text" placeholder="Part (b) Text Content" value={longInput.ptB} onChange={(e) => setLongInput({...longInput, ptB: e.target.value})} className="vends-input" />
                                    <input type="number" placeholder="Marks" value={longInput.marksB} onChange={(e) => setLongInput({...longInput, marksB: e.target.value})} className="vends-input" />
                                </div>
                            </div>
                        )}

                        <button onClick={addItemToSection} className="vends-btn">Confirm & Add Item</button>
                    </div>

                    <button onClick={() => window.print()} className="vends-btn" style={{ width: '100%', padding: '14px', fontSize: '16px', background: '#0f172a', marginBottom: '25px' }}>🖨️ Execute Print Commands</button>
                </div>

                <div className="printable-paper-area" style={{ background: '#fff', padding: '30px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ textAlign: 'center', borderBottom: '3px double #000', paddingBottom: '10px', marginBottom: '20px', color: '#000' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, textTransform: 'uppercase', color: '#000' }}>{meta.schoolName}</h2>
                        <div style={{ fontSize: '15px', fontWeight: '700', margin: '4px 0 12px 0', textTransform: 'uppercase', color: '#000' }}>{meta.examName}</div>
                        
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: '6px 12px', fontWeight: 'bold', fontSize: '13px', color: '#000' }}>Subject: <span style={{ fontWeight: 'normal' }}>{meta.subjectName}</span></td>
                                    <td style={{ border: '1px solid #000', padding: '6px 12px', fontWeight: 'bold', fontSize: '13px', color: '#000' }}>Class: <span style={{ fontWeight: 'normal' }}>{meta.className}</span></td>
                                    <td style={{ border: '1px solid #000', padding: '6px 12px', fontWeight: 'bold', fontSize: '13px', color: '#000' }}>Marks: <span style={{ fontWeight: 'bold' }}>{aggregateScore}</span></td>
                                    <td style={{ border: '1px solid #000', padding: '6px 12px', fontWeight: 'bold', fontSize: '13px', color: '#000' }}>Time: <span style={{ fontWeight: 'normal' }}>{meta.timeAllowed}</span></td>
                                </tr>
                                <tr>
                                    <td colSpan="2" style={{ border: '1px solid #000', padding: '6px 12px', fontWeight: 'bold', fontSize: '13px', color: '#000' }}>Student Name: ___________________________</td>
                                    <td colSpan="2" style={{ border: '1px solid #000', padding: '6px 12px', fontWeight: 'bold', fontSize: '13px', color: '#000' }}>Date: <span style={{ fontWeight: 'normal' }}>{examDate}</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {computedSections.map((sec) => {
                        if (sec.items.length === 0) return null;

                        return (
                            <div key={sec.id} style={{ marginBottom: '20px', color: '#000' }}>
                                <div className="question-row-line">
                                    <span>{sec.heading}</span>
                                    {sec.type === 'mcq' && <span>Marks: {sec.calculatedMarks} ({sec.items.length} x 1)</span>}
                                    {sec.type === 'short' && (
                                        <span>Marks: {sec.calculatedMarks} ({sec.attemptCount || sec.items.length} x 2)</span>
                                    )}
                                    {sec.type === 'long' && <span>Marks: {sec.calculatedMarks}</span>}
                                </div>

                                {sec.type === 'mcq' && (
                                    <div style={{ marginTop: '10px' }}>
                                        {sec.items.map((m, idx) => (
                                            <div key={idx} style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px', color: '#000' }}>
                                                ({idx + 1}) {m.stmt}
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px', marginTop: '4px', fontWeight: 'normal', fontSize: '13px', paddingLeft: '15px' }}>
                                                    <div><strong>(A)</strong> {m.a}</div>
                                                    <div><strong>(B)</strong> {m.b}</div>
                                                    <div><strong>(C)</strong> {m.c}</div>
                                                    <div><strong>(D)</strong> {m.d}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {sec.type === 'short' && (
                                    <ol style={{ paddingLeft: '25px', margin: '10px 0 0 0', fontSize: '14px', fontWeight: 'bold', color: '#000' }}>
                                        {sec.items.map((s, idx) => (
                                            <li key={idx} style={{ marginBottom: '6px', color: '#000' }}>{s}</li>
                                        ))}
                                    </ol>
                                )}

                                {sec.type === 'long' && (
                                    <ol style={{ listStyleType: 'none', paddingLeft: 0, fontSize: '14px', fontWeight: 'bold', margin: '10px 0 0 0', color: '#000' }}>
                                        {sec.items.map((l, idx) => (
                                            <li key={idx} style={{ marginTop: '10px', color: '#000' }}>
                                                • {l.stmt}
                                                {l.ptA && <div style={{ fontWeight: 'normal', marginLeft: '20px', fontSize: '13px', marginTop: '4px' }}><strong>(a)</strong> {l.ptA} <span style={{ float: 'right' }}>[{l.marksA}]</span></div>}
                                                {l.ptB && <div style={{ fontWeight: 'normal', marginLeft: '20px', fontSize: '13px', marginTop: '4px' }}><strong>(b)</strong> {l.ptB} <span style={{ float: 'right' }}>[{l.marksB}]</span></div>}
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </div>
                        );
                    })}
                </div>

                <button className="no-print vends-btn" onClick={clearAllData} style={{ background: '#dc2626', fontSize: '12px', marginTop: '20px' }}>Reset Workspace Canvas</button>
            </div>
        </div>
    );
}