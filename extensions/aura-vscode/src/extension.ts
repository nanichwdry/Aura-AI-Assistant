import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel;
let lastTerminalOutput = '';

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('Aura');
  
  context.subscriptions.push(
    vscode.commands.registerCommand('aura.explainSelection', explainSelection),
    vscode.commands.registerCommand('aura.fixFromTerminal', fixFromTerminal),
    vscode.commands.registerCommand('aura.explainDiagnostics', explainDiagnostics)
  );
}

async function explainSelection() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }
  
  const selection = editor.document.getText(editor.selection);
  if (!selection.trim()) {
    vscode.window.showWarningMessage('No text selected');
    return;
  }
  
  const contextSnippet = getContextSnippet(editor);
  const diagnostics = getDiagnostics(editor.document);
  
  const preview = `File: ${editor.document.fileName}
Language: ${editor.document.languageId}
Selection: ${selection.slice(0, 100)}...
Context: ${contextSnippet.slice(0, 100)}...
Diagnostics: ${diagnostics.length} issues

Send to Aura?`;
  
  const confirm = await vscode.window.showInformationMessage(preview, 'Send', 'Cancel');
  if (confirm !== 'Send') return;
  
  const question = await vscode.window.showInputBox({
    prompt: 'What do you want to know?',
    value: 'Explain this code'
  });
  
  await sendToAura({
    question: question || 'Explain this code',
    filePath: editor.document.fileName,
    languageId: editor.document.languageId,
    selectionText: selection,
    contextSnippet,
    diagnostics
  });
}

async function fixFromTerminal() {
  const editor = vscode.window.activeTextEditor;
  
  const terminalOutput = await vscode.window.showInputBox({
    prompt: 'Paste terminal error output (or leave empty to use last pasted)',
    value: lastTerminalOutput,
    placeHolder: 'Error: Cannot find module...'
  });
  
  if (!terminalOutput) {
    vscode.window.showWarningMessage('No terminal output provided');
    return;
  }
  
  lastTerminalOutput = terminalOutput;
  
  const contextSnippet = editor ? getContextSnippet(editor) : '';
  const diagnostics = editor ? getDiagnostics(editor.document) : [];
  
  const preview = `Terminal Output: ${terminalOutput.slice(0, 150)}...
${editor ? `File: ${editor.document.fileName}` : 'No active file'}

Send to Aura?`;
  
  const confirm = await vscode.window.showInformationMessage(preview, 'Send', 'Cancel');
  if (confirm !== 'Send') return;
  
  await sendToAura({
    question: 'Help me fix this terminal error',
    filePath: editor?.document.fileName || '(no file)',
    languageId: editor?.document.languageId || 'unknown',
    selectionText: '',
    contextSnippet,
    diagnostics,
    terminalTail: terminalOutput
  });
}

async function explainDiagnostics() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }
  
  const diagnostics = getDiagnostics(editor.document);
  if (diagnostics.length === 0) {
    vscode.window.showInformationMessage('No diagnostics found');
    return;
  }
  
  const contextSnippet = getContextSnippet(editor);
  
  const preview = `File: ${editor.document.fileName}
Diagnostics: ${diagnostics.length} issues
Context: ${contextSnippet.slice(0, 100)}...

Send to Aura?`;
  
  const confirm = await vscode.window.showInformationMessage(preview, 'Send', 'Cancel');
  if (confirm !== 'Send') return;
  
  await sendToAura({
    question: 'Explain these diagnostics and how to fix them',
    filePath: editor.document.fileName,
    languageId: editor.document.languageId,
    selectionText: '',
    contextSnippet,
    diagnostics
  });
}

function getContextSnippet(editor: vscode.TextEditor): string {
  const position = editor.selection.active;
  const startLine = Math.max(0, position.line - 20);
  const endLine = Math.min(editor.document.lineCount - 1, position.line + 20);
  
  const range = new vscode.Range(startLine, 0, endLine, editor.document.lineAt(endLine).text.length);
  const snippet = editor.document.getText(range);
  
  return snippet.slice(0, 6000);
}

function getDiagnostics(document: vscode.TextDocument): any[] {
  const diagnostics = vscode.languages.getDiagnostics(document.uri);
  return diagnostics.slice(0, 10).map(d => ({
    severity: vscode.DiagnosticSeverity[d.severity],
    message: d.message,
    line: d.range.start.line + 1,
    source: d.source
  }));
}

async function sendToAura(input: any) {
  const config = vscode.workspace.getConfiguration('aura');
  const backendUrl = config.get<string>('backendUrl') || 'https://aura-ai-assistant.onrender.com';
  
  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Aura is thinking...',
    cancellable: false
  }, async () => {
    try {
      const response = await fetch(`${backendUrl}/api/tools/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'vscode_help',
          input
        })
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server error: ${text}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        const answer = result.data.answer;
        outputChannel.clear();
        outputChannel.appendLine('=== AURA RESPONSE ===\n');
        outputChannel.appendLine(answer);
        outputChannel.appendLine('\n===================');
        outputChannel.show();
        
        vscode.window.showInformationMessage('Aura response ready! Check the Output panel.');
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Aura error: ${error.message}`);
      outputChannel.appendLine(`ERROR: ${error.message}`);
      outputChannel.show();
    }
  });
}

export function deactivate() {}
