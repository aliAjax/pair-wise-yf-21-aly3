export type StepStatus = "未开始" | "进行中" | "已完成" | "已作废";

export type CarpetStatus = "待修复" | "修复中" | "已完成";

export type LedgerEventType =
  | "开工"
  | "工序"
  | "完工"
  | "升级"
  | "作废重算"
  | "回填"
  | "确认"
  | "锁定"
  | "解锁";

export interface ColorCardEntry {
  name: string;
  code: string;
}

export interface StepTemplate {
  name: string;
  params: Record<string, string>;
}

export interface TemplateVersion {
  id: string;
  version: string;
  effectiveAt: string;
  note: string;
  colorCard: ColorCardEntry[];
  steps: StepTemplate[];
}

export interface TemplateFamily {
  id: string;
  origin: string;
  material: string;
  density: number;
  versions: TemplateVersion[];
}

export interface Step {
  id: string;
  name: string;
  params: Record<string, string>;
  status: StepStatus;
  templateVersionId: string;
  startedAt?: string;
  completedAt?: string;
  voidedAt?: string;
}

export interface LedgerEvent {
  id: string;
  time: string;
  type: LedgerEventType;
  description: string;
  operator?: string;
  templateVersionId?: string;
}

export interface Carpet {
  id: string;
  origin: string;
  era: string;
  material: string;
  density: number;
  dyeType: string;
  damage: string;
  storageAt: string;
  status: CarpetStatus;
  steps: Step[];
  currentVersionId?: string;
  pendingConfirm: boolean;
  lock: { by: string; at: string } | null;
  ledger: LedgerEvent[];
}

export interface AppState {
  carpets: Carpet[];
  families: TemplateFamily[];
}

export interface StartResult {
  ok: boolean;
  alreadyLocked?: boolean;
  lockedBy?: string;
  lockedAt?: string;
}
