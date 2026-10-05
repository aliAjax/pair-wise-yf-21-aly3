import { useSyncExternalStore } from "react";
import type {
  AppState,
  Carpet,
  ColorCardEntry,
  LedgerEvent,
  StartResult,
  Step,
  StepTemplate,
  TemplateFamily,
  TemplateVersion,
} from "./types";
import { seedState } from "./seed";
import { closestVersion, uid } from "./utils";

const STORAGE_KEY = "carpet-ledger-state-v1";

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if ( raw) return JSON.parse(raw) as AppState;
  } catch {
    /* ignore */
  }
  return seedState();
}

let state: AppState = loadState();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function setState(updater: (s: AppState) => AppState) {
  state = updater(state);
  persist();
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getState(): AppState {
  return state;
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState);
}

/* ---------- selectors ---------- */

export function findFamily(
  families: TemplateFamily[],
  origin: string,
  material: string,
  density: number,
): TemplateFamily | undefined {
  return families.find(
    (f) => f.origin === origin && f.material === material && f.density === density,
  );
}

export function currentVersion(family: TemplateFamily): TemplateVersion {
  return [...family.versions].sort(
    (a, b) => new Date(b.effectiveAt).getTime() - new Date(a.effectiveAt).getTime(),
  )[0];
}

function generateSteps(version: TemplateVersion): Step[] {
  return version.steps.map((tpl) => ({
    id: uid("step"),
    name: tpl.name,
    params: { ...tpl.params },
    status: "未开始" as const,
    templateVersionId: version.id,
  }));
}

function led(
  type: LedgerEvent["type"],
  description: string,
  operator?: string,
  templateVersionId?: string,
): LedgerEvent {
  return { id: uid("led"), time: new Date().toISOString(), type, description, operator, templateVersionId };
}

function nextVersionNo(family: TemplateFamily): string {
  return `v${family.versions.length + 1}`;
}

/* ---------- actions ---------- */

/** 开工：先到锁定，后到看到被谁锁定。同一师傅重复开工不重复生成工序。 */
export function startWork(carpetId: string, craftsman: string): StartResult {
  const c = state.carpets.find((x) => x.id === carpetId);
  if (!c) return { ok: false };
  if (c.status === "已完成") return { ok: false };
  if (c.lock) {
    if (c.lock.by === craftsman) return { ok: true, alreadyLocked: true };
    return { ok: false, lockedBy: c.lock.by, lockedAt: c.lock.at };
  }
  const family = findFamily(state.families, c.origin, c.material, c.density);
  if (!family) return { ok: false };
  const version = currentVersion(family);
  const now = new Date().toISOString();
  setState((s) => ({
    ...s,
    carpets: s.carpets.map((x) =>
      x.id === carpetId
        ? {
            ...x,
            status: "修复中",
            lock: { by: craftsman, at: now },
            currentVersionId: version.id,
            steps: generateSteps(version),
            ledger: [
              ...x.ledger,
              led(
                "开工",
                `${craftsman} 开工，锁定档案并采用 ${family.origin}·${family.material}·结密度${family.density} 模板 ${version.version}`,
                craftsman,
                version.id,
              ),
            ],
          }
        : x,
    ),
  }));
  return { ok: true };
}

/** 推进工序：未开始 → 进行中 → 已完成；全部完成则档案完工。 */
export function advanceStep(carpetId: string, stepId: string, craftsman: string) {
  const c = state.carpets.find((x) => x.id === carpetId);
  if (!c) return;
  const step = c.steps.find((x) => x.id === stepId);
  if (!step || step.status === "已完成" || step.status === "已作废") return;
  const now = new Date().toISOString();
  setState((s) => {
    const carpets = s.carpets.map((x) => {
      if (x.id !== carpetId) return x;
      const steps = x.steps.map((st) => {
        if (st.id !== stepId) return st;
        if (st.status === "未开始") return { ...st, status: "进行中" as const, startedAt: now };
        return { ...st, status: "已完成" as const, completedAt: now };
      });
      const allDone = steps.every((st) => st.status === "已完成");
      const ledger = [...x.ledger, led("工序", `${craftsman} 完成工序「${step.name}」`, craftsman, step.templateVersionId)];
      if (allDone) {
        ledger.push(led("完工", "全部工序完成，档案完工", craftsman, step.templateVersionId));
      }
      return { ...x, steps, status: allDone ? ("已完成" as const) : x.status, ledger };
    });
    return { ...s, carpets };
  });
}

/**
 * 升级模板：只动还没开始的工序（切换到新版本参数），
 * 进行中、已完成的工序保留当时参数。
 */
export function upgradeTemplate(
  familyId: string,
  input: { note: string; colorCard: ColorCardEntry[]; steps: StepTemplate[] },
) {
  const family = state.families.find((f) => f.id === familyId);
  if (!family) return;
  const version: TemplateVersion = {
    id: uid("ver"),
    version: nextVersionNo(family),
    effectiveAt: new Date().toISOString(),
    note: input.note || "模板升级",
    colorCard: input.colorCard.map((c) => ({ ...c })),
    steps: input.steps.map((s) => ({ name: s.name, params: { ...s.params } })),
  };
  setState((s) => ({
    ...s,
    families: s.families.map((f) =>
      f.id === familyId ? { ...f, versions: [...f.versions, version] } : f,
    ),
    carpets: s.carpets.map((c) => {
      if (!(c.origin === family.origin && c.material === family.material && c.density === family.density))
        return c;
      let touched = false;
      const steps = c.steps.map((st) => {
        if (st.status !== "未开始") return st;
        const tpl = version.steps.find((t) => t.name === st.name);
        touched = true;
        return {
          ...st,
          params: tpl ? { ...tpl.params } : st.params,
          templateVersionId: version.id,
        };
      });
      if (!touched) return c;
      return {
        ...c,
        steps,
        ledger: [
          ...c.ledger,
          led(
            "升级",
            `模板升级到 ${version.version}：未开始工序已切换到新参数，进行中/已完成工序保留原参数`,
            undefined,
            version.id,
          ),
        ],
      };
    }),
  }));
}

