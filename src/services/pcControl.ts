export type PcControlResult =
  | { ok: true; result: string; audit_id?: string }
  | { ok: false; error: string };

export async function pcControlNL(text: string): Promise<PcControlResult> {
  const r = await fetch("http://localhost:3001/api/pc/nl", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  const data = (await r.json().catch(() => null)) as PcControlResult | null;
  if (!data) return { ok: false, error: "Invalid response from backend" };
  return data;
}

export async function pcControlExecute(tool_name: string, args: any): Promise<PcControlResult> {
  const r = await fetch("http://localhost:3001/api/pc/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool_name, args }),
  });

  const data = (await r.json().catch(() => null)) as PcControlResult | null;
  if (!data) return { ok: false, error: "Invalid response from backend" };
  return data;
}