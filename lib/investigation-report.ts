export type InvestigationRecord = {
  stage: 'detect' | 'repair' | 'done';
  findMisses: number;
  repairMisses: number;
  findSeconds: number;
  repairSeconds: number;
  hintOpened: boolean;
  tabExits: number;
  inactiveSeconds: number;
};

export type TraceStatus = 'immediate' | 'independent' | 'assisted' | 'unfinished';

export const TRACE_STATUS_LABELS: Record<TraceStatus, string> = {
  immediate: 'Xác định ngay',
  independent: 'Tự xác minh',
  assisted: 'Xác minh có hỗ trợ',
  unfinished: 'Chưa hoàn tất',
};

export function traceStatus(record: InvestigationRecord): TraceStatus {
  if (record.stage !== 'done') return 'unfinished';
  if (record.hintOpened) return 'assisted';
  if (record.findMisses === 0 && record.repairMisses === 0) return 'immediate';
  return 'independent';
}

export function formatInvestigationTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export function investigationReport(records: InvestigationRecord[]) {
  const statuses = records.map(traceStatus);
  const count = (status: TraceStatus) => statuses.filter(item => item === status).length;
  const immediate = count('immediate');
  const independent = count('independent');
  const assisted = count('assisted');
  const unfinished = count('unfinished');
  const activeSeconds = records.reduce((total, record) => total + record.findSeconds + record.repairSeconds, 0);
  const tabExits = records.reduce((total, record) => total + record.tabExits, 0);
  const inactiveSeconds = records.reduce((total, record) => total + record.inactiveSeconds, 0);

  let narrative: string;
  if (unfinished > 0) {
    narrative = `Hồ sơ vẫn còn bỏ ngỏ. Hãy quay lại ${unfinished} phiếu chưa hoàn tất để tiếp tục truy tìm manh mối.`;
  } else if (immediate === records.length && records.length > 0) {
    narrative = 'Bạn đã lần theo toàn bộ dấu vết chính xác ngay từ lần kiểm tra đầu tiên. Hồ sơ vụ án đã được khép lại.';
  } else if (assisted > 0) {
    narrative = `Vụ án đã được khép lại. ${assisted} dấu vết cần thêm thông tin hỗ trợ, và bạn đã sử dụng chúng để hoàn tất quá trình đối chiếu.`;
  } else {
    narrative = `Vụ án đã được khép lại. Bạn đã tự kiểm tra và điều chỉnh ${independent} phán đoán trước khi xác minh đủ các manh mối.`;
  }

  return { immediate, independent, assisted, unfinished, activeSeconds, tabExits, inactiveSeconds, narrative };
}
