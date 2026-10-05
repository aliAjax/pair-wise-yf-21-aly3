import type { AppState, Carpet, LedgerEvent, Step, TemplateFamily, TemplateVersion } from "./types";
import { closestVersion, formatDate, uid } from "./utils";

function led(
  type: LedgerEvent["type"],
  description: string,
  operator?: string,
  templateVersionId?: string,
): LedgerEvent {
  return { id: uid("led"), time: new Date().toISOString(), type, description, operator, templateVersionId };
}

function step(name: string, params: Record<string, string>): Step {
  return { id: uid("step"), name, params: { ...params }, status: "未开始", templateVersionId: "" };
}

const baseSteps = {
  persian: [
    { name: "清洗", params: { 水温: "30°C", 洗剂: "中性皂液" } },
    { name: "配线", params: { 色卡: "靛蓝/茜红/米黄", 针法: "8字结" } },
    { name: "补线", params: { 针法: "8字结", 密度: "42结/英寸", 线量: "约120米" } },
    { name: "整理", params: { 修剪: "齐绒", 整烫: "低温" } },
  ],
  anatolian: [
    { name: "清洗", params: { 水温: "28°C", 洗剂: "中性皂液" } },
    { name: "配线", params: { 色卡: "胡桃棕/叶绿", 针法: "土耳其结" } },
    { name: "补线", params: { 针法: "土耳其结", 密度: "36结/英寸", 线量: "约100米" } },
    { name: "整理", params: { 修剪: "齐绒", 整烫: "低温" } },
  ],
  tibetan: [
    { name: "清洗", params: { 水温: "30°C", 洗剂: "皂角水" } },
    { name: "配线", params: { 色卡: "藏红/牦牛棕", 针法: "藏结" } },
    { name: "补线", params: { 针法: "藏结", 密度: "30结/英寸", 线量: "约90米" } },
    { name: "整理", params: { 修剪: "齐绒", 整烫: "低温" } },
  ],
};

export function seedFamilies(): TemplateFamily[] {
  return [
    {
      id: "fam-persian-wool-42",
      origin: "波斯",
      material: "羊毛",
      density: 42,
      versions: [
        {
          id: "ver-persian-v1",
          version: "v1",
          effectiveAt: "2024-01-15T00:00:00.000Z",
          note: "基础版",
          colorCard: [
            { name: "靛蓝", code: "#1e3a5f" },
            { name: "茜红", code: "#9b2d3f" },
            { name: "米黄", code: "#d9c8a9" },
          ],
          steps: baseSteps.persian.map((s) => ({ ...s, params: { ...s.params } })),
        },
        {
          id: "ver-persian-v2",
          version: "v2",
          effectiveAt: "2024-06-20T00:00:00.000Z",
          note: "配线工艺细化，补线线量上调",
          colorCard: [
            { name: "靛蓝", code: "#1e3a5f" },
            { name: "茜红", code: "#9b2d3f" },
            { name: "米黄", code: "#d9c8a9" },
          ],
          steps: [
            { name: "清洗", params: { 水温: "30°C", 洗剂: "中性皂液" } },
            { name: "配线", params: { 色卡: "靛蓝/茜红/米黄", 针法: "8字结", 比对: "自然光下比对" } },
            { name: "补线", params: { 针法: "8字结", 密度: "42结/英寸", 线量: "约135米" } },
            { name: "整理", params: { 修剪: "齐绒", 整烫: "低温" } },
          ],
        },
        {
          id: "ver-persian-v3",
          version: "v3",
          effectiveAt: "2025-03-10T00:00:00.000Z",
          note: "环保洗剂，水温下调",
          colorCard: [
            { name: "靛蓝", code: "#1e3a5f" },
            { name: "茜红", code: "#9b2d3f" },
            { name: "米黄", code: "#d9c8a9" },
          ],
          steps: [
            { name: "清洗", params: { 水温: "28°C", 洗剂: "环保中性皂液" } },
            { name: "配线", params: { 色卡: "靛蓝/茜红/米黄", 针法: "8字结", 比对: "自然光下比对" } },
            { name: "补线", params: { 针法: "8字结", 密度: "42结/英寸", 线量: "约135米" } },
            { name: "整理", params: { 修剪: "齐绒", 整烫: "低温" } },
          ],
        },
      ],
    },
    {
      id: "fam-anatolian-plant-36",
      origin: "安纳托利亚",
      material: "植物染",
      density: 36,
      versions: [
        {
          id: "ver-anatolian-v1",
          version: "v1",
          effectiveAt: "2024-03-01T00:00:00.000Z",
          note: "基础版",
          colorCard: [
            { name: "胡桃棕", code: "#6b4a2f" },
            { name: "叶绿", code: "#4a6b3f" },
          ],
          steps: baseSteps.anatolian.map((s) => ({ ...s, params: { ...s.params } })),
        },
        {
          id: "ver-anatolian-v2",
          version: "v2",
          effectiveAt: "2024-11-05T00:00:00.000Z",
          note: "固色工艺升级",
          colorCard: [
            { name: "胡桃棕", code: "#6b4a2f" },
            { name: "叶绿", code: "#4a6b3f" },
          ],
          steps: [
            { name: "清洗", params: { 水温: "28°C", 洗剂: "中性皂液", 固色: "盐水固色" } },
            { name: "配线", params: { 色卡: "胡桃棕/叶绿", 针法: "土耳其结" } },
            { name: "补线", params: { 针法: "土耳其结", 密度: "36结/英寸", 线量: "约100米" } },
            { name: "整理", params: { 修剪: "齐绒", 整烫: "低温" } },
          ],
        },
      ],
    },
    {
      id: "fam-tibetan-wool-30",
      origin: "藏毯",
      material: "羊毛",
      density: 30,
      versions: [
        {
          id: "ver-tibetan-v1",
          version: "v1",
          effectiveAt: "2024-05-12T00:00:00.000Z",
          note: "基础版",
          colorCard: [
            { name: "藏红", code: "#a83232" },
            { name: "牦牛棕", code: "#5a4632" },
          ],
          steps: baseSteps.tibetan.map((s) => ({ ...s, params: { ...s.params } })),
        },
      ],
    },
  ];
}

