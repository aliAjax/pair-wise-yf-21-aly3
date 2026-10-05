import type {
  Artisan,
  CarpetArchive,
  ChangeKind,
  CraftTemplate,
  JobStep,
  LedgerEvent,
  RepairJob,
  StartClaim,
  State,
  StepParams,
  TemplateVersion,
  ThreadColor,
  VersionDraft,
} from "./types";

/* ------------------------------- 工序目录 ------------------------------- */

export const STEP_SPECS: { key: string; name: string; defaultGuide: string }[] = [
  { key: "survey", name: "勘察登记", defaultGuide: "测量尺寸、结密度与染色类型，拍照建档" },
  { key: "match", name: "配色对线", defaultGuide: "按色卡编号选配补线，留样并登记批号" },
  { key: "warp", name: "经线加固", defaultGuide: "按结密度调整经线张力，加固破损边缘" },
  { key: "weave", name: "补织结扣", defaultGuide: "按原纹样结法补结，结距与原毯一致" },
  { key: "trim", name: "剪平修整", defaultGuide: "剪齐补绒高度，与原毯绒面平齐" },
  { key: "record", name: "验收留档", defaultGuide: "修复前后照片归档，复核色卡与结密度" },
];

/* -------------------------------- 基础数据 -------------------------------- */

const ARTISANS: Artisan[] = [
  { id: "a1", name: "陈师傅", badge: "W-07" },
  { id: "a2", name: "赵师傅", badge: "W-12" },
];

const c = (id: string, name: string, hex: string): ThreadColor => ({ id, name, hex });

function version(
  templateId: string,
  no: number,
  effectiveAt: string,
  publishedBy: string,
  summary: string,
  kinds: ChangeKind[],
  knotDensity: number,
  dyeType: string,
  colorCard: ThreadColor[],
  guideNote = ""
): TemplateVersion {
  return {
    id: `${templateId}@v${no}`,
    no,
    effectiveAt,
    publishedBy,
    summary,
    kinds,
    knotDensity,
    dyeType,
    colorCard,
    guides: Object.fromEntries(
      STEP_SPECS.map((s) => [
        s.key,
        guideNote && s.key !== "survey" && s.key !== "record"
          ? `${s.defaultGuide}；${guideNote}`
          : s.defaultGuide,
      ])
    ),
  };
}

const T_PERSIAN: CraftTemplate = {
  id: "tpl-persian-wool",
  name: "波斯羊毛常规做法",
  origin: "波斯",
  material: "羊毛",
  knotRange: [30, 60],
  versions: [
    version(
      "tpl-persian-wool",
      1,
      "2026-01-15T09:00",
      "工艺组",
      "首版：波斯羊毛毯标准做法",
      [],
      40,
      "植物染",
      [
        c("p-r1", "茜草红", "#b4432a"),
        c("p-i1", "靛蓝", "#1f3a68"),
        c("p-o1", "石榴皮黄", "#c99a2e"),
      ]
    ),
    version(
      "tpl-persian-wool",
      2,
      "2026-04-01T09:00",
      "工艺组",
      "提高结密度标准，靛蓝改用植物靛新批号",
      ["color", "knot"],
      42,
      "植物染",
      [
        c("p-r1", "茜草红", "#b4432a"),
        c("p-i2", "靛蓝·新批号", "#27467d"),
        c("p-o1", "石榴皮黄", "#c99a2e"),
      ]
    ),
    // v3（做旧色卡）不在此预置：由 createInitialState 通过 publishVersion 过账，
    // 与真实升级走同一套“作废重算”传播规则。
  ],
};

const T_ANATOLIA: CraftTemplate = {
  id: "tpl-anatolia-wool",
  name: "安纳托利亚羊毛做法",
  origin: "安纳托利亚",
  material: "羊毛",
  knotRange: [28, 55],
  versions: [
    version(
      "tpl-anatolia-wool",
      1,
      "2026-02-10T09:00",
      "工艺组",
      "首版：安纳托利亚羊毛毯做法",
      [],
      36,
      "植物染",
      [
        c("a-r1", "土耳其红", "#a83b2c"),
        c("a-b1", "板岩蓝", "#33414e"),
        c("a-y1", "赭黄", "#b7862f"),
      ]
    ),
  ],
};

