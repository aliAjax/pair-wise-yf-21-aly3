// 版本账核心数据模型：地毯档案 / 工艺模板（多版本） / 修复工单（工序快照）

export type StepStatus = "pending" | "in_progress" | "done" | "voided";

/** 模板升级涉及的变更面：色卡、结密度属于“硬变更”，其余归为工艺调整 */
export type ChangeKind = "color" | "knot" | "other";

export type PinSource = "start" | "backfill";

export interface Artisan {
  id: string;
  name: string;
  badge: string; // 工号
}

export interface ThreadColor {
  id: string;
  name: string;
  hex: string;
}

export interface TemplateVersion {
  id: string; // `${templateId}@v${no}`
  no: number;
  effectiveAt: string; // 生效时间
  publishedBy: string; // 发布人
  summary: string; // 版本说明
  kinds: ChangeKind[]; // 相对上一版的变更面，首版为空
  knotDensity: number; // 结密度
  dyeType: string; // 染色类型
  colorCard: ThreadColor[]; // 色卡
  guides: Record<string, string>; // 每道工序的工艺要求
}

export interface CraftTemplate {
  id: string;
  name: string;
  origin: string; // 产地
  material: string; // 材质
  knotRange: [number, number]; // 适用结密度区间
  versions: TemplateVersion[]; // 按版本号升序
}

export interface CarpetArchive {
  id: string;
  origin: string;
  era: string;
  material: string;
  knotDensity: number;
  dyeType: string;
  damage: string; // 破损区域
  inboundAt: string; // 入库时间
  historical: boolean; // 早先档案：入库早于账本建立，需要回填版本
  backfill?: {
    versionId: string;
    at: string;
    status: "pending" | "confirmed";
    confirmedAt?: string;
    confirmedBy?: string;
  };
  jobId?: string;
}

/** 工序在某一版模板下的参数快照，落定后不再随模板升级变化 */
export interface StepParams {
  knotDensity: number;
  dyeType: string;
  colorCard: ThreadColor[];
  guide: string;
}

export interface JobStep {
  instanceId: string; // `${specKey}#r${gen}`，原件 gen=0
  gen: number; // 重算代数
  specKey: string;
  name: string;
  order: number;
  status: StepStatus;
  basedOnVersionId: string; // 本道工序实际按哪一版算的
  params: StepParams;
  recalculated?: boolean; // 作废重算出来的替代工序
  startedAt?: string;
  completedAt?: string;
  operator?: string;
  voidReason?: string;
  replacedBy?: string;
}

export interface RepairJob {
  id: string;
  carpetId: string;
  pinnedVersionId: string; // 开工时钉死的模板版本
  pinSource: PinSource; // start=开工即锁定；backfill=历史回填确认后沿用
  startedAt: string;
  lockedBy: Artisan; // 抢到开工锁的师傅
  finishedAt?: string;
  steps: JobStep[];
}

/** 开工申请受理回执：成功的加锁，失败的写明锁在谁手里 */
export interface StartClaim {
  id: string;
  at: string;
  carpetId: string;
  artisan: Artisan;
  seq: 1 | 2; // 同一批并发申请的受理顺序
  ok: boolean;
  holder?: Artisan;
  pinnedVersionId?: string;
  message: string;
}

export type EventKind =
  | "start"
  | "reject"
  | "upgrade"
  | "migrate"
  | "step"
  | "backfill"
  | "confirm"
  | "finish";

export interface LedgerEvent {
  id: string;
  at: string;
  kind: EventKind;
  text: string;
}

export interface State {
  seq: number;
  artisans: Artisan[];
  templates: CraftTemplate[];
  archives: CarpetArchive[];
  jobs: RepairJob[];
  claims: StartClaim[];
  events: LedgerEvent[];
}

export interface VersionDraft {
  summary: string;
  knotDensity: number;
  dyeType: string;
  colorCard: ThreadColor[];
  guideNote: string; // 对工艺要求的补充说明，空表示不调整
}
