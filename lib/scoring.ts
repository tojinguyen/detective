export type RoomScoreBreakdown = {
  completion: number;     // +6 khi hoàn thành
  findScore: number;      // +2 lần 1, +1 lần 2, +0 từ lần 3
  repairScore: number;    // +2 lần 1, +1 lần 2, +0 từ lần 3
  hintScore: number;      // +2 không dùng gợi ý, +0 có dùng
  total: number;          // Tối đa 12
};

export type ConclusionScoreBreakdown = {
  completion: number;     // +20 khi hoàn thành vụ án
  accuracyScore: number;  // +20 lần 1, +10 lần 2, +0 từ lần 3
  total: number;          // Tối đa 40
};

export type CaseScoreBreakdown = {
  rooms: RoomScoreBreakdown[];
  roomsTotal: number;
  conclusion: ConclusionScoreBreakdown;
  totalScore: number;     // Tối đa 100
};

export type DetectiveRank = 
  | 'Thám tử tập sự'
  | 'Trợ lý điều tra'
  | 'Điều tra viên'
  | 'Điều tra viên cấp cao'
  | 'Thám tử trưởng';

export interface RankInfo {
  rank: DetectiveRank;
  nextRank: DetectiveRank | null;
  targetCases: number;
  targetScore: number;
  description: string;
}

export function calculateRoomScore(
  isDone: boolean,
  findMisses: number,
  repairMisses: number,
  hintOpened: boolean
): RoomScoreBreakdown {
  if (!isDone) {
    return {
      completion: 0,
      findScore: 0,
      repairScore: 0,
      hintScore: 0,
      total: 0,
    };
  }

  const completion = 6;
  const findScore = findMisses === 0 ? 2 : findMisses === 1 ? 1 : 0;
  const repairScore = repairMisses === 0 ? 2 : repairMisses === 1 ? 1 : 0;
  const hintScore = hintOpened ? 0 : 2;

  return {
    completion,
    findScore,
    repairScore,
    hintScore,
    total: completion + findScore + repairScore + hintScore,
  };
}

export function calculateConclusionScore(
  won: boolean,
  conclusionMisses: number
): ConclusionScoreBreakdown {
  if (!won) {
    return {
      completion: 0,
      accuracyScore: 0,
      total: 0,
    };
  }

  const completion = 20;
  const accuracyScore = conclusionMisses === 0 ? 20 : conclusionMisses === 1 ? 10 : 0;

  return {
    completion,
    accuracyScore,
    total: completion + accuracyScore,
  };
}

export function calculateCaseScore(
  roomRecords: { stage: string; findMisses: number; repairMisses: number; hintOpened: boolean }[],
  won: boolean,
  conclusionMisses: number
): CaseScoreBreakdown {
  const rooms = roomRecords.map(r => 
    calculateRoomScore(r.stage === 'done', r.findMisses, r.repairMisses, r.hintOpened)
  );
  const roomsTotal = rooms.reduce((sum, r) => sum + r.total, 0);
  const conclusion = calculateConclusionScore(won, conclusionMisses);
  const totalScore = roomsTotal + conclusion.total;

  return {
    rooms,
    roomsTotal,
    conclusion,
    totalScore,
  };
}

export function evaluateRank(completedCasesCount: number, totalCareerScore: number): RankInfo {
  if (completedCasesCount >= 3 && totalCareerScore >= 260) {
    return {
      rank: 'Thám tử trưởng',
      nextRank: null,
      targetCases: 3,
      targetScore: 260,
      description: 'Cấp bậc danh dự tối cao của Viện Lưu trữ & Hiện trường.',
    };
  }
  if (completedCasesCount >= 3 && totalCareerScore >= 200) {
    return {
      rank: 'Điều tra viên cấp cao',
      nextRank: 'Thám tử trưởng',
      targetCases: 3,
      targetScore: 260,
      description: 'Phá thành công cả 3 vụ án với nghiệp vụ xuất sắc.',
    };
  }
  if (completedCasesCount >= 2 && totalCareerScore >= 120) {
    return {
      rank: 'Điều tra viên',
      nextRank: 'Điều tra viên cấp cao',
      targetCases: 3,
      targetScore: 200,
      description: 'Đã hoàn thành 2 vụ án và có khả năng suy luận vững chắc.',
    };
  }
  if (completedCasesCount >= 1 && totalCareerScore >= 50) {
    return {
      rank: 'Trợ lý điều tra',
      nextRank: 'Điều tra viên',
      targetCases: 2,
      targetScore: 120,
      description: 'Hoàn thành vụ án đầu tiên và nắm vững quy trình phá án.',
    };
  }
  return {
    rank: 'Thám tử tập sự',
    nextRank: 'Trợ lý điều tra',
    targetCases: 1,
    targetScore: 50,
    description: 'Bắt đầu hành trình điều tra tại Viện Lưu trữ & Hiện trường.',
  };
}
