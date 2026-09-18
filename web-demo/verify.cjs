// 작성자: 김진우 — 웹 OCR의 실제 multipart 파일 계약과 인증 프록시를 검증한다.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { File } = require('node:buffer');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/features/dataConnection/checkupUpload.ts'), 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
const exported = {};
vm.runInNewContext(compiled, {exports: exported, FormData, require: name => {
  if (name === 'react-native') return {Platform: {OS: 'web'}};
  throw new Error(`예상하지 않은 모듈: ${name}`);
}});
(async () => {
  const file = new File(['%PDF-1.4\nHEAPY 가상 문서'], 'sample.pdf', {type: 'application/pdf'});
  const form = exported.createCheckupUploadForm({uri: '', name: file.name, type: file.type, size: file.size, inputType: 'pdf', browserFile: file});
  assert.equal(form.get('file').name, 'sample.pdf');
  assert.equal(form.get('file').type, 'application/pdf');
  assert.equal(form.get('inputType'), 'pdf');
  assert.equal(Object.keys(exported.uploadContentHeaders()).length, 0);
  const request = new Request('https://example.invalid', {method:'POST',body:form,headers:exported.uploadContentHeaders()});
  assert.match(request.headers.get('content-type'), /^multipart\/form-data; boundary=/);
  assert.match(await request.text(), /filename="sample.pdf"/);
  assert.throws(() => exported.createCheckupUploadForm({inputType:'pdf'}), /파일을 다시 선택/);
  const base = process.env.HEAPY_TEST_URL || 'http://127.0.0.1:5195';
  const result = await fetch(`${base}/api/users/me`);
  assert.equal(result.status, 401, '실제 보호 API는 미인증 요청을 거절해야 한다.');
  assert.match(result.headers.get('cache-control') || '', /no-store/);
  console.log('통과: 파일명·MIME·multipart 경계, 파일 누락 거부, 실제 서버 인증 및 캐시 금지');
  console.log('로그인 이후 챗봇·OCR 처리·일정 저장은 별도 실제 계정 검증이 필요합니다.');
})().catch(error => {console.error(error);process.exitCode = 1;});
