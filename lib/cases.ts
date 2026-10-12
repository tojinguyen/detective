export type Direction = 'front' | 'back' | 'left' | 'right';
export type FactValue = string | number;
export type RuleOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
export type ProfileIcon = 'ruler' | 'clock' | 'card' | 'package' | 'route' | 'trophy' | 'compass' | 'tag' | 'gem';

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

export const CASE_02 = {
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
    { no: '01', name: 'Khu Tính nhanh', source: 'VÒNG 1: TÍNH NHANH', object: 'Bảng bấm giờ điện tử', image: '/room-classroom.png', note: 'Dữ liệu thời gian về đích vòng Tính nhanh bị kẹt ở một phép toán số học.', position: 'north', final: false, door: { x: 50, y: 27 }, facing: 'back' },
    { no: '02', name: 'Sân Đo đạc thực tế', source: 'VÒNG 2: ĐO ĐẠC', object: 'Sổ số liệu trắc địa', image: '/room-archive.png', note: 'Phiếu tính chu vi và diện tích thực địa cần được kiểm tra lại.', position: 'west', final: false, door: { x: 24, y: 50 }, facing: 'left' },
    { no: '03', name: 'Phòng Lập trình mini', source: 'VÒNG 3: LẬP TRÌNH', object: 'Mạch Micro:bit vòng 3', image: '/detective-room.png', note: 'Vi mạch lập trình điều khiển robot ghi nhận điểm số vòng 3.', position: 'east', final: false, door: { x: 76, y: 50 }, facing: 'right' },
    { no: '04', name: 'Mê cung Giải mã bản đồ', source: 'VÒNG 4: BẢN ĐỒ', object: 'Tọa độ mật mã vòng 4', image: '/room-archive.png', note: 'Mảnh bản đồ cuối cùng để xác định người dẫn đầu vòng 4.', position: 'south', final: false, door: { x: 50, y: 73 }, facing: 'front' },
    { no: '05', name: 'Ban Tổ chức', source: 'CHẶNG CUỐI: TỔNG KẾT', object: 'Biên bản quy chế chung cuộc', image: '/room-security.png', note: 'Khôi phục máy chủ tổng để đọc quy chế xét Quán quân chính thức.', position: 'security', final: true, door: { x: 76, y: 73 }, facing: 'front', securityWarning: 'Máy chủ tính điểm bị ngắt mạch. Giải bài toán tổng kết để mở khóa quy chế chọn quán quân.' },
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

export const CASE_03 = {
  id: 'case-03',
  number: '03',
  title: 'Vụ trộm tại Phòng Nghiên cứu Đá quý',
  discoveredAt: '20:45',
  status: 'available',
  topicBadge: 'Logic tương quan & Hệ suy luận đan xen',
  difficulty: 'Nâng cao',
  estimatedTime: '20 - 25 phút',
  objective: {
    initial: 'Thu thập các manh mối tương quan giữa các nghi phạm',
    finalRoom: 'Mở khóa camera hồng ngoại tại buồng an ninh 05',
    conclusion: 'Đối chiếu các mối liên hệ và chỉ ra thủ phạm',
  },
  story: {
    summary: 'Viên pha lê quang phổ tím trong phòng nghiên cứu bị lấy cắp. 5 nhà khoa học có mặt tại tòa nhà đưa ra các dữ kiện so sánh đan xen nhau.',
    groupLabel: 'Đội nghiên cứu',
    missingData: 'Mất pha lê',
  },
  prologue: {
    location: 'Viện Nghiên cứu Đá quý & Khoáng sản Hoàng gia',
    time: '20:45 · 45 phút sau khi chuông báo động kích hoạt',
    background: 'Viên pha lê quang phổ tím - mẫu vật đo khúc xạ quý giá nhất của Viện - được bảo quản trong lồng kính hút chân không tại Phòng Thí nghiệm Tầng 3. Đúng 20:45, cảm biến quang học báo mất mẫu vật.',
    incident: 'Camera hành lang bị che khuất một phần. Các dấu vết để lại gồm chiều cao tương đối, thứ tự rời đi, tầng lầu làm việc và thiết bị mang theo đan xen nhau giữa 5 nhân sự có mặt trong tòa nhà vào buổi tối.',
    mission: [
      'Giải 5 bài toán nâng cao để giải mã dữ liệu hiện trường tại các phòng nghiên cứu.',
      'Xâu chuỗi các manh mối so sánh tương quan (chiều cao tương đối, thời gian rời viện, tầng làm việc và thiết bị).',
      'Loại trừ các đối tượng có chứng cứ ngoại phạm và vạch trần kẻ trộm viên pha lê!'
    ]
  },
  rooms: [
    { no: '01', name: 'Phòng Quang học', source: 'TẦNG 1: QUANG HỌC', object: 'Kính hiển vi phân tích', image: '/room-classroom.png', note: 'Dấu vân tay trên tủ kính phòng quang học đang chờ giải mã.', position: 'north', final: false, door: { x: 50, y: 27 }, facing: 'back' },
    { no: '02', name: 'Phòng Cơ khí', source: 'TẦNG 2: CƠ KHÍ', object: 'Khung cửa sổ xước', image: '/room-archive.png', note: 'Vết xước trên khung cửa sổ cho manh mối về chiều cao tương đối.', position: 'west', final: false, door: { x: 24, y: 50 }, facing: 'left' },
    { no: '03', name: 'Phòng Tinh thể', source: 'TẦNG 3: TINH THỂ', object: 'Vết bụi khoáng trên sàn', image: '/detective-room.png', note: 'Bụi khoáng huỳnh quang tiết lộ tầng làm việc của kẻ đột nhập.', position: 'east', final: false, door: { x: 76, y: 50 }, facing: 'right' },
    { no: '04', name: 'Kho Mẫu vật', source: 'TẦNG 3: KHO MẪU', object: 'Nhật ký xuất kho thiết bị', image: '/room-archive.png', note: 'Bản kê thiết bị xác nhận chứng cứ ngoại phạm của một nghi phạm.', position: 'south', final: false, door: { x: 50, y: 73 }, facing: 'front' },
    { no: '05', name: 'Buồng An ninh', source: 'CHẶNG CUỐI: BUỒNG AN NINH', object: 'Băng ghi hình hồng ngoại', image: '/room-security.png', note: 'Khôi phục hình ảnh hồng ngoại cửa sau để xác định thủ phạm.', position: 'security', final: true, door: { x: 76, y: 73 }, facing: 'front', securityWarning: 'Tín hiệu camera hồng ngoại bị nhiễu. Sửa biểu thức ma trận quang học để lấy hình ảnh cuối cùng.' },
  ],
  people: [
    { id: 'an', name: 'Tiến sĩ An', role: 'Chuyên gia Quang học', color: '#5b8296', facts: { height: 162, departed: '19:40', floor: 'Tầng 1', device: 'Kính lúp', route: 'Cửa sảnh' } },
    { id: 'binh', name: 'Kỹ sư Bình', role: 'Kỹ sư Cơ khí chính xác', color: '#a07c55', facts: { height: 170, departed: '20:05', floor: 'Tầng 2', device: 'Cặp tài liệu', route: 'Cầu thang' } },
    { id: 'chi', name: 'Thạc sĩ Chi', role: 'Nhà nghiên cứu Tinh thể', color: '#9b6c88', facts: { height: 166, departed: '20:20', floor: 'Tầng 3', device: 'Hộp huỳnh quang', route: 'Cầu thang' } },
    { id: 'dung', name: 'Chuyên viên Dũng', role: 'Kỹ thuật viên Quang phổ', color: '#688c6e', facts: { height: 175, departed: '20:15', floor: 'Tầng 2', device: 'Đèn cực tím', route: 'Thang máy' } },
    { id: 'en', name: 'Giám sát Én', role: 'Thanh tra Khoáng sản', color: '#b8944d', facts: { height: 168, departed: '20:35', floor: 'Tầng 3', device: 'Hộp mẫu đá', route: 'Cửa sau' } },
  ],
  profileFields: [
    { key: 'departed', label: 'Giờ rời viện', icon: 'clock', unlockClueIndex: 0 },
    { key: 'height', label: 'Chiều cao', icon: 'ruler', suffix: ' cm', unlockClueIndex: 1 },
    { key: 'floor', label: 'Tầng làm việc', icon: 'package', unlockClueIndex: 2 },
    { key: 'device', label: 'Thiết bị mang theo', icon: 'card', unlockClueIndex: 3 },
    { key: 'route', label: 'Lối ra', icon: 'route', fullWidth: true, unlockClueIndex: 4 },
  ],
  clues: [
    {
      text: 'Dấu vân tay trên tủ kính: Kẻ đột nhập rời khỏi viện nghiên cứu muộn hơn người làm việc ở Tầng 1 (Tiến sĩ An - 19:40).',
      shortLabel: 'Rời đi sau 19:40',
      unlockedNote: '✓ Loại trừ Tiến sĩ An (19:40)',
      rule: { field: 'departed', operator: 'gt', value: '19:40' },
      matchPerson: (p) => p.facts.departed > '19:40',
    },
    {
      text: 'Vết xước khung cửa sổ: Thủ phạm thấp hơn người mang Cặp tài liệu (Kỹ sư Bình - 170 cm), nhưng cao hơn người rời đi sớm nhất (An - 162 cm).',
      shortLabel: '162 cm < Cao < 170 cm',
      unlockedNote: '✓ Loại Kỹ sư Bình (170cm) và Chuyên viên Dũng (175cm)',
      rule: { field: 'height', operator: 'lt', value: 170 },
      matchPerson: (p) => Number(p.facts.height) > 162 && Number(p.facts.height) < 170,
    },
    {
      text: 'Bụi khoáng huỳnh quang: Dấu vết chỉ xuất hiện tại tầng làm việc cao hơn Tầng 2.',
      shortLabel: 'Làm việc ở Tầng 3',
      unlockedNote: '✓ Thủ phạm làm việc tại Tầng 3 (Chi hoặc Én)',
      rule: { field: 'floor', operator: 'eq', value: 'Tầng 3' },
      matchPerson: (p) => p.facts.floor === 'Tầng 3',
    },
    {
      text: 'Camera sảnh số 3: Người mang Hộp huỳnh quang (Thạc sĩ Chi) có chứng cứ ngoại phạm do đang kiểm định mẫu lúc 20:20.',
      shortLabel: 'Không mang Hộp huỳnh quang',
      unlockedNote: '✓ Loại trừ Thạc sĩ Chi',
      rule: { field: 'device', operator: 'neq', value: 'Hộp huỳnh quang' },
      matchPerson: (p) => p.facts.device !== 'Hộp huỳnh quang',
    },
    {
      text: 'Hình ảnh hồng ngoại buồng an ninh: Thủ phạm rời đi sau 20:30 và mang theo Hộp mẫu đá.',
      shortLabel: 'Sau 20:30 & Hộp mẫu đá',
      unlockedNote: '✓ Dữ kiện quyết định: Giám sát Én',
      rule: { field: 'device', operator: 'eq', value: 'Hộp mẫu đá' },
      matchPerson: (p) => p.facts.departed > '20:30' && p.facts.device === 'Hộp mẫu đá',
    },
  ],
  logicHints: [
    'M1 loại trừ Tiến sĩ An vì An rời đi lúc 19:40.',
    'M2: Thủ phạm thấp hơn Bình (170 cm) và cao hơn 162 cm. Điều này loại Bình (170 cm) và Dũng (175 cm). Chỉ còn Chi (166 cm) và Én (168 cm).',
    'M3 xác nhận cả Chi và Én đều làm việc ở Tầng 3.',
    'M4: Thạc sĩ Chi có chứng cứ ngoại phạm vì mang Hộp huỳnh quang. Điều này loại trừ Chi.',
    'M5 trích xuất hình ảnh hồng ngoại: Thủ phạm rời đi lúc 20:35 và mang theo Hộp mẫu đá.',
    'Giám sát Én là thủ phạm duy nhất thỏa mãn toàn bộ các manh mối tương quan!',
  ],
  defaultQuestionIds: [29, 3, 7, 4, 18],
  finalRoomIndex: 4,
  finalPersonIndex: 4,
  conclusionQuestion: 'Ai là người đã lấy cắp viên pha lê quang phổ tím?',
  solvedDescription: 'Bạn đã xâu chuỗi toàn bộ hệ thống manh mối đan xen và vạch trần thủ phạm!',
  resolution: 'Giám sát Én chính là thủ phạm! Qua các manh mối đan xen: thủ phạm rời đi sau 19:40 (loại An), có chiều cao nằm trong khoảng 163 - 169 cm (loại Bình 170cm và Dũng 175cm), làm việc ở Tầng 3. Thạc sĩ Chi có chứng cứ ngoại phạm vì mang Hộp huỳnh quang. Giám sát Én (cao 168 cm, Tầng 3, rời đi lúc 20:35 mang theo Hộp mẫu đá) là người duy nhất khớp toàn bộ các dữ kiện điều tra!',
} satisfies CaseDefinition;

export const CASES: readonly CaseDefinition[] = [CASE_01, CASE_02, CASE_03];

export function getCase(caseId: string) {
  return CASES.find(caseData => caseData.id === caseId);
}
