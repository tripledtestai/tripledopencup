import type {
  BotDifficulty,
  CampaignLevelConfig,
  CampaignModeType,
  CarLoadout,
  Giftcode,
  MapDefinition,
  PartItem,
  PartSlot,
  PartTier,
  PlayerTitleDefinition,
  PlayerTitleId,
  RaidBossConfig,
  RaidBossId,
  RankDefinition,
  StudentAccount,
  TuningLoadout,
  TuningPartItem,
  TuningPreset,
  TuningSlot,
} from './types.ts';

export const DEFAULT_ADMIN_PASSWORD = 'max123123de2';
export const GACHA_PITY_THRESHOLD = 20;

export const SLOT_LABELS: { slot: PartSlot; label: string; icon: string }[] = [
  { slot: 'chassis', label: '1. Khung Thân Xe', icon: '🏎️' },
  { slot: 'paint', label: '2. Màu Sơn & Chất Liệu', icon: '🎨' },
  { slot: 'decal', label: '3. Họa Tiết Thân Xe', icon: '⚡' },
  { slot: 'wheels', label: '4. Bánh Xe', icon: '🛞' },
  { slot: 'spoiler', label: '5. Cánh Gió & Nóc Xe', icon: '🪽' },
  { slot: 'underglow', label: '6. Đèn Gầm & Hào Quang', icon: '✨' },
  { slot: 'trail', label: '7. Vệt Bánh & Khói Xả', icon: '💨' },
];

export const TIER_COLORS: Record<
  PartTier,
  { bg: string; text: string; border: string; label: string }
> = {
  D: { bg: '#2C382A', text: '#CBD5E1', border: '#64748B', label: 'Hạng D' },
  C: { bg: '#1E3A2F', text: '#4ADE80', border: '#22C55E', label: 'Hạng C' },
  B: { bg: '#1E3A5F', text: '#60A5FA', border: '#3B82F6', label: 'Hạng B' },
  A: { bg: '#3B1F5E', text: '#C084FC', border: '#A855F7', label: 'Hạng A' },
  S: { bg: '#5C3D0E', text: '#FBBF24', border: '#F59E0B', label: 'Hạng S' },
  SS: { bg: '#5F1426', text: '#FB7185', border: '#F43F5E', label: 'Hạng SS (Thần Thoại)' },
  SSS: { bg: '#4A0E4E', text: '#FDE047', border: '#FACC15', label: 'Hạng SSS (Tối Thượng)' },
};

export const ALL_PARTS: PartItem[] = [
  // =========================================================================
  // SLOT 1: Khung Thân Xe (Chassis)
  // =========================================================================
  {
    id: 'chassis_kart',
    slot: 'chassis',
    name: 'Kart Tiêu Chuẩn',
    tier: 'D',
    price: 0,
    gachaOnly: false,
    description: 'Khung Go-Kart cơ bản.',
    visualKey: 'kart',
  },
  {
    id: 'chassis_buggy',
    slot: 'chassis',
    name: 'Buggy Địa Hình',
    tier: 'D',
    price: 20,
    gachaOnly: false,
    description: 'Khung ống thép vượt địa hình.',
    visualKey: 'buggy',
  },
  {
    id: 'chassis_coupe',
    slot: 'chassis',
    name: 'Coupe Thể Thao',
    tier: 'C',
    price: 40,
    gachaOnly: false,
    description: 'Thân xe khí động học đường phố.',
    visualKey: 'coupe',
  },
  {
    id: 'chassis_roadster',
    slot: 'chassis',
    name: 'Roadster Mui Trần',
    tier: 'C',
    price: 55,
    gachaOnly: false,
    description: 'Mui trần thể thao gọn nhẹ.',
    visualKey: 'roadster',
  },
  {
    id: 'chassis_f1',
    slot: 'chassis',
    name: 'Xe Đua F1 Khung Hở',
    tier: 'B',
    price: 80,
    gachaOnly: false,
    description: 'Thiết kế mũi nhọn công thức 1.',
    visualKey: 'f1',
  },
  {
    id: 'chassis_muscle',
    slot: 'chassis',
    name: 'Muscle Cơ Bắp',
    tier: 'B',
    price: 95,
    gachaOnly: false,
    description: 'Thân xe cơ bắp mũi dài hầm hố.',
    visualKey: 'muscle',
  },
  {
    id: 'chassis_armored',
    slot: 'chassis',
    name: 'Xe Bọc Thép Quân Sự',
    tier: 'A',
    price: 130,
    gachaOnly: false,
    description: 'Khung thép góc cạnh siêu cứng.',
    visualKey: 'armored',
  },
  {
    id: 'chassis_hypergt',
    slot: 'chassis',
    name: 'Siêu Xe Hyper GT',
    tier: 'A',
    price: 145,
    gachaOnly: false,
    description: 'Siêu xe khí động học rãnh gió kép.',
    visualKey: 'hypergt',
  },
  {
    id: 'chassis_project',
    slot: 'chassis',
    name: 'SIÊU PHẨM: Cyber-Vayne',
    tier: 'SSS',
    price: 0,
    gachaOnly: true,
    description: 'Chiến cơ Hologram dòng SIÊU PHẨM.',
    visualKey: 'project_cyber',
  },
  {
    id: 'chassis_poolparty',
    slot: 'chassis',
    name: 'Cá Mập Tiệc Bể Bơi',
    tier: 'SSS',
    price: 0,
    gachaOnly: true,
    description: 'Thủy phi cơ Cá Mập mùa hè.',
    visualKey: 'pool_shark',
  },
  {
    id: 'chassis_t1',
    slot: 'chassis',
    name: 'Thần Xa T1 Quỷ Vương',
    tier: 'SSS',
    price: 0,
    gachaOnly: true,
    description: 'Chiến xa Vô Địch Thế Giới T1.',
    visualKey: 't1_champion',
  },
  {
    id: 'chassis_biopod',
    slot: 'chassis',
    name: 'Chiến Xa Bio-Pod',
    tier: 'SS',
    price: 0,
    gachaOnly: true,
    description: 'Khoang lái sinh học phát sáng.',
    visualKey: 'biopod',
  },
  {
    id: 'chassis_ufo',
    slot: 'chassis',
    name: 'Đĩa Bay UFO',
    tier: 'SSS',
    price: 0,
    gachaOnly: true,
    description: 'Phi thuyền phản trọng lực 360°.',
    visualKey: 'ufo',
  },
  {
    id: 'chassis_dragon',
    slot: 'chassis',
    name: 'Siêu Xe Đầu Rồng Cyber',
    tier: 'SSS',
    price: 0,
    gachaOnly: true,
    description: 'Chiến xa giáp rồng cơ khí.',
    visualKey: 'dragon',
  },
  {
    id: 'chassis_tripled_a',
    slot: 'chassis',
    name: 'Chiến Xa Học Viện TripleD',
    tier: 'A',
    price: 0,
    gachaOnly: true,
    description: 'Chiến xa phiên bản Học Viện TripleD.',
    visualKey: 'tripled_student',
  },
  {
    id: 'chassis_tripled',
    slot: 'chassis',
    name: 'Thần Rừng TripleD: Cổ Thụ',
    tier: 'SSS',
    price: 0,
    gachaOnly: true,
    description: 'Khung xương lồng ngực cổ thụ Elderwood & lõi phổi phát sáng.',
    visualKey: 'tripled_elderwood',
  },

  // =========================================================================
  // SLOT 2: Màu Sơn & Chất Liệu (Paint)
  // =========================================================================
  {
    id: 'paint_red',
    slot: 'paint',
    name: 'Đỏ Tiêu Chuẩn',
    tier: 'D',
    price: 0,
    gachaOnly: false,
    description: 'Sơn đỏ nguyên bản.',
    visualKey: 'solid_red',
  },
  {
    id: 'paint_cobalt',
    slot: 'paint',
    name: 'Xanh Dương Cobalt',
    tier: 'D',
    price: 15,
    gachaOnly: false,
    description: 'Sơn xanh dương thể thao.',
    visualKey: 'cobalt',
  },
  {
    id: 'paint_metallic',
    slot: 'paint',
    name: 'Sơn Bóng Metallic',
    tier: 'C',
    price: 30,
    gachaOnly: false,
    description: 'Ánh kim xanh lục bảo.',
    visualKey: 'metallic',
  },
  {
    id: 'paint_sunset',
    slot: 'paint',
    name: 'Cam Hoàng Hôn',
    tier: 'C',
    price: 40,
    gachaOnly: false,
    description: 'Chuyển sắc cam đỏ rực rỡ.',
    visualKey: 'sunset',
  },
  {
    id: 'paint_carbon',
    slot: 'paint',
    name: 'Đen Nhám Carbon',
    tier: 'B',
    price: 60,
    gachaOnly: false,
    description: 'Sợi carbon đen nhám.',
    visualKey: 'carbon',
  },
  {
    id: 'paint_titanium',
    slot: 'paint',
    name: 'Bạc Titanium',
    tier: 'B',
    price: 75,
    gachaOnly: false,
    description: 'Hợp kim bạc ánh thép lạnh.',
    visualKey: 'titanium',
  },
  {
    id: 'paint_gradient',
    slot: 'paint',
    name: 'Gradient Xanh - Vàng',
    tier: 'A',
    price: 110,
    gachaOnly: false,
    description: 'Chuyển sắc Xanh sang Vàng.',
    visualKey: 'gradient',
  },
  {
    id: 'paint_amethyst',
    slot: 'paint',
    name: 'Tím Thạch Anh',
    tier: 'A',
    price: 125,
    gachaOnly: false,
    description: 'Tím pha lê ánh hồng neon.',
    visualKey: 'amethyst',
  },
  {
    id: 'paint_gold24k',
    slot: 'paint',
    name: 'Vàng Hoàng Kim 24K',
    tier: 'S',
    price: 200,
    gachaOnly: false,
    description: 'Mạ vàng 24K lấp lánh.',
    visualKey: 'gold24k',
  },
  {
    id: 'paint_project',
    slot: 'paint',
    name: 'Giáp Quang Học SIÊU PHẨM',
    tier: 'SS',
    price: 0,
    gachaOnly: true,
    description: 'Hợp kim Cyber Tím-Hồng-Xanh.',
    visualKey: 'project_neon',
  },
  {
    id: 'paint_poolparty',
    slot: 'paint',
    name: 'Sóng Biển Pool Party',
    tier: 'SS',
    price: 0,
    gachaOnly: true,
    description: 'Nước sơn Xanh Đại Dương & Nắng Vàng.',
    visualKey: 'pool_aqua',
  },
  {
    id: 'paint_t1',
    slot: 'paint',
    name: 'Sơn Hoàng Gia T1',
    tier: 'SS',
    price: 0,
    gachaOnly: true,
    description: 'Đỏ Huyết Long & Vàng Vô Địch T1.',
    visualKey: 't1_royal',
  },
  {
    id: 'paint_chroma',
    slot: 'paint',
    name: 'Đổi Màu Chroma RGB',
    tier: 'SS',
    price: 0,
    gachaOnly: true,
    description: 'Chuyển màu cầu vồng theo thời gian thực.',
    visualKey: 'chroma',
  },
  {
    id: 'paint_radioactive',
    slot: 'paint',
    name: 'Dạ Quang Phóng Xạ',
    tier: 'SSS',
    price: 0,
    gachaOnly: true,
    description: 'Phát quang xanh neon cực mạnh.',
    visualKey: 'radioactive',
  },
  {
    id: 'paint_tripled_a',
    slot: 'paint',
    name: 'Sơn Xanh Rêu Học Viện TripleD',
    tier: 'A',
    price: 0,
    gachaOnly: true,
    description: 'Nước sơn kem & xanh rêu TripleD.',
    visualKey: 'tripled_sage',
  },
  {
    id: 'paint_tripled',
    slot: 'paint',
    name: 'Vỏ Cổ Thụ & Lục Bảo Elderwood',
    tier: 'SS',
    price: 0,
    gachaOnly: true,
    description: 'Gỗ cổ thụ rêu phong kết hợp mạch nhựa sống lục bảo TripleD.',
    visualKey: 'tripled_bark',
  },

  // =========================================================================
  // SLOT 3: Họa Tiết Thân Xe (Decal)
  // =========================================================================
  {
    id: 'decal_none',
    slot: 'decal',
    name: 'Không Có Họa Tiết',
    tier: 'D',
    price: 0,
    gachaOnly: false,
    description: 'Bề mặt sơn nguyên bản.',
    visualKey: 'none',
  },
  {
    id: 'decal_number',
    slot: 'decal',
    name: 'Số Đua 88',
    tier: 'D',
    price: 15,
    gachaOnly: false,
    description: 'Phù hiệu số đua cổ điển.',
    visualKey: 'number88',
  },
  {
    id: 'decal_stripes',
    slot: 'decal',
    name: '2 Sọc Thể Thao',
    tier: 'C',
    price: 25,
    gachaOnly: false,
    description: 'Sọc trắng chạy dọc thân xe.',
    visualKey: 'stripes',
  },
  {
    id: 'decal_checkered',
    slot: 'decal',
    name: 'Cờ Đua Caro',
    tier: 'C',
    price: 35,
    gachaOnly: false,
    description: 'Họa tiết caro đen trắng hai bên.',
    visualKey: 'checkered',
  },
  {
    id: 'decal_flames',
    slot: 'decal',
    name: 'Ngọn Lửa',
    tier: 'B',
    price: 50,
    gachaOnly: false,
    description: 'Lửa đỏ cam bùng cháy từ mũi xe.',
    visualKey: 'flames',
  },
  {
    id: 'decal_camo',
    slot: 'decal',
    name: 'Rằn Ri Chiến Thuật',
    tier: 'B',
    price: 65,
    gachaOnly: false,
    description: 'Họa tiết rằn ri quân sự.',
    visualKey: 'camo',
  },
  {
    id: 'decal_lightning',
    slot: 'decal',
    name: 'Tia Chớp Vàng',
    tier: 'A',
    price: 90,
    gachaOnly: false,
    description: 'Tia sét vàng kim xé gió.',
    visualKey: 'lightning',
  },
  {
    id: 'decal_sharkteeth',
    slot: 'decal',
    name: 'Hàm Cá Mập Chiến',
    tier: 'A',
    price: 105,
    gachaOnly: false,
    description: 'Họa tiết nanh cá mập hung dữ.',
    visualKey: 'sharkteeth',
  },
  {
    id: 'decal_cells',
    slot: 'decal',
    name: 'Mạng Lưới Tế Bào',
    tier: 'S',
    price: 150,
    gachaOnly: false,
    description: 'Lục giác màng tế bào sinh học.',
    visualKey: 'cells',
  },
  {
    id: 'decal_project',
    slot: 'decal',
    name: 'Ấn Ký Lõi SIÊU PHẨM',
    tier: 'S',
    price: 0,
    gachaOnly: true,
    description: 'Biểu tượng tam giác PROJECT Hologram.',
    visualKey: 'project_crest',
  },
  {
    id: 'decal_poolparty',
    slot: 'decal',
    name: 'Hoa Dâm Bụt & Ván Lướt',
    tier: 'S',
    price: 0,
    gachaOnly: true,
    description: 'Sao biển và ván lướt sóng mùa hè.',
    visualKey: 'pool_tropical',
  },
  {
    id: 'decal_t1',
    slot: 'decal',
    name: 'Huy Hiệu Đôi Cánh T1',
    tier: 'SSS',
    price: 0,
    gachaOnly: true,
    description: 'Logo T1 & 5 sao Vô Địch Thế Giới.',
    visualKey: 't1_crest',
  },
  {
    id: 'decal_dna',
    slot: 'decal',
    name: 'Mạch Xoắn Kép ADN',
    tier: 'SSS',
    price: 0,
    gachaOnly: true,
    description: 'Chuỗi ADN phát sáng dọc thân xe.',
    visualKey: 'dna',
  },
  {
    id: 'decal_tripled_a',
    slot: 'decal',
    name: 'Huy Hiệu Phổi TripleD',
    tier: 'A',
    price: 0,
    gachaOnly: true,
    description: 'Logo chữ D Gothic & phổi sinh học TripleD Bậc A.',
    visualKey: 'tripled_emblem',
  },
  {
    id: 'decal_tripled',
    slot: 'decal',
    name: 'Ấn Ký Phổi Sinh Học Elderwood',
    tier: 'SSS',
    price: 0,
    gachaOnly: true,
    description: 'Lồng ngực cổ thụ & lá phổi rễ cây phát sáng TripleD.',
    visualKey: 'tripled_lungs',
  },

  // =========================================================================
  // SLOT 4: Bánh Xe (Wheels)
  // =========================================================================
  {
    id: 'wheels_standard',
    slot: 'wheels',
    name: 'Lốp Đen Thường',
    tier: 'D',
    price: 0,
    gachaOnly: false,
    description: 'Lốp cao su tiêu chuẩn.',
    visualKey: 'standard',
  },
  {
    id: 'wheels_offroad',
    slot: 'wheels',
    name: 'Lốp Gai Địa Hình',
    tier: 'D',
    price: 15,
    gachaOnly: false,
    description: 'Bánh gai bản rộng bám đường.',
    visualKey: 'offroad',
  },
  {
    id: 'wheels_whitewall',
    slot: 'wheels',
    name: 'Lốp Viền Trắng',
    tier: 'C',
    price: 25,
    gachaOnly: false,
    description: 'Lốp cổ điển viền trắng.',
    visualKey: 'whitewall',
  },
  {
    id: 'wheels_goldrim',
    slot: 'wheels',
    name: 'Mâm Đồng Hoàng Kim',
    tier: 'C',
    price: 35,
    gachaOnly: false,
    description: 'Mâm đúc ánh đồng thể thao.',
    visualKey: 'goldrim',
  },
  {
    id: 'wheels_redsport',
    slot: 'wheels',
    name: 'Lốp Thể Thao Viền Đỏ',
    tier: 'B',
    price: 50,
    gachaOnly: false,
    description: 'Mâm hợp kim viền đỏ F1.',
    visualKey: 'redsport',
  },
  {
    id: 'wheels_cybercyan',
    slot: 'wheels',
    name: 'Lốp Viền Xanh Cyan',
    tier: 'B',
    price: 65,
    gachaOnly: false,
    description: 'Mâm đèn LED xanh băng tốc độ.',
    visualKey: 'cybercyan',
  },
  {
    id: 'wheels_turboprop',
    slot: 'wheels',
    name: 'Mâm Cánh Quạt Turbo',
    tier: 'A',
    price: 100,
    gachaOnly: false,
    description: 'Mâm xoáy khí động học tím-vàng.',
    visualKey: 'turboprop',
  },
  {
    id: 'wheels_project',
    slot: 'wheels',
    name: 'Mâm Từ Trường SIÊU PHẨM',
    tier: 'SS',
    price: 0,
    gachaOnly: true,
    description: 'Bánh xe lõi xung lực Hextech.',
    visualKey: 'project_hex',
  },
  {
    id: 'wheels_poolparty',
    slot: 'wheels',
    name: 'Bánh Phao Cứu Sinh',
    tier: 'SS',
    price: 0,
    gachaOnly: true,
    description: 'Phao cứu sinh Đỏ-Trắng Tiệc Biển.',
    visualKey: 'pool_float',
  },
  {
    id: 'wheels_t1',
    slot: 'wheels',
    name: 'Mâm Vàng Vương Miện T1',
    tier: 'SS',
    price: 0,
    gachaOnly: true,
    description: 'Mâm chiến thần Vàng & Đỏ T1.',
    visualKey: 't1_gold',
  },
  {
    id: 'wheels_blueenergy',
    slot: 'wheels',
    name: 'Bánh Xe Năng Lượng Xanh',
    tier: 'SS',
    price: 0,
    gachaOnly: true,
    description: 'Lõi plasma xanh dương phát sáng.',
    visualKey: 'blueenergy',
  },
  {
    id: 'wheels_hellfire',
    slot: 'wheels',
    name: 'Bánh Xe Lửa Địa Ngục',
    tier: 'SSS',
    price: 0,
    gachaOnly: true,
    description: 'Bánh xe rực lửa dung nham.',
    visualKey: 'hellfire',
  },
  {
    id: 'wheels_tripled',
    slot: 'wheels',
    name: 'Mâm Rễ Cổ Thụ Đom Đóm',
    tier: 'SS',
    price: 0,
    gachaOnly: true,
    description: 'Bánh xe rễ cây Thần Rừng phát sáng tinh linh xanh ngọc.',
    visualKey: 'tripled_roots',
  },
  {
    id: 'wheels_tripled_a',
    slot: 'wheels',
    name: 'Mâm Xanh Rêu Học Viện TripleD',
    tier: 'A',
    price: 0,
    gachaOnly: true,
    description: 'Mâm thể thao xanh rêu viền lá vàng Học Viện TripleD.',
    visualKey: 'tripled_roots',
  },

  // =========================================================================
  // SLOT 5: Cánh Gió & Nóc Xe (Spoiler/Roof)
  // =========================================================================
  {
    id: 'spoiler_none',
    slot: 'spoiler',
    name: 'Không Gắn',
    tier: 'D',
    price: 0,
    gachaOnly: false,
    description: 'Đuôi xe nguyên bản.',
    visualKey: 'none',
  },
  {
    id: 'spoiler_antenna',
    slot: 'spoiler',
    name: 'Ăng-ten Cờ Đua',
    tier: 'D',
    price: 15,
    gachaOnly: false,
    description: 'Ăng-ten phát tín hiệu đuôi xe.',
    visualKey: 'antenna',
  },
  {
    id: 'spoiler_mini',
    slot: 'spoiler',
    name: 'Cánh Gió Nhỏ',
    tier: 'C',
    price: 30,
    gachaOnly: false,
    description: 'Cánh lướt gió thể thao gọn nhẹ.',
    visualKey: 'mini',
  },
  {
    id: 'spoiler_gtwing',
    slot: 'spoiler',
    name: 'Cánh Gió Thể Thao GT',
    tier: 'C',
    price: 45,
    gachaOnly: false,
    description: 'Cánh gió chữ V sơn viền đỏ.',
    visualKey: 'gtwing',
  },
  {
    id: 'spoiler_f1carbon',
    slot: 'spoiler',
    name: 'Cánh Gió Đôi F1 Carbon',
    tier: 'B',
    price: 70,
    gachaOnly: false,
    description: 'Cánh gió kép sợi carbon bản rộng.',
    visualKey: 'f1carbon',
  },
  {
    id: 'spoiler_roofscoop',
    slot: 'spoiler',
    name: 'Hốc Gió Nóc Xe',
    tier: 'B',
    price: 80,
    gachaOnly: false,
    description: 'Ống hút gió làm mát động cơ.',
    visualKey: 'roofscoop',
  },
  {
    id: 'spoiler_police',
    slot: 'spoiler',
    name: 'Đèn Cảnh Sát Xanh-Đỏ',
    tier: 'A',
    price: 100,
    gachaOnly: false,
    description: 'Đèn ưu tiên chớp xanh đỏ liên tục.',
    visualKey: 'police',
  },
  {
    id: 'spoiler_lasercannon',
    slot: 'spoiler',
    name: 'Pháo Quang Học Nóc Xe',
    tier: 'A',
    price: 120,
    gachaOnly: false,
    description: 'Tháp pháo năng lượng gắn nóc xe.',
    visualKey: 'lasercannon',
  },
  {
    id: 'spoiler_project',
    slot: 'spoiler',
    name: 'Cánh Kiếm Quang Năng PROJECT',
    tier: 'SSS',
    price: 0,
    gachaOnly: true,
    description: 'Cánh lưỡi kiếm laser Hồng-Xanh.',
    visualKey: 'project_wings',
  },
  {
    id: 'spoiler_poolparty',
    slot: 'spoiler',
    name: 'Đại Bác Súng Nước Kép',
    tier: 'SS',
    price: 0,
    gachaOnly: true,
    description: 'Cặp súng nước áp lực cao Tiệc Biển.',
    visualKey: 'pool_blaster',
  },
  {
    id: 'spoiler_t1',
    slot: 'spoiler',
    name: 'Đôi Cánh Quỷ Vương T1',
    tier: 'SSS',
    price: 0,
    gachaOnly: true,
    description: 'Đôi cánh Vàng & Đỏ vô địch T1.',
    visualKey: 't1_wings',
  },
  {
    id: 'spoiler_twinjet',
    slot: 'spoiler',
    name: 'Động Cơ Phản Lực Kép',
    tier: 'SS',
    price: 0,
    gachaOnly: true,
    description: 'Hai ống phóng phản lực cỡ lớn.',
    visualKey: 'twinjet',
  },
  {
    id: 'spoiler_biowings',
    slot: 'spoiler',
    name: 'Cánh Năng Lượng Sinh Học',
    tier: 'SSS',
    price: 0,
    gachaOnly: true,
    description: 'Đôi cánh ánh sáng quang hợp.',
    visualKey: 'biowings',
  },
  {
    id: 'spoiler_tripled',
    slot: 'spoiler',
    name: 'Đôi Cánh Sừng Hươu Elderwood',
    tier: 'SSS',
    price: 0,
    gachaOnly: true,
    description: 'Sừng linh thú Thần Rừng & cành lá cổ thụ TripleD phát quang.',
    visualKey: 'tripled_antlers',
  },
  {
    id: 'spoiler_tripled_a',
    slot: 'spoiler',
    name: 'Cánh Gió Lá Cây Học Viện TripleD',
    tier: 'A',
    price: 0,
    gachaOnly: true,
    description: 'Cánh gió học sinh TripleD điểm cành lá xanh.',
    visualKey: 'tripled_antlers',
  },

  // =========================================================================
  // SLOT 6: Đèn Gầm & Hào Quang (Underglow)
  // =========================================================================
  {
    id: 'underglow_none',
    slot: 'underglow',
    name: 'Không Có Đèn Gầm',
    tier: 'D',
    price: 0,
    gachaOnly: false,
    description: 'Tắt đèn gầm xe.',
    visualKey: 'none',
  },
  {
    id: 'underglow_warmamber',
    slot: 'underglow',
    name: 'Đèn Gầm Vàng Ấm',
    tier: 'D',
    price: 20,
    gachaOnly: false,
    description: 'Ánh sáng vàng hổ phách dịu mắt.',
    visualKey: 'warmamber',
  },
  {
    id: 'underglow_cyansonic',
    slot: 'underglow',
    name: 'Neon Xanh Băng',
    tier: 'C',
    price: 40,
    gachaOnly: false,
    description: 'Đèn LED gầm xanh băng giá.',
    visualKey: 'cyansonic',
  },
  {
    id: 'underglow_neongreen',
    slot: 'underglow',
    name: 'Neon Xanh Lá',
    tier: 'B',
    price: 60,
    gachaOnly: false,
    description: 'Đèn LED gầm xanh lá sinh học.',
    visualKey: 'neongreen',
  },
  {
    id: 'underglow_crimson',
    slot: 'underglow',
    name: 'Neon Đỏ Huyết',
    tier: 'B',
    price: 70,
    gachaOnly: false,
    description: 'Hào quang gầm đỏ rực chiến đấu.',
    visualKey: 'crimson',
  },
  {
    id: 'underglow_neonpurple',
    slot: 'underglow',
    name: 'Neon Tím / Đỏ',
    tier: 'A',
    price: 90,
    gachaOnly: false,
    description: 'Đèn gầm chuyển sắc Tím - Đỏ.',
    visualKey: 'neonpurple',
  },
  {
    id: 'underglow_dualpulse',
    slot: 'underglow',
    name: 'Vòng Xung Nhịp Kép',
    tier: 'A',
    price: 110,
    gachaOnly: false,
    description: 'Vòng hào quang kép Xanh-Vàng.',
    visualKey: 'dualpulse',
  },
  {
    id: 'underglow_project',
    slot: 'underglow',
    name: 'Ma Trận Hologram PROJECT',
    tier: 'SS',
    price: 0,
    gachaOnly: true,
    description: 'Vòng lục giác kỹ thuật số PROJECT.',
    visualKey: 'project_matrix',
  },
  {
    id: 'underglow_poolparty',
    slot: 'underglow',
    name: 'Hào Quang Xoáy Nước',
    tier: 'SS',
    price: 0,
    gachaOnly: true,
    description: 'Vòng gợn sóng đại dương & bọt nước.',
    visualKey: 'pool_splash',
  },
  {
    id: 'underglow_t1',
    slot: 'underglow',
    name: 'Hào Quang 5 Sao T1',
    tier: 'SSS',
    price: 0,
    gachaOnly: true,
    description: '5 ngôi sao vàng T1 xoay quanh xe.',
    visualKey: 't1_stars',
  },
  {
    id: 'underglow_lightning',
    slot: 'underglow',
    name: 'Từ Trường Giật Sét',
    tier: 'SS',
    price: 0,
    gachaOnly: true,
    description: 'Hồ quang điện phóng tia sét xanh.',
    visualKey: 'lightning',
  },
  {
    id: 'underglow_atp',
    slot: 'underglow',
    name: 'Vòng Xoáy Phân Tử ATP',
    tier: 'SSS',
    price: 0,
    gachaOnly: true,
    description: 'Hạt năng lượng ATP xoay quanh xe.',
    visualKey: 'atp',
  },
  {
    id: 'underglow_tripled',
    slot: 'underglow',
    name: 'Vòng Cổ Ngữ Thần Rừng TripleD',
    tier: 'SSS',
    price: 0,
    gachaOnly: true,
    description: 'Ma trận cổ ngữ Elderwood & lá phổi sinh học xoay quanh xe.',
    visualKey: 'tripled_runes',
  },
  {
    id: 'underglow_tripled_a',
    slot: 'underglow',
    name: 'Đèn Gầm Xanh Rêu Học Viện TripleD',
    tier: 'A',
    price: 0,
    gachaOnly: true,
    description: 'Hào quang xanh lục bảo học sinh TripleD.',
    visualKey: 'neongreen',
  },

  // =========================================================================
  // SLOT 7: Vệt Bánh Xe & Khói Xả (Trail Effect)
  // =========================================================================
  {
    id: 'trail_black',
    slot: 'trail',
    name: 'Vệt Lốp Đen',
    tier: 'D',
    price: 0,
    gachaOnly: false,
    description: 'Vệt cao su đen tiêu chuẩn.',
    visualKey: 'black',
  },
  {
    id: 'trail_dust',
    slot: 'trail',
    name: 'Khói Bụi Sa Mạc',
    tier: 'D',
    price: 20,
    gachaOnly: false,
    description: 'Bụi cát vàng cuốn theo lốp sau.',
    visualKey: 'dust',
  },
  {
    id: 'trail_whitesmoke',
    slot: 'trail',
    name: 'Khói Trắng Drift',
    tier: 'C',
    price: 45,
    gachaOnly: false,
    description: 'Cuộn khói trắng từ lốp sau.',
    visualKey: 'whitesmoke',
  },
  {
    id: 'trail_bluesmoke',
    slot: 'trail',
    name: 'Khói Xanh Băng Giá',
    tier: 'C',
    price: 55,
    gachaOnly: false,
    description: 'Luồng khói lạnh xanh băng.',
    visualKey: 'bluesmoke',
  },
  {
    id: 'trail_sparks',
    slot: 'trail',
    name: 'Tia Lửa Điện Vàng',
    tier: 'B',
    price: 75,
    gachaOnly: false,
    description: 'Tia lửa vàng sáng rực khi bật Nitro.',
    visualKey: 'sparks',
  },
  {
    id: 'trail_redfire',
    slot: 'trail',
    name: 'Lửa Đỏ Ống Xả',
    tier: 'A',
    price: 100,
    gachaOnly: false,
    description: 'Lửa đỏ cam phụt ra từ ống pô.',
    visualKey: 'redfire',
  },
  {
    id: 'trail_purpleplasma',
    slot: 'trail',
    name: 'Xung Lửa Tím Plasma',
    tier: 'A',
    price: 115,
    gachaOnly: false,
    description: 'Luồng plasma tím hồng tốc độ cao.',
    visualKey: 'purpleplasma',
  },
  {
    id: 'trail_project',
    slot: 'trail',
    name: 'Xung Nhịp PROJECT',
    tier: 'SS',
    price: 0,
    gachaOnly: true,
    description: 'Hạt khối dữ liệu Hologram Tím-Xanh.',
    visualKey: 'project_glitch',
  },
  {
    id: 'trail_poolparty',
    slot: 'trail',
    name: 'Bọt Biển & Bong Bóng',
    tier: 'SSS',
    price: 0,
    gachaOnly: true,
    description: 'Bong bóng xà phòng & tia nước biển.',
    visualKey: 'pool_bubbles',
  },
  {
    id: 'trail_t1',
    slot: 'trail',
    name: 'Vệt Lửa Hoàng Kim T1',
    tier: 'SS',
    price: 0,
    gachaOnly: true,
    description: 'Hào quang Đỏ Huyết Long & Vàng T1.',
    visualKey: 't1_flames',
  },
  {
    id: 'trail_spores',
    slot: 'trail',
    name: 'Bào Tử Phát Sáng',
    tier: 'SS',
    price: 0,
    gachaOnly: true,
    description: 'Bào tử sinh học xanh lục phát sáng.',
    visualKey: 'spores',
  },
  {
    id: 'trail_rainbow',
    slot: 'trail',
    name: 'Vệt Cầu Vồng Neon',
    tier: 'SSS',
    price: 0,
    gachaOnly: true,
    description: 'Dải ánh sáng 7 sắc cầu vồng.',
    visualKey: 'rainbow',
  },
  {
    id: 'trail_tripled',
    slot: 'trail',
    name: 'Tinh Linh Lá Rừng & Đom Đóm',
    tier: 'SS',
    price: 0,
    gachaOnly: true,
    description: 'Đom đóm tinh linh và lá cổ thụ Elderwood bay theo xe.',
    visualKey: 'tripled_wisps',
  },
  {
    id: 'trail_tripled_a',
    slot: 'trail',
    name: 'Khói Lá Xanh Học Viện TripleD',
    tier: 'A',
    price: 0,
    gachaOnly: true,
    description: 'Vệt hạt diệp lục & lá non Học Viện TripleD.',
    visualKey: 'tripled_wisps',
  },
];

