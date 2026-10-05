import { useState } from "react";
import type { ColorCardEntry, StepTemplate, TemplateFamily } from "../types";
import { changeColorCard, upgradeTemplate, useAppState } from "../store";
import { formatDate } from "../utils";

function FamilyEditor({ family, onClose }: { family: TemplateFamily; onClose: () => void }) {
  const current = [...family.versions].sort(
    (a, b) => new Date(b.effectiveAt).getTime() - new Date(a.effectiveAt).getTime(),
  )[0];
  const [note, setNote] = useState(current.note);
  const [colorCard, setColorCard] = useState<ColorCardEntry[]>(current.colorCard.map((c) => ({ ...c })));
  const [steps, setSteps] = useState<StepTemplate[]>(
    current.steps.map((s) => ({ name: s.name, params: { ...s.params } })),
  );

  function updateColor(i: number, patch: Partial<ColorCardEntry>) {
    setColorCard((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function addColor() {
    setColorCard((cs) => [...cs, { name: "新色", code: "#888888" }]);
  }
  function removeColor(i: number) {
    setColorCard((cs) => cs.filter((_, idx) => idx !== i));
  }

  function updateParam(si: number, key: string, value: string) {
    setSteps((ss) =>
      ss.map((s, idx) => (idx === si ? { ...s, params: { ...s.params, [key]: value } } : s)),
    );
  }
  function renameParam(si: number, oldKey: string, newKey: string) {
    setSteps((ss) =>
      ss.map((s, idx) => {
        if (idx !== si) return s;
        const entries = Object.entries(s.params).map(([k, v]) => [k === oldKey ? newKey : k, v]);
        return { ...s, params: Object.fromEntries(entries) };
      }),
    );
  }
  function addParam(si: number) {
    setSteps((ss) =>
      ss.map((s, idx) => (idx === si ? { ...s, params: { ...s.params, 新参数: "值" } } : s)),
    );
  }
  function removeParam(si: number, key: string) {
    setSteps((ss) =>
      ss.map((s, idx) => {
        if (idx !== si) return s;
        const params = { ...s.params };
        delete params[key];
        return { ...s, params };
      }),
    );
  }
  function addStep() {
    setSteps((ss) => [...ss, { name: "新工序", params: { 说明: "" } }]);
  }
  function removeStep(si: number) {
    setSteps((ss) => ss.filter((_, idx) => idx !== si));
  }

  return (
    <div className="editor">
      <label>
        <span>版本说明</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      <div className="editor-section">
        <div className="editor-head">
          <h4>色卡</h4>
          <button onClick={addColor}>加色</button>
        </div>
        <div className="editor-rows">
          {colorCard.map((c, i) => (
            <div key={i} className="editor-row">
              <input value={c.name} onChange={(e) => updateColor(i, { name: e.target.value })} />
              <input value={c.code} onChange={(e) => updateColor(i, { code: e.target.value })} />
              <i style={{ background: c.code }} />
              <button className="ghost" onClick={() => removeColor(i)}>
                删
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="editor-section">
        <div className="editor-head">
          <h4>工序与冻结参数</h4>
          <button onClick={addStep}>加工序</button>
        </div>
        {steps.map((s, si) => (
          <div key={si} className="editor-step">
            <div className="editor-step-head">
              <input
                className="step-name-input"
                value={s.name}
                onChange={(e) =>
                  setSteps((ss) => ss.map((x, idx) => (idx === si ? { ...x, name: e.target.value } : x)))
                }
              />
              <button className="ghost" onClick={() => removeStep(si)}>
                删工序
              </button>
            </div>
            <div className="editor-rows">
              {Object.entries(s.params).map(([k, v]) => (
                <div key={k} className="editor-row">
                  <input value={k} onChange={(e) => renameParam(si, k, e.target.value)} placeholder="参数名" />
                  <input value={v} onChange={(e) => updateParam(si, k, e.target.value)} placeholder="参数值" />
                  <button className="ghost" onClick={() => removeParam(si, k)}>
                    删
                  </button>
                </div>
              ))}
              <button className="ghost" onClick={() => addParam(si)}>
                加参数
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="editor-actions">
        <button
          className="primary"
          onClick={() => {
            upgradeTemplate(family.id, { note, colorCard, steps });
            onClose();
          }}
        >
          升级模板（未开始工序切换）
        </button>
        <button
          onClick={() => {
            changeColorCard(family.id, colorCard);
            onClose();
          }}
        >
          色卡调整（未完成工序作废重算）
        </button>
        <button className="ghost" onClick={onClose}>
          取消
        </button>
      </div>
    </div>
  );
}

export default function TemplatePanel() {
  const families = useAppState().families;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(families[0]?.id ?? null);

  const viewing = families.find((f) => f.id === viewingId) ?? families[0];
  const current = viewing
    ? [...viewing.versions].sort(
        (a, b) => new Date(b.effectiveAt).getTime() - new Date(a.effectiveAt).getTime(),
      )[0]
    : undefined;

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>工艺模板</p>
          <h2>按产地·材质·结密度整理</h2>
        </div>
        <div className="chip-row">
          {families.map((f) => (
            <button
              key={f.id}
              className={f.id === viewing?.id ? "chip-active" : ""}
              onClick={() => {
                setViewingId(f.id);
                setEditingId(null);
              }}
            >
              {f.origin}·{f.material}·{f.density}
            </button>
          ))}
        </div>
      </div>

      {viewing && current && (
        <div className="template-detail">
          <div className="template-versions">
            {viewing.versions.map((v) => (
              <span key={v.id} className={v.id === current.id ? "version-pill version-pill-active" : "version-pill"}>
                {v.version}
                <em>{formatDate(v.effectiveAt)}</em>
              </span>
            ))}
          </div>

          {editingId === viewing.id ? (
            <FamilyEditor family={viewing} onClose={() => setEditingId(null)} />
          ) : (
            <>
              <p className="template-note">
                <b>{current.version}</b> · {current.note} · 生效于 {formatDate(current.effectiveAt)}
              </p>
              <div className="swatches">
                {current.colorCard.map((c) => (
                  <div key={c.name} className="swatch">
                    <i style={{ background: c.code }} />
                    <span>{c.name}</span>
                    <code>{c.code}</code>
                  </div>
                ))}
              </div>
              <div className="template-steps">
                {current.steps.map((s, i) => (
                  <div key={s.name} className="template-step">
                    <b>
                      {i + 1}. {s.name}
                    </b>
                    <div className="params">
                      {Object.entries(s.params).map(([k, v]) => (
                        <span key={k}>
                          <var>{k}</var>
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="editor-actions">
                <button className="primary" onClick={() => setEditingId(viewing.id)}>
                  升级 / 改色卡
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
