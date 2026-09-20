// 작성자: 김진우 — 서버 응답에 검사 종류가 없어 itemCode 로 묶는다.
// 검체(혈액·소변)가 아니라 무엇을 보는 검사인지로 나눈 분류이며 의학적 판정이 아니다.
// 모르는 코드는 임의로 짐작하지 않고 '기타 검사'에 둔다.
export type CheckupCategoryKey =
  | 'body'
  | 'pressure'
  | 'glucose'
  | 'lipid'
  | 'liver'
  | 'kidney'
  | 'blood'
  | 'etc';

export type CheckupPalette = { background: string; ink: string; tint: string };

export type CheckupCategory = {
  key: CheckupCategoryKey;
  name: string;
  description: string;
  palette: CheckupPalette;
};

// 화면에 나오는 순서다.
export const checkupCategories: CheckupCategory[] = [
  {
    key: 'body',
    name: '신체계측 및 비만도',
    description: '기본적인 체격과 복부 비만도를 평가하는 항목이에요.',
    palette: { background: '#EAF8F2', ink: '#247C68', tint: '#CEF0E1' },
  },
  {
    key: 'pressure',
    name: '혈압',
    description: '심장이 수축하고 이완할 때 혈관이 받는 압력이에요.',
    palette: { background: '#FFF0F3', ink: '#A8475F', tint: '#FBD9E1' },
  },
  {
    key: 'glucose',
    name: '당뇨 검사',
    description: '혈액 속 포도당 농도와 장기적인 혈당 조절 능력을 평가해요.',
    palette: { background: '#FFF8E6', ink: '#8A6A1F', tint: '#FAEBC4' },
  },
  {
    key: 'lipid',
    name: '지질 검사',
    description: '혈액 속 지방 성분으로 동맥경화·고지혈증 위험을 평가해요.',
    palette: { background: '#FFF2E8', ink: '#A7602F', tint: '#FFE2CB' },
  },
  {
    key: 'liver',
    name: '간 기능 검사',
    description: '간세포 손상과 단백질 합성·담즙 배설 능력을 평가해요.',
    palette: { background: '#F3EDFF', ink: '#7855A8', tint: '#E5D8FA' },
  },
  {
    key: 'kidney',
    name: '신장(콩팥) 및 요검사',
    description: '신장의 여과 기능과 소변을 통한 노폐물 배출 상태를 평가해요.',
    palette: { background: '#ECF3FF', ink: '#466FA9', tint: '#D6E6FE' },
  },
  {
    key: 'blood',
    name: '혈액 일반 검사',
    description: '혈구 세포의 수와 상태로 빈혈·면역·지혈 기능을 평가해요.',
    palette: { background: '#E9F6FA', ink: '#2D7488', tint: '#CDEAF2' },
  },
  {
    key: 'etc',
    name: '기타 검사',
    description: '위 분류에 들어가지 않는 검사예요.',
    palette: { background: '#F3F5F4', ink: '#5F6E6A', tint: '#E1E7E5' },
  },
];

// 신장·체중·허리둘레·BMI 와 같은 자리에서 재는 체성분 항목을 함께 둔다.
const body = new Set([
  'HEIGHT',
  'WEIGHT',
  'WAIST_CIRCUMFERENCE',
  'BMI',
  'BODY_FAT_PERCENTAGE',
  'BODY_FAT_MASS',
  'MUSCLE_MASS',
  'METABOLIC_AGE',
]);

const pressure = new Set(['SYSTOLIC_BP', 'DIASTOLIC_BP']);

const glucose = new Set([
  'FASTING_GLUCOSE',
  'FASTING_BLOOD_GLUCOSE',
  'HBA1C',
]);

const lipid = new Set([
  'TOTAL_CHOLESTEROL',
  'HDL_CHOLESTEROL',
  'LDL_CHOLESTEROL',
  'TRIGLYCERIDES',
  'LIPID_PANEL',
]);

// AST·ALT·γ-GTP·알부민·총빌리루빈에 더해 같은 간 기능 패널로 나오는 항목을 포함한다.
const liver = new Set([
  'AST',
  'ALT',
  'GGT',
  'GAMMA_GTP',
  'ALP',
  'ALBUMIN',
  'TOTAL_BILIRUBIN',
  'DIRECT_BILIRUBIN',
  'INDIRECT_BILIRUBIN',
  'TOTAL_PROTEIN',
  'GLOBULIN',
  'AG_RATIO',
  'FIB4',
  'LDH',
  'LIVER_FUNCTION_PANEL',
]);

// 혈액으로 보는 신장 기능. 소변 항목은 URINE_ 접두사 규칙으로 함께 묶인다.
const kidney = new Set([
  'SERUM_CREATININE',
  'BUN',
  'BUN_CREATININE_RATIO',
  'EGFR',
  'CYSTATIN_C',
  'URIC_ACID',
]);

const blood = new Set([
  'HEMOGLOBIN',
  'HEMATOCRIT',
  'WBC_COUNT',
  'RBC_COUNT',
  'PLATELET_COUNT',
  'MCV',
  'MCH',
  'MCHC',
  'RDW',
  'PDW',
  'MPV',
  'PCT',
  'NEUTROPHIL_PERCENT',
  'EOSINOPHIL_PERCENT',
  'BASOPHIL_PERCENT',
  'MONOCYTE_PERCENT',
  'LYMPHOCYTE_PERCENT',
  'ESR',
  'CBC_PANEL',
]);

// 작성자: 김진우 — 항목 하나의 분류가 필요할 때(핵심 수치 카드 등) 쓴다.
export function checkupCategoryFor(itemCode: string | null): CheckupCategory {
  const key = checkupCategoryOf(itemCode);
  return (
    checkupCategories.find(category => category.key === key) ??
    checkupCategories[checkupCategories.length - 1]!
  );
}

export function checkupCategoryOf(itemCode: string | null): CheckupCategoryKey {
  const code = (itemCode ?? '').trim().toUpperCase();
  if (!code) return 'etc';
  // 소변 항목은 접두사가 분명해 코드 목록보다 규칙이 안전하다.
  if (code.startsWith('URINE_') || code === 'URINALYSIS_PANEL') return 'kidney';
  if (body.has(code)) return 'body';
  if (pressure.has(code)) return 'pressure';
  if (glucose.has(code)) return 'glucose';
  if (lipid.has(code)) return 'lipid';
  if (liver.has(code)) return 'liver';
  if (kidney.has(code)) return 'kidney';
  if (blood.has(code)) return 'blood';
  return 'etc';
}
