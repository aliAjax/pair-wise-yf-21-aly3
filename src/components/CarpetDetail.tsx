import { useMemo, useState } from "react";
import type { LedgerEvent, StepStatus } from "../types";
import { useAppState, advanceStep, changeDensity, confirmBackfill, releaseLock, startWork } from "../store";
import { formatTime, versionLabel } from "../utils";

const DENSITY_OPTIONS = [30, 36, 42, 48];

const STATUS_LABEL: Record<StepStatus, string> = {
  未开始: "未开始",
  进行中: "进行中",
  已完成: "已完成",
  已作废: "已作废",
};

function statusClass(status: StepStatus): string {
  return `step-status step-${status}`;
}

function eventClass(type: LedgerEvent["type"]): string {
  return `ledger-event ledger-${type}`;
}

export default function CarpetDetail({ carpetId, craftsman }: { carpetId: string; craftsman: string }) {
  const state = useAppState();
  const carpet = state.carpets.find((c) => c.id === carpetId);
  const [lockError, setLockError] = useState<string | null>(null);

  const family = useMemo(
    () =>
      carpet
        ? state.families.find(
            (f) => f.origin === carpet.origin && f.material === carpet.material && f.density === carpet.density,
          )
        : undefined,
    [state.families, carpet],
  );

  const versionInUse = useMemo(() => {
    if (!carpet || !family) return undefined;
    return family.versions.find((v) => v.id === carpet.currentVersionId);
  }, [family, carpet]);

  if (!carpet) {
    return (
      <section className="panel detail-empty">
        <p>请选择一块地毯查看版本账</p>
      </section>
    );
  }

  const lockedByOther = carpet.lock && carpet.lock.by !== craftsman;
  const lockedBySelf = carpet.lock && carpet.lock.by === craftsman;
  const finishedCount = carpet.steps.filter((s) => s.status === "已完成").length;
  const progress = carpet.steps.length ? Math.round((finishedCount / carpet.steps.length) * 100) : 0;

  function handleStart() {
    if (!carpet) return;
    const result = startWork(carpet.id, craftsman);
    if (!result.ok && result.lockedBy) {
      setLockError(`该毯子已被 ${result.lockedBy} 于 ${formatTime(result.lockedAt)} 锁定`);
    } else if (result.ok) {
      setLockError(null);
    }
  }

  return (
    <section className="panel detail">
      <div className="heading">
        <div>
          <p>版本账</p>
          <h2>
            {carpet.id}
            <span className={`badge badge-status badge-${carpet.status}`}>{carpet.status}</span>
            {carpet.pendingConfirm && <span className="badge badge-confirm">待确认</span>}
            {carpet.lock && <span className="badge badge-lock">锁定中</span>}
          </h2>
        </div>
        <div className="detail-actions">
          {carpet.status !== "已完成" && !carpet.lock && (
            <button className="primary" onClick={handleStart}>
              开工（{craftsman}）
            </button>
          )}
          {lockedBySelf && (
            <button onClick={() => releaseLock(carpet.id, craftsman)}>解锁</button>
          )}
        </div>
      </div>

      <div className="detail-meta">
        <span>
          <b>产地</b>
          {carpet.origin}
        </span>
        <span>
          <b>年代</b>
          {carpet.era}
        </span>
        <span>
          <b>材质</b>
          {carpet.material}
        </span>
        <span>
          <b>结密度</b>
          {carpet.density} 结/英寸
        </span>
        <span>
          <b>染色</b>
          {carpet.dyeType}
        </span>
        <span>
          <b>入库</b>
          {carpet.storageAt}
        </span>
        <span className="detail-damage">
          <b>破损</b>
          {carpet.damage}
        </span>
      </div>

      {carpet.pendingConfirm && (
        <div className="banner banner-confirm">
          <div>
            <strong>历史数据待确认</strong>
            <span>
              已按入库时间 {carpet.storageAt} 回填最接近的模板版本
              {versionInUse ? ` ${versionInUse.version}` : ""}，请确认是否采用该版本开工。
            </span>
          </div>
          <button
            className="primary"
            onClick={() => {
              confirmBackfill(carpet.id, craftsman);
              setLockError(null);
            }}
          >
            确认回填
          </button>
        </div>
      )}

      {lockError && (
        <div className="banner banner-lock">
          <strong>开工被拒</strong>
          <span>{lockError}</span>
        </div>
      )}

      {lockedByOther && (
        <div className="banner banner-lock">
          <strong>档案已锁定</strong>
          <span>
            该毯子已被 <b>{carpet.lock!.by}</b> 于 {formatTime(carpet.lock!.at)} 锁定，其他师傅无法开工。
          </span>
        </div>
      )}

      {lockedBySelf && (
        <div className="banner banner-self">
          <strong>你已锁定本档案</strong>
          <span>锁定于 {formatTime(carpet.lock!.at)}，可继续推进工序或解锁交接。</span>
        </div>
      )}

      <div className="detail-grid">
        <div>
          <h3>当前色卡</h3>
          {versionInUse && versionInUse.colorCard.length > 0 ? (
            <div className="swatches">
              {versionInUse.colorCard.map((c) => (
                <div key={c.name} className="swatch" title={`${c.name} ${c.code}`}>
                  <i style={{ background: c.code }} />
                  <span>{c.name}</span>
                  <code>{c.code}</code>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">暂无色卡</p>
          )}
          <p className="muted version-in-use">
            开工版本：{versionLabel(state.families, carpet.currentVersionId)}
          </p>

          <h3>结密度改动</h3>
          <div className="density-row">
            <select
              value={carpet.density}
              onChange={(e) => changeDensity(carpet.id, Number(e.target.value))}
              disabled={carpet.status === "已完成"}
            >
              {DENSITY_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} 结/英寸
                </option>
              ))}
            </select>
            <span className="muted">改动后未完成工序作废重算，已完成工序保留</span>
          </div>
        </div>

        <div>
          <h3>工序进度</h3>
          <div className="progress-bar">
            <i style={{ width: `${progress}%` }} />
            <span>{progress}%</span>
          </div>
          {carpet.steps.length === 0 ? (
            <p className="muted">尚未开工，开工后按当前模板版本生成工序。</p>
          ) : (
            <table className="steps-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>工序</th>
                  <th>冻结参数（开工时快照）</th>
                  <th>状态</th>
                  <th>版本</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {carpet.steps.map((st, i) => (
                  <tr key={st.id} className={st.status === "已作废" ? "row-voided" : ""}>
                    <td>{i + 1}</td>
                    <td>
                      <b>{st.name}</b>
                      {st.startedAt && <em>开始 {formatTime(st.startedAt)}</em>}
                      {st.completedAt && <em>完成 {formatTime(st.completedAt)}</em>}
                      {st.voidedAt && <em>作废 {formatTime(st.voidedAt)}</em>}
                    </td>
                    <td>
                      <div className="params">
                        {Object.entries(st.params).map(([k, v]) => (
                          <span key={k}>
                            <var>{k}</var>
                            {v}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={statusClass(st.status)}>{STATUS_LABEL[st.status]}</span>
                    </td>
                    <td>
                      <span className="version-tag">{versionLabel(state.families, st.templateVersionId)}</span>
                    </td>
                    <td>
                      {st.status === "未开始" && (
                        <button
                          onClick={() => advanceStep(carpet.id, st.id, craftsman)}
                          disabled={!!carpet.lock && carpet.lock.by !== craftsman}
                        >
                          开始
                        </button>
                      )}
                      {st.status === "进行中" && (
                        <button
                          className="primary"
                          onClick={() => advanceStep(carpet.id, st.id, craftsman)}
                          disabled={!!carpet.lock && carpet.lock.by !== craftsman}
                        >
                          完成
                        </button>
                      )}
                      {st.status === "已完成" && <span className="muted">—</span>}
                      {st.status === "已作废" && <span className="muted">已作废</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <h3>版本账</h3>
      <div className="ledger">
        {carpet.ledger.map((ev) => (
          <div key={ev.id} className={eventClass(ev.type)}>
            <span className="ledger-dot" />
            <div className="ledger-body">
              <div className="ledger-head">
                <span className="ledger-type">{ev.type}</span>
                <span className="ledger-time">{formatTime(ev.time)}</span>
                {ev.operator && <span className="ledger-operator">{ev.operator}</span>}
              </div>
              <p>{ev.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
