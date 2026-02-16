export interface CodeAnalysisRequest {
  code: string;
  language?: string;
  path?: string;
  goal?: string;
  constraints?: string[];
}

export interface CodeAnalysisResponse {
  summary: {
    risk_level: string;
    main_problems: string[];
    what_i_changed: string[];
    what_i_did_not_change: string[];
  };
  issues: Array<{
    category: string;
    severity: string;
    title: string;
    why_it_matters: string;
    where: { path: string; lines: string };
    fix: string;
  }>;
  patches: Array<{
    path: string;
    patch_unified_diff: string;
  }>;
  final_files: Array<{
    path: string;
    content: string;
  }>;
  quick_tests: string[];
  raw_text?: string;
}

interface ApiResponse {
  ok: boolean;
  data: CodeAnalysisResponse | null;
  error: { message: string; details?: string } | null;
  raw_model_output?: string;
  analysis?: string;
}

export async function analyzeCode(req: CodeAnalysisRequest): Promise<CodeAnalysisResponse> {
  const response = await fetch('/api/code/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });
  
  const text = await response.text();
  
  if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
    throw new Error('Backend not responding - got HTML instead of JSON. Is Express running on port 3001?');
  }
  
  const apiResponse: ApiResponse = JSON.parse(text);
  
  if (apiResponse.analysis) {
    return {
      summary: { risk_level: 'low', main_problems: [], what_i_changed: [], what_i_did_not_change: [] },
      issues: [],
      patches: [],
      final_files: [],
      quick_tests: [],
      raw_text: apiResponse.analysis
    };
  }
  
  if (!apiResponse.ok || !apiResponse.data) {
    const errorMsg = apiResponse.error?.message || 'Analysis failed';
    const errorDetails = apiResponse.error?.details ? ` (${apiResponse.error.details})` : '';
    throw new Error(errorMsg + errorDetails);
  }
  
  return apiResponse.data;
}

export async function fixCode(req: CodeAnalysisRequest): Promise<CodeAnalysisResponse> {
  const response = await fetch('/api/code/fix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });
  
  const text = await response.text();
  
  if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
    throw new Error('Backend not responding - got HTML instead of JSON. Is Express running on port 3001?');
  }
  
  const apiResponse: ApiResponse = JSON.parse(text);
  
  if (apiResponse.analysis) {
    return {
      summary: { risk_level: 'low', main_problems: [], what_i_changed: [], what_i_did_not_change: [] },
      issues: [],
      patches: [],
      final_files: [],
      quick_tests: [],
      raw_text: apiResponse.analysis
    };
  }
  
  if (!apiResponse.ok || !apiResponse.data) {
    const errorMsg = apiResponse.error?.message || 'Fix failed';
    const errorDetails = apiResponse.error?.details ? ` (${apiResponse.error.details})` : '';
    throw new Error(errorMsg + errorDetails);
  }
  
  return apiResponse.data;
}
