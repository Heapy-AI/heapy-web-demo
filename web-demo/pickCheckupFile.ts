// 작성자: 김진우 — 파일을 읽기 전에 형식·크기를 검증하고 실제 File을 업로드에 전달한다.
import { CheckupFile, InputType } from '../src/features/dataConnection/types';
import { prepareOcrFile } from './prepareOcrFile';
export function pickCheckupFile(
  inputType: InputType,
): Promise<CheckupFile | null> {
  if (inputType === 'camera')
    return Promise.reject(
      new Error('웹에서는 PDF 또는 이미지 파일을 선택해 주세요.'),
    );
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = inputType === 'image';
    input.accept =
      inputType === 'pdf'
        ? 'application/pdf,.pdf'
        : 'image/jpeg,image/png,.jpg,.jpeg,.png';
    input.style.display = 'none';
    input.setAttribute(
      'aria-label',
      inputType === 'pdf' ? 'PDF 파일 선택' : '사진 최대 20장 선택',
    );
    document.body.appendChild(input);
    const cleanup = () => input.remove();
    input.addEventListener(
      'cancel',
      () => {
        cleanup();
        resolve(null);
      },
      { once: true },
    );
    input.addEventListener(
      'change',
      async () => {
        const selected = Array.from(input.files || []);
        cleanup();
        try {
          resolve(await prepareOcrFile(selected, inputType));
        } catch (error) {
          reject(error);
        }
      },
      { once: true },
    );
    input.click();
  });
}
