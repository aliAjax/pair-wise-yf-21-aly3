import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Artisan, State, VersionDraft } from "./types";
import {
  advanceStep as engineAdvance,
  confirmBackfill as engineConfirm,
  createInitialState,
  recordStart as engineStart,
  publishVersion as enginePublish,
} from "./engine";

const STORAGE_KEY = "carpet-version-ledger-v1";

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    // 存档损坏时回退到种子数据
  }
  return createInitialState();
}

export function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

interface Store {
  state: State;
  currentArtisan: Artisan;
  setCurrentArtisanId: (id: string) => void;
  startJob: (carpetId: string, at?: string) => void;
  /** 并发模拟：两位师傅的开工申请按 2 秒时间差先后受理 */
  startRace: (carpetId: string) => void;
  advance: (carpetId: string) => void;
  confirm: (carpetId: string) => void;
  publish: (templateId: string, draft: VersionDraft) => void;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load);
  const [artisanId, setArtisanId] = useState<string>(state.artisans[0]?.id ?? "a1");

  const currentArtisan = state.artisans.find((a) => a.id === artisanId) ?? state.artisans[0];

  function commit(next: State) {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 持久化失败不影响内存账本
    }
  }

  const store: Store = useMemo(
    () => ({
      state,
      currentArtisan,
      setCurrentArtisanId: setArtisanId,
      startJob: (carpetId, at = nowStamp()) =>
        commit(engineStart(state, carpetId, currentArtisan, at, 1)),
      startRace: (carpetId) => {
        const stamp = (d: Date) => {
          const p = (n: number) => String(n).padStart(2, "0");
          return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(
            d.getMinutes()
          )}:${p(d.getSeconds())}`;
        };
        const base = new Date();
        const t1 = stamp(new Date(base.getTime() - 2000));
        const t2 = stamp(base);
        const [a1, a2] = state.artisans;
        const s1 = engineStart(state, carpetId, a1, t1, 1);
        commit(engineStart(s1, carpetId, a2, t2, 2));
      },
      advance: (carpetId) => commit(engineAdvance(state, carpetId, currentArtisan, nowStamp())),
      confirm: (carpetId) =>
        commit(engineConfirm(state, carpetId, currentArtisan, nowStamp())),
      publish: (templateId, draft) =>
        commit(enginePublish(state, templateId, draft, nowStamp(), "工艺组")),
      reset: () => {
        localStorage.removeItem(STORAGE_KEY);
        setState(createInitialState());
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, currentArtisan]
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore 必须在 StoreProvider 内使用");
  return v;
}