export const DEFAULT_LOADOUT: CarLoadout = {
  chassis: 'chassis_kart',
  paint: 'paint_red',
  decal: 'decal_none',
  wheels: 'wheels_standard',
  spoiler: 'spoiler_none',
  underglow: 'underglow_none',
  trail: 'trail_black',
};

export const STARTER_OWNED_PARTS: string[] = [
  'chassis_kart',
  'paint_red',
  'decal_none',
  'wheels_standard',
  'spoiler_none',
  'underglow_none',
  'trail_black',
];

// 7 Bậc Rank Liên Quân
export const RANK_TIERS: RankDefinition[] = [
  {
    id: 'bronze',
    name: 'Đồng',
    minRP: 0,
    maxRP: 49,
    color: '#D97706',
    borderColor: '#92400E',
    badgeIcon: '🟫',
  },
  {
    id: 'silver',
    name: 'Bạc',
    minRP: 50,
    maxRP: 119,
    color: '#E2E8F0',
    borderColor: '#94A3B8',
    badgeIcon: '⬜',
  },
  {
    id: 'gold',
    name: 'Vàng',
    minRP: 120,
    maxRP: 219,
    color: '#FACC15',
    borderColor: '#CA8A04',
    badgeIcon: '🟨',
  },
  {
    id: 'platinum',
    name: 'Bạch Kim',
    minRP: 220,
    maxRP: 349,
    color: '#4ADE80',
    borderColor: '#16A34A',
    badgeIcon: '🟩',
  },
  {
    id: 'diamond',
    name: 'Kim Cương',
    minRP: 350,
    maxRP: 499,
    color: '#38BDF8',
    borderColor: '#0284C7',
    badgeIcon: '🟦',
  },
  {
    id: 'veteran',
    name: 'Tinh Anh',
    minRP: 500,
    maxRP: 699,
    color: '#C084FC',
    borderColor: '#9333EA',
    badgeIcon: '🟪',
  },
  {
    id: 'master',
    name: 'Thách Đấu',
    minRP: 700,
    maxRP: null,
    color: '#F43F5E',
    borderColor: '#F59E0B',
    badgeIcon: '🟥',
    glow: true,
  },
];

