// 작성자: 김진우 — 경계값, 판정 원문, 단위·연령 검증과 비파괴 표시를 확인한다.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { test } = require('node:test');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, filename);
};
const { assessCheckup, checkupCode } = require('../src/features/health/checkupAssessment.ts');
const profile = { birthDate: '1990-01-13', sex: 'Male' };
const item = (itemCode, value, unit = 'mg/dL', extra = {}) => ({ itemCode, itemName: itemCode, value: String(value), unit, status: null, ...extra });
const classify = (result, person = profile, measuredAt = '2026-09-18') => assessCheckup({ measuredAt, results: [result] }, person).results[0];

test('정상·경계·이상 경계값과 저혈당을 구분한다', () => {
  for (const [code, unit, cases] of [
    ['FASTING_GLUCOSE', 'mg/dL', [[69, '이상'], [70, '정상'], [99, '정상'], [100, '경계'], [125.9, '경계'], [126, '이상']]],
    ['TOTAL_CHOLESTEROL', 'mg/dL', [[199, '정상'], [200, '경계'], [239, '경계'], [240, '이상']]],
    ['LDL', 'mg/dL', [[129, '정상'], [130, '경계'], [160, '이상']]],
    ['TRIGLYCERIDES', 'mg/dL', [[149, '정상'], [150, '경계'], [200, '이상']]],
    ['SBP', 'mmHg', [[90, '이상'], [118, '정상'], [120, '경계'], [140, '이상']]],
    ['DBP', 'mmHg', [[60, '이상'], [76, '정상'], [80, '경계'], [90, '이상']]],
    ['BMI', 'kg/m²', [[18.4, '이상'], [18.5, '정상'], [22.5, '정상'], [23, '경계'], [25, '이상']]],
    ['HBA1C', '%', [[5.6, '정상'], [5.7, '경계'], [6.5, '이상']]],
  ]) for (const [value, status] of cases) {
    const result = classify(item(code, value, unit));
    assert.equal(result.status, status, `${code} ${value}`);
    assert.equal(result.assessmentSource, 'reference');
  }
});

test('기관 판정을 보존하고 참고 판정은 서버 원본을 변경하지 않는다', () => {
  const original = item('BMI', 25.9, 'kg/m2', { status: '경계' });
  assert.equal(classify(original).status, '경계');
  assert.equal(classify(original).assessmentSource, 'institution');
  const blank = item('FASTING_GLUCOSE', 92);
  assert.equal(classify(blank).status, '정상');
  assert.equal(blank.status, null);
  assert.equal(checkupCode('SBP'), checkupCode('SYSTOLIC_BP'));
});

test('미성년·날짜 누락·수치 불일치·단위 불명은 정상으로 추측하지 않는다', () => {
  const result = item('FASTING_GLUCOSE', 92);
  for (const birthDate of ['2019-01-13', '2006-09-19', '', '1990-02-30']) assert.equal(classify(result, { birthDate }).status, '확인 필요');
  assert.equal(classify(result, { birthDate: '2006-09-18' }).status, '정상');
  assert.equal(classify(result, profile, null).status, '확인 필요');
  for (const value of ['', '<100', '92 mg/dL', '-1', '0', 'NaN']) assert.equal(classify(item('FASTING_GLUCOSE', value)).status, '확인 필요');
  assert.equal(classify(item('FASTING_GLUCOSE', 92, 'mmol/L')).status, '확인 필요');
  assert.equal(classify(item('FASTING_GLUCOSE', 92, 'mg/dL', { numericValue: 120 })).status, '확인 필요');
  assert.equal(classify(item('UNKNOWN', 92)).status, '확인 필요');
  assert.equal(classify(item('HEIGHT', 170, 'cm')).status, '측정값');
});

test('성별에 따른 혈색소·HDL 범위를 적용한다', () => {
  const female = { ...profile, sex: 'Female' };
  assert.equal(classify(item('HDL', 45)).status, '정상');
  assert.equal(classify(item('HDL', 45), female).status, '이상');
  assert.equal(classify(item('HEMOGLOBIN', 14.5, 'g/dL')).status, '정상');
  assert.equal(classify(item('HEMOGLOBIN', 15.3, 'g/dL'), female).status, '이상');
  assert.equal(classify(item('HEMOGLOBIN', 14.5, 'g/dL'), { birthDate: profile.birthDate }).status, '확인 필요');
});
