import { useState } from "react";
import { useStore } from "../store";
import { fmtDate, jobOfCarpet, versionById } from "../engine";
import { Tag } from "./ui";

export function ArchiveList({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { state } = useStore();
  const origins = ["全部", ...Array.from(new Set(state.archives.map((a) => a.origin)))];
  const [origin, setOrigin] = useState("全部");
  const list = state.archives.filter((a) => origin === "全部" || a.origin === origin);

  return (
    <section className="panel archive-list">
      <div className="heading">
        <div>
          <p>纹样与修复档案</p>
          <h2>地毯档案（{state.archives.length}）</h2>
        </div>
      </div>
      <div className="chips">
        {origins.map((o) => (
          <button key={o} className={origin === o ? "chip-active" : ""} onClick={() => setOrigin(o)}>
            {o}
          </button>
        ))}
      </div>
      <div className="archive-items">
        {list.map((a) => {
          const job = jobOfCarpet(state, a.id);
          const pinned = job ? versionById(state, job.pinnedVersionId) : undefined;
          return (
            <button
              key={a.id}
              className={`archive-item${selectedId === a.id ? " sel" : ""}`}
              onClick={() => onSelect(a.id)}
            >
              <div className="archive-item-top">
                <b>{a.id}</b>
                {job?.finishedAt ? (
                  <Tag tone="muted">已完工</Tag>
                ) : job ? (
                  <Tag tone="teal">修复中</Tag>
                ) : a.historical && (!a.backfill || a.backfill.status === "pending") ? (
                  <Tag tone="danger">回填待确认</Tag>
                ) : (
                  <Tag>待开工</Tag>
                )}
              </div>
              <p>
                {a.origin} · {a.era} · 结密度 {a.knotDensity}
              </p>
              <p className="damage">{a.damage}</p>
              <div className="archive-item-foot">
                <span>入库 {fmtDate(a.inboundAt)}</span>
                {pinned && <span className="pin">钉版 {pinned.version.id}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
