export type Direction = 'front' | 'back' | 'left' | 'right';
export type FactValue = string | number;
export type RuleOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
export type ProfileIcon = 'ruler' | 'clock' | 'card' | 'package' | 'route' | 'trophy' | 'compass' | 'tag' | 'gem' | 'heart' | 'footprints' | 'shield';

export type WitnessTestimony = {
  witness: string;
  role?: string;
  content: string;
};

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
  testimonies?: WitnessTestimony[];
};

export type CasePerson = {
  id: string;
  name: string;
  role: string;
  color: string;
  /** Ảnh chân dung riêng; mặc định /vu_an_{số vụ án}/suspect-{thứ tự}.webp */
  portrait?: string;
  facts: Record<string, FactValue>;
};

export type ProfileField = {
  key: string;
  label: string;
  icon: ProfileIcon;
  suffix?: string;
  fullWidth?: boolean;
  unlockClueIndex?: number;
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
  matchPerson?: (person: CasePerson, index: number, caseData: CaseDefinition) => boolean;
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
  difficulty?: 'Dễ' | 'Trung bình' | 'Khó' | 'Trung bình - Khó' | 'Nâng cao';
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

export const CASE_01: CaseDefinition = {
  id: 'case-01',
  number: '01',
  title: 'Chiếc huy hiệu biến mất',
  discoveredAt: '16:12',
  status: 'available',
  topicBadge: 'Số học & Thứ tự thực hiện phép tính',
  difficulty: 'Dễ',
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
    { no: '01', name: 'Phòng học', source: 'PHÒNG HỌC', object: 'Phiếu nháp trên bàn', image: '/room_1/room-classroom.webp', note: 'Một lời giải bị bỏ dở cạnh cửa sổ.', position: 'north', final: false, door: { x: 50, y: 27 }, facing: 'back' },
    { no: '02', name: 'Phòng lưu trữ', source: 'PHÒNG LƯU TRỮ', object: 'Sổ kiểm kê', image: '/room_1/room-archive.webp', note: 'Ngăn hồ sơ có một trang bị đánh dấu.', position: 'west', final: false, door: { x: 24, y: 50 }, facing: 'left' },
    { no: '03', name: 'Phòng câu lạc bộ', source: 'PHÒNG CÂU LẠC BỘ', object: 'Ghi chú trên bảng', image: '/room_1/detective-room.webp', note: 'Bảng ghim còn giữ lại một mảnh giấy.', position: 'east', final: false, door: { x: 76, y: 50 }, facing: 'right' },
    { no: '04', name: 'Kho đạo cụ', source: 'KHO ĐẠO CỤ', object: 'Thẻ nhớ camera', image: '/room_1/room-archive.webp', note: 'Một thẻ nhớ nằm trong khay chứng cứ.', position: 'south', final: false, door: { x: 50, y: 73 }, facing: 'front' },
    { no: '05', name: 'Buồng an ninh', source: 'BUỒNG AN NINH', object: 'Màn hình bị đóng băng', image: '/room_1/room-security.webp', note: 'Khôi phục khung hình cuối cùng của vụ án.', position: 'security', final: true, door: { x: 76, y: 73 }, facing: 'front', securityWarning: 'Tín hiệu camera bị kẹt ở một phép tính sai. Sửa phiếu kiểm tra để khôi phục hình ảnh.' },
  ],
  people: [
    { id: 'ha', name: 'Cô Hạ', role: 'Giáo viên Mỹ thuật', color: '#bc8951', facts: { height: 158, arrived: '15:52', card: 'Xanh dương', caseLength: 24, route: 'Cầu thang' } },
    { id: 'khai', name: 'Thầy Khải', role: 'Phụ trách thiết bị', color: '#7c9e9b', facts: { height: 171, arrived: '15:38', card: 'Xanh dương', caseLength: 32, route: 'Cầu thang' } },
    { id: 'ngan', name: 'Cô Ngân', role: 'Thủ thư', color: '#a58a74', facts: { height: 166, arrived: '15:48', card: 'Xanh lá', caseLength: 18, route: 'Cầu thang' } },
    { id: 'phuc', name: 'Anh Phúc', role: 'Kỹ thuật viên sự kiện', color: '#8995b2', facts: { height: 174, arrived: '15:55', card: 'Xanh dương', caseLength: 28, route: 'Cầu thang' } },
    { id: 'vy', name: 'Cô Vy', role: 'Điều phối buổi lễ', color: '#a6a16b', facts: { height: 169, arrived: '16:02', card: 'Xanh dương', caseLength: 28, route: 'Thang máy' } },
  ],
  profileFields: [
    { key: 'height', label: 'Chiều cao', icon: 'ruler', suffix: ' cm', unlockClueIndex: 0 },
    { key: 'arrived', label: 'Xuất hiện', icon: 'clock', unlockClueIndex: 1 },
    { key: 'card', label: 'Màu thẻ', icon: 'card', unlockClueIndex: 2 },
    { key: 'caseLength', label: 'Chiều dài hộp', icon: 'package', suffix: ' cm', unlockClueIndex: 3 },
    { key: 'route', label: 'Lối di chuyển', icon: 'route', fullWidth: true, unlockClueIndex: 4 },
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

export const CASE_02: CaseDefinition = {
  id: 'case-02',
  number: '02',
  title: 'Cuộc đua STEM — Ai là quán quân?',
  discoveredAt: '16:30',
  status: 'available',
  topicBadge: 'Tập hợp & Logic phân loại loại trừ',
  difficulty: 'Trung bình',
  estimatedTime: '15 - 20 phút',
  objective: {
    initial: 'Thu thập kết quả 5 vòng thi của Cuộc đua STEM',
    finalRoom: 'Mở khóa máy chủ ban tổ chức tại buồng 05',
    conclusion: 'Đối chiếu quy chế chung cuộc và tìm ra Quán quân',
  },
  story: {
    summary: 'Sự cố mất điện khiến toàn bộ dữ liệu điểm số của Cuộc đua STEM bị mất. Cần thu thập kết quả 5 vòng để kịp thời công bố Quán quân.',
    groupLabel: 'Bảng thí sinh chung kết',
    missingData: 'Mất dữ liệu điểm',
  },
  prologue: {
    location: 'Sân thi đấu Cuộc đua STEM · Trường E·RASE',
    time: '16:30 · 40 phút trước giờ công bố quán quân',
    background: 'Chiều nay, trường đang tổ chức Cuộc đua STEM với 5 vòng thi hấp dẫn giữa 5 thí sinh xuất sắc nhất các khối lớp. Ban tổ chức đang ghi điểm trực tiếp thì bất ngờ mất điện toàn khu vực.',
    incident: 'Khi điện trở lại, toàn bộ dữ liệu máy chủ đã bị mất! Kết quả từng vòng đang nằm rải rác ở năm khu vực khác nhau. Thời gian công bố quán quân chỉ còn chưa đầy 40 phút. Nếu không nhanh chóng thu thập đủ kết quả từ 5 vòng, cuộc thi sẽ không thể có người thắng cuộc chính thức!',
    mission: [
      'Đến từng địa điểm, giải các thử thách Toán học để lấy lại kết quả từng vòng thi.',
      'Tổng hợp dữ liệu kết quả 4 vòng đầu để xác định danh sách các thí sinh dẫn đầu.',
      'Khôi phục máy chủ Ban tổ chức ở chặng 5, đối chiếu quy chế chung cuộc và tìm ra ai là quán quân thật sự trước khi hết giờ!'
    ]
  },
  rooms: [
    { no: '01', name: 'Khu Tính nhanh', source: 'VÒNG 1: TÍNH NHANH', object: 'Bảng bấm giờ điện tử', image: '/room_2/room-1.webp', note: 'Dữ liệu thời gian về đích vòng Tính nhanh bị kẹt ở một phép toán số học.', position: 'north', final: false, door: { x: 50, y: 27 }, facing: 'back' },
    { no: '02', name: 'Sân Đo đạc thực tế', source: 'VÒNG 2: ĐO ĐẠC', object: 'Sổ số liệu trắc địa', image: '/room_2/room-2.webp', note: 'Phiếu tính chu vi và diện tích thực địa cần được kiểm tra lại.', position: 'west', final: false, door: { x: 24, y: 50 }, facing: 'left' },
    { no: '03', name: 'Phòng Lập trình mini', source: 'VÒNG 3: LẬP TRÌNH', object: 'Mạch Micro:bit vòng 3', image: '/room_2/room-3.webp', note: 'Vi mạch lập trình điều khiển robot ghi nhận điểm số vòng 3.', position: 'east', final: false, door: { x: 76, y: 50 }, facing: 'right' },
    { no: '04', name: 'Mê cung Giải mã bản đồ', source: 'VÒNG 4: BẢN ĐỒ', object: 'Tọa độ mật mã vòng 4', image: '/room_2/room-4.webp', note: 'Mảnh bản đồ cuối cùng để xác định người dẫn đầu vòng 4.', position: 'south', final: false, door: { x: 50, y: 73 }, facing: 'front' },
    { no: '05', name: 'Ban Tổ chức', source: 'CHẶNG CUỐI: TỔNG KẾT', object: 'Biên bản quy chế chung cuộc', image: '/room_2/room-5.webp', note: 'Khôi phục máy chủ tổng để đọc quy chế xét Quán quân chính thức.', position: 'security', final: true, door: { x: 76, y: 73 }, facing: 'front', securityWarning: 'Máy chủ tính điểm bị ngắt mạch. Giải bài toán tổng kết để mở khóa quy chế chọn quán quân.' },
  ],
  people: [
    { id: 'minh', name: 'Minh', role: 'Lớp 7A', color: '#3b82f6', facts: { class: '7A', shirt: 'Xanh dương', specialty: 'Tính nhanh', style: 'Thi đấu cá nhân', gender: 'Nam', roundWon: 'Vòng 1 (Tính nhanh)' } },
    { id: 'lan', name: 'Lan', role: 'Lớp 8B', color: '#ef4444', facts: { class: '8B', shirt: 'Đỏ', specialty: 'Đo đạc thực tế', style: 'Thích làm việc nhóm', gender: 'Nữ', roundWon: 'Vòng 2 (Đo đạc)' } },
    { id: 'hung', name: 'Hùng', role: 'Lớp 6C', color: '#eab308', facts: { class: '6C', shirt: 'Vàng', specialty: 'Lập trình mini', style: 'Bình tĩnh, ít nói', gender: 'Nam', roundWon: 'Vòng 3 (Lập trình)' } },
    { id: 'mai', name: 'Mai', role: 'Lớp 7D', color: '#22c55e', facts: { class: '7D', shirt: 'Xanh lá', specialty: 'Giải mã bản đồ', style: 'Nhanh nhẹn, quyết đoán', gender: 'Nữ', roundWon: 'Vòng 4 (Giải mã)' } },
    { id: 'nam', name: 'Nam', role: 'Lớp 8A', color: '#f97316', facts: { class: '8A', shirt: 'Cam', specialty: 'Thử thách đồng đội', style: 'Hay hỗ trợ bạn khác', gender: 'Nam', roundWon: 'Không dẫn đầu' } },
  ],
  profileFields: [
    { key: 'shirt', label: 'Màu áo đội', icon: 'card', unlockClueIndex: 0 },
    { key: 'class', label: 'Lớp', icon: 'tag', unlockClueIndex: 1 },
    { key: 'specialty', label: 'Sở trường', icon: 'package' },
    { key: 'style', label: 'Phong cách thi đấu', icon: 'compass', fullWidth: true, unlockClueIndex: 2 },
    { key: 'gender', label: 'Giới tính', icon: 'clock', unlockClueIndex: 4 },
  ],
  clues: [
    {
      text: 'Vòng Tính nhanh: Người dẫn đầu vòng này mặc áo xanh dương.',
      shortLabel: 'V1: Áo xanh dương',
      unlockedNote: '✓ Minh dẫn đầu vòng Tính nhanh',
      rule: { field: 'shirt', operator: 'eq', value: 'Xanh dương' },
      matchPerson: () => true,
    },
    {
      text: 'Vòng Đo đạc thực tế: Người dẫn đầu vòng này là học sinh khối 8 và thích làm việc nhóm.',
      shortLabel: 'V2: Khối 8, thích làm việc nhóm',
      unlockedNote: '✓ Lan dẫn đầu vòng Đo đạc thực tế',
      rule: { field: 'class', operator: 'eq', value: '8B' },
      matchPerson: () => true,
    },
    {
      text: 'Vòng Lập trình mini: Người dẫn đầu vòng này có phong cách bình tĩnh, ít nói.',
      shortLabel: 'V3: Bình tĩnh, ít nói',
      unlockedNote: '✓ Hùng dẫn đầu vòng Lập trình mini',
      rule: { field: 'style', operator: 'eq', value: 'Bình tĩnh, ít nói' },
      matchPerson: () => true,
    },
    {
      text: 'Vòng Giải mã bản đồ: Người dẫn đầu vòng này có phong cách nhanh nhẹn, quyết đoán.',
      shortLabel: 'V4: Nhanh nhẹn, quyết đoán',
      unlockedNote: '✓ Mai dẫn đầu vòng Giải mã bản đồ (Nam không dẫn đầu vòng nào)',
      rule: { field: 'style', operator: 'eq', value: 'Nhanh nhẹn, quyết đoán' },
      matchPerson: (p) => p.facts.roundWon !== 'Không dẫn đầu',
    },
    {
      text: 'Quy chế chung cuộc: Quán quân phải là một trong những người đã dẫn đầu các vòng thi. Năm nay, quán quân không phải nam giới và không mặc áo màu đỏ.',
      shortLabel: 'Quy chế: Nữ & không mặc áo đỏ',
      unlockedNote: '✓ Dữ kiện quyết định Quán quân',
      rule: { field: 'shirt', operator: 'neq', value: 'Đỏ' },
      matchPerson: (p) => p.facts.roundWon !== 'Không dẫn đầu' && p.facts.gender !== 'Nam' && p.facts.shirt !== 'Đỏ',
    },
  ],
  logicHints: [
    'M1 xác định Minh (áo xanh dương) dẫn đầu vòng Tính nhanh.',
    'M2 xác định Lan (lớp 8B, thích làm việc nhóm) dẫn đầu vòng Đo đạc thực tế.',
    'M3 xác định Hùng (bình tĩnh, ít nói) dẫn đầu vòng Lập trình mini.',
    'M4 xác định Mai (nhanh nhẹn, quyết đoán) dẫn đầu vòng Giải mã bản đồ. Nam không dẫn đầu vòng nào.',
    'Quy chế M5 yêu cầu quán quân phải từng dẫn đầu một vòng thi (loại Nam). Quán quân không phải nam (loại Minh và Hùng). Quán quân không mặc áo đỏ (loại Lan).',
    'Chỉ còn lại Mai là quán quân thỏa mãn toàn bộ tiêu chí!',
  ],
  defaultQuestionIds: [29, 3, 7, 4, 18],
  finalRoomIndex: 4,
  finalPersonIndex: 3,
  conclusionQuestion: 'Ai là quán quân Cuộc đua STEM năm nay?',
  solvedDescription: 'Bạn đã thu thập đủ 5 kết quả vòng thi và tìm ra Quán quân xứng đáng nhất!',
  resolution: 'Mai (Lớp 7D) chính là Quán quân của Cuộc đua STEM! Sau 4 vòng thi, bốn thí sinh dẫn đầu gồm: Minh (Vòng 1), Lan (Vòng 2), Hùng (Vòng 3) và Mai (Vòng 4). Nam không dẫn đầu vòng nào nên bị loại. Theo quy chế chung cuộc tại chặng 5, quán quân không phải nam giới (loại Minh và Hùng), không mặc áo đỏ (loại Lan). Mai là người duy nhất thỏa mãn tất cả tiêu chí!',
} satisfies CaseDefinition;

export const CASE_03: CaseDefinition = {
  id: 'case-03',
  number: '03',
  title: 'Ai là Hero?',
  discoveredAt: '06:30',
  status: 'available',
  topicBadge: 'Logic ngoại phạm & Nhận dạng hiện trường',
  difficulty: 'Khó',
  estimatedTime: '20 - 25 phút',
  objective: {
    initial: 'Khám phá 5 địa điểm hiện trường để thu thập dấu vết Người Hùng',
    finalRoom: 'Mở khóa tủ dụng cụ tại chốt dân phòng (phòng 05)',
    conclusion: 'Đối chiếu các dấu vết và tìm ra người hùng giấu mặt',
  },
  story: {
    summary: 'Ba sự cố nguy hiểm trong đêm đã được một người hùng bí ẩn kịp thời xử lý an toàn rồi rời đi. Hãy giải mã các dấu vết để tìm ra người hùng!',
    groupLabel: 'Bảng nghi phạm người hùng',
    missingData: 'Danh tính Người Hùng',
  },
  prologue: {
    location: 'Khu phố An Bình · 3 điểm sự cố nguy hiểm',
    time: '06:30 sáng · Sau đêm xảy ra sự cố',
    background: 'Đêm qua, khu phố liên tiếp xảy ra ba sự cố nguy hiểm: biển quảng cáo chập điện, một người bán hàng rong bị ngã và một trụ đèn bị rò điện.',
    incident: 'Sáng hôm sau, mọi người mới biết các nguy cơ đã được xử lý kịp thời. Người bị nạn an toàn, khu vực nguy hiểm được phong tỏa, nhưng người đã âm thầm giúp đỡ mọi người lại biến mất không để lại danh tính. Tin đồn về một người hùng bí ẩn nhanh chóng lan khắp khu phố. Tại mỗi hiện trường, một dấu vết khác thường đang chờ được giải mã.',
    mission: [
      'Đến từng địa điểm, giải các thử thách Toán học để lấy lại dấu vết hiện trường.',
      'Đọc lời khai của các nhân chứng tại Ngã tư khu phố để đối chiếu vị trí và nhận dạng.',
      'Kết nối các manh mối, giải mã vật chứng tại Tủ dụng cụ và tìm ra ai là người hùng thật sự!'
    ]
  },
  rooms: [
    { no: '01', name: 'Bảng quảng cáo', source: 'HIỆN TRƯỜNG 1: BẢNG QUẢNG CÁO', object: 'Mảnh vải ở tủ điện', image: '/room_3/room-1.webp', note: 'Biển quảng cáo chập điện đã được ngắt cầu dao; cạnh tủ điện vướng một mảnh vải.', position: 'north', final: false, door: { x: 50, y: 27 }, facing: 'back' },
    { no: '02', name: 'Điểm sơ cứu', source: 'HIỆN TRƯỜNG 2: ĐIỂM SƠ CỨU', object: 'Băng gạc & nẹp sơ cứu', image: '/room_3/room-2.webp', note: 'Người bán hàng rong bị ngã đã được xử lý chấn thương và băng bó đúng phương pháp.', position: 'west', final: false, door: { x: 24, y: 50 }, facing: 'left' },
    { no: '03', name: 'Cột đèn đường', source: 'HIỆN TRƯỜNG 3: CỘT ĐÈN ĐƯỜNG', object: 'Dấu giày trên nền đất', image: '/room_3/room-3.webp', note: 'Trụ đèn rò điện đã được phong tỏa an toàn; dưới chân cột đèn còn in rõ dấu giày.', position: 'east', final: false, door: { x: 76, y: 50 }, facing: 'right' },
    {
      no: '04',
      name: 'Ngã tư khu phố',
      source: 'ĐỊA ĐIỂM 4: NGÃ TƯ KHU PHỐ',
      object: 'Lời khai nhân chứng',
      image: '/room_3/room-4.webp',
      note: 'Các nhân chứng có mặt gần ngã tư vào thời điểm xảy ra sự cố cung cấp những thông tin quan trọng.',
      position: 'south',
      final: false,
      door: { x: 50, y: 73 },
      facing: 'front',
      testimonies: [
        {
          witness: 'Bà Tư',
          role: 'Bán hủ tíu gõ',
          content: '“Tôi thấy rõ một người mặc đồ xanh đậm chạy xe máy đến gần cột đèn rồi xuống sửa. Tôi nghĩ là anh công an Dũng vì anh hay tuần tra khu này.”'
        },
        {
          witness: 'Anh Minh',
          role: 'Người đi xe máy ngang qua',
          content: '“Tôi nhìn thấy một người mặc áo xanh đen, đi bộ nhanh về phía bảng quảng cáo. Trông rất giống bác bảo vệ Hùng, vì bác hay tuần tra khu này vào ban đêm.”'
        }
      ]
    },
    {
      no: '05',
      name: 'Tủ dụng cụ',
      source: 'CHẶNG CUỐI: TỦ DỤNG CỤ',
      object: 'Chiếc đèn pin kim loại',
      image: '/room_3/room-5.webp',
      note: 'Tủ chứa đồ nghề tại chốt bảo vệ dân phòng có chứa vật dụng quan trọng của người hùng.',
      position: 'security',
      final: true,
      door: { x: 76, y: 73 },
      facing: 'front',
      securityWarning: 'Tủ dụng cụ bị khóa mật mã cơ khí. Giải bài toán để mở ngăn khóa và kiểm tra dấu vết trên đèn pin.'
    },
  ],
  people: [
    { id: 'hung', name: 'Bác Hùng', role: 'Bảo vệ', color: '#2563eb', facts: { job: 'Bảo vệ', outfit: 'Xanh đen', firstAid: 'Đã học', vehicle: 'Đi bộ', shoeSize: 41 } },
    { id: 'dung', name: 'Anh Dũng', role: 'Công an', color: '#16a34a', facts: { job: 'Công an', outfit: 'Xanh lá đậm', firstAid: 'Chuyên nghiệp', vehicle: 'Xe máy', shoeSize: 42 } },
    { id: 'lan', name: 'Cô Lan', role: 'Giáo viên', color: '#eab308', facts: { job: 'Giáo viên', outfit: 'Màu kem', firstAid: 'Đã học', vehicle: 'Xe đạp điện', shoeSize: 37 } },
    { id: 'vu', name: 'Anh Vũ', role: 'Ca sĩ', color: '#9333ea', facts: { job: 'Ca sĩ', outfit: 'Nhiều màu', firstAid: 'Chưa học', vehicle: 'Ô tô', shoeSize: 42 } },
    { id: 'phong', name: 'Chú Phong', role: 'Thợ điện', color: '#ea580c', facts: { job: 'Thợ điện', outfit: 'Cam phản quang', firstAid: 'Đã học', vehicle: 'Xe chuyên dụng', shoeSize: 39 } },
  ],
  profileFields: [
    { key: 'outfit', label: 'Trang phục', icon: 'card', unlockClueIndex: 0 },
    { key: 'firstAid', label: 'Sơ cứu', icon: 'heart', unlockClueIndex: 1 },
    { key: 'shoeSize', label: 'Cỡ giày', icon: 'footprints', unlockClueIndex: 2 },
    { key: 'vehicle', label: 'Di chuyển', icon: 'compass', unlockClueIndex: 3 },
    { key: 'job', label: 'Nghề nghiệp', icon: 'tag', fullWidth: true },
  ],
  clues: [
    {
      text: 'Bảng quảng cáo: Mảnh vải tối màu mắc ở cạnh tủ điện.',
      shortLabel: 'Mảnh vải tối màu',
      unlockedNote: '✓ Loại Chú Phong (đồng phục cam phản quang)',
      rule: { field: 'outfit', operator: 'neq', value: 'Cam phản quang' },
      matchPerson: (p) => p.facts.outfit !== 'Cam phản quang',
    },
    {
      text: 'Điểm sơ cứu: Người hùng đã được huấn luyện sơ cứu.',
      shortLabel: 'Đã học sơ cứu',
      unlockedNote: '✓ Loại Anh Vũ (chưa học sơ cứu)',
      rule: { field: 'firstAid', operator: 'neq', value: 'Chưa học' },
      matchPerson: (p) => p.facts.firstAid !== 'Chưa học',
    },
    {
      text: 'Cột đèn đường: Dấu giày dài khoảng 27–28 cm (tương đương cỡ giày từ 41 trở lên).',
      shortLabel: 'Dấu giày 27–28 cm (cỡ ≥ 41)',
      unlockedNote: '✓ Loại Cô Lan (cỡ 37) và Chú Phong (cỡ 39)',
      rule: { field: 'shoeSize', operator: 'gte', value: 41 },
      matchPerson: (p) => Number(p.facts.shoeSize) >= 41,
    },
    {
      text: 'Ngã tư khu phố: Đơn vị xác nhận Anh Dũng đang làm nhiệm vụ đột xuất ở nơi khác vào thời điểm xảy ra sự cố.',
      shortLabel: 'Dũng có ngoại phạm',
      unlockedNote: '✓ Loại Anh Dũng (ở nơi khác)',
      rule: { field: 'job', operator: 'neq', value: 'Công an' },
      matchPerson: (p) => p.id !== 'dung',
    },
    {
      text: 'Tủ dụng cụ: Đèn pin có vết khắc chữ ‘H’ và dấu hàn đặc trưng của bác bảo vệ.',
      shortLabel: 'Đèn pin khắc chữ H',
      unlockedNote: '✓ Xác nhận danh tính Người Hùng: Bác Hùng',
      rule: { field: 'name', operator: 'eq', value: 'Bác Hùng' },
      matchPerson: (p) => p.id === 'hung',
    },
  ],
  logicHints: [
    'M1 tìm thấy mảnh vải tối màu ở tủ điện, loại bỏ Chú Phong vì đồng phục của chú màu cam phản quang.',
    'M2 cho thấy người hùng đã được huấn luyện sơ cứu, loại trừ Anh Vũ (ca sĩ, chưa học sơ cứu).',
    'M3 dấu giày dài 27–28 cm (tương ứng cỡ giày 41–42), loại Cô Lan (cỡ 37) và Chú Phong (cỡ 39).',
    'M4 kết hợp lời khai nhân chứng và xác nhận ngoại phạm: Anh Dũng đang làm nhiệm vụ nơi khác, loại Anh Dũng.',
    'M5 chiếc đèn pin có khắc chữ "H" và dấu hàn đặc trưng xác nhận Bác Hùng là Người Hùng giấu mặt!',
  ],
  defaultQuestionIds: [29, 3, 7, 4, 18],
  finalRoomIndex: 4,
  finalPersonIndex: 0,
  conclusionQuestion: 'Ai là người hùng giấu mặt của khu phố?',
  solvedDescription: 'Bạn đã thu thập đủ 5 manh mối và xác định chính xác người hùng giấu mặt!',
  resolution: 'Bác Hùng (Bảo vệ) chính là Người Hùng thầm lặng của khu phố! Đêm qua khi tuần tra, bác đã kịp thời ngắt cầu dao biển quảng cáo chập điện (để lại mảnh vải tối màu xanh đen), sơ cứu người bán hàng rong bị ngã, rào chắn cột đèn rò điện an toàn (in dấu giày cỡ 41), và để lại chiếc đèn pin quen thuộc có khắc chữ "H" trong tủ dụng cụ chốt trực.',
} satisfies CaseDefinition;

export const CASES: readonly CaseDefinition[] = [CASE_01, CASE_02, CASE_03];

export function getCase(caseId: string) {
  return CASES.find(caseData => caseData.id === caseId);
}