// 5 Bản Đồ Thi Đấu Đường Dài (each loop ~8500-10000 px perimeter so 1 lap is ~60s of rich racing, 10 checkpoints, 1 risky shortcut)
export const MAPS: MapDefinition[] = [
  {
    id: 'map_city',
    name: 'Map 1 – Thành Phố TripleD',
    subtitle: 'Đường nhựa tiêu chuẩn · Khe lốp xe chữ U & Cổng chắn laze mạo hiểm',
    theme: 'city',
    description:
      'Mặt đường nhựa xám chuẩn giải đấu với gờ giảm tốc xanh-vàng, đoạn cua chữ U gắt và lối tắt đi thẳng xuyên qua trận địa lốp xe zíc-zắc kết hợp cổng laze an ninh.',
    roadWidth: 230,
    friction: 0.96,
    bgColor: '#1E351B',
    roadColor: '#333942',
    roadBorderColor: '#94A3B8',
    kerbColors: ['#16A34A', '#FACC15'],
    waypoints: [
      { x: 0, y: 0 },
      { x: 750, y: 0 },
      { x: 1500, y: -40 },
      { x: 2200, y: -250 },
      { x: 2550, y: -800 },
      { x: 2450, y: -1550 },
      { x: 1850, y: -2000 },
      { x: 1100, y: -1950 },
      // Deep U-turn chicane (indices 8..12)
      { x: 600, y: -1400 },
      { x: 250, y: -950 },
      { x: -150, y: -1400 },
      { x: -550, y: -1950 },
      { x: -1350, y: -2000 },
      { x: -2100, y: -1650 },
      { x: -2450, y: -1000 },
      { x: -2350, y: -250 },
      { x: -1800, y: 300 },
      { x: -1150, y: 200 },
      { x: -650, y: 20 },
      { x: -250, y: 0 },
    ],
    checkpointIndices: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18],
    shortcut: {
      entryWaypointIndex: 7,
      exitWaypointIndex: 11,
      path: [
        { x: 1100, y: -1950 },
        { x: 300, y: -1950 },
        { x: -550, y: -1950 },
      ],
      label: 'Lối Tắt Trận Địa Lốp Xe & Cổng Laze',
      widthRatio: 0.55,
    },
    boostZones: [
      { x: 1100, y: -20, radius: 75, angle: 0 },
      { x: -1600, y: -1850, radius: 75, angle: Math.PI * 0.85 },
    ],
    naturalMudZones: [
      // Main track puddles
      { x: 2380, y: -1180, radius: 68 },
      { x: -2050, y: 50, radius: 68 },
    ],
    tireBarriers: [
      // Shortcut side guide posts (wide open driving lane)
      { x: 820, y: -2005, radius: 22 },
      { x: -380, y: -1895, radius: 22 },
      // Main track chicane & straight hazards
      { x: 1850, y: -190, radius: 25 },
      { x: 250, y: -1020, radius: 25 },
      { x: -1750, y: -1820, radius: 25 },
      { x: -1450, y: 260, radius: 25 },
    ],
    synapseGates: [
      // Security Laser Gate in the middle of the shortcut
      { x: 300, y: -1950, angle: Math.PI, width: 130, phaseOffset: 0.6 },
    ],
  },
  {
    id: 'map_aorta',
    name: 'Map 2 – Mạch Máu Cao Tốc',
    subtitle: 'Tông đỏ-hồng sinh học · Van tim co bóp & Mao mạch tắt huyết tương',
    theme: 'aorta',
    description:
      'Đường đua bên trong động mạch chủ với các dải mũi tên Dòng chảy huyết tương, các cụm tiểu cầu cản đường, van động mạch đóng mở và nhánh mao mạch tắt đầy dịch vị sinh học.',
    roadWidth: 240,
    friction: 0.97,
    bgColor: '#2B0912',
    roadColor: '#691428',
    roadBorderColor: '#FB7185',
    kerbColors: ['#F43F5E', '#FDE047'],
    waypoints: [
      { x: 0, y: 0 },
      { x: 850, y: 0 },
      { x: 1700, y: 120 },
      { x: 2450, y: -200 },
      { x: 2800, y: -900 },
      { x: 2500, y: -1650 },
      { x: 1750, y: -2150 },
      { x: 850, y: -2250 },
      { x: 0, y: -1900 },
      { x: -750, y: -2250 },
      { x: -1650, y: -2100 },
      { x: -2350, y: -1550 },
      { x: -2650, y: -750 },
      { x: -2300, y: 50 },
      { x: -1600, y: 450 },
      { x: -950, y: 350 },
      { x: -500, y: 120 },
      { x: -200, y: 0 },
      { x: -80, y: 0 },
      { x: -30, y: 0 },
    ],
    checkpointIndices: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18],
    shortcut: {
      entryWaypointIndex: 6,
      exitWaypointIndex: 10,
      path: [
        { x: 1750, y: -2150 },
        { x: 50, y: -1650 },
        { x: -1650, y: -2100 },
      ],
      label: 'Mao Mạch Tắt Huyết Tương (Van Co Bóp)',
      widthRatio: 0.52,
    },
    boostZones: [
      { x: 550, y: 0, radius: 85, angle: 0 },
      { x: 1350, y: 60, radius: 85, angle: 0.1 },
      { x: 2650, y: -550, radius: 85, angle: -1.3 },
      { x: 1300, y: -2200, radius: 85, angle: Math.PI },
      { x: -1200, y: -2180, radius: 85, angle: Math.PI },
      { x: -2500, y: -1150, radius: 85, angle: 1.7 },
      { x: -1950, y: 250, radius: 85, angle: 0.6 },
    ],
    naturalMudZones: [
      // Main artery slow pools
      { x: 2100, y: -40, radius: 72 },
      { x: -2480, y: -350, radius: 72 },
    ],
    tireBarriers: [
      // Shortcut shoulder markers (wide open driving lane)
      { x: 1220, y: -2035, radius: 24 },
      { x: -1150, y: -2015, radius: 24 },
      // Main artery obstacles
      { x: 2620, y: -1280, radius: 28 },
      { x: 0, y: -1960, radius: 26 },
      { x: -2000, y: -1820, radius: 28 },
      { x: -1280, y: 400, radius: 26 },
    ],
    acidZones: [],
    synapseGates: [
      // Main curve gate
      { x: 0, y: -1900, angle: Math.PI, width: 175, phaseOffset: 0.8 },
    ],
  },
  {
    id: 'map_swamp',
    name: 'Map 3 – Rừng Rậm Nguyên Sinh',
    subtitle: 'Bẫy bùn tự nhiên · Cầu gỗ mục & Lốc xoáy đầm lầy',
    theme: 'swamp',
    description:
      'Đường đua xuyên rừng ngập mặn với nhiều vũng bùn tự nhiên làm chậm 70% tốc độ, đầm độc axit và cây cầu gỗ mục lối tắt bị gió lốc thổi ngang.',
    roadWidth: 225,
    friction: 0.95,
    bgColor: '#112214',
    roadColor: '#3E3526',
    roadBorderColor: '#65A30D',
    kerbColors: ['#4D7C0F', '#A16207'],
    waypoints: [
      { x: 0, y: 0 },
      { x: 750, y: 0 },
      { x: 1550, y: -150 },
      { x: 2250, y: -550 },
      { x: 2450, y: -1250 },
      { x: 1950, y: -1900 },
      { x: 1150, y: -2150 },
      { x: 350, y: -1850 },
      { x: -350, y: -1850 },
      { x: -1150, y: -2150 },
      { x: -1950, y: -1850 },
      { x: -2400, y: -1150 },
      { x: -2200, y: -350 },
      { x: -1550, y: 200 },
      { x: -900, y: 250 },
      { x: -450, y: 80 },
      { x: -200, y: 10 },
      { x: -100, y: 0 },
      { x: -50, y: 0 },
      { x: -20, y: 0 },
    ],
    checkpointIndices: [0, 2, 4, 6, 7, 9, 11, 13, 15, 17],
    bridgeSegment: { startIdx: 7, endIdx: 8 },
    shortcut: {
      entryWaypointIndex: 5,
      exitWaypointIndex: 10,
      path: [
        { x: 1950, y: -1900 },
        { x: 950, y: -1580 },
        { x: 0, y: -1450 },
        { x: -950, y: -1580 },
        { x: -1950, y: -1850 },
      ],
      label: 'Cầu Gỗ Mục Lối Tắt Qua Sông (Gió Lốc & Đầm Độc)',
      widthRatio: 0.5,
    },
    boostZones: [
      { x: 0, y: -1850, radius: 70, angle: Math.PI },
    ],
    naturalMudZones: [
      // Main track swamp mud traps
      { x: 1200, y: -90, radius: 78 },
      { x: 2350, y: -900, radius: 82 },
      { x: 1550, y: -2050, radius: 78 },
      { x: -1550, y: -2000, radius: 85 },
      { x: -2300, y: -750, radius: 78 },
      { x: -1200, y: 220, radius: 78 },
    ],
    acidZones: [
      // Poisonous swamp gas pools on main curve
      { x: 750, y: -2000, radius: 75 },
      { x: -750, y: -2000, radius: 75 },
    ],
    crosswindZones: [
      // Gentle swamp river breeze
      { x: 0, y: -1450, radius: 185, forceAngle: -Math.PI / 2, strength: 180 },
    ],
    tireBarriers: [
      // Bridge entrance/exit side posts (wide clear racing lane)
      { x: 1150, y: -1700, radius: 22 },
      { x: -1150, y: -1700, radius: 22 },
      // Main track barriers
      { x: 1900, y: -350, radius: 26 },
      { x: -1850, y: -100, radius: 26 },
    ],
  },
  {
    id: 'map_dna',
    name: 'Map 4 – Xoắn Kép ADN',
    subtitle: 'Đường đua hình số 8 · Ngã tư giao cắt hỗn loạn & Liên kết Hydro Laze',
    theme: 'dna',
    description:
      'Cấu trúc mạch xoắn kép hình số 8 uốn lượn với điểm giao cắt chéo ngay chính giữa bản đồ, kết hợp cổng laze Liên kết Hydro và piston đột biến gen.',
    roadWidth: 230,
    friction: 0.96,
    bgColor: '#0F1E2E',
    roadColor: '#1E293B',
    roadBorderColor: '#38BDF8',
    kerbColors: ['#0284C7', '#F59E0B'],
    waypoints: [
      { x: 0, y: 0 },
      { x: 700, y: 0 },
      { x: 1550, y: -350 },
      { x: 2250, y: -950 },
      { x: 2350, y: -1750 },
      { x: 1700, y: -2300 },
      { x: 900, y: -2100 },
      { x: 250, y: -1450 },
      // Center figure-8 crossover
      { x: -250, y: -900 },
      { x: -950, y: -300 },
      { x: -1750, y: -200 },
      { x: -2350, y: -750 },
      { x: -2350, y: -1600 },
      { x: -1700, y: -2150 },
      { x: -900, y: -1950 },
      { x: -250, y: -1450 },
      { x: 250, y: -900 },
      { x: -350, y: -250 },
      { x: -450, y: 0 },
      { x: -180, y: 0 },
    ],
    checkpointIndices: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18],
    shortcut: {
      entryWaypointIndex: 3,
      exitWaypointIndex: 6,
      path: [
        { x: 2250, y: -950 },
        { x: 1550, y: -1550 },
        { x: 900, y: -2100 },
      ],
      label: 'Liên Kết Hydro Tắt (Cổng Laze & Piston Đột Biến)',
      widthRatio: 0.52,
    },
    boostZones: [
      { x: 0, y: -1175, radius: 90, angle: 2.3 },
      { x: 1550, y: -1550, radius: 75, angle: 2.4 },
    ],
    naturalMudZones: [
      { x: 2300, y: -1350, radius: 68 },
      { x: -2350, y: -1175, radius: 68 },
    ],
    acidZones: [
      // Main track crossover pool
      { x: -1300, y: -2050, radius: 78 },
    ],
    tireBarriers: [
      // Main figure-8 hazards
      { x: 1120, y: -175, radius: 26 },
      { x: -1350, y: -250, radius: 26 },
      { x: -2020, y: -1875, radius: 26 },
    ],
    synapseGates: [
      { x: 0, y: -1175, angle: 2.35, width: 185, phaseOffset: 1.8 },
    ],
    tarnPistons: [
      { x: 1820, y: -1320, angle: -0.7, pushForce: 200, radius: 65, phaseOffset: 0.2 },
    ],
  },
  {
    id: 'map_cryo',
    name: 'Map 5 – Phòng Thí Nghiệm Đóng Băng',
    subtitle: 'Sàn băng xanh lam ma sát thấp · Hành lang Nitơ lỏng & Bão tuyết',
    theme: 'cryo',
    description:
      'Sàn băng nitơ lỏng độ ma sát thấp khiến xe trượt (drift) dài ở các góc vuông 90 độ, kết hợp quạt gió hàn băng thổi ngang và hành lang tắt đóng băng.',
    roadWidth: 245,
    friction: 0.89, // Slippery cryo ice!
    bgColor: '#0B192C',
    roadColor: '#1E3E62',
    roadBorderColor: '#7DD3FC',
    kerbColors: ['#38BDF8', '#F8FAFC'],
    waypoints: [
      { x: 0, y: 0 },
      { x: 900, y: 0 },
      { x: 1900, y: 0 },
      // 90 deg corner 1
      { x: 2300, y: -100 },
      { x: 2350, y: -850 },
      { x: 2350, y: -1750 },
      // 90 deg corner 2
      { x: 2250, y: -2100 },
      { x: 1350, y: -2150 },
      { x: 400, y: -2150 },
      // Inner lab chicane
      { x: 350, y: -1350 },
      { x: -450, y: -1350 },
      { x: -500, y: -2150 },
      { x: -1450, y: -2150 },
      { x: -2300, y: -2050 },
      { x: -2350, y: -1150 },
      { x: -2300, y: -150 },
      { x: -1450, y: 0 },
      { x: -750, y: 0 },
      { x: -350, y: 0 },
      { x: -120, y: 0 },
    ],
    checkpointIndices: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18],
    shortcut: {
      entryWaypointIndex: 8,
      exitWaypointIndex: 11,
      path: [
        { x: 400, y: -2150 },
        { x: -50, y: -2150 },
        { x: -500, y: -2150 },
      ],
      label: 'Hành Lang Băng Nitơ Tắt (Cổng Laze & Piston Băng)',
      widthRatio: 0.48,
    },
    boostZones: [
      { x: 1400, y: 0, radius: 80, angle: 0 },
      { x: -1900, y: -1150, radius: 80, angle: 1.57 },
    ],
    naturalMudZones: [
      // Slushy liquid-nitrogen slow patches
      { x: 1800, y: -2150, radius: 75 },
      { x: -950, y: -2150, radius: 75 },
      { x: -50, y: -1350, radius: 72 },
    ],
    tireBarriers: [
      // Main cryo track chicanes
      { x: 2350, y: -1300, radius: 28 },
      { x: 900, y: -2110, radius: 28 },
      { x: -1850, y: -2110, radius: 28 },
      { x: -1100, y: -40, radius: 28 },
    ],
    crosswindZones: [
      // Cryo-blizzard turbine fans pushing drifting cars
      { x: -50, y: -2150, radius: 170, forceAngle: Math.PI / 2, strength: 160 },
      { x: 2350, y: -500, radius: 180, forceAngle: 0, strength: 430 },
      { x: -2350, y: -1600, radius: 180, forceAngle: Math.PI, strength: 430 },
    ],
    synapseGates: [],
    tarnPistons: [
      { x: 160, y: -2150, angle: -Math.PI / 2, pushForce: 200, radius: 65, phaseOffset: 0.0 },
    ],
  },
  // =========================================================================
  // MAP 6: MÊ CUNG NƠ-RON THẦN KINH (NEURAL SYNAPSE MAZE)
  // =========================================================================
  {
    id: 'map_synapse',
    name: 'Map 6 – Mê Cung Nơ-ron Thần Kinh',
    subtitle: 'Sợi trục thần kinh phát sáng · Cổng xung điện Laze đóng mở liên hoàn',
    theme: 'synapse',
    description:
      'Mạng lưới sợi trục thần kinh phát sáng xanh neon với chuỗi khúc cua chữ Z liên hoàn, nút thắt Khe Synapse và 3 Cổng Xung Điện Laze đóng mở liên hoàn trên đường tắt.',
    roadWidth: 220,
    friction: 0.97,
    bgColor: '#120B29',
    roadColor: '#0F1E3A',
    roadBorderColor: '#00F5D4',
    kerbColors: ['#00F5D4', '#7C3AED'],
    waypoints: [
      { x: 0, y: 0 },
      { x: 850, y: 0 },
      // Z-hairpin sequence 1 (East Dendrite)
      { x: 1750, y: -120 },
      { x: 2350, y: -650 },
      { x: 1500, y: -1050 },
      { x: 2450, y: -1550 },
      { x: 1750, y: -2150 },
      // Top Synapse Bottleneck & Hairpin
      { x: 900, y: -2150 },
      { x: 350, y: -1500 },
      { x: -250, y: -2150 },
      { x: -1050, y: -2150 },
      // Z-hairpin sequence 2 (West Axon)
      { x: -1850, y: -1850 },
      { x: -1200, y: -1300 },
      { x: -2300, y: -950 },
      { x: -1450, y: -400 },
      { x: -2200, y: 150 },
      // Return Axon Corridor
      { x: -1400, y: 380 },
      { x: -750, y: 120 },
      { x: -350, y: 0 },
      { x: -120, y: 0 },
    ],
    checkpointIndices: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18],
    bottleneckSegments: [
      { startIdx: 6, endIdx: 7 },
      { startIdx: 9, endIdx: 10 },
      { startIdx: 16, endIdx: 17 },
    ],
    shortcut: {
      entryWaypointIndex: 7,
      exitWaypointIndex: 10,
      path: [
        { x: 900, y: -2150 },
        { x: -75, y: -2150 },
        { x: -1050, y: -2150 },
      ],
      label: 'Khe Dẫn Truyền Nhảy Cóc (3 Cổng Laze Liên Hoàn)',
      widthRatio: 0.45,
    },
    boostZones: [
      { x: 550, y: 0, radius: 75, angle: 0 },
      { x: -1050, y: 240, radius: 75, angle: 0.25 },
    ],
    naturalMudZones: [
      { x: 1920, y: -850, radius: 68 },
      { x: -1750, y: -1120, radius: 68 },
    ],
    acidZones: [
      // Main track Z-bends pools (cleared from narrow shortcut)
      { x: 1980, y: -1300, radius: 72 },
      { x: -1820, y: -680, radius: 72 },
    ],
    tireBarriers: [
      // Main track Z-curve barriers (cleared 8 slalom barriers from shortcut)
      { x: 1300, y: -60, radius: 25 },
      { x: 350, y: -1560, radius: 25 },
      { x: -1520, y: -1580, radius: 25 },
    ],
    synapseGates: [
      { x: 1325, y: -2150, angle: Math.PI, width: 175, phaseOffset: 0.0 },
      { x: -75, y: -2150, angle: Math.PI, width: 140, phaseOffset: 1.5 },
      { x: 1950, y: -1850, angle: 2.4, width: 165, phaseOffset: 1.1 },
      { x: -1075, y: 250, angle: 0.35, width: 175, phaseOffset: 3.7 },
    ],
  },
  // =========================================================================
  // MAP 7: DẠ DÀY AXIT & NHU ĐỘNG RUỘT (GASTRIC ACID PIT)
  // =========================================================================
  {
    id: 'map_gastric',
    name: 'Map 7 – Dạ Dày Axit & Nhu Động Ruột',
    subtitle: 'Đường phân nhánh đôi · Hồ dịch vị axit, Gió nhu động & Cơ thắt dập ngang',
    theme: 'gastric',
    description:
      'Cấu trúc phân nhánh giữa bản đồ: Ngả ngoài đường sạch dài hơn 35% hoặc Ngả giữa đi xuyên qua Hồ Dịch Vị Axit sủi bọt, luồng Gió Nhu Động và Piston Cơ Thắt.',
    roadWidth: 235,
    friction: 0.95,
    bgColor: '#24070E',
    roadColor: '#4A1222',
    roadBorderColor: '#84CC16',
    kerbColors: ['#84CC16', '#E11D48'],
    waypoints: [
      { x: 0, y: 0 },
      { x: 850, y: 0 },
      { x: 1750, y: -80 },
      { x: 2500, y: -450 },
      { x: 2750, y: -1150 },
      { x: 2350, y: -1850 },
      // Split-Path Entry at index 6: Outer Clean Loop (indices 6..13) is 35% longer
      { x: 1650, y: -2150 },
      { x: 1200, y: -2850 },
      { x: 450, y: -3250 },
      { x: -450, y: -3250 },
      { x: -1200, y: -2850 },
      { x: -1650, y: -2150 },
      // Split-Path Merge at index 12..13
      { x: -2350, y: -1750 },
      { x: -2650, y: -1050 },
      { x: -2350, y: -300 },
      { x: -1650, y: 250 },
      { x: -950, y: 200 },
      { x: -450, y: 50 },
      { x: -180, y: 0 },
      { x: -50, y: 0 },
    ],
    checkpointIndices: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18],
    // Ngả Giữa (Đường tắt xuyên tâm qua Hồ Dịch Vị Axit & Gió Nhu Động)
    shortcut: {
      entryWaypointIndex: 6,
      exitWaypointIndex: 11,
      path: [
        { x: 1650, y: -2150 },
        { x: 850, y: -2150 },
        { x: 0, y: -2150 },
        { x: -850, y: -2150 },
        { x: -1650, y: -2150 },
      ],
      label: 'Ngả Giữa Xuyên Hồ Dịch Vị Axit & Cơ Thắt',
      widthRatio: 0.72,
    },
    boostZones: [
      { x: 1250, y: -40, radius: 80, angle: -0.08 },
      { x: 0, y: -3250, radius: 80, angle: Math.PI },
    ],
    naturalMudZones: [
      { x: 820, y: -3050, radius: 75 },
      { x: -820, y: -3050, radius: 75 },
      { x: -1300, y: 225, radius: 72 },
    ],
    tireBarriers: [
      // Outer loop barriers (cleared 10 barriers blocking the shortcut)
      { x: 450, y: -3210, radius: 26 },
      { x: -450, y: -3290, radius: 26 },
    ],
    acidZones: [
      // Scaled-down central shortcut warning pool & main track edge pockets
      { x: 0, y: -2210, radius: 60 },
      { x: 2150, y: -240, radius: 85 },
      { x: -2000, y: -20, radius: 85 },
    ],
    crosswindZones: [
      // Rebalanced peristaltic crosswind on shortcut (strength 160) and outer loops
      { x: 0, y: -2150, radius: 175, forceAngle: Math.PI / 2, strength: 160 },
      { x: 2620, y: -1500, radius: 180, forceAngle: 0, strength: 420 },
      { x: -2500, y: -1400, radius: 180, forceAngle: Math.PI, strength: 420 },
    ],
    tarnPistons: [
      // Pyloric Sphincter crushers on the shortcut (rebalanced pushForce 200)
      { x: 850, y: -2150, angle: -Math.PI / 2, pushForce: 200, radius: 75, phaseOffset: 0.2 },
      { x: -850, y: -2150, angle: Math.PI / 2, pushForce: 200, radius: 75, phaseOffset: 1.2 },
    ],
  },
  // =========================================================================
  // MAP 8: LỤC LẠP QUANG HỢP (CHLOROPLAST SOLAR CIRCUIT)
  // =========================================================================
  {
    id: 'map_chloroplast',
    name: 'Map 8 – Lục Lạp Quang Hợp',
    subtitle: 'Chồng túi Thylakoid phát sáng · Đệm Nhảy Vực Thẳm & Tia Quang Tử Laze',
    theme: 'chloroplast',
    description:
      'Mặt đường lục lạp xanh ngọc lục bảo với các chồng túi Thylakoid phát sáng vàng mặt trời, 3 Đệm Nhảy Lò Xo vượt khe vực (kể cả trên đường tắt) và Vùng Ánh Sáng Quang Hợp tự nạp Bình Nitro.',
    roadWidth: 235,
    friction: 0.97,
    bgColor: '#064E3B',
    roadColor: '#065F46',
    roadBorderColor: '#FACC15',
    kerbColors: ['#10B981', '#FACC15'],
    waypoints: [
      { x: 0, y: 0 },
      { x: 850, y: 0 },
      { x: 1700, y: -120 },
      { x: 2450, y: -550 },
      { x: 2650, y: -1300 },
      { x: 2150, y: -1950 },
      { x: 1300, y: -2250 },
      { x: 400, y: -2100 },
      { x: -450, y: -2250 },
      { x: -1350, y: -2100 },
      { x: -2150, y: -1650 },
      { x: -2550, y: -950 },
      { x: -2300, y: -150 },
      { x: -1600, y: 350 },
      { x: -900, y: 280 },
      { x: -420, y: 90 },
      { x: -180, y: 15 },
      { x: -90, y: 0 },
      { x: -45, y: 0 },
      { x: -15, y: 0 },
    ],
    checkpointIndices: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18],
    shortcut: {
      entryWaypointIndex: 5,
      exitWaypointIndex: 9,
      path: [
        { x: 2150, y: -1950 },
        { x: 350, y: -1650 },
        { x: -1350, y: -2100 },
      ],
      label: 'Cầu Màng Thylakoid Tắt (Nhảy Vực & Cổng Quang Tử)',
      widthRatio: 0.52,
    },
    boostZones: [
      { x: 600, y: 0, radius: 80, angle: 0 },
    ],
    naturalMudZones: [
      { x: 2050, y: -320, radius: 72 },
      { x: -1950, y: 100, radius: 72 },
    ],
    tireBarriers: [
      // Main track barriers (cleared 8 slalom barriers from Thylakoid shortcut)
      { x: 1700, y: -2100, radius: 26 },
      { x: 0, y: -2180, radius: 26 },
      { x: -2420, y: -1300, radius: 26 },
    ],
    jumpPads: [
      { x: 2530, y: -880, radius: 85, angle: -1.32 },
      { x: -880, y: -2180, radius: 85, angle: Math.PI - 0.15 },
      // Shortcut Chasm Jump Pad
      { x: 540, y: -1680, radius: 78, angle: 2.98 },
    ],
    chasmSegments: [
      { x: 2590, y: -1080, radius: 135, angle: -1.32 },
      { x: -1100, y: -2150, radius: 135, angle: Math.PI - 0.15 },
      // Shortcut Abyss Chasm right after the shortcut Jump Pad
      { x: 310, y: -1660, radius: 115, angle: 2.98 },
    ],
    synapseGates: [
      { x: 1280, y: -1805, angle: 2.98, width: 135, phaseOffset: 0.3 },
      { x: -550, y: -1890, angle: -2.88, width: 135, phaseOffset: 1.6 },
    ],
    solarZones: [
      { x: 1280, y: -60, radius: 155 },
      { x: 1750, y: -2100, radius: 155 },
      { x: 0, y: -2170, radius: 160 },
      { x: -1750, y: -1880, radius: 155 },
      { x: -2420, y: -550, radius: 155 },
      { x: -1250, y: 315, radius: 155 },
    ],
  },
  // =========================================================================
  // MAP 9: HÀNH TRÌNH XUYÊN CƠ THỂ – "AROUND THE BIO-WORLD" (3X MARATHON)
  // =========================================================================
  {
    id: 'map_bioworld',
    name: 'Map 9 – Hành Trình Xuyên Cơ Thể',
    subtitle: 'Bản đồ liên hoàn khổng lồ gấp 3 lần · 4 Quần xã sinh học nối tiếp',
    theme: 'bioworld',
    description:
      'Hành trình đại trường chinh dài gấp 3 lần bản đồ thường, đi xuyên qua 4 quần xã liên tiếp: Thành Phố & Động Mạch -> Đầm Lầy & Hồ Axit -> Đèo ADN & Nơ-ron Laze -> Phòng Thí Nghiệm Băng Giá.',
    roadWidth: 240,
    friction: 0.96,
    bgColor: '#09111E',
    roadColor: '#273449',
    roadBorderColor: '#38BDF8',
    kerbColors: ['#38BDF8', '#FACC15'],
    waypoints: [
      // CHẶNG 1 (Waypoints 0..9): Thành Phố TripleD & Cao Tốc Động Mạch
      { x: 0, y: 0 },
      { x: 1100, y: 0 },
      { x: 2200, y: 0 },
      { x: 3300, y: -150 },
      { x: 4350, y: -450 },
      { x: 5250, y: -1000 },
      { x: 5800, y: -1800 },
      { x: 5900, y: -2750 },
      { x: 5400, y: -3600 },
      { x: 4550, y: -4200 },
      // CHẶNG 2 (Waypoints 10..19): Rừng Đầm Lầy & Hồ Axit
      { x: 3550, y: -4500 },
      { x: 2500, y: -4650 },
      { x: 1450, y: -4350 },
      { x: 500, y: -4750 },
      { x: -500, y: -4950 },
      { x: -1550, y: -4750 },
      { x: -2550, y: -4350 },
      { x: -3550, y: -4650 },
      { x: -4550, y: -4400 },
      { x: -5350, y: -3800 },
      // CHẶNG 3 (Waypoints 20..29): Đèo Xoắn Kép ADN & Mê Cung Nơ-ron
      { x: -5850, y: -3000 },
      { x: -4950, y: -2450 },
      { x: -5950, y: -1850 },
      { x: -4850, y: -1250 },
      { x: -5800, y: -650 },
      { x: -4900, y: -50 },
      { x: -5550, y: 550 },
      { x: -4650, y: 1050 },
      { x: -3650, y: 950 },
      { x: -2800, y: 550 },
      // CHẶNG 4 (Waypoints 30..39): Phòng Thí Nghiệm Băng Giá Cryo-Lab
      { x: -2100, y: 950 },
      { x: -1250, y: 950 },
      { x: -1200, y: 250 },
      { x: -650, y: 250 },
      { x: -600, y: 750 },
      { x: 0, y: 750 },
      { x: 250, y: 400 },
      { x: -250, y: 120 },
      { x: -150, y: 0 },
      { x: -50, y: 0 },
    ],
    checkpointIndices: [0, 4, 8, 12, 16, 20, 24, 28, 32, 36],
    biomeSegments: [
      {
        startIdx: 0,
        endIdx: 9,
        theme: 'aorta',
        roadColor: '#581C2E',
        kerbColors: ['#F43F5E', '#FACC15'],
        label: 'CHẶNG 1: THÀNH PHỐ & ĐỘNG MẠCH',
      },
      {
        startIdx: 10,
        endIdx: 19,
        theme: 'gastric',
        roadColor: '#3F2E21',
        kerbColors: ['#84CC16', '#A16207'],
        label: 'CHẶNG 2: ĐẦM LẦY & HỒ AXIT',
      },
      {
        startIdx: 20,
        endIdx: 29,
        theme: 'synapse',
        roadColor: '#0F1E3A',
        kerbColors: ['#00F5D4', '#7C3AED'],
        label: 'CHẶNG 3: ĐÈO ADN & MÊ CUNG NƠ-RON',
      },
      {
        startIdx: 30,
        endIdx: 39,
        theme: 'cryo',
        roadColor: '#1E3E62',
        kerbColors: ['#38BDF8', '#F8FAFC'],
        label: 'CHẶNG 4: PHÒNG THÍ NGHIỆM BĂNG GIÁ',
      },
    ],
    shortcut: {
      entryWaypointIndex: 11,
      exitWaypointIndex: 17,
      path: [
        { x: 2500, y: -4650 },
        { x: 950, y: -4150 },
        { x: -500, y: -4100 },
        { x: -2050, y: -4150 },
        { x: -3550, y: -4650 },
      ],
      label: 'Đường Tắt Xuyên Đầm Axit & Piston Sinh Học',
      widthRatio: 0.65,
    },
    boostZones: [
      { x: 1650, y: 0, radius: 90, angle: 0 },
      { x: 4800, y: -720, radius: 90, angle: -0.55 },
      { x: 5650, y: -3180, radius: 90, angle: -1.9 },
      { x: -3200, y: 750, radius: 90, angle: 0.4 },
    ],
    naturalMudZones: [
      { x: 3000, y: -4580, radius: 95 },
      { x: 980, y: -4550, radius: 95 },
      { x: -2050, y: -4550, radius: 95 },
      { x: -4050, y: -4520, radius: 95 },
    ],
    tireBarriers: [
      // Biome 1 chicanes
      { x: 2750, y: -140, radius: 26 },
      { x: 2750, y: 20, radius: 26 },
      { x: 3800, y: -380, radius: 26 },
      { x: 3800, y: -220, radius: 26 },
      // Biome 4 cryo chicanes (cleared 8 barriers from shortcut)
      { x: -1650, y: 950, radius: 26 },
      { x: -920, y: 250, radius: 26 },
    ],
    acidZones: [
      // Main track swamp acid pool (cleared 3 pools from shortcut corridor)
      { x: 0, y: -4850, radius: 110 },
    ],
    crosswindZones: [
      { x: -500, y: -4950, radius: 210, forceAngle: -Math.PI / 2, strength: 450 },
      { x: -500, y: -4100, radius: 190, forceAngle: Math.PI / 2, strength: 160 },
      { x: -4950, y: -4100, radius: 195, forceAngle: Math.PI, strength: 430 },
    ],
    synapseGates: [
      { x: 950, y: -4150, angle: Math.PI, width: 160, phaseOffset: 0.4 },
      { x: -2050, y: -4150, angle: Math.PI, width: 160, phaseOffset: 1.9 },
      { x: -5400, y: -2725, angle: 2.6, width: 185, phaseOffset: 0.0 },
      { x: -5400, y: -1550, angle: 2.6, width: 185, phaseOffset: 1.7 },
      { x: -5350, y: -350, angle: 2.6, width: 185, phaseOffset: 3.3 },
    ],
    tarnPistons: [
      { x: 0, y: -4110, angle: -Math.PI / 2, pushForce: 200, radius: 75, phaseOffset: 0.0 },
      { x: -1000, y: -4110, angle: Math.PI / 2, pushForce: 200, radius: 75, phaseOffset: 1.0 },
    ],
  },
  // =========================================================================
  // MAP 10: ĐƯỜNG BĂNG SÂN BAY TRIPLED (AIRPORT DRAG & BLITZ STRIP)
  // =========================================================================
  {
    id: 'map_airport',
    name: 'Map 10 – Đường Băng Sân Bay TripleD',
    subtitle: 'Đường băng đêm rộng gấp đôi · Phản lực tạt ngang & Đường lăn U-Turn tử thần',
    theme: 'airport',
    description:
      'Đường băng sân bay ban đêm rộng gấp đôi đường thường với đèn dẫn đường nhấp nháy, luồng gió động cơ phản lực tạt ngang, đệm nhảy vượt hào và đường lăn tắt có cổng laze an ninh.',
    roadWidth: 440,
    friction: 0.98,
    bgColor: '#070B14',
    roadColor: '#1E2430',
    roadBorderColor: '#38BDF8',
    kerbColors: ['#F8FAFC', '#F59E0B'],
    waypoints: [
      // Outbound Ultra-Wide Drag Strip (West -> East at y = 0)
      { x: -2400, y: 0 },
      { x: -1400, y: 0 },
      { x: -400, y: 0 },
      { x: 600, y: 0 },
      { x: 1600, y: 0 },
      { x: 2600, y: 0 },
      { x: 3600, y: 0 },
      { x: 4600, y: 0 },
      // East End U-Turn Roundabout (Waypoints 8..11)
      { x: 5350, y: -180 },
      { x: 5650, y: -620 },
      { x: 5350, y: -1060 },
      // Return Blitz Strip with Chicanes & Jump Pads (East -> West at y = -1240)
      { x: 4600, y: -1240 },
      { x: 3600, y: -1240 },
      { x: 2600, y: -1240 },
      { x: 1600, y: -1240 },
      { x: 600, y: -1240 },
      { x: -400, y: -1240 },
      { x: -1400, y: -1240 },
      { x: -2400, y: -1240 },
      // West End Turnaround back to Start/Finish Line
      { x: -3150, y: -1060 },
      { x: -3450, y: -620 },
      { x: -3150, y: -180 },
    ],
    checkpointIndices: [0, 2, 4, 6, 8, 10, 12, 14, 16, 19],
    shortcut: {
      entryWaypointIndex: 7,
      exitWaypointIndex: 11,
      path: [
        { x: 4600, y: 0 },
        { x: 4950, y: -620 },
        { x: 4600, y: -1240 },
      ],
      label: 'Đường Lăn Quay Đầu Gắt (Cổng Laze & Luồng Phản Lực)',
      widthRatio: 0.45,
    },
    boostZones: [
      { x: -900, y: 0, radius: 110, angle: 0 },
      { x: 1100, y: 0, radius: 110, angle: 0 },
      { x: 3100, y: 0, radius: 110, angle: 0 },
      { x: 5650, y: -620, radius: 95, angle: -Math.PI / 2 },
    ],
    naturalMudZones: [
      // Aviation oil slicks on the runway (cleared from taxiway shortcut)
      { x: 100, y: -70, radius: 85 },
      { x: 2100, y: 75, radius: 85 },
    ],
    // Staggered Chicane Barriers on Outbound and Return Blitz Leg (cleared 8 barriers from taxiway shortcut)
    tireBarriers: [
      // Outbound high-speed chicane clusters
      { x: -150, y: 95, radius: 32 },
      { x: -150, y: 30, radius: 32 },
      { x: 1600, y: -95, radius: 32 },
      { x: 1600, y: -30, radius: 32 },
      { x: 3850, y: 95, radius: 32 },
      { x: 3850, y: 30, radius: 32 },
      // Return Blitz Leg staggered chicanes (y = -1240)
      { x: 3950, y: -1360, radius: 34 },
      { x: 3950, y: -1290, radius: 34 },
      { x: 3250, y: -1120, radius: 34 },
      { x: 3250, y: -1190, radius: 34 },
      { x: 1950, y: -1360, radius: 34 },
      { x: 1950, y: -1290, radius: 34 },
      { x: 1250, y: -1120, radius: 34 },
      { x: 1250, y: -1190, radius: 34 },
      { x: -750, y: -1360, radius: 34 },
      { x: -750, y: -1290, radius: 34 },
      { x: -1550, y: -1120, radius: 34 },
      { x: -1550, y: -1190, radius: 34 },
    ],
    crosswindZones: [
      // Jet Engine Blast zones (rebalanced taxiway shortcut blast to strength 170)
      { x: 4950, y: -620, radius: 175, forceAngle: 0, strength: 170 },
      { x: 2600, y: 0, radius: 210, forceAngle: -Math.PI / 2, strength: 440 },
      { x: 600, y: -1240, radius: 210, forceAngle: Math.PI / 2, strength: 440 },
    ],
    synapseGates: [
      // Runway Security Laser Gates on the Taxiway Shortcut
      { x: 4820, y: -390, angle: -1.05, width: 145, phaseOffset: 0.2 },
      { x: 4820, y: -850, angle: -2.09, width: 145, phaseOffset: 1.4 },
    ],
    jumpPads: [
      { x: 2600, y: -1240, radius: 110, angle: Math.PI },
      { x: -100, y: -1240, radius: 110, angle: Math.PI },
    ],
    chasmSegments: [
      { x: 2350, y: -1240, radius: 160, angle: Math.PI },
      { x: -350, y: -1240, radius: 160, angle: Math.PI },
    ],
  },
  // ===========================================================================
  // MAP 11: CẦU VỒNG CHUỖI POLYPEPTIDE (5-Pointed Intersecting Star + Glass Bridges)
  // ===========================================================================
  {
    id: 'map_polypeptide',
    name: 'Map 11 – Cầu Vồng Chuỗi Polypeptide',
    subtitle: 'Ngôi Sao 5 Cánh Đan Chéo · Cầu Kính Không Trọng Lực & Cổng Laze Peptid',
    theme: 'polypeptide',
    description:
      'Cấu trúc Ngôi Sao 5 Cánh đan chéo giữa không gian sinh học: 5 cạnh cầu kính không lan can có gió vũ trụ thổi ngang, 5 đỉnh cua gắt 180° và cầu nối tắt Peptid khóa bằng Laze & Piston.',
    roadWidth: 220,
    friction: 1.0,
    bgColor: '#050314',
    roadColor: '#25225C',
    roadBorderColor: '#38BDF8',
    kerbColors: ['#F472B6', '#38BDF8'],
    waypoints: [
      // Start on Arm 1 approaching Star Tip 1 (North Apex, elevation 0)
      { x: -320, y: -780, width: 195, cornerType: 'curve', elevation: 0, surfaceType: 'asphalt' },
      { x: -190, y: -1480, width: 255, cornerType: 'hairpin', elevation: 0, surfaceType: 'asphalt' },
      { x: 0, y: -1780, width: 285, cornerType: 'hairpin', elevation: 0, surfaceType: 'asphalt' },
      { x: 190, y: -1480, width: 255, cornerType: 'hairpin', elevation: 0, surfaceType: 'asphalt' },
      // Arm 1 -> Tip 3 (South-East): Zero-G Glass Underpass (elevation 0 all the way under Arm 3 & Arm 4)
      { x: 380, y: -620, width: 165, cornerType: 'curve', elevation: 0, surfaceType: 'glass', noGuardrail: true },
      { x: 680, y: 420, width: 165, cornerType: 'curve', elevation: 0, surfaceType: 'glass', noGuardrail: true },
      // Star Tip 3 (South-East 180° Hairpin, elevation 0)
      { x: 960, y: 1180, width: 260, cornerType: 'hairpin', elevation: 0, surfaceType: 'asphalt' },
      { x: 1180, y: 1520, width: 285, cornerType: 'hairpin', elevation: 0, surfaceType: 'asphalt' },
      { x: 760, y: 1380, width: 255, cornerType: 'hairpin', elevation: 0, surfaceType: 'asphalt' },
      // Arm 2 -> Tip 5 (North-West): Passes UNDER Arm 4 at (220, 820), then rises OVER Arm 5 at (-650, 0)
      { x: -40, y: 540, width: 165, cornerType: 'curve', elevation: 0, surfaceType: 'glass', noGuardrail: true },
      { x: -340, y: 220, width: 165, cornerType: 'curve', elevation: 1, surfaceType: 'glass', noGuardrail: true },
      { x: -860, y: -150, width: 165, cornerType: 'curve', elevation: 1, surfaceType: 'glass', noGuardrail: true },
      // Star Tip 5 (North-West 180° Hairpin, elevation 0 - South entry -> West apex -> North exit)
      { x: -1420, y: -320, width: 260, cornerType: 'hairpin', elevation: 0, surfaceType: 'asphalt' },
      { x: -1820, y: -520, width: 285, cornerType: 'hairpin', elevation: 0, surfaceType: 'asphalt' },
      { x: -1460, y: -680, width: 255, cornerType: 'hairpin', elevation: 0, surfaceType: 'asphalt' },
      // Arm 3 -> Tip 2 (North-East): Full Overpass Bridge (elevation 1 across BOTH Arm 5 and Arm 1)
      { x: -920, y: -560, width: 165, cornerType: 'curve', elevation: 1, surfaceType: 'glass', noGuardrail: true },
      { x: 0, y: -480, width: 165, cornerType: 'curve', elevation: 1, surfaceType: 'glass', noGuardrail: true },
      { x: 920, y: -560, width: 165, cornerType: 'curve', elevation: 1, surfaceType: 'glass', noGuardrail: true },
      // Star Tip 2 (North-East 180° Hairpin, elevation 0)
      { x: 1440, y: -680, width: 260, cornerType: 'hairpin', elevation: 0, surfaceType: 'asphalt' },
      { x: 1820, y: -520, width: 285, cornerType: 'hairpin', elevation: 0, surfaceType: 'asphalt' },
      { x: 1460, y: -240, width: 255, cornerType: 'hairpin', elevation: 0, surfaceType: 'asphalt' },
      // Arm 4 -> Tip 4 (South-West): Full Overpass Bridge (elevation 1 across BOTH Arm 1 and Arm 2)
      { x: 1020, y: 60, width: 165, cornerType: 'curve', elevation: 1, surfaceType: 'glass', noGuardrail: true },
      { x: 320, y: 560, width: 165, cornerType: 'curve', elevation: 1, surfaceType: 'glass', noGuardrail: true },
      { x: -320, y: 1000, width: 165, cornerType: 'curve', elevation: 1, surfaceType: 'glass', noGuardrail: true },
      // Star Tip 4 (South-West 180° Hairpin, elevation 0)
      { x: -960, y: 1420, width: 260, cornerType: 'hairpin', elevation: 0, surfaceType: 'asphalt' },
      { x: -1180, y: 1520, width: 285, cornerType: 'hairpin', elevation: 0, surfaceType: 'asphalt' },
      { x: -880, y: 1080, width: 255, cornerType: 'hairpin', elevation: 0, surfaceType: 'asphalt' },
      // Arm 5 -> Back to Tip 1 (North): Ground Underpass (elevation 0 all the way under Arm 2 & Arm 3)
      { x: -600, y: 160, width: 165, cornerType: 'curve', elevation: 0, surfaceType: 'glass', noGuardrail: true },
    ],
    checkpointIndices: [0, 2, 5, 7, 9, 13, 16, 19, 22, 25],
    shortcut: {
      entryWaypointIndex: 5,
      exitWaypointIndex: 9,
      path: [
        { x: 680, y: 420, width: 140, elevation: 0 },
        { x: 320, y: 480, width: 140, elevation: 0 },
        { x: -40, y: 540, width: 140, elevation: 0 },
      ],
      label: 'Cầu Nối Liên Kết Peptid (Cổng Laze & Piston Không Trọng Lực)',
      widthRatio: 0.52,
    },
    boostZones: [
      { x: 0, y: -1720, radius: 95, angle: 0, elevation: 0 },
      { x: 1120, y: 1460, radius: 95, angle: Math.PI * 0.75, elevation: 0 },
      { x: -1740, y: -520, radius: 95, angle: -Math.PI * 0.5, elevation: 0 },
      { x: 1740, y: -520, radius: 95, angle: Math.PI * 0.5, elevation: 0 },
      { x: -1120, y: 1460, radius: 95, angle: -Math.PI * 0.25, elevation: 0 },
    ],
    naturalMudZones: [],
    tireBarriers: [
      // Level 0 Star Hairpin apex obstacles (cleared 6 slalom barriers from shortcut)
      { x: 0, y: -1620, radius: 26, elevation: 0 },
      { x: 1020, y: 1380, radius: 26, elevation: 0 },
      { x: -1620, y: -520, radius: 26, elevation: 0 },
      { x: 1620, y: -520, radius: 26, elevation: 0 },
      // Level 1 Skyway Glass Bridge obstacles
      { x: -350, y: -510, radius: 24, elevation: 1 },
      { x: 350, y: -510, radius: 24, elevation: 1 },
      { x: 670, y: 310, radius: 24, elevation: 1 },
    ],
    crosswindZones: [
      // Cosmic solar wind (rebalanced shortcut crosswind to strength 160)
      { x: 530, y: -100, radius: 175, forceAngle: 0, strength: 430 },
      { x: 0, y: -480, radius: 175, forceAngle: -Math.PI / 2, strength: 430 },
      { x: 320, y: 480, radius: 160, forceAngle: Math.PI / 2, strength: 160 },
    ],
    synapseGates: [
      // Peptide Laser Locks on the shortcut & star arms
      { x: 420, y: 463, angle: 2.98, width: 135, phaseOffset: 0.0 },
      { x: -600, y: 160, angle: -1.25, width: 150, phaseOffset: 0.8 },
    ],
    tarnPistons: [
      { x: 320, y: 480, angle: -Math.PI / 2, pushForce: 200, radius: 75, phaseOffset: 0.5 },
    ],
  },
  // ===========================================================================
  // MAP 12: DÂY CHUYỀN DỊCH MÃ RIBOSOME (Manhattan 90° Zig-Zag Grid + Conveyors + Pistons)
  // ===========================================================================
  {
    id: 'map_ribosome',
    name: 'Map 12 – Dây Chuyền Dịch Mã Ribosome',
    subtitle: 'Bàn Cờ Vuông Góc 90° Manhattan · Băng Chuyền mARN & Piston tARN 2 Giây',
    theme: 'ribosome',
    description:
      'Nhà máy sinh học Manhattan gồm 100% hành lang thẳng cắt nhau vuông góc 90°. Băng chuyền mARN chia nửa tốc độ (+35% / -35%) và Hành Lang Exon Tốc Hành gắn chuỗi 3 Piston tARN + Cổng Laze.',
    roadWidth: 240,
    friction: 1.0,
    bgColor: '#070D17',
    roadColor: '#1E3448',
    roadBorderColor: '#34D399',
    kerbColors: ['#10B981', '#FACC15'],
    waypoints: [
      // Corridor 1: West Vertical Straight (South -> North, width 240, elevation 0)
      { x: -1750, y: 900, width: 240, cornerType: 'sharp', elevation: 0, surfaceType: 'conveyor' },
      { x: -1750, y: -200, width: 240, cornerType: 'sharp', elevation: 0, surfaceType: 'conveyor' },
      { x: -1750, y: -1300, width: 240, cornerType: 'sharp', elevation: 0, surfaceType: 'conveyor' },
      // 90° Right Turn into North Horizontal Alley (width 165, elevation 0)
      { x: -450, y: -1300, width: 165, cornerType: 'sharp', elevation: 0, surfaceType: 'asphalt' },
      // 90° Down Turn into Mid-West Vertical Drop (width 240, elevation 0)
      { x: -450, y: -300, width: 240, cornerType: 'sharp', elevation: 0, surfaceType: 'conveyor' },
      // 90° Left Turn into Zig-Zag Step 1 (width 165, elevation 0)
      { x: -850, y: -300, width: 165, cornerType: 'sharp', elevation: 0, surfaceType: 'asphalt' },
      // 90° Down Turn into South-West Pocket (width 240, Underpass elevation 0 under y=200 bridge)
      { x: -850, y: 700, width: 240, cornerType: 'sharp', elevation: 0, surfaceType: 'asphalt' },
      // 90° Right Turn into Central mARN Assembly Line (width 240, elevation 0)
      { x: 200, y: 700, width: 240, cornerType: 'sharp', elevation: 0, surfaceType: 'conveyor' },
      // 90° Up Turn along Central Vertical Shaft (width 240, Underpass elevation 0 under y=200 bridge)
      { x: 200, y: -400, width: 240, cornerType: 'sharp', elevation: 0, surfaceType: 'conveyor' },
      { x: 200, y: -1300, width: 240, cornerType: 'sharp', elevation: 0, surfaceType: 'conveyor' },
      // 90° Right Turn to East Wing (width 165, elevation 0)
      { x: 1500, y: -1300, width: 165, cornerType: 'sharp', elevation: 0, surfaceType: 'asphalt' },
      // 90° Down Turn along East Vertical Corridor (width 240, elevation 0)
      { x: 1500, y: -100, width: 240, cornerType: 'sharp', elevation: 0, surfaceType: 'conveyor' },
      // 90° Left Turn into East Zig-Zag Alley (width 165, elevation 0)
      { x: 1160, y: -100, width: 165, cornerType: 'sharp', elevation: 0, surfaceType: 'asphalt' },
      // 90° Down Turn to South-East Loop (width 240, elevation 0)
      { x: 1160, y: 1200, width: 240, cornerType: 'sharp', elevation: 0, surfaceType: 'asphalt' },
      { x: 800, y: 1200, width: 210, cornerType: 'sharp', elevation: 0, surfaceType: 'asphalt' },
      // 90° Up Turn along x=800 to Skyway Approach Corner at (800, 200)
      { x: 800, y: 200, width: 195, cornerType: 'sharp', elevation: 0, surfaceType: 'asphalt' },
      // Straight Horizontal Up-Ramp (800->460) & Skyway Overpass Bridge at y=200 crossing OVER x=200 and x=-850
      { x: 460, y: 200, width: 185, cornerType: 'sharp', elevation: 1, surfaceType: 'glass' },
      { x: -320, y: 200, width: 185, cornerType: 'sharp', elevation: 1, surfaceType: 'glass' },
      { x: -1080, y: 200, width: 185, cornerType: 'sharp', elevation: 1, surfaceType: 'glass' },
      // Straight Horizontal Down-Ramp (-1080->-1420) descending to Ground Level (elevation 0)
      { x: -1420, y: 200, width: 195, cornerType: 'sharp', elevation: 0, surfaceType: 'asphalt' },
      // 90° South Turn along x=-1420 to South-West Finish Connector (elevation 0)
      { x: -1420, y: 1200, width: 215, cornerType: 'sharp', elevation: 0, surfaceType: 'asphalt' },
      { x: -1750, y: 1200, width: 240, cornerType: 'sharp', elevation: 0, surfaceType: 'asphalt' },
    ],
    checkpointIndices: [0, 2, 4, 6, 8, 10, 13, 15, 17, 20],
    shortcut: {
      entryWaypointIndex: 10,
      exitWaypointIndex: 13,
      path: [
        { x: 1500, y: -1300, width: 140, elevation: 0 },
        { x: 1500, y: 1200, width: 140, elevation: 0 },
        { x: 1160, y: 1200, width: 140, elevation: 0 },
      ],
      label: 'Hành Lang Exon Tốc Hành (Chuỗi 3 Piston & Cổng Laze)',
      widthRatio: 0.52,
    },
    boostZones: [
      { x: -1750, y: 350, radius: 95, angle: -Math.PI / 2, elevation: 0 },
      { x: 200, y: -850, radius: 95, angle: -Math.PI / 2, elevation: 0 },
      { x: -320, y: 200, radius: 90, angle: Math.PI, elevation: 1 },
    ],
    naturalMudZones: [],
    acidZones: [
      // Main track bend pool (cleared 2 acid pools from shortcut corridor)
      { x: -325, y: 700, radius: 75 },
    ],
    tireBarriers: [
      // Main factory grid obstacles (cleared 8 slalom barriers from Exon Express shortcut)
      { x: -1100, y: -1300, radius: 25, elevation: 0 },
      { x: 850, y: -1300, radius: 25, elevation: 0 },
      { x: 1160, y: 550, radius: 25, elevation: 0 },
      { x: 60, y: 200, radius: 24, elevation: 1 },
      { x: -700, y: 200, radius: 24, elevation: 1 },
    ],
    conveyorBelts: [
      { startIdx: 0, endIdx: 2, boostMultiplier: 1.35, dragMultiplier: 0.65 },
      { startIdx: 7, endIdx: 9, boostMultiplier: 1.35, dragMultiplier: 0.65 },
      { startIdx: 10, endIdx: 11, boostMultiplier: 1.35, dragMultiplier: 0.65 },
    ],
    synapseGates: [
      { x: 1500, y: 280, angle: Math.PI / 2, width: 140, phaseOffset: 0.2 },
    ],
    tarnPistons: [
      { x: -1750, y: -1300, angle: Math.PI / 4, pushForce: 460, radius: 95, phaseOffset: 0.0 },
      { x: -450, y: -300, angle: -Math.PI / 2, pushForce: 460, radius: 95, phaseOffset: 0.5 },
      { x: -850, y: 700, angle: 0, pushForce: 460, radius: 95, phaseOffset: 1.0 },
      { x: 200, y: -1300, angle: Math.PI / 2, pushForce: 460, radius: 95, phaseOffset: 1.5 },
      { x: 1500, y: -100, angle: Math.PI, pushForce: 460, radius: 95, phaseOffset: 0.3 },
      { x: 1500, y: 550, angle: 0, pushForce: 200, radius: 75, phaseOffset: 0.9 },
      { x: 1500, y: 1100, angle: Math.PI, pushForce: 200, radius: 75, phaseOffset: 1.6 },
      { x: 1160, y: 1200, angle: -Math.PI / 2, pushForce: 460, radius: 95, phaseOffset: 1.2 },
    ],
  },
  // ===========================================================================
  // MAP 13: ỐC TAI TIỀN ĐÌNH XOẮN ỐC (Nautilus Spiral 3 Loops + Skyway Overpass)
  // ===========================================================================
  {
    id: 'map_cochlea',
    name: 'Map 13 – Ốc Tai Tiền Đình Xoắn Ốc',
    subtitle: 'Xoắn Ốc Nautilus 3 Vòng Đồng Tâm · Sóng Âm Tạt Ngang & Ống Bán Khuyên Tắt',
    theme: 'cochlea',
    description:
      'Đường đua xoắn ốc từ vành ngoài (320px) thu hẹp dần qua 3 vòng xoáy vào tâm (155px) với sóng xung kích âm thanh, cổng cộng hưởng laze và Ống Bán Khuyên Tắt.',
    roadWidth: 260,
    friction: 1.04,
    bgColor: '#03091C',
    roadColor: '#193566',
    roadBorderColor: '#38BDF8',
    kerbColors: ['#38BDF8', '#FDE047'],
    waypoints: [
      // Loop 1: Outer Rim (width 320 -> 285, elevation 0)
      { x: -1850, y: -300, width: 320, cornerType: 'curve', elevation: 0, surfaceType: 'acoustic_bowl' },
      { x: -1500, y: -1450, width: 315, cornerType: 'curve', elevation: 0, surfaceType: 'acoustic_bowl' },
      { x: 0, y: -1850, width: 310, cornerType: 'curve', elevation: 0, surfaceType: 'acoustic_bowl' },
      { x: 1550, y: -1450, width: 300, cornerType: 'curve', elevation: 0, surfaceType: 'acoustic_bowl' },
      { x: 1850, y: 0, width: 295, cornerType: 'curve', elevation: 0, surfaceType: 'acoustic_bowl' },
      { x: 1450, y: 1450, width: 285, cornerType: 'curve', elevation: 0, surfaceType: 'acoustic_bowl' },
      { x: 0, y: 1780, width: 275, cornerType: 'curve', elevation: 0, surfaceType: 'acoustic_bowl' },
      { x: -1350, y: 1280, width: 265, cornerType: 'curve', elevation: 0, surfaceType: 'acoustic_bowl' },
      // Loop 2: Middle Cochlear Chamber (width 255 -> 205, elevation 0)
      { x: -1300, y: -200, width: 255, cornerType: 'curve', elevation: 0, surfaceType: 'acoustic_bowl' },
      { x: -1020, y: -1020, width: 245, cornerType: 'curve', elevation: 0, surfaceType: 'acoustic_bowl' },
      { x: 0, y: -1260, width: 235, cornerType: 'curve', elevation: 0, surfaceType: 'acoustic_bowl' },
      { x: 1020, y: -980, width: 225, cornerType: 'curve', elevation: 0, surfaceType: 'acoustic_bowl' },
      { x: 1240, y: 0, width: 215, cornerType: 'curve', elevation: 0, surfaceType: 'acoustic_bowl' },
      { x: 960, y: 940, width: 205, cornerType: 'curve', elevation: 0, surfaceType: 'acoustic_bowl' },
      { x: 0, y: 1180, width: 195, cornerType: 'curve', elevation: 0, surfaceType: 'acoustic_bowl' },
      { x: -840, y: 820, width: 185, cornerType: 'curve', elevation: 0, surfaceType: 'acoustic_bowl' },
      // Loop 3: Innermost Vortex (width 175 -> 165, elevation 0)
      { x: -760, y: -120, width: 180, cornerType: 'curve', elevation: 0, surfaceType: 'acoustic_bowl' },
      { x: -540, y: -560, width: 175, cornerType: 'curve', elevation: 0, surfaceType: 'acoustic_bowl' },
      { x: 0, y: -680, width: 170, cornerType: 'curve', elevation: 0, surfaceType: 'acoustic_bowl' },
      { x: 540, y: -480, width: 165, cornerType: 'curve', elevation: 0, surfaceType: 'acoustic_bowl' },
      { x: 620, y: 120, width: 165, cornerType: 'hairpin', elevation: 0, surfaceType: 'acoustic_bowl' },
      { x: 380, y: 155, width: 175, cornerType: 'curve', elevation: 0, surfaceType: 'acoustic_bowl' },
      // Straight Collinear Launch Ramp (380->40) onto Skyway Overpass (elevation 1 across all rings!)
      { x: 40, y: 120, width: 175, cornerType: 'sharp', elevation: 1, surfaceType: 'glass' },
      { x: -520, y: 60, width: 175, cornerType: 'curve', elevation: 1, surfaceType: 'glass' },
      { x: -1060, y: 10, width: 180, cornerType: 'curve', elevation: 1, surfaceType: 'glass' },
      { x: -1580, y: -35, width: 185, cornerType: 'curve', elevation: 1, surfaceType: 'glass' },
      // Collinear Down-Ramp descending cleanly outside all rings to Start/Finish Line (elevation 0)
      { x: -1920, y: -65, width: 225, cornerType: 'hairpin', elevation: 0, surfaceType: 'asphalt' },
    ],
    checkpointIndices: [0, 3, 6, 9, 12, 15, 18, 21, 24, 26],
    shortcut: {
      entryWaypointIndex: 14,
      exitWaypointIndex: 20,
      path: [
        { x: 0, y: 1180, width: 140, elevation: 0 },
        { x: 320, y: 680, width: 140, elevation: 0 },
        { x: 620, y: 120, width: 140, elevation: 0 },
      ],
      label: 'Ống Bán Khuyên Tắt (Sóng Xung Kích & Cổng Cộng Hưởng)',
      widthRatio: 0.52,
    },
    boostZones: [
      { x: 0, y: -1850, radius: 105, angle: 0, elevation: 0 },
      { x: 0, y: -1260, radius: 95, angle: 0, elevation: 0 },
      { x: -520, y: 60, radius: 95, angle: Math.PI, elevation: 1 },
      { x: -1060, y: 10, radius: 95, angle: Math.PI, elevation: 1 },
    ],
    naturalMudZones: [
      // Endolymph fluid damping pools on Outer & Middle spiral loops
      { x: 1850, y: 0, radius: 85, elevation: 0 },
      { x: -1350, y: 1280, radius: 80, elevation: 0 },
      { x: 1240, y: 0, radius: 75, elevation: 0 },
    ],
    tireBarriers: [
      // Spiral loops & Skyway barriers (cleared 6 slalom barriers from shortcut)
      { x: 1550, y: -1450, radius: 28, elevation: 0 },
      { x: 0, y: 1740, radius: 28, elevation: 0 },
      { x: -1020, y: -1020, radius: 26, elevation: 0 },
      { x: 960, y: 940, radius: 26, elevation: 0 },
      { x: 0, y: -680, radius: 24, elevation: 0 },
      { x: -790, y: 35, radius: 24, elevation: 1 },
      { x: -1320, y: -15, radius: 24, elevation: 1 },
    ],
    crosswindZones: [
      // Acoustic Resonance Shockwaves (rebalanced shortcut crosswind to strength 170)
      { x: 320, y: 680, radius: 165, forceAngle: -0.5, strength: 170 },
      { x: 0, y: -1850, radius: 195, forceAngle: -Math.PI / 2, strength: 430 },
      { x: 0, y: 1180, radius: 180, forceAngle: Math.PI / 2, strength: 440 },
    ],
    synapseGates: [
      { x: 220, y: 830, angle: -1.0, width: 135, phaseOffset: 0.3 },
      { x: -840, y: 820, angle: -2.3, width: 165, phaseOffset: 0.9 },
    ],
    tarnPistons: [
      { x: 320, y: 680, angle: 0.52, pushForce: 200, radius: 75, phaseOffset: 0.7 },
    ],
  },
  // ===========================================================================
  // MAP 14: ĐẤU TRƯỜNG ĐẠI THỰC BÀO (Hourglass / Erlenmeyer Flask + 12 Pinball Bumpers)
  // ===========================================================================
  {
    id: 'map_macrophage',
    name: 'Map 14 – Đấu Trường Đại Thực Bào',
    subtitle: 'Bình Tam Giác Đồng Hồ Cát · Ống Mao Mạch & Bụng Đại Thực Bào 540px Pinball',
    theme: 'macrophage',
    description:
      'Nửa trên là Ống Mao Mạch kỹ thuật đổ thẳng xuống Bụng Đại Thực Bào khổng lồ (540px) không vạch phân làn với các Túi Tiêu Thể Lysosome đàn hồi, Hồ Axit tiêu hóa và Kháng Thể tuần tra.',
    roadWidth: 260,
    friction: 1.0,
    bgColor: '#12040E',
    roadColor: '#4C1D3D',
    roadBorderColor: '#FB7185',
    kerbColors: ['#FB7185', '#FDE047'],
    waypoints: [
      // Top Capillary Tube (width 185, technical S-bends, elevation 0)
      { x: -420, y: -1750, width: 195, cornerType: 'curve', elevation: 0, surfaceType: 'asphalt' },
      { x: 0, y: -1920, width: 185, cornerType: 'hairpin', elevation: 0, surfaceType: 'asphalt' },
      { x: 420, y: -1750, width: 185, cornerType: 'curve', elevation: 0, surfaceType: 'asphalt' },
      { x: 360, y: -1260, width: 185, cornerType: 'curve', elevation: 0, surfaceType: 'asphalt' },
      // Hourglass Neck Underpass (elevation 0) passing UNDER the return Skyway Bridge
      { x: -120, y: -820, width: 195, cornerType: 'curve', elevation: 0, surfaceType: 'asphalt' },
      { x: 240, y: -440, width: 230, cornerType: 'curve', elevation: 0, surfaceType: 'arena' },
      // Giant Circular Macrophage Belly Arena (width 520 - 540, no lane lines!)
      { x: 680, y: -180, width: 520, cornerType: 'curve', elevation: 0, surfaceType: 'arena' },
      { x: 960, y: 520, width: 540, cornerType: 'curve', elevation: 0, surfaceType: 'arena' },
      { x: 640, y: 1240, width: 540, cornerType: 'curve', elevation: 0, surfaceType: 'arena' },
      { x: 0, y: 1520, width: 540, cornerType: 'curve', elevation: 0, surfaceType: 'arena' },
      { x: -640, y: 1240, width: 540, cornerType: 'curve', elevation: 0, surfaceType: 'arena' },
      { x: -960, y: 520, width: 520, cornerType: 'curve', elevation: 0, surfaceType: 'arena' },
      // Twin-Gate Exit & Full Overpass Bridge (elevation 1) crossing OVER the Hourglass Neck
      { x: -680, y: -180, width: 260, cornerType: 'curve', elevation: 0, surfaceType: 'asphalt' },
      { x: -380, y: -440, width: 185, cornerType: 'curve', elevation: 1, surfaceType: 'glass' },
      { x: 60, y: -820, width: 185, cornerType: 'curve', elevation: 1, surfaceType: 'glass' },
      { x: -280, y: -1220, width: 185, cornerType: 'curve', elevation: 1, surfaceType: 'glass' },
      // Return Connector descending cleanly on the West side to Start/Finish Line (elevation 0)
      { x: -420, y: -1480, width: 190, cornerType: 'curve', elevation: 0, surfaceType: 'asphalt' },
    ],
    checkpointIndices: [0, 2, 4, 6, 7, 9, 10, 11, 14, 16],
    shortcut: {
      entryWaypointIndex: 6,
      exitWaypointIndex: 11,
      path: [
        { x: 680, y: -180, width: 320, elevation: 0 },
        { x: 0, y: 520, width: 420, elevation: 0 },
        { x: -960, y: 520, width: 320, elevation: 0 },
      ],
      label: 'Đường Xuyên Tâm Thực Bào (Trận Địa Pinball & Hồ Tiêu Thể Axit)',
      widthRatio: 0.72,
    },
    boostZones: [
      { x: 240, y: -440, radius: 105, angle: Math.PI / 4, elevation: 0 },
      { x: 0, y: 1520, radius: 115, angle: Math.PI, elevation: 0 },
      { x: 60, y: -820, radius: 95, angle: -Math.PI * 0.75, elevation: 1 },
    ],
    naturalMudZones: [],
    acidZones: [
      // Digestive enzyme pools shifted off the central shortcut driving line
      { x: 340, y: 170, radius: 80 },
      { x: -480, y: 520, radius: 80 },
      { x: 320, y: 1380, radius: 90 },
      { x: -320, y: 1380, radius: 90 },
    ],
    tireBarriers: [
      // Capillary Tube technical chicanes & skyway (cleared 4 barriers from shortcut core)
      { x: 210, y: -1835, radius: 24, elevation: 0 },
      { x: 390, y: -1500, radius: 24, elevation: 0 },
      { x: -160, y: -630, radius: 24, elevation: 1 },
    ],
    synapseGates: [
      { x: 480, y: 30, angle: 2.35, width: 175, phaseOffset: 0.2 },
      { x: -680, y: 520, angle: Math.PI, width: 175, phaseOffset: 1.5 },
    ],
    // Glowing Elastic Lysosome Pinball Bumpers inside the Macrophage Belly Arena
    pinballBumpers: [
      { x: 0, y: 120, radius: 46, color: '#fb7185', restitution: 1.45, label: 'LYSOSOME α' },
      { x: 420, y: 200, radius: 44, color: '#f43f5e', restitution: 1.4, label: 'LYSOSOME β' },
      { x: -420, y: 200, radius: 44, color: '#f43f5e', restitution: 1.4, label: 'LYSOSOME γ' },
      { x: 240, y: 540, radius: 50, color: '#fde047', restitution: 1.55, label: 'PHAGOSOME CORE' },
      { x: -240, y: 540, radius: 50, color: '#fde047', restitution: 1.55, label: 'PHAGOSOME CORE' },
      { x: 0, y: 340, radius: 44, color: '#a855f7', restitution: 1.5, label: 'LYSOSOME δ' },
      { x: -380, y: 520, radius: 44, color: '#a855f7', restitution: 1.5, label: 'LYSOSOME ε' },
      { x: 520, y: 840, radius: 44, color: '#38bdf8', restitution: 1.4, label: 'LYSOSOME ζ' },
      { x: -520, y: 840, radius: 44, color: '#38bdf8', restitution: 1.4, label: 'LYSOSOME η' },
      { x: 0, y: 940, radius: 48, color: '#fb7185', restitution: 1.5, label: 'LYSOSOME θ' },
    ],
    antibodySpheres: [
      { centerX: 0, centerY: 520, orbitRadiusX: 460, orbitRadiusY: 240, radius: 36, speed: 1.25, phase: 0 },
      { centerX: 0, centerY: 520, orbitRadiusX: 460, orbitRadiusY: 240, radius: 36, speed: 1.25, phase: Math.PI },
    ],
  },
  // ===========================================================================
  // MAP 15: HÀNH TRÌNH KHÁM PHÁ VI SINH – "INTO THE UNKNOWN CELL" (Point-to-Point)
  // ===========================================================================
  {
    id: 'map_unknown_cell',
    name: 'Map 15 – Hành Trình Khám Phá Vi Sinh',
    subtitle: 'Đường Đua Phượt 1 Chiều Cực Bắc → Cực Nam 4 Quần Xã',
    theme: 'unknown_cell',
    description:
      'Hành trình khám phá 1 chiều từ Cực Bắc xuống Cực Nam xuyên qua 4 vùng: Hang Động Ti Thể Phát Quang 3 nhánh ẩn, Đầm Lầy Thủy Triều Lưới Nội Chất (chu kỳ 6s), Rừng Lông Nhung Sương Mù và Đường Ngầm Kính Xuyên Nhân.',
    roadWidth: 260,
    friction: 1.0,
    bgColor: '#020B14',
    roadColor: '#163854',
    roadBorderColor: '#2DD4BF',
    kerbColors: ['#2DD4BF', '#FACC15'],
    isPointToPoint: true,
    waypoints: [
      // ZONE 1: Hang Động Ti Thể Phát Quang (Bioluminescent Mitochondria Cave, North Pole Start)
      { x: 0, y: -3800, width: 280, cornerType: 'curve', elevation: 0, surfaceType: 'cave' },
      { x: 0, y: -3400, width: 300, cornerType: 'curve', elevation: 0, surfaceType: 'cave' },
      { x: -280, y: -2950, width: 340, cornerType: 'curve', elevation: 0, surfaceType: 'cave' },
      { x: -480, y: -2500, width: 340, cornerType: 'curve', elevation: 0, surfaceType: 'cave' },
      { x: -220, y: -2050, width: 300, cornerType: 'curve', elevation: 0, surfaceType: 'cave' },
      { x: 120, y: -1650, width: 260, cornerType: 'curve', elevation: 0, surfaceType: 'cave' },
      // ZONE 2: Đầm Lầy Lưới Nội Chất – Thủy Triều Sinh Học (Endoplasmic Reticulum Tidal Swamp)
      { x: 580, y: -1250, width: 280, cornerType: 'curve', elevation: 0, surfaceType: 'swamp_tide' },
      { x: 920, y: -750, width: 320, cornerType: 'curve', elevation: 0, surfaceType: 'swamp_tide' },
      { x: 860, y: -200, width: 320, cornerType: 'curve', elevation: 0, surfaceType: 'swamp_tide' },
      { x: 380, y: 260, width: 280, cornerType: 'curve', elevation: 0, surfaceType: 'swamp_tide' },
      // ZONE 3: Rừng Lông Nhung & Sương Mù Khám Phá (Villi Forest & Light Fog of War)
      { x: -240, y: 680, width: 250, cornerType: 'curve', elevation: 0, surfaceType: 'villi' },
      { x: -720, y: 1120, width: 230, cornerType: 'hairpin', elevation: 0, surfaceType: 'villi' },
      { x: -420, y: 1620, width: 240, cornerType: 'curve', elevation: 0, surfaceType: 'villi' },
      { x: 240, y: 2040, width: 250, cornerType: 'curve', elevation: 0, surfaceType: 'villi' },
      // ZONE 4: Đường Ngầm Xuyên Nhân Tế Bào (Sub-nuclear Glass Tunnel -> South Pole Portal Finish)
      { x: 0, y: 2520, width: 240, cornerType: 'curve', elevation: 0, surfaceType: 'glass_tunnel' },
      { x: 0, y: 3150, width: 240, cornerType: 'curve', elevation: 0, surfaceType: 'glass_tunnel' },
      { x: 0, y: 3800, width: 280, cornerType: 'sharp', elevation: 0, surfaceType: 'glass_tunnel' },
    ],
    checkpointIndices: [0, 2, 4, 5, 7, 9, 10, 12, 14, 16],
    // Zone 2 Ancient Submerged Stone Path (Con Đường Đá Cổ Ngầm cắt thẳng qua hồ Lưới Nội Chất)
    shortcut: {
      entryWaypointIndex: 5,
      exitWaypointIndex: 9,
      path: [
        { x: 120, y: -1650, width: 175, elevation: 0, surfaceType: 'swamp_tide' },
        { x: 220, y: -1020, width: 175, elevation: 0, surfaceType: 'swamp_tide' },
        { x: 300, y: -380, width: 175, elevation: 0, surfaceType: 'swamp_tide' },
        { x: 380, y: 260, width: 175, elevation: 0, surfaceType: 'swamp_tide' },
      ],
      label: 'Con Đường Đá Cổ Ngầm (Triều Cường 6s, Hồ Axit & Piston Đá)',
      widthRatio: 0.62,
    },
    secretBranches: [
      // Branch 1: Left Crystal Cave Pocket with Double Item Boxes
      {
        id: 'branch_atp_pocket',
        entryWaypointIndex: 1,
        exitWaypointIndex: 4,
        width: 185,
        elevation: 0,
        hasDoubleGiftBox: true,
        label: 'Hốc Tinh Thể ATP (Hộp Quà Đôi)',
        path: [
          { x: 0, y: -3400, width: 185, elevation: 0 },
          { x: -780, y: -3050, width: 195, elevation: 0 },
          { x: -820, y: -2450, width: 195, elevation: 0 },
          { x: -220, y: -2050, width: 185, elevation: 0 },
        ],
      },
      // Branch 2: Right Narrow Wooden/Chitin Suspension Bridge over Energy Waterfall
      {
        id: 'branch_waterfall_bridge',
        entryWaypointIndex: 1,
        exitWaypointIndex: 5,
        width: 145,
        elevation: 0,
        surfaceType: 'waterfall_bridge',
        label: 'Cầu Treo Vượt Thác Năng Lượng',
        path: [
          { x: 0, y: -3400, width: 145, elevation: 0 },
          { x: 340, y: -2800, width: 145, elevation: 0 },
          { x: 320, y: -2200, width: 145, elevation: 0 },
          { x: 120, y: -1650, width: 145, elevation: 0 },
        ],
      },
    ],
    tidalZones: [
      { startIdx: 5, endIdx: 9, periodSec: 6.0, highTideSlowMultiplier: 0.4 },
    ],
    fogOfWar: {
      startIdx: 10,
      endIdx: 13,
      visionRadius: 380,
    },
    glassTunnelSegments: [
      { startIdx: 14, endIdx: 16 },
    ],
    boostZones: [
      { x: 0, y: -3550, radius: 95, angle: Math.PI / 2, elevation: 0 },
      { x: 330, y: -2500, radius: 85, angle: Math.PI / 2, elevation: 0 },
      { x: 0, y: 2750, radius: 105, angle: Math.PI / 2, elevation: 0 },
      { x: 0, y: 3400, radius: 105, angle: Math.PI / 2, elevation: 0 },
    ],
    naturalMudZones: [
      // Swamp mud pockets (cleared 2 mud pockets from Submerged Stone causeway)
      { x: 890, y: -480, radius: 78, elevation: 0 },
      { x: -560, y: 1360, radius: 72, elevation: 0 },
    ],
    acidZones: [
      // Bioluminescent acid pools (cleared pool from causeway driving line)
      { x: -80, y: 1830, radius: 85 },
    ],
    crosswindZones: [
      // Waterfall mist gale on right secret branch & rebalanced causeway tidal gale (strength 170)
      { x: 330, y: -2500, radius: 170, forceAngle: 0, strength: 440 },
      { x: 260, y: -700, radius: 175, forceAngle: 0, strength: 170 },
    ],
    tireBarriers: [
      // Secret Branches & Main Cave obstacles (cleared 8 slalom rocks from Submerged Stone causeway)
      { x: -800, y: -2750, radius: 25, elevation: 0 },
      { x: 330, y: -2350, radius: 22, elevation: 0 },
      { x: -380, y: -2720, radius: 26, elevation: 0 },
      { x: -480, y: 900, radius: 26, elevation: 0 },
      { x: 0, y: 2950, radius: 26, elevation: 0 },
    ],
    synapseGates: [
      // Sub-nuclear Glass Tunnel Laser Gates & Causeway Gate
      { x: 220, y: -1020, angle: 1.44, width: 140, phaseOffset: 0.4 },
      { x: 0, y: 2850, angle: Math.PI / 2, width: 175, phaseOffset: 0.0 },
      { x: 0, y: 3300, angle: Math.PI / 2, width: 175, phaseOffset: 1.5 },
    ],
    tarnPistons: [
      { x: 300, y: -380, angle: 0, pushForce: 200, radius: 75, phaseOffset: 0.8 },
    ],
  },
];

