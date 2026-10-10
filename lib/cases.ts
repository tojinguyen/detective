export type Direction = 'front' | 'back' | 'left' | 'right';
export type FactValue = string | number;
export type RuleOperator = 'eq' | 'gt' | 'gte' | 'lt' | 'lte';
export type ProfileIcon = 'ruler' | 'clock' | 'card' | 'package' | 'route';

export type CaseRoom = {
  no: string;
  name: string;
  source: string;
  object: string;
  image: string;
  note: string;
  position: 'north' | 'west' | 'east' | 'south' | 'security';
  final: boolean;
  door: { x: number; y: number };
  facing: Direction;
  securityWarning?: string;
};

export type CasePerson = {
  id: string;
  name: string;
  role: string;
  color: string;
  facts: Record<string, FactValue>;
};

export type ProfileField = {
  key: string;
  label: string;
  icon: ProfileIcon;
  suffix?: string;
  fullWidth?: boolean;
};

export type CaseClue = {
  text: string;
  shortLabel: string;
  unlockedNote: string;
  rule: {
    field: string;
    operator: RuleOperator;
    value: FactValue;
  };
};

export type CasePrologue = {
  location: string;
  time: string;
  background: string;
  incident: string;
  mission: string[];
};

export type CaseDefinition = {
  id: string;
  number: string;
  title: string;
  discoveredAt: string;
  status?: 'available' | 'upcoming';
  topicBadge?: string;
  difficulty?: 'Dễ' | 'Trung bình' | 'Nâng cao';
  estimatedTime?: string;
  objective: {
    initial: string;
    finalRoom: string;
    conclusion: string;
  };
  story: {
    summary: string;
    groupLabel: string;
    missingData: string;
  };
  prologue?: CasePrologue;
  rooms: readonly CaseRoom[];
  people: readonly CasePerson[];
  profileFields: readonly ProfileField[];
  clues: readonly CaseClue[];
  logicHints: readonly string[];
  defaultQuestionIds: readonly number[];
  finalRoomIndex: number;
  finalPersonIndex: number;
  conclusionQuestion: string;
  solvedDescription: string;
  resolution: string;
};

