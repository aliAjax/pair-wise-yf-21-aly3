import { useStore } from "../store";
import {
  activeVersion,
  claimsOfCarpet,
  fmt,
  fmtDate,
  jobOfCarpet,
  matchTemplate,
  versionById,
} from "../engine";
import type { JobStep } from "../types";
import { KV, Panel, StatusBadge, Swatches, Tag } from "./ui";

function StepCard({ step }: { step: JobStep }) {
  return (
    <article className={`step-card step-${step.status}`}>
      <div className="step-head">
        <b>
          <span className="step-order">{step.order + 1}</span>
          {step.name}
          {step.recalculated && <em className="recalc">作废重算 r{step.gen}</em>}
        </b>
        <StatusBadge status={step.status} />
      </div>
      <div className="step-version">
        <Tag tone={step.status === "done" ? "muted" : "warm"}>{step.basedOnVersionId}</Tag>
        {step.operator && <span className="operator">经手：{step.operator}</span>}
      </div>
      <p className="step-guide">{step.params.guide}</p>
      <div className="step-params">
        <span>
          结密度 <b>{step.params.knotDensity}</b>
        </span>
        <span>{step.params.dyeType}</span>
      </div>
      <Swatches colors={step.params.colorCard} dim={step.status === "voided" || step.status === "done"} />
      {step.startedAt && (
        <p className="step-time">开始 {fmt(step.startedAt)}</p>
      )}
      {step.completedAt && <p className="step-time">完工 {fmt(step.completedAt)}，参数封存</p>}
      {step.voidReason && <p className="void-reason">{step.voidReason}</p>}
    </article>
  );
}

function ClaimsBox({ carpetId }: { carpetId: string }) {
  const { state } = useStore();
  const claims = claimsOfCarpet(state, carpetId);
  if (!claims.length) return null;
  return (
    <div className="claims">
      <h4>开工受理回执</h4>
      {claims.map((cl) => (
        <div key={cl.id} className={`claim ${cl.ok ? "ok" : "no"}`}>
          <div className="claim-top">
            <b>
              第 {cl.seq} 份 · {cl.artisan.name}（{cl.artisan.badge}）
            </b>
            {cl.ok ? <Tag tone="teal">锁定成功</Tag> : <Tag tone="danger">未获锁</Tag>}
            <span className="claim-time">{fmt(cl.at)}</span>
          </div>
          <p>{cl.message}</p>
        </div>
      ))}
    </div>
  );
}