export const INITIAL_GIFTCODES: Giftcode[] = [
  {
    code: 'TRIPLED',
    coins: 200,
    maxUses: 9999,
    usedBy: [],
    createdAt: Date.now() - 86400000,
    rewardParts: [
      'chassis_tripled_a',
      'paint_tripled_a',
      'decal_tripled_a',
      'wheels_tripled_a',
      'spoiler_tripled_a',
      'underglow_tripled_a',
      'trail_tripled_a',
    ],
  },
  {
    code: 'TRIPLED2026',
    coins: 200,
    maxUses: 100,
    usedBy: [],
    createdAt: Date.now() - 86400000,
  },
  {
    code: 'BIO100',
    coins: 100,
    maxUses: 50,
    usedBy: [],
    createdAt: Date.now() - 86400000,
  },
  {
    code: 'OPEN888',
    coins: 300,
    maxUses: 50,
    usedBy: [],
    createdAt: Date.now() - 86400000,
  },
];

export const INITIAL_DEMO_STUDENTS: StudentAccount[] = [];

export const BOT_NAMES: string[] = [
  'Turbo Bot',
  'Nitro Apex',
  'Drift King',
  'Phantom Racer',
  'Cyber Velocity',
  'Neon Storm',
  'Shadow Fox',
  'Viper Speed',
  'Thunder Bolt',
  'Blaze Arrow',
  'Quantum Wave',
  'Titan Grip',
];

