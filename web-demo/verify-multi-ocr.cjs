// 작성자: 김진우 — 다중 사진의 페이지 보존과 OCR 업로드 제한을 검증한다.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { test } = require('node:test');
const { File } = require('node:buffer');
const { PDFDocument } = require('pdf-lib');
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(result.outputText, filename);
};
const { prepareOcrFile } = require('./prepareOcrFile.ts');
const jpeg = Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAUAAoDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD8qqKKKACiiigD/9k=', 'base64');
const photo = name => new File([jpeg], name, { type: 'image/jpeg' });

test('취소·단일 파일은 기존 계약을 보존하고 수량·용량·형식을 검증한다', async () => {
  assert.equal(await prepareOcrFile([], 'image'), null);
  const first = photo('1.jpg');
  assert.equal((await prepareOcrFile([first], 'image')).browserFile, first);
  const pdf = new File(['%PDF-1.4'], '문서.pdf', { type: 'application/pdf' });
  assert.equal((await prepareOcrFile([pdf], 'pdf')).browserFile, pdf);
  await assert.rejects(prepareOcrFile(Array(21).fill(first), 'image'), /20장/);
  await assert.rejects(prepareOcrFile([pdf, pdf], 'pdf'), /한 파일/);
  await assert.rejects(prepareOcrFile([pdf], 'image'), /JPG/);
  await assert.rejects(prepareOcrFile([new File([], '빈사진.jpg', {type:'image/jpeg'})], 'image'), /20MB/);
  const big = new File([new Uint8Array(10_000_001)], '큰사진.jpg', {type:'image/jpeg'});
  await assert.rejects(prepareOcrFile([big, big], 'image'), /합계가 20MB/);
});

test('사진 2장과 최대 20장을 누락 없이 PDF 페이지로 묶고 이미지 자원을 해제한다', async () => {
  const previousBitmap = global.createImageBitmap;
  const previousDocument = global.document;
  let closed = 0;
  let decoded = [];
  global.createImageBitmap = async (file, options) => {
    assert.equal(options.imageOrientation, 'from-image');
    decoded.push(file.name);
    return {width:10, height:20, close: () => closed++};
  };
  global.document = { createElement: () => ({
    getContext: () => ({ fillRect() {}, drawImage() {} }),
    toBlob: callback => callback(new Blob([jpeg], {type:'image/jpeg'})),
  }) };
  try {
    for (const count of [2, 20]) {
      decoded = [];
      const input = Array.from({length:count}, (_, index) => photo(`${index+1}.jpg`));
      const result = await prepareOcrFile(input, 'image');
      assert.equal(result.inputType, 'pdf');
      assert.equal(result.sourceImageCount, count);
      assert.deepEqual(decoded, input.map(file => file.name));
      const pdf = await PDFDocument.load(await result.browserFile.arrayBuffer());
      assert.equal(pdf.getPageCount(), count);
      for (const page of pdf.getPages()) {
        assert.equal(page.getWidth() / page.getHeight(), 0.5);
        assert.equal(page.node.Resources().lookup(require('pdf-lib').PDFName.of('XObject')).keys().length, 1);
      }
    }
    assert.equal(closed, 22);
    global.createImageBitmap = async () => { throw new Error('손상된 사진'); };
    await assert.rejects(prepareOcrFile([photo('손상.jpg'),photo('2.jpg')], 'image'), /사진을 읽을 수/);
  } finally {
    global.createImageBitmap = previousBitmap;
    global.document = previousDocument;
  }
});
