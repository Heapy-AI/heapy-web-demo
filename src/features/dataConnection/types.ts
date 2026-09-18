export type InputType = 'pdf' | 'image' | 'camera';
export type CheckupFile = {
  // 작성자: 김진우 — 웹 파일 업로드에만 사용하고 서버 JSON에는 포함하지 않는다.
  browserFile?: Blob;
  // 작성자: 김진우 — 웹에서 한 문서로 묶은 사진 수를 선택 화면에 표시한다.
  sourceImageCount?: number;
  uri: string;
  name: string;
  type: string;
  size: number;
  inputType: InputType;
};
export type CheckupItem = {
  // 작성자: 김진우 — 화면 표시용 참고 판정이며 기관 원문·OCR 저장에는 사용하지 않는다.
  assessmentSource?: 'institution' | 'reference' | 'unavailable';
  referenceDescription?: string;
  classification?: string;
  fieldKey: string;
  itemCode: string | null;
  itemName: string;
  value: string;
  numericValue?: number | null;
  unit: string | null;
  status: string | null;
  confidence?: number | null;
};
export type CheckupResult = {
  schemaVersion?: number;
  measuredAt: string | null;
  providerName: string | null;
  items: CheckupItem[];
  findings?: CheckupFinding[];
  overallOpinions?: CheckupFinding[];
  reviewRequired?: ReviewRequiredItem[];
};
// 작성자: 김진우 — 백엔드 검진_저장확장_공유계약.md의 버전 2 공개 계약이다.
export type CheckupFinding = {
  schemaVersion: number;
  findingId: string;
  classification: string;
  examType: string | null;
  examName: string;
  text: string;
  bodySite: string | null;
  method: string | null;
  performedAt: string | null;
  summary: { text: string; source: string; basisHash: string } | null;
};
export type ReviewRequiredItem = {
  fieldKey: string;
  classification: string;
  text: string;
  reason: string;
};
export type CheckupDetail = {
  recordId: string;
  measuredAt: string | null;
  providerName: string | null;
  results: Array<Omit<CheckupItem, 'fieldKey'>>;
  findings?: CheckupFinding[];
  overallOpinions?: CheckupFinding[];
};
export type CheckupRecord = Pick<
  CheckupDetail,
  'recordId' | 'measuredAt' | 'providerName'
> & {
  sourceType: string;
  resultCount: number;
  confirmedAt: string;
};
export type ConfirmedCheckup = {
  recordId: string;
  resultCount?: number;
  findingCount?: number;
  overallOpinionCount?: number;
};
export type OcrJob = {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  expiresAt: string;
  pollAfterMs?: number;
  errorCode?: string | null;
  result?: CheckupResult;
};
export type ConfirmCheckup = {
  measuredAt: string | null;
  providerName: string | null;
  results: Array<
    Omit<
      CheckupItem,
      'fieldKey' | 'itemName' | 'confidence' | 'classification'
    > & { fieldKey?: string }
  >;
  reviewVersion?: 2;
  findings?: CheckupFinding[];
  overallOpinions?: CheckupFinding[];
  excludedFieldKeys?: string[];
  corrections: Array<{
    fieldKey: string;
    itemCode: string | null;
    originalValue: string;
    correctedValue: string;
    correctionType: 'value' | 'unit' | 'excluded';
  }>;
};
export type HealthConnection = {
  deviceInstallationId?: string;
  connectionId: string;
  status: string;
  grantedDataTypes: string[];
  lastSyncedAt: string | null;
};
export type SamsungPermission = {
  deviceInstallationId: string;
  grantedDataTypes: string[];
  sdkVersion: string;
  permissionCheckedAt: string;
};

export type SamsungSteps = {
  date: string;
  steps: number;
  hasData: boolean;
  readAt: string;
};