export const TUNING_SLOT_LABELS: {
  slot: TuningSlot;
  label: string;
  shortLabel: string;
  icon: string;
}[] = [
  { slot: 'engine', label: '1. Động Cơ (Engine)', shortLabel: 'Động Cơ', icon: '⚙️' },
  { slot: 'tires', label: '2. Lốp Xe (Tires)', shortLabel: 'Lốp Xe', icon: '🛞' },
  { slot: 'body', label: '3. Vỏ & Khung Gầm (Body)', shortLabel: 'Khung Gầm', icon: '🛡️' },
  { slot: 'nitro', label: '4. Hệ Thống Nitro (Nitro)', shortLabel: 'Bình Nitro', icon: '⚡' },
];

export const ALL_TUNING_PARTS: TuningPartItem[] = [
  // =========================================================================
  // NHÓM 1: ĐỘNG CƠ (Engine) - 9 Món (D -> S)
  // Chuyên Tốc Độ & Gia Tốc (Đánh đổi Cua & Cân Nặng)
  // =========================================================================
  {
    id: 'eng_d_piston',
    slot: 'engine',
    name: 'Động Cơ Piston Cũ',
    tier: 'D',
    cp: 2,
    stats: { topSpeed: 1, accel: 1, handling: 0, nitro: 0, weight: 0 },
  },
  {
    id: 'eng_c_ice',
    slot: 'engine',
    name: 'Động Cơ Đốt Trong Phổ Thông',
    tier: 'C',
    cp: 3,
    stats: { topSpeed: 3, accel: 2, handling: -1, nitro: 0, weight: 0 },
  },
  {
    id: 'eng_c_mini_ev',
    slot: 'engine',
    name: 'Động Cơ Điện Mini (Nhẹ)',
    tier: 'C',
    cp: 4,
    stats: { topSpeed: -1, accel: 4, handling: 0, nitro: 0, weight: -3 },
  },
  {
    id: 'eng_b_v6',
    slot: 'engine',
    name: 'Động Cơ V6 Thể Thao',
    tier: 'B',
    cp: 5,
    stats: { topSpeed: 5, accel: 3, handling: -2, nitro: 0, weight: 0 },
  },
  {
    id: 'eng_b_diesel',
    slot: 'engine',
    name: 'Động Cơ Diesel Kéo Nặng',
    tier: 'B',
    cp: 6,
    stats: { topSpeed: 6, accel: -3, handling: -2, nitro: 0, weight: 5 },
  },
  {
    id: 'eng_a_twinturbo',
    slot: 'engine',
    name: 'Động Cơ Turbo Kép (Twin-Turbo)',
    tier: 'A',
    cp: 7,
    stats: { topSpeed: 8, accel: 5, handling: -4, nitro: 0, weight: 2 },
  },
  {
    id: 'eng_a_jet',
    slot: 'engine',
    name: 'Động Cơ Phản Lực Đề-pa (Jet Start)',
    tier: 'A',
    cp: 7,
    stats: { topSpeed: 2, accel: 10, handling: -5, nitro: 3, weight: 0 },
  },
  {
    id: 'eng_s_v12_nuclear',
    slot: 'engine',
    name: 'Lò Phản Ứng Hạt Nhân V12',
    tier: 'S',
    cp: 9,
    stats: { topSpeed: 14, accel: 6, handling: -8, nitro: 0, weight: 5 },
    passiveId: 'v12Reactor',
    passiveLabel: 'Nội tại',
    passiveDesc: 'Chạy thẳng ở tốc độ cao nhận thêm +6% tốc độ tối đa.',
  },
  {
    id: 'eng_s_em_hyper',
    slot: 'engine',
    name: 'Động Cơ Điện Từ Tốc Độ Siêu Cao',
    tier: 'S',
    cp: 9,
    stats: { topSpeed: 11, accel: 9, handling: -6, nitro: -3, weight: 0 },
    passiveId: 'emPulse',
    passiveLabel: 'Nội tại',
    passiveDesc: 'Tự hồi thêm +6% Nitro/giây và +25% gia tốc đề-pa.',
  },

  // =========================================================================
  // NHÓM 2: LỐP XE (Tires) - 9 Món (D -> S)
  // Chuyên Khả Năng Cua & Bám Đường (Đánh đổi Tốc Độ)
  // =========================================================================
  {
    id: 'tire_d_hard',
    slot: 'tires',
    name: 'Lốp Cao Su Cứng',
    tier: 'D',
    cp: 2,
    stats: { topSpeed: 0, accel: 0, handling: 2, nitro: 0, weight: 0 },
  },
  {
    id: 'tire_c_street',
    slot: 'tires',
    name: 'Lốp Đường Phố Tiêu Chuẩn',
    tier: 'C',
    cp: 3,
    stats: { topSpeed: 1, accel: -1, handling: 3, nitro: 0, weight: 0 },
  },
  {
    id: 'tire_c_rain',
    slot: 'tires',
    name: 'Lốp Mưa Rãnh Sâu',
    tier: 'C',
    cp: 4,
    stats: { topSpeed: -2, accel: -1, handling: 5, nitro: 0, weight: 0 },
  },
  {
    id: 'tire_b_semislick',
    slot: 'tires',
    name: 'Lốp Bán Trơn (Semi-Slick)',
    tier: 'B',
    cp: 5,
    stats: { topSpeed: 2, accel: 1, handling: 6, nitro: 0, weight: -2 },
  },
  {
    id: 'tire_b_offroad',
    slot: 'tires',
    name: 'Lốp Gai Địa Hình (Off-Road)',
    tier: 'B',
    cp: 5,
    stats: { topSpeed: -3, accel: 0, handling: 4, nitro: 0, weight: 3 },
    passiveId: 'offroadPass',
    passiveLabel: 'Nội tại',
    passiveDesc: 'Miễn hoàn toàn phạt tốc độ ở Cỏ/Bùn.',
  },
  {
    id: 'tire_a_f1',
    slot: 'tires',
    name: 'Lốp Đua F1 Siêu Bám (Soft Slick)',
    tier: 'A',
    cp: 7,
    stats: { topSpeed: 3, accel: -3, handling: 10, nitro: 0, weight: -3 },
    passiveId: 'grassPenalty',
    passiveLabel: 'Nội tại',
    passiveDesc: 'Giảm tốc mạnh hơn khi đi vào Cỏ.',
    isPenalty: true,
  },
  {
    id: 'tire_a_ice_spikes',
    slot: 'tires',
    name: 'Lốp Đinh Phá Băng',
    tier: 'A',
    cp: 7,
    stats: { topSpeed: -4, accel: 3, handling: 9, nitro: 0, weight: 0 },
    passiveId: 'iceImmune',
    passiveLabel: 'Nội tại',
    passiveDesc: 'Miễn nhiễm trơn băng.',
  },
  {
    id: 'tire_s_maglev',
    slot: 'tires',
    name: 'Đệm Từ Trường Áp Suất (Mag-Lev)',
    tier: 'S',
    cp: 9,
    stats: { topSpeed: -6, accel: 4, handling: 15, nitro: 0, weight: 0 },
    passiveId: 'maglevFloat',
    passiveLabel: 'Nội tại',
    passiveDesc: 'Giảm 50% phạt tốc độ địa hình và +12% tốc độ thoát cua.',
  },
  {
    id: 'tire_s_carbon_pillar',
    slot: 'tires',
    name: 'Lốp Trụ Carbon Siêu Cứng',
    tier: 'S',
    cp: 9,
    stats: { topSpeed: -3, accel: -5, handling: 12, nitro: 0, weight: 8 },
    passiveId: 'carbonGrip',
    passiveLabel: 'Nội tại',
    passiveDesc: 'Kháng 50% gió tạt & va chạm ngang, +25% sạc Nitro khi Drift.',
  },

  // =========================================================================
  // NHÓM 3: VỎ & KHUNG GẦM (Body/Chassis) - 9 Món (D -> S)
  // Chuyên Cân Nặng & Chống Chịu (Đánh đổi Tốc Độ & Gia Tốc)
  // =========================================================================
  {
    id: 'body_d_iron',
    slot: 'body',
    name: 'Khung Sắt Thô Sơ',
    tier: 'D',
    cp: 2,
    stats: { topSpeed: 1, accel: 0, handling: 0, nitro: 0, weight: 2 },
  },
  {
    id: 'body_c_steel',
    slot: 'body',
    name: 'Khung Thép Gia Cường',
    tier: 'C',
    cp: 3,
    stats: { topSpeed: -1, accel: -2, handling: 0, nitro: 0, weight: 5 },
    passiveId: 'steelReinforced',
    passiveLabel: 'Nội tại',
    passiveDesc: 'Giảm 20% thời gian choáng.',
  },
  {
    id: 'body_c_poly',
    slot: 'body',
    name: 'Vỏ Nhựa Tổng Hợp Siêu Nhẹ',
    tier: 'C',
    cp: 4,
    stats: { topSpeed: -2, accel: 4, handling: 2, nitro: 0, weight: -5 },
  },
  {
    id: 'body_b_alloy',
    slot: 'body',
    name: 'Khung Hợp Kim Nhôm Định Hình',
    tier: 'B',
    cp: 5,
    stats: { topSpeed: 3, accel: 3, handling: 2, nitro: 0, weight: -1 },
  },
  {
    id: 'body_b_aero',
    slot: 'body',
    name: 'Khung Khí Động Học Cánh Ngầm',
    tier: 'B',
    cp: 6,
    stats: { topSpeed: 6, accel: -3, handling: 4, nitro: 0, weight: -4 },
  },
  {
    id: 'body_a_carbon',
    slot: 'body',
    name: 'Vỏ Sợi Carbon Khí Động Lực',
    tier: 'A',
    cp: 7,
    stats: { topSpeed: 7, accel: 6, handling: 3, nitro: 0, weight: -6 },
  },
  {
    id: 'body_a_riot',
    slot: 'body',
    name: 'Giáp Chống Bạo Động (Riot Armor)',
    tier: 'A',
    cp: 7,
    stats: { topSpeed: 3, accel: -5, handling: -3, nitro: 0, weight: 11 },
    passiveId: 'bananaResist',
    passiveLabel: 'Nội tại',
    passiveDesc: 'Kháng 40% thời gian trượt chuối.',
  },
  {
    id: 'body_s_heavy_titan',
    slot: 'body',
    name: 'Khung Titan Hạng Nặng Cực Đoan',
    tier: 'S',
    cp: 9,
    stats: { topSpeed: -4, accel: -8, handling: 4, nitro: 0, weight: 16 },
    passiveId: 'heavyBulldozer',
    passiveLabel: 'Nội tại',
    passiveDesc: 'Tăng 40% lực húc văng xe khác, giữ 95% tốc độ khi va rào lốp.',
  },
  {
    id: 'body_s_titan',
    slot: 'body',
    name: 'Khung Sinh Học Tự Phục Hồi',
    tier: 'S',
    cp: 9,
    stats: { topSpeed: 6, accel: -4, handling: 4, nitro: 0, weight: 12 },
    passiveId: 'titanArmor',
    passiveLabel: 'Nội tại',
    passiveDesc: 'Giảm 50% choáng, không nảy ngược khi đâm lốp.',
  },

  // =========================================================================
  // NHÓM 4: HỆ THỐNG NITRO (Nitro Unit) - 9 Món (D -> S)
  // Chuyên Bứt Tốc Nitro (Đánh đổi Cua & Trọng Lượng)
  // =========================================================================
  {
    id: 'nitro_d_mini',
    slot: 'nitro',
    name: 'Bình Khí Nén Mini',
    tier: 'D',
    cp: 2,
    stats: { topSpeed: 0, accel: 0, handling: 0, nitro: 2, weight: 0 },
  },
  {
    id: 'nitro_c_n2o',
    slot: 'nitro',
    name: 'Bình N2O Đơn Phổ Thông',
    tier: 'C',
    cp: 3,
    stats: { topSpeed: 1, accel: 0, handling: 0, nitro: 4, weight: -1 },
  },
  {
    id: 'nitro_c_injector',
    slot: 'nitro',
    name: 'Phun Nhiên Liệu Áp Cao',
    tier: 'C',
    cp: 4,
    stats: { topSpeed: 0, accel: 3, handling: -1, nitro: 3, weight: 0 },
  },
  {
    id: 'nitro_b_twinbio',
    slot: 'nitro',
    name: 'Bình Nitro Kép Sinh Học',
    tier: 'B',
    cp: 5,
    stats: { topSpeed: 0, accel: 2, handling: 0, nitro: 6, weight: 1 },
  },
  {
    id: 'nitro_b_overheat',
    slot: 'nitro',
    name: 'Hệ Thống Quá Tải Nhiệt (Overclock)',
    tier: 'B',
    cp: 6,
    stats: { topSpeed: 2, accel: 0, handling: -5, nitro: 10, weight: 0 },
  },
  {
    id: 'nitro_a_plasma',
    slot: 'nitro',
    name: 'Buồng Đốt Plasma Xanh',
    tier: 'A',
    cp: 7,
    stats: { topSpeed: 4, accel: 2, handling: -3, nitro: 9, weight: 0 },
  },
  {
    id: 'nitro_a_converter',
    slot: 'nitro',
    name: 'Bộ Chuyển Hóa Năng Lượng Phụ',
    tier: 'A',
    cp: 7,
    stats: { topSpeed: 0, accel: 0, handling: 2, nitro: 7, weight: 0 },
    passiveId: 'trapBoost',
    passiveLabel: 'Nội tại',
    passiveDesc: 'Thả chuối/bùn được tăng tốc 0.8s.',
  },
  {
    id: 'nitro_s_overdrive',
    slot: 'nitro',
    name: 'Lõi Năng Lượng Quá Tải Toàn Phần',
    tier: 'S',
    cp: 9,
    stats: { topSpeed: 0, accel: 5, handling: -6, nitro: 16, weight: -7 },
    passiveId: 'overdriveCore',
    passiveLabel: 'Nội tại',
    passiveDesc: 'Tốc độ khi Nitro Boost +20%.',
  },
  {
    id: 'nitro_s_atp',
    slot: 'nitro',
    name: 'Lõi Năng Lượng ATP Hằng Định',
    tier: 'S',
    cp: 9,
    stats: { topSpeed: 4, accel: -3, handling: 0, nitro: 12, weight: 3 },
    passiveId: 'atpCore',
    passiveLabel: 'Nội tại',
    passiveDesc: '+20% thời gian thanh Nitro (không áp dụng hộp quà), đi xuyên bùn không giảm tốc.',
  },
];