const T_CAUCASUS: CraftTemplate = {
  id: "tpl-caucasus-wool",
  name: "高加索羊毛做法",
  origin: "高加索",
  material: "羊毛",
  knotRange: [40, 80],
  versions: [
    version(
      "tpl-caucasus-wool",
      1,
      "2026-03-01T09:00",
      "工艺组",
      "首版：高加索高结密度做法",
      [],
      55,
      "天然染",
      [
        c("k-r1", "朱砂红", "#c13d2a"),
        c("k-b1", "深蓝", "#20305c"),
        c("k-w1", "本白", "#efe8d8"),
      ]
    ),
  ],
};

const T_TIBET: CraftTemplate = {
  id: "tpl-tibetan-wool",
  name: "藏毯羊毛做法",
  origin: "藏毯",
  material: "羊毛",
  knotRange: [24, 48],
  versions: [
    version(
      "tpl-tibetan-wool",
      1,
      "2026-02-20T09:00",
      "工艺组",
      "首版：藏毯穿杆结做法",
      [],
      30,
      "天然染",
      [
        c("t-i1", "靛蓝", "#1d3b70"),
        c("t-y1", "姜黄", "#cf9b3a"),
        c("t-r1", "藏红", "#9c3026"),
      ]
    ),
  ],
};

/* ------------------------------ 种子档案/工单 ------------------------------ */

function archive(
  id: string,
  origin: string,
  era: string,
  material: string,
  knotDensity: number,
  dyeType: string,
  damage: string,
  inboundAt: string,
  historical: boolean
): CarpetArchive {
  return { id, origin, era, material, knotDensity, dyeType, damage, inboundAt, historical };
}

function stepParams(v: TemplateVersion, key: string): StepParams {
  return {
    knotDensity: v.knotDensity,
    dyeType: v.dyeType,
    colorCard: v.colorCard.map((x) => ({ ...x })),
    guide: v.guides[key] ?? "",
  };
}

/** 按模板版本展开一套完整工序（每道工序带着当时版本号，即为版本账的“快照”） */
export function buildSteps(v: TemplateVersion, gen = 0): JobStep[] {
  return STEP_SPECS.map((spec, i) => ({
    instanceId: `${spec.key}#r${gen}`,
    gen,
    specKey: spec.key,
    name: spec.name,
    order: i,
    status: "pending" as const,
    basedOnVersionId: v.id,
    params: stepParams(v, spec.key),
  }));
}

/** 初始账本：种子事件按时间顺序逐条“过账”，保证演示数据与真实操作走同一套规则 */
export function createInitialState(): State {
  const templates = [T_PERSIAN, T_ANATOLIA, T_CAUCASUS, T_TIBET];
  const [chen, zhao] = ARTISANS;

  const archives: CarpetArchive[] = [
    archive("CAR-092", "波斯", "1960s", "羊毛", 42, "植物染", "边缘磨损待补线", "2026-05-03T10:00", false),
    archive("CAR-117", "安纳托利亚", "约1970s", "羊毛", 36, "植物染", "中心纹样缺口", "2026-01-08T11:00", true),
    archive("CAR-138", "藏毯", "1980s", "羊毛", 30, "天然染", "局部褪色，需匹配靛蓝色卡", "2026-02-25T09:30", true),
    archive("CAR-141", "波斯", "1950s", "羊毛", 40, "植物染", "边角结扣松散", "2025-12-20T14:00", true),
  ];

  let s: State = {
    seq: 0,
    artisans: ARTISANS,
    templates,
    archives,
    jobs: [],
    claims: [],
    events: [],
  };

  // 1) 历史档案按入库时间回填最接近的一版，全部挂待确认
  s = backfillHistorical(s, "2026-05-06T08:30");
  // CAR-117、CAR-138 事后由陈师傅确认回填版本无误
  s = confirmBackfill(s, "CAR-117", chen, "2026-05-06T09:05");
  s = confirmBackfill(s, "CAR-138", chen, "2026-05-06T09:10");

  // 2) CAR-092 开工：两位师傅同一块毯同时提交，陈师傅先到锁定
  s = recordStart(s, "CAR-092", chen, "2026-05-08T08:29:55", 1);
  s = recordStart(s, "CAR-092", zhao, "2026-05-08T08:29:57", 2);

  // 3) 按 v2 推进三道工序（前两道已完工，经线加固进行中）——交接的两位师傅都能看到各自用的版本
  s = advanceStep(s, "CAR-092", chen, "2026-05-08T09:00"); // 勘察登记 开始
  s = advanceStep(s, "CAR-092", chen, "2026-05-09T16:00"); // 勘察登记 完工
  s = advanceStep(s, "CAR-092", zhao, "2026-05-10T09:00"); // 配色对线 开始
  s = advanceStep(s, "CAR-092", zhao, "2026-05-11T15:30"); // 配色对线 完工
  s = advanceStep(s, "CAR-092", zhao, "2026-05-12T09:00"); // 经线加固 开始

  // 4) 9月模板升到 v3（色卡变更）：进行中的经线加固连同未开始工序全部作废，按 v3 重算；已完工两道保留 v2 参数
  const v3Draft: VersionDraft = {
    summary: "增配旧毯褪色区专用的做旧茜草红",
    knotDensity: 42,
    dyeType: "植物染",
    colorCard: [
      c("p-r1", "茜草红", "#b4432a"),
      c("p-r2", "做旧茜草红", "#9d4530"),
      c("p-i2", "靛蓝·新批号", "#27467d"),
      c("p-o1", "石榴皮黄", "#c99a2e"),
    ],
    guideNote: "褪色区优先比对做旧色卡",
  };
  s = publishVersion(s, "tpl-persian-wool", v3Draft, "2026-09-12T09:00", "工艺组");

  return s;
}

