import React, { useState } from 'react';

const CodeEditor = () => {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [instruction, setInstruction] = useState('');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const analyzeCode = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('/api/code/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language })
      });
      const data = await response.json();
      setResult(data.ok ? data.analysis : data.error);
    } catch (error) {
      setResult('Error: ' + error.message);
    }
    setLoading(false);
  };

  const editCode = async () => {
    if (!code.trim() || !instruction.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('/api/code/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, instruction, language })
      });
      const data = await response.json();
      if (data.ok) {
        setCode(data.editedCode);
        setResult('Code updated successfully');
      } else {
        setResult('Error: ' + data.error);
      }
    } catch (error) {
      setResult('Error: ' + error.message);
    }
    setLoading(false);
  };

  const generateCode = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('/api/code/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, language })
      });
      const data = await response.json();
      if (data.ok) {
        setCode(data.generatedCode);
        setResult('Code generated successfully');
      } else {
        setResult('Error: ' + data.error);
      }
    } catch (error) {
      setResult('Error: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>AI Code Editor & Analyzer</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label>Language: </label>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
          <option value="html">HTML</option>
          <option value="css">CSS</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h3>Code Editor</h3>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter your code here..."
            style={{
              width: '100%',
              height: '300px',
              fontFamily: 'monospace',
              fontSize: '14px',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
          
          <div style={{ marginTop: '10px' }}>
            <button onClick={analyzeCode} disabled={loading}>
              {loading ? 'Analyzing...' : 'Analyze Code'}
            </button>
          </div>

          <div style={{ marginTop: '20px' }}>
            <h4>Edit Code</h4>
            <input
              type="text"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Enter editing instruction..."
              style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
            />
            <button onClick={editCode} disabled={loading}>
              {loading ? 'Editing...' : 'Edit Code'}
            </button>
          </div>

          <div style={{ marginTop: '20px' }}>
            <h4>Generate Code</h4>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what code you want..."
              style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
            />
            <button onClick={generateCode} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Code'}
            </button>
          </div>
        </div>

        <div>
          <h3>AI Analysis & Results</h3>
          <div
            style={{
              height: '500px',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: '#f9f9f9',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: '14px'
            }}
          >
            {result || 'AI analysis and results will appear here...'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;