export const DEFAULT_TUNING_LOADOUT: TuningLoadout = {
  engine: 'eng_d_piston',
  tires: 'tire_d_hard',
  body: 'body_d_iron',
  nitro: 'nitro_d_mini',
};

export const EMPTY_TUNING_PRESETS: (TuningPreset | null)[] = [null, null, null];

export interface SuggestedPlaystylePreset {
  id: string;
  name: string;
  styleTag: string;
  description: string;
  totalCP: number;
  loadout: TuningLoadout;
}

export const SUGGESTED_PLAYSTYLE_PRESETS: SuggestedPlaystylePreset[] = [
  {
    id: 'preset_speed_king',
    name: 'Tốc Độ Đường Trường',
    styleTag: 'Chuyên Đường Thẳng',
    description:
      'Tối đa vận tốc trần & giữ đà bứt phá trên các bản đồ rộng, nhiều đoạn thẳng dài.',
    totalCP: 25,
    loadout: {
      engine: 'eng_s_v12_nuclear',
      tires: 'tire_b_semislick',
      body: 'body_b_aero',
      nitro: 'nitro_b_twinbio',
    },
  },
  {
    id: 'preset_drift_master',
    name: 'Vua Ôm Cua & Drift',
    styleTag: 'Chuyên Khúc Cua Gắt',
    description:
      'Bám cua cực gắt, thoát cua nhận thêm +12% tốc độ và đề-pa nhạy bén sau mỗi góc hẹp.',
    totalCP: 25,
    loadout: {
      engine: 'eng_a_jet',
      tires: 'tire_s_maglev',
      body: 'body_c_poly',
      nitro: 'nitro_b_twinbio',
    },
  },
  {
    id: 'preset_nitro_overdrive',
    name: 'Cuồng Nộ Nitro',
    styleTag: 'Đốt Nitro Liên Tục',
    description:
      'Tự hồi +6% Nitro/giây và tăng +20% tốc độ bứt phá mỗi khi kích hoạt Nitro Boost.',
    totalCP: 25,
    loadout: {
      engine: 'eng_s_em_hyper',
      tires: 'tire_c_rain',
      body: 'body_c_steel',
      nitro: 'nitro_s_overdrive',
    },
  },
  {
    id: 'preset_tank_bulldozer',
    name: 'Thiết Giáp Càn Lướt',
    styleTag: 'Húc Văng & Kháng Choáng',
    description:
      'Siêu đầm chắc, tăng 40% lực húc văng đối thủ và giữ 95% tốc độ khi va chạm rào chắn.',
    totalCP: 25,
    loadout: {
      engine: 'eng_b_diesel',
      tires: 'tire_b_semislick',
      body: 'body_s_heavy_titan',
      nitro: 'nitro_b_twinbio',
    },
  },
  {
    id: 'preset_offroad_explorer',
    name: 'Phượt Thủ Địa Hình',
    styleTag: 'Bùn Lầy & Đường Tắt',
    description:
      'Miễn 100% phạt tốc độ ở Cỏ/Bùn và +20% thời lượng thanh Nitro để băng qua lối tắt.',
    totalCP: 24,
    loadout: {
      engine: 'eng_a_twinturbo',
      tires: 'tire_b_offroad',
      body: 'body_c_steel',
      nitro: 'nitro_s_atp',
    },
  },
  {
    id: 'preset_all_rounder',
    name: 'Toàn Diện Cân Bằng',
    styleTag: 'Đa Dụng Mọi Bản Đồ',
    description:
      'Cân bằng đồng đều cả 5 chỉ số vật lý, dễ kiểm soát trên mọi địa hình đường đua.',
    totalCP: 24,
    loadout: {
      engine: 'eng_a_twinturbo',
      tires: 'tire_b_semislick',
      body: 'body_b_alloy',
      nitro: 'nitro_a_converter',
    },
  },
];

