import { useState } from "react";
import { useStore } from "../store";
import { fmt, sortedEvents } from "../engine";
import type { EventKind } from "../types";
import { Panel, Tag } from "./ui";

const KIND_TONE: Record<EventKind, { label: string; tone: "warm" | "teal" | "danger" | "muted" | "neutral" }> = {
  start: { label: "开工锁定", tone: "teal" },
  reject: { label: "开工被拒", tone: "danger" },
  upgrade: { label: "模板升级", tone: "warm" },
  migrate: { label: "工序传播", tone: "neutral" },
  step: { label: "工序", tone: "neutral" },
  backfill: { label: "历史回填", tone: "warm" },
  confirm: { label: "回填确认", tone: "teal" },
  finish: { label: "工单完工", tone: "muted" },
};

export function LedgerFeed() {
  const { state } = useStore();
  const events = sortedEvents(state);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Panel
      title="版本账流水"
      sub="开工钉版 / 升级传播 / 作废重算 / 回填确认 / 开工锁"
      extra={
        <button className="ghost-btn" onClick={() => setCollapsed((v) => !v)}>
          {collapsed ? `展开（${events.length} 条）` : "收起"}
        </button>
      }
    >
      {!collapsed && (
        <ol className="ledger">
          {[...events].reverse().map((e) => {
            const meta = KIND_TONE[e.kind];
            return (
              <li key={e.id} className={`ledger-item kind-${e.kind}`}>
                <span className="ledger-time">{fmt(e.at)}</span>
                <Tag tone={meta.tone}>{meta.label}</Tag>
                <span className="ledger-text">{e.text}</span>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