export function JobDetail({ carpetId }: { carpetId: string }) {
  const { state, currentArtisan, startJob, startRace, advance, confirm } = useStore();
  const a = state.archives.find((x) => x.id === carpetId);
  if (!a) return null;
  const job = jobOfCarpet(state, carpetId);
  const pinned = job ? versionById(state, job.pinnedVersionId) : undefined;
  const active = job ? activeVersion(state, job) : undefined;
  const backfillV = a.backfill ? versionById(state, a.backfill.versionId) : undefined;
  const matchedT = matchTemplate(state, a);
  const liveSteps = job?.steps.filter((s) => s.status !== "voided") ?? [];
  const voidSteps = job?.steps.filter((s) => s.status === "voided") ?? [];
  const canAdvance = !!job && !job.finishedAt;

  return (
    <Panel
      title={`${a.id} · 修复工单`}
      sub={job ? `开工锁：${job.lockedBy.name}（${job.lockedBy.badge}）` : "尚未开工"}
      extra={
        job?.finishedAt ? <Tag tone="muted">{fmtDate(job.finishedAt)} 完工，锁已释放</Tag> : undefined
      }
    >
      <div className="detail-kv">
        <KV k="产地 / 年代">{`${a.origin} · ${a.era}`}</KV>
        <KV k="材质 / 染色">{`${a.material} · ${a.dyeType}`}</KV>
        <KV k="结密度">{a.knotDensity} 结/10cm</KV>
        <KV k="破损区域">{a.damage}</KV>
      </div>

      {/* 版本账：开工钉版 + 历史回填 */}
      <div className="pin-box">
        {job && pinned ? (
          <>
            <div className="pin-line">
              <Tag tone="warm">开工钉版 {pinned.version.id}</Tag>
              <span>
                {job.pinSource === "backfill" ? "沿用已确认的历史回填版本" : "取开工当时已生效的最新版"} · 开工 {fmt(job.startedAt)}
              </span>
            </div>
            {active && active.id !== job.pinnedVersionId && (
              <div className="pin-line">
                <Tag tone="teal">当前执行版 {active.id}</Tag>
                <span>钉版不变；未完成工序已按新版重算，已完工工序各自封存于当时版本</span>
              </div>
            )}
          </>
        ) : a.historical ? (
          <>
            <div className="pin-line">
              <Tag tone={a.backfill?.status === "confirmed" ? "teal" : "danger"}>
                历史回填 {a.backfill?.versionId ?? "—"}
              </Tag>
              <span>
                按入库时间 {fmtDate(a.inboundAt)} 匹配当时已生效的最新一版（入库早于全部版本时取最早版）
              </span>
            </div>
            {backfillV && (
              <p className="backfill-meta">
                匹配模板「{backfillV.template.name}」· 回填于 {a.backfill ? fmt(a.backfill.at) : ""}
                {a.backfill?.status === "confirmed"
                  ? ` · ${a.backfill.confirmedBy} 于 ${fmt(a.backfill.confirmedAt!)} 确认`
                  : " · 待确认"}
              </p>
            )}
          </>
        ) : (
          <div className="pin-line">
            <Tag>待开工</Tag>
            <span>
              将匹配模板「{matchedT?.name ?? "无"}」并钉住开工当时的最新版本；开工后模板再升级也不改钉版
            </span>
          </div>
        )}
      </div>

      {/* 开工操作：单人提交 / 两位师傅并发模拟 */}
      {!job && (
        <div className="start-box">
          {a.historical && a.backfill?.status !== "confirmed" && (
            <div className="guard">
              <Tag tone="danger">先确认回填版本</Tag>
              <button className="primary" disabled={!a.backfill} onClick={() => confirm(a.id)}>
                以 {currentArtisan.name} 身份确认回填
              </button>
            </div>
          )}
          <button
            className="primary"
            disabled={a.historical && a.backfill?.status !== "confirmed"}
            onClick={() => startJob(a.id)}
          >
            {currentArtisan.name} 提交开工（锁定模板版本）
          </button>
          <button
            disabled={a.historical && a.backfill?.status !== "confirmed"}
            onClick={() => startRace(a.id)}
            title="两位师傅同时对这块毯提交开工，按 2 秒时间差先后受理"
          >
            模拟两位师傅同时开工
          </button>
        </div>
      )}
      <ClaimsBox carpetId={a.id} />

      {/* 工序：每道带着版本号与参数快照 */}
      {job && (
        <>
          <div className="steps">
            {liveSteps.map((st) => (
              <StepCard key={st.instanceId} step={st} />
            ))}
          </div>
          {voidSteps.length > 0 && (
            <details className="voided-details">
              <summary>作废留痕（{voidSteps.length} 道，参数与版本原样保留）</summary>
              <div className="steps voided-grid">
                {voidSteps.map((st) => (
                  <StepCard key={st.instanceId} step={st} />
                ))}
              </div>
            </details>
          )}
          <div className="advance-row">
            <button className="primary" disabled={!canAdvance} onClick={() => advance(a.id)}>
              {liveSteps.some((s) => s.status === "in_progress")
                ? `${currentArtisan.name} 完成进行中的工序并封存`
                : `${currentArtisan.name} 开始下一道工序`}
            </button>
            <span className="hint">
              进行中的工序必须先完工，下一道才能开工——交接时两位师傅各按工序上记录的版本执行
            </span>
          </div>
        </>
      )}
    </Panel>
  );
}