/**
 * 色卡改动：未完成的工序（未开始+进行中）作废并按新版本重算，
 * 已完成的工序保留。
 */
export function changeColorCard(familyId: string, colorCard: ColorCardEntry[]) {
  const family = state.families.find((f) => f.id === familyId);
  if (!family) return;
  const base = currentVersion(family);
  const version: TemplateVersion = {
    ...base,
    id: uid("ver"),
    version: nextVersionNo(family),
    effectiveAt: new Date().toISOString(),
    note: "色卡调整",
    colorCard: colorCard.map((c) => ({ ...c })),
  };
  const now = new Date().toISOString();
  setState((s) => ({
    ...s,
    families: s.families.map((f) =>
      f.id === familyId ? { ...f, versions: [...f.versions, version] } : f,
    ),
    carpets: s.carpets.map((c) => {
      if (!(c.origin === family.origin && c.material === family.material && c.density === family.density))
        return c;
      const finished = c.steps.filter((st) => st.status === "已完成");
      const unfinished = c.steps.filter((st) => st.status === "未开始" || st.status === "进行中");
      if (unfinished.length === 0) return c;
      const voided = unfinished.map((st) => ({
        ...st,
        status: "已作废" as const,
        voidedAt: now,
      }));
      const fresh = generateSteps(version);
      return {
        ...c,
        steps: [...finished, ...voided, ...fresh],
        currentVersionId: version.id,
        ledger: [
          ...c.ledger,
          led(
            "作废重算",
            `色卡调整：${unfinished.length} 道未完成工序已作废，按 ${version.version} 重算；${finished.length} 道已完成工序保留`,
            undefined,
            version.id,
          ),
        ],
      };
    }),
  }));
}

/**
 * 结密度改动：切换到对应密度的模板族（无则新建），
 * 未完成工序作废重算，已完成工序保留。
 */
export function changeDensity(carpetId: string, newDensity: number) {
  const c = state.carpets.find((x) => x.id === carpetId);
  if (!c || c.density === newDensity) return;
  let family = findFamily(state.families, c.origin, c.material, newDensity);
  const now = new Date().toISOString();
  setState((s) => {
    let families = s.families;
    if (!family) {
      const newFamily: TemplateFamily = {
        id: uid("fam"),
        origin: c.origin,
        material: c.material,
        density: newDensity,
        versions: [
          {
            id: uid("ver"),
            version: "v1",
            effectiveAt: now,
            note: "结密度调整后新建",
            colorCard: [],
            steps: [],
          },
        ],
      };
      families = [...families, newFamily];
      family = newFamily;
    }
    const version = currentVersion(family);
    const carpets = s.carpets.map((x) => {
      if (x.id !== carpetId) return x;
      const finished = x.steps.filter((st) => st.status === "已完成");
      const unfinished = x.steps.filter((st) => st.status === "未开始" || st.status === "进行中");
      const voided = unfinished.map((st) => ({ ...st, status: "已作废" as const, voidedAt: now }));
      const fresh = unfinished.length > 0 ? generateSteps(version) : [];
      return {
        ...x,
        density: newDensity,
        steps: [...finished, ...voided, ...fresh],
        currentVersionId: unfinished.length > 0 ? version.id : x.currentVersionId,
        ledger: [
          ...x.ledger,
          led(
            "作废重算",
            `结密度调整为 ${newDensity}：${unfinished.length} 道未完成工序已作废重算，${finished.length} 道已完成工序保留`,
            undefined,
            version.id,
          ),
        ],
      };
    });
    return { ...s, families, carpets };
  });
}

/** 确认回填的历史版本。 */
export function confirmBackfill(carpetId: string, craftsman: string) {
  const c = state.carpets.find((x) => x.id === carpetId);
  if (!c || !c.pendingConfirm) return;
  setState((s) => ({
    ...s,
    carpets: s.carpets.map((x) =>
      x.id === carpetId
        ? {
            ...x,
            pendingConfirm: false,
            ledger: [...x.ledger, led("确认", `${craftsman} 确认回填的模板版本`, craftsman, x.currentVersionId)],
          }
        : x,
    ),
  }));
}

/** 师傅主动解锁（交接场景）。 */
export function releaseLock(carpetId: string, craftsman: string) {
  const c = state.carpets.find((x) => x.id === carpetId);
  if (!c || !c.lock || c.lock.by !== craftsman) return;
  setState((s) => ({
    ...s,
    carpets: s.carpets.map((x) =>
      x.id === carpetId
        ? { ...x, lock: null, ledger: [...x.ledger, led("解锁", `${craftsman} 解锁档案`, craftsman)] }
        : x,
    ),
  }));
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  state = seedState();
  listeners.forEach((l) => l());
}

/** 按入库时间回填最接近版本（用于新录入的历史档案）。 */
export function backfillForStorage(
  families: TemplateFamily[],
  origin: string,
  material: string,
  density: number,
  storageAt: string,
): string | undefined {
  const family = findFamily(families, origin, material, density);
  if (!family) return undefined;
  return closestVersion(family, storageAt).id;
}