/* -------------------------------- 纯函数工具 -------------------------------- */

export function nextId(s: State, prefix: string): string {
  s.seq += 1;
  return `${prefix}-${s.seq}`;
}

function pushEvent(s: State, kind: LedgerEvent["kind"], text: string, at: string): State {
  const seq = s.seq + 1;
  return { ...s, seq, events: [...s.events, { id: `evt-${seq}`, kind, text, at }] };
}

export function templateById(s: State, id: string): CraftTemplate | undefined {
  return s.templates.find((t) => t.id === id);
}

export function versionById(s: State, versionId: string): { template: CraftTemplate; version: TemplateVersion } | undefined {
  for (const t of s.templates) {
    const v = t.versions.find((x) => x.id === versionId);
    if (v) return { template: t, version: v };
  }
  return undefined;
}

export function latestVersion(t: CraftTemplate, at?: string): TemplateVersion {
  if (!at) return t.versions[t.versions.length - 1];
  const effective = t.versions.filter((v) => v.effectiveAt <= at);
  return effective.length ? effective[effective.length - 1] : t.versions[0];
}

/** 按产地 + 材质 + 结密度区间为档案挑模板，取区间最贴合者 */
export function matchTemplate(s: State, a: CarpetArchive): CraftTemplate | undefined {
  const candidates = s.templates.filter(
    (t) => t.origin === a.origin && t.material === a.material && a.knotDensity >= t.knotRange[0] && a.knotDensity <= t.knotRange[1]
  );
  if (!candidates.length) return undefined;
  candidates.sort(
    (x, y) =>
      Math.abs(x.knotRange[0] + x.knotRange[1] - 2 * a.knotDensity) -
      Math.abs(y.knotRange[0] + y.knotRange[1] - 2 * a.knotDensity)
  );
  return candidates[0];
}

/** 历史回填规则：入库当时已生效的最新一版；入库早于全部版本则取最早一版 */
export function backfillCandidate(t: CraftTemplate, inboundAt: string): TemplateVersion {
  const effective = t.versions.filter((v) => v.effectiveAt <= inboundAt);
  return effective.length ? effective[effective.length - 1] : t.versions[0];
}

/* --------------------------------- 动作：回填 --------------------------------- */

function backfillHistorical(prev: State, at: string): State {
  let s = prev;
  for (const a of s.archives.filter((x) => x.historical && !x.backfill)) {
    const t = matchTemplate(s, a);
    if (!t) continue;
    const v = backfillCandidate(t, a.inboundAt);
    s = {
      ...s,
      archives: s.archives.map((x) =>
        x.id === a.id ? { ...x, backfill: { versionId: v.id, at, status: "pending" } } : x
      ),
    };
    s = pushEvent(
      s,
      "backfill",
      `历史档案 ${a.id}（${a.inboundAt.slice(0, 10)} 入库）回填最接近版本 ${v.id}，挂待确认`,
      at
    );
  }
  return s;
}

