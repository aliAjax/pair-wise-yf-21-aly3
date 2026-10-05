import { useMemo, useState } from "react";
import "./styles.css";
import { StoreProvider, useStore } from "./store";
import { ArchiveList } from "./components/ArchiveList";
import { JobDetail } from "./components/JobDetail";
import { TemplatesPanel } from "./components/TemplatesPanel";
import { LedgerFeed } from "./components/LedgerFeed";

const RULES = [
  "开工即钉版：工单记下当时模板版本，之后模板升级不改钉版",
  "普通升级只动未开始工序；进行中、已完工保留当时参数",
  "色卡/结密度改动：未完成工序（含进行中）作废留痕并按新版重算",
  "历史档案按入库时间回填最接近的一版，挂待确认",
  "两人同开一块毯：先到锁定，后到看到锁在谁手里",
];

function Metrics() {
  const { state } = useStore();
  const metrics = useMemo(() => {
    const activeJobs = state.jobs.filter((j) => !j.finishedAt).length;
    const pendingBackfill = state.archives.filter(
      (a) => a.historical && a.backfill?.status === "pending"
    ).length;
    const liveSteps = state.jobs.flatMap((j) => j.steps.filter((s) => s.status !== "voided"));
    const done = liveSteps.filter((s) => s.status === "done").length;
    const rate = liveSteps.length ? Math.round((done / liveSteps.length) * 100) : 0;
    const versions = state.templates.reduce((n, t) => n + t.versions.length, 0);
    return [
      { label: "进行中工单", value: activeJobs },
      { label: "模板版本总数", value: versions },
      { label: "回填待确认", value: pendingBackfill },
      { label: "工序完工率", value: `${rate}%` },
    ];
  }, [state]);

  return (
    <section className="metrics">
      {metrics.map((m) => (
        <article key={m.label}>
          <small>{m.label}</small>
          <strong>{m.value}</strong>
        </article>
      ))}
    </section>
  );
}

function Shell() {
  const { state, currentArtisan, setCurrentArtisanId, reset } = useStore();
  const [selectedId, setSelectedId] = useState(state.archives[0].id);

  return (
    <main className="app">
      <section className="hero">
        <div className="hero-top">
          <p>hxyfront-62009 · 手工地毯修复 · 版本账工作台</p>
          <div className="artisan-switch">
            <span>当前身份</span>
            {state.artisans.map((a) => (
              <button
                key={a.id}
                className={a.id === currentArtisan.id ? "artisan-active" : ""}
                onClick={() => setCurrentArtisanId(a.id)}
              >
                {a.name}（{a.badge}）
              </button>
            ))}
            <button className="ghost-btn" onClick={reset} title="清空本地账本并恢复演示数据">
              重置演示
            </button>
          </div>
        </div>
        <h1>地毯档案 · 工艺模板 · 工序版本账</h1>
        <div className="rules">
          {RULES.map((r, i) => (
            <span key={r}>
              <b>{i + 1}</b>
              {r}
            </span>
          ))}
        </div>
      </section>

      <Metrics />

      <section className="workspace detail-layout">
        <ArchiveList selectedId={selectedId} onSelect={setSelectedId} />
        <JobDetail carpetId={selectedId} />
      </section>

      <div className="template-block">
        <TemplatesPanel />
      </div>

      <LedgerFeed />
    </main>
  );
}

function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

export default App;