export const PHYSICS_STAT_DESCRIPTIONS: Record<
  'topSpeed' | 'accel' | 'handling' | 'nitro' | 'weight',
  {
    title: string;
    impact: string;
    tip: string;
  }
> = {
  topSpeed: {
    title: 'Tốc Độ Tối Đa (Top Speed)',
    impact:
      'Quyết định vận tốc trần khi chạy hết ga trên đường thẳng (KM/H) và giới hạn tốc độ khi đè lên dải tăng tốc.',
    tip: 'Rất lợi thế trên các bản đồ có đoạn thẳng dài hoặc cầu vượt (Map 1, 2, 10, 12).',
  },
  accel: {
    title: 'Gia Tốc Bứt Phá (Acceleration)',
    impact:
      'Tăng lực kéo đề-pa lúc xuất phát, giúp xe lấy lại tốc độ tối đa nhanh chóng sau khi phanh, va chạm hoặc thoát cua.',
    tip: 'Phát huy tối đa ở bản đồ nhiều khúc cua liên tiếp hoặc chướng ngại vật (Map 4, 6, 13).',
  },
  handling: {
    title: 'Độ Cua & Bám Đường (Handling / Grip)',
    impact:
      'Tăng tốc độ đánh lái, độ bám mặt đường khi ôm cua gắt, giảm văng đuôi khi Drift và giữ tốc độ tốt hơn trong góc cua.',
    tip: 'Thiết yếu cho các đường đua xoắn ốc, cua chữ U và cầu hẹp (Map 4, 8, 11, 13).',
  },
  nitro: {
    title: 'Hiệu Suất Nitro (Nitro Efficiency)',
    impact:
      'Kéo dài thời gian đốt bình Nitro (giây), tăng lực đẩy bứt tốc khi nhấn Shift/Space và sạc đầy thanh Nitro nhanh hơn khi Drift.',
    tip: 'Giúp bứt tốc ngoạn mục ở đoạn nước rút về đích hoặc vượt qua đầm lầy.',
  },
  weight: {
    title: 'Cân Nặng & Giáp Va Chạm (Weight & Armor)',
    impact:
      'Tăng lực húc văng đối thủ khi va chạm, giảm thời gian bị choáng (Stun) khi trúng bẫy và giữ thân xe ổn định trước gió tạt/sóng âm.',
    tip: 'Phù hợp lối chơi càn lướt ở phòng đua đông người hoặc đấu trường (Map 7, 10, 14).',
  },
};