export function confirmBackfill(prev: State, carpetId: string, by: Artisan, at: string): State {
  const a = prev.archives.find((x) => x.id === carpetId);
  if (!a?.backfill || a.backfill.status !== "pending") return prev;
  let s = {
    ...prev,
    archives: prev.archives.map((x) =>
      x.id === carpetId
        ? { ...x, backfill: { ...x.backfill!, status: "confirmed" as const, confirmedAt: at, confirmedBy: by.name } }
        : x
    ),
  };
  return pushEvent(s, "confirm", `${by.name} 确认 ${carpetId} 回填版本 ${a.backfill.versionId}`, at);
}

/* -------------------------------- 动作：并发开工 -------------------------------- */

export function recordStart(
  prev: State,
  carpetId: string,
  artisan: Artisan,
  at: string,
  seq: 1 | 2
): State {
  const a = prev.archives.find((x) => x.id === carpetId);
  if (!a) return prev;

  const existing = prev.jobs.find((j) => j.carpetId === carpetId && !j.finishedAt);
  if (existing) {
    // 后到的申请：锁已经在别人手里，只给回执，不产生工单
    let s: State = {
      ...prev,
      seq: prev.seq + 1,
      claims: [
        ...prev.claims,
        {
          id: `claim-${prev.seq + 1}`,
          at,
          carpetId,
          artisan,
          seq,
          ok: false,
          holder: existing.lockedBy,
          pinnedVersionId: existing.pinnedVersionId,
          message: `开工锁已被 ${existing.lockedBy.name}（${existing.lockedBy.badge}）于 ${existing.startedAt} 持有，钉版 ${existing.pinnedVersionId}`,
        },
      ],
    };
    return pushEvent(
      s,
      "reject",
      `${artisan.name} 开工 ${carpetId} 被拒：锁在 ${existing.lockedBy.name} 手里，已按 ${existing.pinnedVersionId} 开工`,
      at
    );
  }

  // 待确认回填的档案不能直接开工
  if (a.historical && (!a.backfill || a.backfill.status !== "confirmed")) {
    let s: State = {
      ...prev,
      seq: prev.seq + 1,
      claims: [
        ...prev.claims,
        {
          id: `claim-${prev.seq + 1}`,
          at,
          carpetId,
          artisan,
          seq,
          ok: false,
          message: a.backfill ? "回填版本仍待确认，确认后方可开工" : "暂无匹配模板，无法开工",
        },
      ],
    };
    return pushEvent(s, "reject", `${artisan.name} 开工 ${carpetId} 被拒：回填版本待确认`, at);
  }

  const t = matchTemplate(prev, a);
  if (!t) {
    let s: State = {
      ...prev,
      seq: prev.seq + 1,
      claims: [
        ...prev.claims,
        {
          id: `claim-${prev.seq + 1}`,
          at,
          carpetId,
          artisan,
          seq,
          ok: false,
          message: "暂无匹配模板，无法开工",
        },
      ],
    };
    return pushEvent(s, "reject", `${artisan.name} 开工 ${carpetId} 被拒：无匹配模板`, at);
  }

  // 开工即钉版：历史档案沿用确认过的回填版本，新档案取当时已生效的最新版
  const pinSource = a.backfill ? "backfill" : "start";
  const v = a.backfill
    ? versionById(prev, a.backfill.versionId)?.version ?? latestVersion(t, at)
    : latestVersion(t, at);

  const jobId = `JOB-${carpetId}`;
  const job: RepairJob = {
    id: jobId,
    carpetId,
    pinnedVersionId: v.id,
    pinSource,
    startedAt: at,
    lockedBy: artisan,
    steps: buildSteps(v),
  };

  let s: State = {
    ...prev,
    seq: prev.seq + 1,
    jobs: [...prev.jobs, job],
    archives: prev.archives.map((x) => (x.id === carpetId ? { ...x, jobId } : x)),
    claims: [
      ...prev.claims,
      {
        id: `claim-${prev.seq + 1}`,
        at,
        carpetId,
        artisan,
        seq,
        ok: true,
        holder: artisan,
        pinnedVersionId: v.id,
        message: `开工锁定成功，钉版 ${v.id}（${pinSource === "backfill" ? "沿用已确认回填版本" : "开工当时最新版"}）`,
      },
    ],
  };
  return pushEvent(
    s,
    "start",
    `${artisan.name} 开工 ${carpetId}，锁定模板版本 ${v.id}，${STEP_SPECS.length} 道工序按该版参数展开`,
    at
  );
}

/* -------------------------------- 动作：发布新版 -------------------------------- */

