// 작성자: 김진우 — 여러 사진을 한 문서로 묶어 기존 검진·복약 OCR API를 재사용한다.
import type {
  CheckupFile,
  InputType,
} from '../src/features/dataConnection/types';
import { validateCheckupFile } from '../src/features/dataConnection/checkupValidation';

const MAX_BYTES = 20_000_000;
const MAX_PAGES = 20;

function describeFile(file: File, inputType: InputType): CheckupFile {
  return {
    uri: '',
    name: file.name,
    type: file.type,
    size: file.size,
    inputType,
    browserFile: file,
  };
}

async function imageToJpeg(file: File): Promise<Uint8Array> {
  let bitmap: ImageBitmap;
  try {
    // 작성자: 김진우 — 촬영 방향을 반영하고 OCR 서버의 이미지 크기에 맞춰 메모리 사용을 제한한다.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error(
      `${file.name}: 사진을 읽을 수 없어요. JPG 또는 PNG 파일을 다시 선택해 주세요.`,
    );
  }
  const canvas = document.createElement('canvas');
  try {
    if (bitmap.width * bitmap.height > 25_000_000) {
      throw new Error(
        `${file.name}: 해상도가 너무 커요. 2,500만 화소 이하 사진을 선택해 주세요.`,
      );
    }
    const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context)
      throw new Error('사진을 처리할 수 없어요. 브라우저를 다시 열어 주세요.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const jpeg = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        blob =>
          blob
            ? resolve(blob)
            : reject(new Error('사진을 문서로 변환하지 못했어요.')),
        'image/jpeg',
        0.95,
      );
    });
    return new Uint8Array(await jpeg.arrayBuffer());
  } finally {
    bitmap.close();
    canvas.width = 0;
    canvas.height = 0;
  }
}

export async function prepareOcrFile(
  selected: File[],
  inputType: InputType,
): Promise<CheckupFile | null> {
  if (!selected.length) return null;
  if (inputType === 'camera')
    throw new Error('웹에서는 PDF 또는 사진을 선택해 주세요.');
  if (inputType === 'pdf' && selected.length !== 1) {
    throw new Error(
      'PDF는 한 파일씩 선택해 주세요. 한 파일에 최대 20페이지를 담을 수 있어요.',
    );
  }
  if (selected.length > MAX_PAGES)
    throw new Error('사진은 한 번에 최대 20장까지 선택할 수 있어요.');
  const files = selected.map(raw => {
    const type =
      raw.type ||
      (/\.pdf$/i.test(raw.name)
        ? 'application/pdf'
        : /\.jpe?g$/i.test(raw.name)
        ? 'image/jpeg'
        : /\.png$/i.test(raw.name)
        ? 'image/png'
        : '');
    const file = raw.type === type ? raw : new File([raw], raw.name, { type });
    validateCheckupFile(describeFile(file, inputType));
    if ((inputType === 'pdf') !== (type === 'application/pdf')) {
      throw new Error(
        inputType === 'pdf'
          ? 'PDF 파일을 선택해 주세요.'
          : 'JPG 또는 PNG 사진을 선택해 주세요.',
      );
    }
    return file;
  });
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_BYTES) {
    throw new Error(
      '선택한 파일의 합계가 20MB를 넘어요. 사진 수나 파일 크기를 줄여 주세요.',
    );
  }
  if (files.length === 1) return describeFile(files[0]!, inputType);

  // 작성자: 김진우 — 다중 선택할 때만 PDF 라이브러리를 불러와 최초 화면 로딩을 유지한다.
  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  let convertedBytes = 0;
  for (const file of files) {
    const bytes = await imageToJpeg(file);
    convertedBytes += bytes.byteLength;
    if (convertedBytes > MAX_BYTES)
      throw new Error(
        '묶은 문서가 20MB를 넘어요. 사진 수나 크기를 줄여 주세요.',
      );
    const image = await pdf.embedJpg(bytes);
    const scale = Math.min(595 / image.width, 842 / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const page = pdf.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
    await pdf.flush();
  }
  const bytes = await pdf.save();
  const combined = new File(
    [new Uint8Array(bytes)],
    `사진_${files.length}장.pdf`,
    { type: 'application/pdf' },
  );
  const result = describeFile(combined, 'pdf');
  result.sourceImageCount = files.length;
  validateCheckupFile(result);
  return result;
}
