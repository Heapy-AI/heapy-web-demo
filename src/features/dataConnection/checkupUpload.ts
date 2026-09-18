// 작성자: 김진우 — 모바일 URI와 브라우저 File을 동일한 실제 OCR 요청으로 보낸다.
import { Platform } from 'react-native';
import { CheckupFile } from './types';
export function createCheckupUploadForm(file: CheckupFile): FormData {
  const body = new FormData();
  if (Platform.OS === 'web') {
    if (!file.browserFile) throw new Error('파일을 다시 선택해 주세요.');
    body.append('file', file.browserFile);
  } else {
    body.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);
  }
  body.append('inputType', file.inputType);
  return body;
}
// 작성자: 김진우 — 웹의 multipart 경계는 브라우저가 생성하며 직접 헤더로 덮지 않는다.
export const uploadContentHeaders = () =>
  Platform.OS === 'web' ? {} : { 'Content-Type': 'multipart/form-data' };