function diffKinds(draft: VersionDraft, prevV: TemplateVersion): ChangeKind[] {
  const kinds: ChangeKind[] = [];
  const colorChanged =
    draft.colorCard.length !== prevV.colorCard.length ||
    draft.colorCard.some(
      (nc, i) =>
        !prevV.colorCard[i] ||
        prevV.colorCard[i].id !== nc.id ||
        prevV.colorCard[i].name !== nc.name ||
        prevV.colorCard[i].hex.toUpperCase() !== nc.hex.toUpperCase()
    );
  if (colorChanged) kinds.push("color");
  if (draft.knotDensity !== prevV.knotDensity) kinds.push("knot");
  const otherChanged =
    draft.dyeType !== prevV.dyeType ||
    (draft.guideNote.trim() !== "" && !Object.values(prevV.guides).some((g) => g.includes(draft.guideNote.trim())));
  if (otherChanged) kinds.push("other");
  return kinds;
}

export function publishVersion(
  prev: State,
  templateId: string,
  draft: VersionDraft,
  at: string,
  by: string
): State {
  const t = templateById(prev, templateId);
  if (!t) return prev;
  const prevV = t.versions[t.versions.length - 1];
  const kinds = diffKinds(draft, prevV);
  const hard = kinds.includes("color") || kinds.includes("knot");
  const no = prevV.no + 1;
  const id = `${templateId}@v${no}`;

  const nv: TemplateVersion = {
    id,
    no,
    effectiveAt: at,
    publishedBy: by,
    summary: draft.summary.trim() || `v${no} 工艺调整`,
    kinds,
    knotDensity: draft.knotDensity,
    dyeType: draft.dyeType,
    colorCard: draft.colorCard.map((x) => ({ ...x })),
    guides: Object.fromEntries(
      STEP_SPECS.map((spec) => {
        const base = prevV.guides[spec.key] ?? spec.defaultGuide;
        const extra = draft.guideNote.trim();
        return [spec.key, extra && !base.includes(extra) ? `${base}；${extra}` : base];
      })
    ),
  };

  let s: State = {
    ...prev,
    templates: prev.templates.map((x) =>
      x.id === templateId ? { ...x, versions: [...x.versions, nv] } : x
    ),
  };
  s = pushEvent(
    s,
    "upgrade",
    `模板「${t.name}」升级 ${id}：${nv.summary}${hard ? "（含色卡/结密度，未完成工序作废重算）" : "（仅未开始工序跟随新版）"}`,
    at
  );

  // 传播到所有正在修、且使用该模板的工单（以钉版所属模板判断）
  const affected = s.jobs.filter(
    (j) => !j.finishedAt && (versionById(s, j.pinnedVersionId)?.template.id === templateId)
  );
  for (const job of affected) {
    const voided: JobStep[] = [];
    const replacements: JobStep[] = [];

    for (const step of job.steps) {
      if (step.status === "done" || step.status === "voided") continue;
      const gen = step.gen + 1;
      const voidReason = hard
        ? `模板升级 ${id}，${kinds.includes("color") ? "色卡" : ""}${kinds.includes("knot") ? "结密度" : ""}变更，本道${
            step.status === "in_progress" ? "（进行中）" : ""
          }作废，按 ${id} 重算`
        : `模板升级 ${id}，未开始工序参数刷新为新版`;
      const replacementId = hard ? `${step.specKey}#r${gen}` : step.instanceId;
      voided.push({
        ...step,
        status: "voided",
        voidReason,
        replacedBy: replacementId,
      });
      if (hard) {
        replacements.push({
          instanceId: replacementId,
          gen,
          specKey: step.specKey,
          name: step.name,
          order: step.order,
          status: "pending",
          basedOnVersionId: id,
          params: stepParams(nv, step.specKey),
          recalculated: true,
        });
      }
    }

    const retained = job.steps.filter(
      (step) => step.status === "done" || (step.status === "voided" && !voided.some((d) => d.instanceId === step.instanceId))
    );
    const softUpdated = hard
      ? []
      : job.steps
          .filter((step) => step.status === "pending")
          .map((step) => ({ ...step, basedOnVersionId: id, params: stepParams(nv, step.specKey) }));
    const softKept = hard
      ? []
      : job.steps.filter((step) => step.status !== "pending");

    const newSteps = hard
      ? [...retained, ...voided, ...replacements].sort(
          (x, y) => x.order - y.order || x.gen - y.gen
        )
      : [...softKept, ...softUpdated].sort((x, y) => x.order - y.order || x.gen - y.gen);

    s = {
      ...s,
      jobs: s.jobs.map((j) => (j.id === job.id ? { ...j, steps: newSteps } : j)),
    };

    const doneCount = retained.filter((x) => x.status === "done").length;
    if (hard) {
      s = pushEvent(
        s,
        "migrate",
        `工单 ${job.id}：${voided.length} 道未完成工序作废并按 ${id} 重算（含进行中），已完成 ${doneCount} 道保留原参数`,
        at
      );
    } else if (softUpdated.length) {
      s = pushEvent(
        s,
        "migrate",
        `工单 ${job.id}：${softUpdated.length} 道未开始工序改按 ${id}，进行中与已完成工序保留各自当时参数`,
        at
      );
    }
  }

  return s;
}

