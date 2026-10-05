import type { ReactNode } from "react";
import type { StepStatus, ThreadColor } from "../types";

export function Panel({
  title,
  sub,
  extra,
  children,
}: {
  title: string;
  sub?: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          {sub && <p>{sub}</p>}
          <h2>{title}</h2>
        </div>
        {extra}
      </div>
      {children}
    </section>
  );
}

const STATUS_TEXT: Record<StepStatus, string> = {
  pending: "未开始",
  in_progress: "进行中",
  done: "已完工",
  voided: "已作废",
};

export function StatusBadge({ status }: { status: StepStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_TEXT[status]}</span>;
}

export function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "warm" | "teal" | "danger" | "muted" }) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}

export function Swatches({ colors, dim }: { colors: ThreadColor[]; dim?: boolean }) {
  return (
    <div className={`swatches${dim ? " dim" : ""}`}>
      {colors.map((col) => (
        <span key={col.id} className="swatch" title={`${col.name} ${col.hex}`}>
          <i style={{ background: col.hex }} />
          {col.name}
        </span>
      ))}
    </div>
  );
}

export function KV({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="kv">
      <small>{k}</small>
      <div>{children}</div>
    </div>
  );
}