function makeBackfillEvent(family: TemplateFamily, storageAt: string): { currentVersionId: string; ledger: LedgerEvent[] } {
  const v = closestVersion(family, storageAt);
  return {
    currentVersionId: v.id,
    ledger: [
      led(
        "回填",
        `历史档案入库于 ${formatDate(storageAt)}，按入库时间回填最接近的模板版本 ${v.version}（${formatDate(v.effectiveAt)} 生效），待师傅确认`,
      ),
    ],
  };
}

export function seedCarpets(families: TemplateFamily[]): Carpet[] {
  const persian = families.find((f) => f.origin === "波斯")!;
  const anatolian = families.find((f) => f.origin === "安纳托利亚")!;
  const tibetan = families.find((f) => f.origin === "藏毯")!;

  // 历史档案：按入库时间回填最接近的一版，挂待确认
  const c092Backfill = makeBackfillEvent(persian, "2024-02-10");
  const c117Backfill = makeBackfillEvent(anatolian, "2024-04-15");
  const c138Backfill = makeBackfillEvent(tibetan, "2024-06-20");

  // CAR-145：修复中，张师傅锁定，开工时采用 v2，清洗已完成、配线进行中
  const v2 = persian.versions.find((v) => v.id === "ver-persian-v2")!;
  const c145Steps: Step[] = v2.steps.map((tpl, i) => {
    const s = step(tpl.name, tpl.params);
    s.templateVersionId = v2.id;
    if (i === 0) {
      s.status = "已完成";
      s.startedAt = "2025-01-08T09:00:00.000Z";
      s.completedAt = "2025-01-08T11:30:00.000Z";
    } else if (i === 1) {
      s.status = "进行中";
      s.startedAt = "2025-01-08T11:30:00.000Z";
    }
    return s;
  });
  const c145Ledger: LedgerEvent[] = [
    led("开工", "张师傅 开工，锁定档案并采用 波斯·羊毛·结密度42 模板 v2", "张师傅", v2.id),
    led("工序", "张师傅 完成工序「清洗」", "张师傅", v2.id),
  ];

  // CAR-152：已完工，全部工序按 v2 完成
  const v2a = anatolian.versions.find((v) => v.id === "ver-anatolian-v2")!;
  const c152Steps: Step[] = v2a.steps.map((tpl) => {
    const s = step(tpl.name, tpl.params);
    s.templateVersionId = v2a.id;
    s.status = "已完成";
    s.startedAt = "2025-02-01T09:00:00.000Z";
    s.completedAt = "2025-02-02T17:00:00.000Z";
    return s;
  });
  const c152Ledger: LedgerEvent[] = [
    led("开工", "李师傅 开工，锁定档案并采用 安纳托利亚·植物染·结密度36 模板 v2", "李师傅", v2a.id),
    ...v2a.steps.map((tpl) => led("工序", `李师傅 完成工序「${tpl.name}」`, "李师傅", v2a.id)),
    led("完工", "全部工序完成，档案完工", "李师傅", v2a.id),
  ];

  return [
    {
      id: "CAR-092",
      origin: "波斯",
      era: "1960s",
      material: "羊毛",
      density: 42,
      dyeType: "天然植物染",
      damage: "边缘磨损，需补线",
      storageAt: "2024-02-10",
      status: "待修复",
      steps: [],
      currentVersionId: c092Backfill.currentVersionId,
      pendingConfirm: true,
      lock: null,
      ledger: c092Backfill.ledger,
    },
    {
      id: "CAR-117",
      origin: "安纳托利亚",
      era: "1970s",
      material: "植物染",
      density: 36,
      dyeType: "植物染",
      damage: "中心纹样缺口",
      storageAt: "2024-04-15",
      status: "待修复",
      steps: [],
      currentVersionId: c117Backfill.currentVersionId,
      pendingConfirm: true,
      lock: null,
      ledger: c117Backfill.ledger,
    },
    {
      id: "CAR-138",
      origin: "藏毯",
      era: "1980s",
      material: "羊毛",
      density: 30,
      dyeType: "矿物染",
      damage: "局部褪色",
      storageAt: "2024-06-20",
      status: "待修复",
      steps: [],
      currentVersionId: c138Backfill.currentVersionId,
      pendingConfirm: true,
      lock: null,
      ledger: c138Backfill.ledger,
    },
    {
      id: "CAR-145",
      origin: "波斯",
      era: "1950s",
      material: "羊毛",
      density: 42,
      dyeType: "植物染",
      damage: "边缘磨损",
      storageAt: "2025-01-08",
      status: "修复中",
      steps: c145Steps,
      currentVersionId: v2.id,
      pendingConfirm: false,
      lock: { by: "张师傅", at: "2025-01-08T09:00:00.000Z" },
      ledger: c145Ledger,
    },
    {
      id: "CAR-152",
      origin: "安纳托利亚",
      era: "1960s",
      material: "植物染",
      density: 36,
      dyeType: "植物染",
      damage: "中心缺口",
      storageAt: "2025-02-01",
      status: "已完成",
      steps: c152Steps,
      currentVersionId: v2a.id,
      pendingConfirm: false,
      lock: null,
      ledger: c152Ledger,
    },
  ];
}

export function seedState(): AppState {
  const families = seedFamilies();
  return { families, carpets: seedCarpets(families) };
}
