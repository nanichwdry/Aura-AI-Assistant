export interface GenerateSketchRequest {
  prompt: string;
  style?: 'line_art' | 'clean_ink' | 'wireframe';
  size?: '1024x1024';
}

export interface GenerateSketchResponse {
  ok: boolean;
  image_base64?: string;
  error?: { message: string };
}

export async function generateSketch(prompt: string): Promise<string> {
  const response = await fetch('/api/sketch/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, style: 'line_art', size: '1024x1024' })
  });

  const text = await response.text();

  if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
    throw new Error('Backend not responding');
  }

  const result: GenerateSketchResponse = JSON.parse(text);

  if (!result.ok || !result.image_base64) {
    throw new Error(result.error?.message || 'Image generation failed');
  }

  return result.image_base64;
}