// =========================================================================
// PHẦN 3: HỆ THỐNG 9 DANH HIỆU CÁ NHÂN (EQUIPPABLE TITLES)
// =========================================================================
export const PLAYER_TITLES: PlayerTitleDefinition[] = [
  {
    id: 'title_camp_10',
    label: 'Tân Binh Nguyên Sinh',
    badgeText: '[ 🦠 Tân Binh Nguyên Sinh ]',
    icon: '🦠',
    category: 'campaign',
    unlockRequirementText: 'Vượt qua Cấp độ 10 Chiến Dịch Solo (Chương 1)',
    color: '#4ADE80',
    bgGradient: 'linear-gradient(135deg, rgba(6, 78, 59, 0.9), rgba(16, 185, 129, 0.35))',
    borderColor: '#34D399',
    glowColor: 'rgba(52, 211, 153, 0.45)',
  },
  {
    id: 'title_camp_20',
    label: 'Kỵ Sĩ Phân Tử ATP',
    badgeText: '[ 🧬 Kỵ Sĩ Phân Tử ATP ]',
    icon: '🧬',
    category: 'campaign',
    unlockRequirementText: 'Vượt qua Cấp độ 20 Chiến Dịch Solo (Chương 2)',
    color: '#38BDF8',
    bgGradient: 'linear-gradient(135deg, rgba(12, 74, 110, 0.9), rgba(56, 189, 248, 0.35))',
    borderColor: '#38BDF8',
    glowColor: 'rgba(56, 189, 248, 0.48)',
  },
  {
    id: 'title_camp_30',
    label: 'Chuyên Gia Đột Biến Gen',
    badgeText: '[ ⚡ Chuyên Gia Đột Biến Gen ]',
    icon: '⚡',
    category: 'campaign',
    unlockRequirementText: 'Vượt qua Cấp độ 30 Chiến Dịch Solo (Chương 3)',
    color: '#C084FC',
    bgGradient: 'linear-gradient(135deg, rgba(59, 7, 100, 0.9), rgba(168, 85, 247, 0.38))',
    borderColor: '#A855F7',
    glowColor: 'rgba(168, 85, 247, 0.5)',
  },
  {
    id: 'title_camp_40',
    label: 'Thợ Săn Đại Thực Bào',
    badgeText: '[ 🛡️ Thợ Săn Đại Thực Bào ]',
    icon: '🛡️',
    category: 'campaign',
    unlockRequirementText: 'Vượt qua Cấp độ 40 Chiến Dịch Solo (Chương 4)',
    color: '#FB7185',
    bgGradient: 'linear-gradient(135deg, rgba(76, 5, 25, 0.92), rgba(244, 63, 94, 0.38))',
    borderColor: '#F43F5E',
    glowColor: 'rgba(244, 63, 94, 0.52)',
  },
  {
    id: 'title_camp_50',
    label: 'Huyền Thoại Sinh Học TripleD',
    badgeText: '[ 👑 Huyền Thoại Sinh Học TripleD ]',
    icon: '👑',
    category: 'campaign',
    unlockRequirementText: 'Phá đảo Cấp độ 50 Chiến Dịch Solo (Chương 5)',
    color: '#FDE047',
    bgGradient: 'linear-gradient(135deg, rgba(120, 53, 15, 0.95), rgba(234, 179, 8, 0.45))',
    borderColor: '#FACC15',
    glowColor: 'rgba(250, 204, 21, 0.65)',
  },
  {
    id: 'title_boss_tuan_anh',
    label: 'Kẻ Vượt Mặt Tuấn Anh',
    badgeText: '[ 🚀 Kẻ Vượt Mặt Tuấn Anh ]',
    icon: '🚀',
    category: 'raid_boss',
    unlockRequirementText: 'Đánh bại Boss 1: Đặng Tuấn Anh (Săn Boss)',
    color: '#F87171',
    bgGradient: 'linear-gradient(135deg, rgba(127, 29, 29, 0.95), rgba(239, 68, 68, 0.42))',
    borderColor: '#EF4444',
    glowColor: 'rgba(239, 68, 68, 0.6)',
  },
  {
    id: 'title_boss_mai_khanh',
    label: 'Phá Băng Mai Khánh',
    badgeText: '[ ❄️ Phá Băng Mai Khánh ]',
    icon: '❄️',
    category: 'raid_boss',
    unlockRequirementText: 'Đánh bại Boss 2: Đặng Mai Khánh (Săn Boss)',
    color: '#7DD3FC',
    bgGradient: 'linear-gradient(135deg, rgba(8, 47, 73, 0.95), rgba(56, 189, 248, 0.42))',
    borderColor: '#38BDF8',
    glowColor: 'rgba(56, 189, 248, 0.6)',
  },
  {
    id: 'title_boss_hanh_dung',
    label: 'Kháng Độc Hạnh Dung',
    badgeText: '[ 🌸 Kháng Độc Hạnh Dung ]',
    icon: '🌸',
    category: 'raid_boss',
    unlockRequirementText: 'Đánh bại Boss 3: Trần Hạnh Dung (Săn Boss)',
    color: '#F472B6',
    bgGradient: 'linear-gradient(135deg, rgba(80, 7, 36, 0.95), rgba(236, 72, 153, 0.45))',
    borderColor: '#EC4899',
    glowColor: 'rgba(236, 72, 153, 0.6)',
  },
  {
    id: 'title_boss_minh_dang',
    label: 'Khắc Tinh Của Minh Đặng',
    badgeText: '[ 🐉 Khắc Tinh Của Minh Đặng ]',
    icon: '🐉',
    category: 'raid_boss',
    unlockRequirementText:
      'Hạ gục Đại Boss Cuối: Minh Đặng (Tặng kèm Hào Quang Rồng dưới gầm xe)',
    color: '#FEF08A',
    bgGradient: 'linear-gradient(135deg, rgba(113, 63, 18, 0.98), rgba(250, 204, 21, 0.55))',
    borderColor: '#FACC15',
    glowColor: 'rgba(250, 204, 21, 0.78)',
    grantsDragonAura: true,
  },
];

// =========================================================================
// PHẦN 2: TỨ ĐẠI BOSS TRIPLED (RAID BOSS CONFIGS)
// =========================================================================
export const RAID_BOSSES: RaidBossConfig[] = [
  {
    id: 'tuan_anh',
    order: 1,
    name: 'ĐẶNG TUẤN ANH',
    title: 'Chiến Thần Phản Lực V12',
    gender: 'Nam',
    scale: 1.5,
    hpPerPlayer: 2200,
    skillCycleSec: 6,
    skillName: 'Mưa Tên Lửa Tầm Nhiệt & Vệt Lửa Nitro',
    skillDescription:
      'Tốc độ đường thẳng cực cao. Mỗi 6 giây khóa mục tiêu bắn Chùm 5 Tên Lửa Tầm Nhiệt về phía các xe học sinh dẫn đầu và rải 6 Vệt Lửa Nitro V12 phía sau đuôi xe.',
    accentColor: '#EF4444',
    glowColor: 'rgba(239, 68, 68, 0.55)',
    badgeIcon: '🔥',
    rewardTitleId: 'title_boss_tuan_anh',
    recommendedMapId: 'map_aorta',
    loadout: {
      chassis: 'chassis_t1',
      paint: 'paint_t1',
      decal: 'decal_t1',
      wheels: 'wheels_t1',
      spoiler: 'spoiler_t1',
      underglow: 'underglow_t1',
      trail: 'trail_t1',
    },
    computedStats: {
      topSpeedBonus: 18,
      accelBonus: 12,
      handlingBonus: 6,
      nitroBonus: 14,
      weightBonus: 12,
      passives: ['v12Reactor', 'overdriveCore', 'titanArmor'],
      maxSpeed: 315,
      accel: 250,
      turnSpeed: 3.4,
      driftGrip: 0.94,
      nitroDuration: 5.5,
      weight: 180,
    },
  },
  {
    id: 'mai_khanh',
    order: 2,
    name: 'ĐẶNG MAI KHÁNH',
    title: 'Nữ Hoàng Băng Giá Vũ Trụ',
    gender: 'Nữ',
    scale: 1.5,
    hpPerPlayer: 2600,
    skillCycleSec: 7,
    skillName: 'Sóng Xung Kích Hàn Băng (Cryo-Nova)',
    skillDescription:
      'Ôm mọi khúc cua 180 độ mượt như lụa không mất tốc độ. Mỗi 7 giây phát ra Sóng Xung Kích Hàn Băng diện rộng (450px) tỏa tròn quanh xe làm các xe ở gần bị đóng băng chậm 60% và trượt bánh trong 3.2 giây.',
    accentColor: '#38BDF8',
    glowColor: 'rgba(56, 189, 248, 0.55)',
    badgeIcon: '❄️',
    rewardTitleId: 'title_boss_mai_khanh',
    recommendedMapId: 'map_cryo',
    loadout: {
      chassis: 'chassis_ufo',
      paint: 'paint_poolparty',
      decal: 'decal_poolparty',
      wheels: 'wheels_poolparty',
      spoiler: 'spoiler_poolparty',
      underglow: 'underglow_poolparty',
      trail: 'trail_bluesmoke',
    },
    computedStats: {
      topSpeedBonus: 14,
      accelBonus: 14,
      handlingBonus: 20,
      nitroBonus: 12,
      weightBonus: 8,
      passives: ['iceImmune', 'maglevFloat', 'carbonGrip'],
      maxSpeed: 310,
      accel: 255,
      turnSpeed: 4.2,
      driftGrip: 0.99,
      nitroDuration: 5.0,
      weight: 160,
    },
  },
  {
    id: 'hanh_dung',
    order: 3,
    name: 'TRẦN HẠNH DUNG',
    title: 'Công Chúa Độc Dược Sinh Học',
    gender: 'Nữ',
    scale: 1.5,
    hpPerPlayer: 3000,
    skillCycleSec: 6,
    skillName: 'Bẫy Hoa Độc & Khiên Sinh Học Hồng Ngọc',
    skillDescription:
      'Mỗi 6 giây thả dải 7 Bẫy Hoa Độc & Vỏ Chuối Đột Biến chắn ngang đường, đồng thời bật Khiên Sinh Học Hồng Ngọc (tự động hồi 8% HP nếu không bị bắn trúng trong 3 giây).',
    accentColor: '#EC4899',
    glowColor: 'rgba(236, 72, 153, 0.55)',
    badgeIcon: '🌸',
    rewardTitleId: 'title_boss_hanh_dung',
    recommendedMapId: 'map_swamp',
    loadout: {
      chassis: 'chassis_biopod',
      paint: 'paint_project',
      decal: 'decal_project',
      wheels: 'wheels_project',
      spoiler: 'spoiler_biowings',
      underglow: 'underglow_neonpurple',
      trail: 'trail_purpleplasma',
    },
    computedStats: {
      topSpeedBonus: 15,
      accelBonus: 15,
      handlingBonus: 15,
      nitroBonus: 15,
      weightBonus: 10,
      passives: ['offroadPass', 'bananaResist', 'atpCore', 'trapBoost'],
      maxSpeed: 308,
      accel: 250,
      turnSpeed: 3.8,
      driftGrip: 0.96,
      nitroDuration: 5.2,
      weight: 175,
    },
  },
  {
    id: 'minh_dang',
    order: 4,
    name: 'MINH ĐẶNG',
    title: 'Tổng Tư Lệnh Sinh Học TripleD',
    gender: 'Nam',
    scale: 1.6,
    hpPerPlayer: 3600,
    skillCycleSec: 5,
    skillName: 'Tia Sét Phân Tử ATP & Cuồng Nộ Hoàng Kim (2 Phase)',
    skillDescription:
      'Phase 1 (100%->50% HP): Siêu nặng đầm, húc văng mọi xe cản đường và phóng Tia Sét Phân Tử ATP (480px) làm giật tê liệt 1.8s. Phase 2 (<50% HP): Phát sáng Đỏ Hoàng Kim, +20% tốc độ, triệu hồi cả 4 Tên Lửa + 7 Bẫy Độc + Băng Vũ Trụ!',
    accentColor: '#FACC15',
    glowColor: 'rgba(250, 204, 21, 0.65)',
    badgeIcon: '👑',
    rewardTitleId: 'title_boss_minh_dang',
    recommendedMapId: 'map_bioworld',
    loadout: {
      chassis: 'chassis_dragon',
      paint: 'paint_gold',
      decal: 'decal_tripled',
      wheels: 'wheels_gold',
      spoiler: 'spoiler_tripled',
      underglow: 'underglow_atp',
      trail: 'trail_rainbow',
    },
    computedStats: {
      topSpeedBonus: 20,
      accelBonus: 16,
      handlingBonus: 16,
      nitroBonus: 18,
      weightBonus: 20,
      passives: [
        'v12Reactor',
        'heavyBulldozer',
        'titanArmor',
        'iceImmune',
        'offroadPass',
        'atpCore',
      ],
      maxSpeed: 325,
      accel: 270,
      turnSpeed: 3.95,
      driftGrip: 0.97,
      nitroDuration: 6.0,
      weight: 210,
    },
  },
];

// =========================================================================
// PHẦN 1: CHIẾN DỊCH ĐUA ĐƠN 50 CẤP ĐỘ (SOLO CAMPAIGN - 50 LEVELS)
// =========================================================================
export const SOLO_CAMPAIGN_CHAPTERS: {
  chapter: number;
  name: string;
  subtitle: string;
  levelRange: [number, number];
  accentColor: string;
  badgeIcon: string;
  milestoneTitleId: PlayerTitleId;
}[] = [
  {
    chapter: 1,
    name: 'Chương 1: Khởi Nguyên Tế Bào',
    subtitle: 'Cấp 1 – 10 · Làm quen đường đua sinh học & kiểm soát quỹ đạo (2 Laps)',
    levelRange: [1, 10],
    accentColor: '#34D399',
    badgeIcon: '🦠',
    milestoneTitleId: 'title_camp_10',
  },
  {
    chapter: 2,
    name: 'Chương 2: Mạch Máu & Năng Lượng ATP',
    subtitle: 'Cấp 11 – 20 · Tăng tốc độ tuần hoàn & bứt phá dòng chảy (3 Laps)',
    levelRange: [11, 20],
    accentColor: '#38BDF8',
    badgeIcon: '🧬',
    milestoneTitleId: 'title_camp_20',
  },
  {
    chapter: 3,
    name: 'Chương 3: Xoắn Ốc Đột Biến Gen',
    subtitle: 'Cấp 21 – 30 · Khúc cua xoắn kép & bẫy sinh học khắc nghiệt (4 Laps)',
    levelRange: [21, 30],
    accentColor: '#A855F7',
    badgeIcon: '⚡',
    milestoneTitleId: 'title_camp_30',
  },
  {
    chapter: 4,
    name: 'Chương 4: Cuộc Chiến Đại Thực Bào',
    subtitle: 'Cấp 31 – 40 · Đấu trường miễn dịch & áp lực sinh tồn cao độ (5 Laps)',
    levelRange: [31, 40],
    accentColor: '#F43F5E',
    badgeIcon: '🛡️',
    milestoneTitleId: 'title_camp_40',
  },
  {
    chapter: 5,
    name: 'Chương 5: Đỉnh Cao Sinh Học TripleD',
    subtitle: 'Cấp 41 – 50 · Thử thách đại dịch & chinh phục ngôi đền Huyền Thoại (6 Laps)',
    levelRange: [41, 50],
    accentColor: '#FACC15',
    badgeIcon: '👑',
    milestoneTitleId: 'title_camp_50',
  },
];

function getCampaignModeByLevel(level: number): {
  mode: CampaignModeType;
  modeLabel: string;
  modeIcon: string;
  modeColor: string;
  subtitle: string;
} {
  const mod10 = level % 10;
  if (mod10 === 0) {
    return {
      mode: 'infection',
      modeLabel: 'Đại Dịch Thực Khuẩn Thể (Bio-Infection)',
      modeIcon: '☣️',
      modeColor: '#A855F7',
      subtitle:
        '2 xe AI nhiễm Virus tím đuổi húc lây nhiễm! Hãy sống sót không bị lây nhiễm đến khi hết giờ!',
    };
  }
  if (mod10 === 1 || mod10 === 4 || mod10 === 7) {
    return {
      mode: 'classic',
      modeLabel: 'Đua Cổ Điển (Classic Race)',
      modeIcon: '🏁',
      modeColor: '#34D399',
      subtitle:
        'Đua tranh thứ hạng Top 1–3 trước dàn AI Bots tinh nhuệ của Học Viện TripleD.',
    };
  }
  if (mod10 === 2 || mod10 === 6) {
    return {
      mode: 'time_trial',
      modeLabel: 'Đua Tính Giờ & Xe Bóng Ma (Time Trial + Ghost Car)',
      modeIcon: '⏱️',
      modeColor: '#38BDF8',
      subtitle:
        'Đua với đồng hồ và vượt qua chiếc Xe Bóng Ma (Ghost Car) ghi lại kỷ lục chạy trước đó của chính bạn!',
    };
  }
  if (mod10 === 3 || mod10 === 8) {
    return {
      mode: 'atp_rush',
      modeLabel: 'Thu Thập Phân Tử ATP (ATP Slalom Rush)',
      modeIcon: '🎯',
      modeColor: '#FACC15',
      subtitle:
        'Lạng lách ăn đủ số hạt năng lượng ATP màu vàng xếp zíc-zắc trên đường và né quả cầu Độc tố tím trước khi hết giờ!',
    };
  }
  // mod10 === 5 || mod10 === 9
  return {
    mode: 'elimination',
    modeLabel: 'Vòng Đua Sinh Tồn (Knockout Elimination)',
    modeIcon: '💀',
    modeColor: '#F43F5E',
    subtitle:
      'Mỗi 20 giây, chiếc xe đứng cuối bảng sẽ phát nổ và bị loại! Hãy giữ vững vị trí dẫn đầu!',
  };
}

export const SOLO_CAMPAIGN_LEVELS: CampaignLevelConfig[] = Array.from(
  { length: 50 },
  (_, idx) => {
    const level = idx + 1;
    const chapter = Math.ceil(level / 10); // 1..5
    const laps = chapter + 1; // Chapter 1 -> 2 Laps, ..., Chapter 5 -> 6 Laps
    const mapObj = MAPS[idx % MAPS.length] || MAPS[0];
    const modeMeta = getCampaignModeByLevel(level);
    const isMilestone = level % 10 === 0;

    const difficulties: BotDifficulty[] = [
      'easy',
      'medium',
      'hard',
      'hard',
      'nightmare',
    ];
    const botDifficulty = difficulties[chapter - 1] || 'medium';

    const milestoneTitles: Record<number, PlayerTitleId> = {
      10: 'title_camp_10',
      20: 'title_camp_20',
      30: 'title_camp_30',
      40: 'title_camp_40',
      50: 'title_camp_50',
    };

    const baseLapSec = mapObj.isPointToPoint ? 52 : 48;
    const targetTimeSec =
      modeMeta.mode === 'infection'
        ? 45 + chapter * 10 // 55s .. 95s survival
        : modeMeta.mode === 'atp_rush'
        ? laps * baseLapSec + 15
        : laps * baseLapSec - chapter * 2;

    const targetAtpCount =
      modeMeta.mode === 'atp_rush' ? 12 + chapter * 4 : undefined;

    const botCount =
      modeMeta.mode === 'time_trial'
        ? 0
        : modeMeta.mode === 'elimination'
        ? 5
        : modeMeta.mode === 'infection'
        ? 7
        : 5 + Math.floor(chapter / 2);

    return {
      level,
      chapter,
      title: `Cấp ${level}: ${mapObj.name.replace(/^Map\s+\d+\s*[–-]\s*/, '')}`,
      subtitle: modeMeta.subtitle,
      mode: modeMeta.mode,
      modeLabel: modeMeta.modeLabel,
      modeIcon: modeMeta.modeIcon,
      modeColor: modeMeta.modeColor,
      mapId: mapObj.id,
      laps: modeMeta.mode === 'infection' ? Math.max(2, laps - 1) : laps,
      botCount,
      botDifficulty,
      targetTimeSec,
      targetTime2StarSec: Math.round(targetTimeSec * 1.15),
      targetTime1StarSec: Math.round(targetTimeSec * 1.30),
      targetAtpCount,
      eliminationIntervalSec: modeMeta.mode === 'elimination' ? 20 : undefined,
      firstClearCoins: isMilestone ? 50 : 15,
      unlocksTitleId: milestoneTitles[level],
    };
  }
);



