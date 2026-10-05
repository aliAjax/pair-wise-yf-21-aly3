import { useState } from "react";
import { useStore } from "../store";
import { KIND_LABEL, fmt, fmtDate, latestVersion, templateById } from "../engine";
import type { TemplateVersion, ThreadColor, VersionDraft } from "../types";
import { Panel, Swatches, Tag } from "./ui";

function VersionCard({ t, v, current }: { t: { name: string }; v: TemplateVersion; current: boolean }) {
  return (
    <article className={`version-card${current ? " current" : ""}`}>
      <div className="version-head">
        <b>{v.id}</b>
        {current ? <Tag tone="warm">当前生效</Tag> : <Tag tone="muted">历史版本</Tag>}
      </div>
      <p className="version-summary">{v.summary}</p>
      <div className="version-meta">
        <span>生效 {fmtDate(v.effectiveAt)} {fmt(v.effectiveAt).slice(11)}</span>
        <span>发布 {v.publishedBy}</span>
      </div>
      <div className="version-kinds">
        {v.kinds.length ? (
          v.kinds.map((k) => (
            <Tag key={k} tone={k === "other" ? "neutral" : "danger"}>
              {KIND_LABEL[k]}变更
            </Tag>
          ))
        ) : (
          <Tag tone="muted">首版</Tag>
        )}
      </div>
      <div className="version-params">
        <span>结密度 <b>{v.knotDensity}</b> 结/10cm</span>
        <span>{v.dyeType}</span>
      </div>
      <Swatches colors={v.colorCard} dim={!current} />
    </article>
  );
}

function PublishForm({ templateId, latest }: { templateId: string; latest: TemplateVersion }) {
  const { publish } = useStore();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [knot, setKnot] = useState(latest.knotDensity);
  const [dye, setDye] = useState(latest.dyeType);
  const [note, setNote] = useState("");
  const [colors, setColors] = useState<ThreadColor[]>(latest.colorCard.map((c) => ({ ...c })));
  const [newName, setNewName] = useState("");
  const [newHex, setNewHex] = useState("#b4432a");

  const colorTouched =
    colors.length !== latest.colorCard.length ||
    colors.some(
      (c, i) => !latest.colorCard[i] || latest.colorCard[i].id !== c.id || latest.colorCard[i].hex.toUpperCase() !== c.hex.toUpperCase()
    );
  const hard = colorTouched || knot !== latest.knotDensity;
  const changed = hard || dye !== latest.dyeType || note.trim() !== "";

  function reset() {
    setSummary("");
    setKnot(latest.knotDensity);
    setDye(latest.dyeType);
    setNote("");
    setColors(latest.colorCard.map((c) => ({ ...c })));
    setNewName("");
  }

  if (!open) {
    return (
      <button className="ghost-btn" onClick={() => setOpen(true)}>
        + 发布新版本
      </button>
    );
  }

  return (
    <div className="publish-form">
      <label>
        <span>版本说明</span>
        <input value={summary} placeholder="例如：增配做旧色卡" onChange={(e) => setSummary(e.target.value)} />
      </label>
      <div className="publish-row">
        <label>
          <span>结密度（改动将作废重算）</span>
          <input type="number" value={knot} min={10} max={120} onChange={(e) => setKnot(Number(e.target.value))} />
        </label>
        <label>
          <span>染色类型</span>
          <input value={dye} onChange={(e) => setDye(e.target.value)} />
        </label>
      </div>
      <div>
        <span className="field-label">色卡（增删/改色将作废重算未完成工序）</span>
        <div className="color-edit">
          {colors.map((col) => (
            <div key={col.id} className="color-edit-row">
              <input
                type="color"
                value={col.hex}
                onChange={(e) => setColors(colors.map((x) => (x.id === col.id ? { ...x, hex: e.target.value } : x)))}
              />
              <input
                value={col.name}
                onChange={(e) => setColors(colors.map((x) => (x.id === col.id ? { ...x, name: e.target.value } : x)))}
              />
              <button
                className="mini danger-text"
                onClick={() => setColors(colors.filter((x) => x.id !== col.id))}
                title="移除该色"
              >
                ×
              </button>
            </div>
          ))}
          <div className="color-edit-row add">
            <input type="color" value={newHex} onChange={(e) => setNewHex(e.target.value)} />
            <input value={newName} placeholder="新色名称" onChange={(e) => setNewName(e.target.value)} />
            <button
              className="mini"
              onClick={() => {
                if (!newName.trim()) return;
                setColors([...colors, { id: `c-${Date.now()}`, name: newName.trim(), hex: newHex }]);
                setNewName("");
              }}
            >
              +
            </button>
          </div>
        </div>
      </div>
      <label>
        <span>工艺要求补充（留空不调整工序要求）</span>
        <input value={note} placeholder="例如：褪色区优先比对做旧色卡" onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="publish-warn">
        {hard ? (
          <Tag tone="danger">硬变更：所有未完成工序（含进行中）作废并按新版重算，已完工保留</Tag>
        ) : (
          <Tag tone="teal">软升级：仅未开始工序跟随新版，进行中与已完工保留当时参数</Tag>
        )}
      </div>
      <div className="publish-actions">
        <button
          className="primary"
          disabled={!changed}
          onClick={() => {
            const draft: VersionDraft = {
              summary: summary.trim() || "工艺调整",
              knotDensity: knot,
              dyeType: dye.trim() || latest.dyeType,
              colorCard: colors,
              guideNote: note.trim(),
            };
            publish(templateId, draft);
            setOpen(false);
            reset();
          }}
        >
          发布为 v{latest.no + 1}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            reset();
          }}
        >
          取消
        </button>
      </div>
    </div>
  );
}

export function TemplatesPanel() {
  const { state } = useStore();
  const [openId, setOpenId] = useState<string>(state.templates[0].id);
  const t = templateById(state, openId) ?? state.templates[0];
  const latest = latestVersion(t);

  return (
    <Panel title="工艺模板版本" sub="按产地 / 材质 / 结密度">
      <div className="tpl-tabs">
        {state.templates.map((x) => (
          <button key={x.id} className={x.id === t.id ? "active" : ""} onClick={() => setOpenId(x.id)}>
            {x.name}
            <small>
              {x.origin} · {x.material} · v{x.versions.length}
            </small>
          </button>
        ))}
      </div>
      <div className="version-list">
        {[...t.versions].reverse().map((v) => (
          <VersionCard key={v.id} t={t} v={v} current={v.id === latest.id} />
        ))}
      </div>
      <PublishForm key={t.id} templateId={t.id} latest={latest} />
    </Panel>
  );
}