/* ------------------------------- 动作：推进工序 ------------------------------- */

export function advanceStep(prev: State, carpetId: string, operator: Artisan, at: string): State {
  const job = prev.jobs.find((j) => j.carpetId === carpetId && !j.finishedAt);
  if (!job) return prev;

  const live = job.steps.filter((st) => st.status !== "voided");
  const inProgress = live.find((st) => st.status === "in_progress");
  const next = live.find((st) => st.status === "pending");
  // 交接规则：先把进行中的那道做完（封存），才能开下一道；无人在做时才启动第一道未开始工序
  const target = inProgress ?? next;
  if (!target) return prev;

  let s: State;
  let text: string;
  let kind: LedgerEvent["kind"] = "step";

  if (target.status === "pending") {
    s = {
      ...prev,
      jobs: prev.jobs.map((j) =>
        j.id === job.id
          ? {
              ...j,
              steps: j.steps.map((st) =>
                st.instanceId === target.instanceId
                  ? { ...st, status: "in_progress", startedAt: at, operator: operator.name }
                  : st
              ),
            }
          : j
      ),
    };
    text = `工单 ${job.id}：${operator.name} 开始「${target.name}」，按 ${target.basedOnVersionId} 参数执行`;
  } else {
    const updatedJob: RepairJob = {
      ...job,
      steps: job.steps.map((st) =>
        st.instanceId === target.instanceId
          ? { ...st, status: "done" as const, completedAt: at }
          : st
      ),
    };
    const allDone = updatedJob.steps
      .filter((st) => st.status !== "voided")
      .every((st) => st.status === "done");
    if (allDone) updatedJob.finishedAt = at;

    s = {
      ...prev,
      jobs: prev.jobs.map((j) => (j.id === job.id ? updatedJob : j)),
    };
    text = `工单 ${job.id}：「${target.name}」完工，参数封存于 ${target.basedOnVersionId}`;
    if (allDone) {
      kind = "finish";
      text += `；工单全部工序完成，开工锁释放`;
    }
  }
  return pushEvent(s, kind, text, at);
}

/* --------------------------------- 选择器 --------------------------------- */

export const jobOfCarpet = (s: State, carpetId: string): RepairJob | undefined =>
  s.jobs.find((j) => j.carpetId === carpetId);

export const claimsOfCarpet = (s: State, carpetId: string): StartClaim[] =>
  s.claims
    .filter((cl) => cl.carpetId === carpetId)
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.seq - b.seq));

export function sortedEvents(s: State): LedgerEvent[] {
  return [...s.events].sort((a, b) =>
    a.at < b.at ? -1 : a.at > b.at ? 1 : Number(a.id.split("-")[1]) - Number(b.id.split("-")[1])
  );
}

/** 工单当前实际参考的版本：未作废工序中版本号最大的一版（钉版则永远显示在头部） */
export function activeVersion(s: State, job: RepairJob): TemplateVersion | undefined {
  const ids = job.steps.filter((st) => st.status !== "voided").map((st) => st.basedOnVersionId);
  let best: TemplateVersion | undefined;
  for (const id of ids) {
    const hit = versionById(s, id);
    if (hit && (!best || hit.version.no > best.no)) best = hit.version;
  }
  return best;
}

export function fmt(at: string): string {
  return at.replace("T", " ").length > 16 ? at.replace("T", " ").slice(0, 16) : at.replace("T", " ");
}

export function fmtDate(at: string): string {
  return at.slice(0, 10);
}

export const KIND_LABEL: Record<ChangeKind, string> = {
  color: "色卡",
  knot: "结密度",
  other: "染色/工艺",
};
