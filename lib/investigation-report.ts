import { calculateCaseScore, type CaseScoreBreakdown } from './scoring.ts';

export type InvestigationRecord = {
  stage: 'detect' | 'repair' | 'done';
  findMisses: number;
  repairMisses: number;
  findSeconds: number;
  repairSeconds: number;
  roomSeconds?: number;
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
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export interface FullInvestigationReportOptions {
  totalInvestigationSeconds?: number;
  boardSeconds?: number;
  conclusionAttempts?: number;
  won?: boolean;
}

export function investigationReport(
  records: InvestigationRecord[],
  options?: FullInvestigationReportOptions
) {
  const statuses = records.map(traceStatus);
  const count = (status: TraceStatus) => statuses.filter(item => item === status).length;
  const immediate = count('immediate');
  const independent = count('independent');
  const assisted = count('assisted');
  const unfinished = count('unfinished');
  
  // Thời gian bài toán cũ (tìm + sửa)
  const mathActiveSeconds = records.reduce((total, record) => total + record.findSeconds + record.repairSeconds, 0);
  
  // Thời gian toàn vụ án mới (nếu được truyền vào từ timer tổng, ngược lại fallback mathActiveSeconds)
  const totalSeconds = options?.totalInvestigationSeconds !== undefined
    ? options.totalInvestigationSeconds
    : mathActiveSeconds;

  const tabExits = records.reduce((total, record) => total + record.tabExits, 0);
  const inactiveSeconds = records.reduce((total, record) => total + record.inactiveSeconds, 0);
  const boardSeconds = options?.boardSeconds ?? 0;
  const roomTimes = records.map(r => r.roomSeconds ?? (r.findSeconds + r.repairSeconds));

  const won = options?.won ?? (unfinished === 0);
  const conclusionMisses = Math.max(0, (options?.conclusionAttempts ?? 1) - 1);
  const scoreBreakdown: CaseScoreBreakdown = calculateCaseScore(records, won, conclusionMisses);

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

  return {
    immediate,
    independent,
    assisted,
    unfinished,
    activeSeconds: totalSeconds,
    mathActiveSeconds,
    boardSeconds,
    roomTimes,
    tabExits,
    inactiveSeconds,
    scoreBreakdown,
    narrative,
  };
}
