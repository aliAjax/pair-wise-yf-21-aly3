import type { TemplateFamily, TemplateVersion } from "./types";

export function uid(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

export function formatTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", { hour12: false });
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("zh-CN");
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 按入库时间回填最接近的一版：取生效时间与入库时间差值最小的模板版本。
 */
export function closestVersion(family: TemplateFamily, at: string): TemplateVersion {
  const t = new Date(at).getTime();
  return [...family.versions].sort(
    (a, b) =>
      Math.abs(new Date(a.effectiveAt).getTime() - t) -
      Math.abs(new Date(b.effectiveAt).getTime() - t),
  )[0];
}

export function versionLabel(families: TemplateFamily[], versionId?: string): string {
  if (!versionId) return "未回填";
  for (const f of families) {
    const v = f.versions.find((x) => x.id === versionId);
    if (v) return `${f.origin}·${f.material}·结密度${f.density} ${v.version}`;
  }
  return "未知版本";
}
