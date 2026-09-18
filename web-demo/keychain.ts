// 작성자: 김진우 — 모바일 토큰 저장·갱신 코드를 재사용하며 웹 세션은 현재 탭에 보관한다.
const key = 'heapy.web.session.v1';
export const STORAGE_TYPE = { AES_GCM_NO_AUTH: 'web-session' };
export async function getGenericPassword() {
  const password = sessionStorage.getItem(key);
  return password ? { username: 'heapy-session', password } : false;
}
export async function setGenericPassword(_username: string, password: string) {
  sessionStorage.setItem(key, password);
  return true;
}
export async function resetGenericPassword() {
  sessionStorage.removeItem(key);
  return true;
}