export const CASE_01 = {
  id: 'case-01',
  number: '01',
  title: 'Chiếc huy hiệu biến mất',
  discoveredAt: '16:12',
  status: 'available',
  topicBadge: 'Số học & Thứ tự thực hiện phép tính',
  difficulty: 'Trung bình',
  estimatedTime: '15 - 20 phút',
  objective: {
    initial: 'Tìm người đã di chuyển huy hiệu',
    finalRoom: 'Tìm dữ kiện quyết định tại buồng 05',
    conclusion: 'Đến Hồ sơ nhân vật để kết luận',
  },
  story: {
    summary: 'Chiếc huy hiệu không còn trong tủ trước lễ tuyên dương. Một thành viên nhóm chuẩn bị đã chuyển nó sang vị trí khác nhưng tờ bàn giao bị thất lạc.',
    groupLabel: 'Nhóm chuẩn bị',
    missingData: 'Mất hình',
  },
  prologue: {
    location: 'Hội trường sự kiện E·RASE',
    time: '16:12 · Trước lễ tuyên dương 48 phút',
    background: 'Buổi lễ tuyên dương học sinh xuất sắc sắp chính thức diễn ra tại hội trường trung tâm. Chiếc huy hiệu danh dự mạ vàng - biểu tượng cao quý nhất của buổi lễ - đã được giao cho Nhóm chuẩn bị sự kiện bảo quản cẩn mật trong tủ kính an toàn.',
    incident: 'Đúng 16:12, ban tổ chức kiểm tra trước giờ khai mạc thì phát hiện chiếc huy hiệu đã không còn trong tủ! Tờ bàn giao thiết bị bị thất lạc trong quá trình chuyển đồ, camera hành lang bị trục trặc khiến việc xác định người cầm huy hiệu bị gián đoạn.',
    mission: [
      'Điều tra 5 phòng hiện trường, tìm lỗi sai và sửa đúng 5 phiếu bài tập Toán để khôi phục dữ liệu vật chứng.',
      'Thu thập đủ 5 manh mối về đặc điểm nhận dạng, kích thước hộp đồ vật và hành trình di chuyển.',
      'Đối chiếu bảng hồ sơ nhân vật và đưa ra bản kết luận chính xác để kịp thời bàn giao lại huy hiệu trước giờ khai mạc!'
    ]
  },
  rooms: [
    { no: '01', name: 'Phòng học', source: 'PHÒNG HỌC', object: 'Phiếu nháp trên bàn', image: '/room-classroom.png', note: 'Một lời giải bị bỏ dở cạnh cửa sổ.', position: 'north', final: false, door: { x: 50, y: 27 }, facing: 'back' },
    { no: '02', name: 'Phòng lưu trữ', source: 'PHÒNG LƯU TRỮ', object: 'Sổ kiểm kê', image: '/room-archive.png', note: 'Ngăn hồ sơ có một trang bị đánh dấu.', position: 'west', final: false, door: { x: 24, y: 50 }, facing: 'left' },
    { no: '03', name: 'Phòng câu lạc bộ', source: 'PHÒNG CÂU LẠC BỘ', object: 'Ghi chú trên bảng', image: '/detective-room.png', note: 'Bảng ghim còn giữ lại một mảnh giấy.', position: 'east', final: false, door: { x: 76, y: 50 }, facing: 'right' },
    { no: '04', name: 'Kho đạo cụ', source: 'KHO ĐẠO CỤ', object: 'Thẻ nhớ camera', image: '/room-archive.png', note: 'Một thẻ nhớ nằm trong khay chứng cứ.', position: 'south', final: false, door: { x: 50, y: 73 }, facing: 'front' },
    { no: '05', name: 'Buồng an ninh', source: 'BUỒNG AN NINH', object: 'Màn hình bị đóng băng', image: '/room-security.png', note: 'Khôi phục khung hình cuối cùng của vụ án.', position: 'security', final: true, door: { x: 76, y: 73 }, facing: 'front', securityWarning: 'Tín hiệu camera bị kẹt ở một phép tính sai. Sửa phiếu kiểm tra để khôi phục hình ảnh.' },
  ],
  people: [
    { id: 'ha', name: 'Cô Hạ', role: 'Giáo viên Mỹ thuật', color: '#bc8951', facts: { height: 158, arrived: '15:52', card: 'Xanh dương', caseLength: 24, route: 'Cầu thang' } },
    { id: 'khai', name: 'Thầy Khải', role: 'Phụ trách thiết bị', color: '#7c9e9b', facts: { height: 171, arrived: '15:38', card: 'Xanh dương', caseLength: 32, route: 'Cầu thang' } },
    { id: 'ngan', name: 'Cô Ngân', role: 'Thủ thư', color: '#a58a74', facts: { height: 166, arrived: '15:48', card: 'Xanh lá', caseLength: 18, route: 'Cầu thang' } },
    { id: 'phuc', name: 'Anh Phúc', role: 'Kỹ thuật viên sự kiện', color: '#8995b2', facts: { height: 174, arrived: '15:55', card: 'Xanh dương', caseLength: 28, route: 'Cầu thang' } },
    { id: 'vy', name: 'Cô Vy', role: 'Điều phối buổi lễ', color: '#a6a16b', facts: { height: 169, arrived: '16:02', card: 'Xanh dương', caseLength: 28, route: 'Thang máy' } },
  ],
  profileFields: [
    { key: 'height', label: 'Chiều cao', icon: 'ruler', suffix: ' cm' },
    { key: 'arrived', label: 'Xuất hiện', icon: 'clock' },
    { key: 'card', label: 'Màu thẻ', icon: 'card' },
    { key: 'caseLength', label: 'Chiều dài hộp', icon: 'package', suffix: ' cm' },
    { key: 'route', label: 'Lối di chuyển', icon: 'route', fullWidth: true },
  ],
  clues: [
    { text: 'Camera ước tính người mang hộp cao từ 165 cm trở lên.', shortLabel: '≥ 165 cm', unlockedNote: '✓ Đã đưa vào bảng đối chiếu', rule: { field: 'height', operator: 'gte', value: 165 } },
    { text: 'Sổ trực ghi nhận người đó xuất hiện sau 15:45.', shortLabel: 'Sau 15:45', unlockedNote: '✓ Đã đưa vào bảng đối chiếu', rule: { field: 'arrived', operator: 'gt', value: '15:45' } },
    { text: 'Đầu đọc cửa ghi nhận một thẻ màu xanh dương.', shortLabel: 'Thẻ xanh dương', unlockedNote: '✓ Đã đưa vào bảng đối chiếu', rule: { field: 'card', operator: 'eq', value: 'Xanh dương' } },
    { text: 'Chiếc huy hiệu được đặt trong hộp bảo vệ dài 28 cm.', shortLabel: 'Hộp 28 cm', unlockedNote: '✓ Xác nhận còn hai khả năng', rule: { field: 'caseLength', operator: 'eq', value: 28 } },
    { text: 'Khung hình cuối cho thấy người cầm hộp đi bằng cầu thang.', shortLabel: 'Cầu thang', unlockedNote: '✓ Dữ kiện quyết định', rule: { field: 'route', operator: 'eq', value: 'Cầu thang' } },
  ],
  logicHints: [
    'Hãy vào một trong bốn phòng đầu để mở dữ kiện đầu tiên.',
    '“Từ 165 cm trở lên” nghĩa là 165 cm cũng phù hợp; chỉ đánh dấu người thấp hơn 165 cm.',
    'Giữ các hồ sơ cao từ 165 cm và xuất hiện sau 15:45.',
    'Sau dữ kiện về chiều cao và thời gian, hãy giữ những người dùng thẻ xanh dương.',
    'M4 xác nhận cả Anh Phúc và Cô Vy đều có hộp 28 cm. Vẫn còn hai khả năng; hãy vào buồng an ninh để lấy M5 quyết định.',
    'M5 cho biết người cầm hộp đi bằng cầu thang. Trong hai hồ sơ còn lại sau M4, hãy đánh dấu người đi thang máy là không phù hợp.',
  ],
  defaultQuestionIds: [29, 3, 7, 4, 18],
  finalRoomIndex: 4,
  finalPersonIndex: 3,
  conclusionQuestion: 'Ai đã di chuyển chiếc huy hiệu?',
  solvedDescription: 'Bạn đã sửa năm phiếu và tìm ra lời giải cho sự việc mà không quy kết nhân vật.',
  resolution: 'Anh Phúc là người duy nhất khớp đủ năm dữ kiện. Anh đã được phân công chuyển huy hiệu sang khu vực sân khấu và đặt nó trong hộp bảo vệ; tờ ghi chú bàn giao vô tình rơi xuống gầm tủ nên mọi người tưởng huy hiệu bị mất.',
} satisfies CaseDefinition;

