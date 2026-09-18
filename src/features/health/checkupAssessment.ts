// 작성자: 김진우 — 기관 원문을 보존하고 성인 수치의 참고 범위만 별도로 계산한다.
import { CheckupDetail } from '../dataConnection/types';
import { UserProfile } from '../../shared/types/api';
import { isValidBirthDate } from '../../shared/utils/birthDate';

type Result = CheckupDetail['results'][number];
type Status = '정상' | '경계' | '이상';
const aliases: Record<string, string> = {
  SBP: 'SYSTOLIC_BP',
  DBP: 'DIASTOLIC_BP',
  HDL: 'HDL_CHOLESTEROL',
  LDL: 'LDL_CHOLESTEROL',
};
export function checkupCode(code: string | null) {
  return code ? aliases[code] ?? code : null;
}

function adultAt(birth: string | undefined, measured: string | null) {
  if (
    !birth ||
    !measured ||
    !isValidBirthDate(birth) ||
    !isValidBirthDate(measured)
  )
    return false;
  const age =
    Number(measured.slice(0, 4)) -
    Number(birth.slice(0, 4)) -
    (measured.slice(5) < birth.slice(5) ? 1 : 0);
  return age >= 20;
}

export function assessCheckup(
  detail: CheckupDetail | undefined,
  profile?: Pick<UserProfile, 'birthDate' | 'sex'>,
): CheckupDetail | undefined {
  if (!detail) return undefined;
  return {
    ...detail,
    results: detail.results.map(result =>
      assessResult(
        result,
        adultAt(profile?.birthDate, detail.measuredAt),
        profile?.sex,
      ),
    ),
  };
}

function assessResult(
  result: Result,
  adult: boolean,
  sex: UserProfile['sex'],
): Result {
  if (result.status?.trim())
    return { ...result, assessmentSource: 'institution' };
  const missing = (reason: string): Result => ({
    ...result,
    status: '확인 필요',
    assessmentSource: 'unavailable',
    referenceDescription: reason,
  });
  const code = checkupCode(result.itemCode);
  if (code === 'HEIGHT' || code === 'WEIGHT')
    return {
      ...result,
      status: '측정값',
      assessmentSource: 'unavailable',
      referenceDescription: '키·체중 단독으로 정상·이상을 판정하지 않아요.',
    };
  if (!adult)
    return missing(
      '검진 당시 만 20세 이상인지 확인할 수 없어 성인 참고 기준을 적용하지 않았어요.',
    );
  const text = result.value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(text))
    return missing('정확한 숫자와 단위를 확인해 주세요.');
  const value = Number(text);
  if (
    !Number.isFinite(value) ||
    value <= 0 ||
    (result.numericValue != null && result.numericValue !== value)
  )
    return missing('수치가 누락되었거나 원문과 숫자가 일치하지 않아요.');
  const unit = (result.unit ?? '')
    .replace(/\s/g, '')
    .replace(/²/g, '2')
    .toLowerCase();
  const done = (status: Status, referenceDescription: string): Result => ({
    ...result,
    status,
    assessmentSource: 'reference',
    referenceDescription,
  });
  const band = (normal: number, high: number): Status =>
    value < normal ? '정상' : value < high ? '경계' : '이상';
  if (unit === 'mg/dl') {
    if (code === 'FASTING_GLUCOSE')
      return done(
        value < 70 ? '이상' : band(100, 126),
        '공복혈당: 70–100 미만 정상, 100–126 미만 경계, 그 밖은 이상 참고 범위',
      );
    if (code === 'TOTAL_CHOLESTEROL')
      return done(
        band(200, 240),
        '총콜레스테롤: 200 미만 정상, 200–240 미만 경계, 240 이상 이상 참고 범위',
      );
    if (code === 'LDL_CHOLESTEROL')
      return done(
        band(130, 160),
        'LDL: 130 미만 정상·근접 범위, 130–160 미만 경계, 160 이상 이상 참고 범위. 개인별 목표는 달라요.',
      );
    if (code === 'TRIGLYCERIDES')
      return done(
        band(150, 200),
        '공복 중성지방: 150 미만 정상, 150–200 미만 경계, 200 이상 이상 참고 범위',
      );
    if (code === 'HDL_CHOLESTEROL' && sex)
      return done(
        value < (sex === 'Male' ? 40 : 50) ? '이상' : '정상',
        'HDL: 남성 40 이상, 여성 50 이상 정상 참고 범위',
      );
  }
  if (unit === '%' && code === 'HBA1C')
    return done(
      band(5.7, 6.5),
      '당화혈색소: 5.7 미만 정상, 5.7–6.5 미만 경계, 6.5 이상 이상 참고 범위',
    );
  if (unit === 'mmhg') {
    if (code === 'SYSTOLIC_BP')
      return done(
        value <= 90 ? '이상' : band(120, 140),
        '수축기: 90 초과–120 미만 정상, 120–140 미만 경계, 그 밖은 이상 참고 범위',
      );
    if (code === 'DIASTOLIC_BP')
      return done(
        value <= 60 ? '이상' : band(80, 90),
        '이완기: 60 초과–80 미만 정상, 80–90 미만 경계, 그 밖은 이상 참고 범위',
      );
  }
  if (unit === 'kg/m2' && code === 'BMI')
    return done(
      value < 18.5 ? '이상' : band(23, 25),
      'BMI: 18.5–23 미만 정상, 23–25 미만 경계, 그 밖은 이상 참고 범위',
    );
  if (unit === 'g/dl' && code === 'HEMOGLOBIN' && sex) {
    const [low, high] = sex === 'Male' ? [13.8, 17.2] : [12.1, 15.1];
    return done(
      value < low! || value > high! ? '이상' : '정상',
      `혈색소: ${low}–${high} g/dL 정상 참고 범위. 검사실마다 달라질 수 있어요.`,
    );
  }
  return missing(
    '이 항목·단위에 적용할 참고 기준이 없어요. 결과지의 기관 판정을 확인해 주세요.',
  );
}
