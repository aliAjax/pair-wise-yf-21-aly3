import { useMemo, useState } from "react";
import CarpetDetail from "./components/CarpetDetail";
import TemplatePanel from "./components/TemplatePanel";
import { resetState, startWork, useAppState } from "./store";
import { delay, formatTime } from "./utils";
import "./styles.css";

const ORIGIN_FILTERS = ["全部", "波斯", "安纳托利亚", "藏毯"];
const STATUS_FILTERS = ["全部", "待修复", "修复中", "已完成"];
const CRAFTSMEN = ["张师傅", "李师傅"];

export default function App() {
  const state = useAppState();
  const [selectedId, setSelectedId] = useState<string>(state.carpets[0]?.id ?? "");
  const [craftsman, setCraftsman] = useState<string>("张师傅");
  const [originFilter, setOriginFilter] = useState<string>("全部");
  const [statusFilter, setStatusFilter] = useState<string>("全部");
  const [raceMsg, setRaceMsg] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      state.carpets.filter((c) => {
        if (originFilter !== "全部" && c.origin !== originFilter) return false;
        if (statusFilter !== "全部" && c.status !== statusFilter) return false;
        return true;
      }),
    [state.carpets, originFilter, statusFilter],
  );

  const selected = state.carpets.find((c) => c.id === selectedId);

  const metrics = useMemo(
    () => [
      { label: "待修复", value: state.carpets.filter((c) => c.status === "待修复").length },
      { label: "修复中", value: state.carpets.filter((c) => c.status === "修复中").length },
      { label: "待确认", value: state.carpets.filter((c) => c.pendingConfirm).length },
      { label: "已完工", value: state.carpets.filter((c) => c.status === "已完成").length },
    ],
    [state.carpets],
  );

  async function handleRace() {
    if (!selected) return;
    setRaceMsg(null);
    const [r1, r2] = await Promise.all([
      delay(20).then(() => startWork(selected.id, "张师傅")),
      delay(90).then(() => startWork(selected.id, "李师傅")),
    ]);
    const loser = r1.ok ? r2 : r1;
    if (loser.ok) {
      setRaceMsg("两位师傅都已开工（该档案此前未锁定）");
    } else if (loser.lockedBy) {
      setRaceMsg(`后到的师傅看到：该毯子已被 ${loser.lockedBy} 于 ${formatTime(loser.lockedAt)} 锁定`);
    } else {
      setRaceMsg("开工失败：档案已完工或无可用模板");
    }
  }

  return (
    <main className="app">
      <section className="hero">
        <p>地毯修复 · 版本账</p>
        <h1>地毯档案版本账</h1>
        <span>
          开工时记下所用模板版本，升级只动未开始的工序；色卡或结密度改动后，未完成工序作废重算，已完成的保留。
          历史档案按入库时间回填最接近的版本并挂待确认。两名师傅同时开工同一块毯子，先到的锁定，后到的看到被谁锁定。
        </span>
      </section>

      <section className="metrics">
        {metrics.map((m) => (
          <article key={m.label}>
            <small>{m.label}</small>
            <strong>{m.value}</strong>
          </article>
        ))}
      </section>

      <section className="panel toolbar">
        <div className="toolbar-group">
          <span className="toolbar-label">当前师傅</span>
          <div className="chips">
            {CRAFTSMEN.map((name) => (
              <button
                key={name}
                className={craftsman === name ? "chip-active" : ""}
                onClick={() => setCraftsman(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        <div className="toolbar-group">
          <button onClick={handleRace} disabled={!selected || selected.status === "已完成"}>
            模拟两位师傅同时开工
          </button>
          <button className="ghost" onClick={() => { resetState(); setRaceMsg(null); }}>
            重置演示数据
          </button>
        </div>
      </section>

      {raceMsg && (
        <section className="banner banner-lock race-banner">
          <strong>并发结果</strong>
          <span>{raceMsg}</span>
        </section>
      )}

      <section className="workspace workspace-ledger">
        <aside className="panel list-panel">
          <div className="heading">
            <div>
              <p>地毯档案</p>
              <h2>档案列表</h2>
            </div>
          </div>
          <div className="filter-block">
            <span className="toolbar-label">产地</span>
            <div className="chips">
              {ORIGIN_FILTERS.map((f) => (
                <button
                  key={f}
                  className={originFilter === f ? "chip-active" : ""}
                  onClick={() => setOriginFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-block">
            <span className="toolbar-label">状态</span>
            <div className="chips">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f}
                  className={statusFilter === f ? "chip-active" : ""}
                  onClick={() => setStatusFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="carpet-list">
            {filtered.map((c) => (
              <button
                key={c.id}
                className={c.id === selectedId ? "carpet-item carpet-item-active" : "carpet-item"}
                onClick={() => { setSelectedId(c.id); setRaceMsg(null); }}
              >
                <div className="carpet-item-head">
                  <b>{c.id}</b>
                  <span className={`badge badge-status badge-${c.status}`}>{c.status}</span>
                </div>
                <p>
                  {c.origin} · {c.material} · 结密度 {c.density}
                </p>
                <div className="carpet-item-tags">
                  {c.pendingConfirm && <span className="badge badge-confirm">待确认</span>}
                  {c.lock && <span className="badge badge-lock">{c.lock.by} 锁定</span>}
                </div>
              </button>
            ))}
            {filtered.length === 0 && <p className="muted">无匹配档案</p>}
          </div>
        </aside>

        {selected ? <CarpetDetail carpetId={selected.id} craftsman={craftsman} /> : <section className="panel detail-empty"><p>请选择一块地毯</p></section>}
      </section>

      <TemplatePanel />
    </main>
  );
}