export const CASE_02 = {
  id: 'case-02',
  number: '02',
  title: 'Bí ẩn chiếc đồng hồ cổ',
  discoveredAt: '08:30',
  status: 'upcoming',
  topicBadge: 'Hình học & Đo lường chu vi, diện tích',
  difficulty: 'Trung bình',
  estimatedTime: '20 - 25 phút',
  objective: {
    initial: 'Giải mã mật thư trong tháp chuông',
    finalRoom: 'Mở khóa buồng máy đồng hồ',
    conclusion: 'Đối chiếu và xác định thủ phạm',
  },
  story: {
    summary: 'Chiếc đồng hồ quả lắc trăm năm tuổi của bảo tàng đột nhiên dừng chạy vào lúc 08:30. Một bánh răng vàng quý giá đã bị tháo rời và cất giấu.',
    groupLabel: 'Đội bảo tồn',
    missingData: 'Mất bánh răng',
  },
  prologue: {
    location: 'Tháp chuông Bảo tàng E·RASE',
    time: '08:30 · Đầu buổi sáng mở cửa triển lãm',
    background: 'Chiếc đồng hồ cổ trăm năm tuổi của bảo tàng đột ngột ngừng điểm chuông đúng 08:30 sáng. Đây là báu vật cơ khí lịch sử lưu giữ ký ức thời gian của thành phố.',
    incident: 'Khi người thợ máy leo lên kiểm tra, bánh răng truyền động trung tâm bằng đồng mạ vàng đã biến mất! Kẻ gian để lại các sơ đồ hình học kỳ lạ đánh dấu tại các khu trưng bày.',
    mission: [
      'Giải mã các bài toán hình học về chu vi, diện tích để mở khóa 5 phòng trưng bày cổ vật.',
      'Thu thập 5 mảnh dữ liệu về kích thước bánh răng và thời điểm tháo dỡ.',
      'Xác định người trong Đội bảo tồn đã cất giấu bánh răng trước khi khách tham quan vào tháp!'
    ]
  },
  rooms: CASE_01.rooms,
  people: CASE_01.people,
  profileFields: CASE_01.profileFields,
  clues: CASE_01.clues,
  logicHints: CASE_01.logicHints,
  defaultQuestionIds: [29, 3, 7, 4, 18],
  finalRoomIndex: 4,
  finalPersonIndex: 1,
  conclusionQuestion: 'Ai đã cất giấu bánh răng chiếc đồng hồ cổ?',
  solvedDescription: 'Hồ sơ vụ án đang được cập nhật thêm chứng cứ.',
  resolution: 'Hồ sơ đang được chuẩn bị hoàn thiện.',
} satisfies CaseDefinition;

export const CASES: readonly CaseDefinition[] = [CASE_01, CASE_02];

export function getCase(caseId: string) {
  return CASES.find(caseData => caseData.id === caseId);
}

