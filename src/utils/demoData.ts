import { RawMainRow, RawStatusRow, RawSalesRow, AdsGroup } from '../types';

export const INITIAL_ADS_GROUPS: AdsGroup[] = [
  {
    id: 'grp-1',
    name: 'ม่านมอเตอร์ & Smart Home',
    color: '#3B82F6', // blue
    assignedAds: [
      'Vdoม่านมอเตอร์บ้านคุณกอล์ฟ',
      'ม่านไฟฟ้า Smart Home เชื่อม Google/Alexa',
      'ม่านมอเตอร์ Somfy บ้านเดี่ยวหรู',
    ],
    keywords: ['มอเตอร์', 'smart', 'ไฟฟ้า'],
  },
  {
    id: 'grp-2',
    name: 'โปรโมชั่นผ้าม่านกัน UV / มินิมอล',
    color: '#10B981', // green
    assignedAds: [
      'โปรโมชั่นผ้าม่านกัน UV สไตล์มินิมอล',
      'ผ้าม่านสองชั้นกันแสง100% บ้านเดี่ยว',
      'ม่านจีบรางเทปแถมสายรวบม่านพรีเมียม',
    ],
    keywords: ['uv', 'กันแสง', 'มินิมอล', 'โปรโมชั่น'],
  },
  {
    id: 'grp-3',
    name: 'ม่านม้วน & มู่ลี่ไม้ & คอนโด',
    color: '#8B5CF6', // purple
    assignedAds: [
      'รีวิวม่านม้วนและม่านปรับแสงคอนโดหรู',
      'แคมเปญมู่ลี่ไม้สั่งตัดพิเศษบ้านหรู',
      'ม่านม้วนกรองแสง Sunscreen ออฟฟิศ',
    ],
    keywords: ['ม่านม้วน', 'มู่ลี่', 'คอนโด'],
  },
  {
    id: 'grp-4',
    name: 'วอลเปเปอร์ & งานตกแต่ง',
    color: '#F59E0B', // amber
    assignedAds: [
      'แนะนำวอลเปเปอร์นำเข้าเกาหลี',
      'วอลเปเปอร์สั่งพิมพ์ลายธรรมชาติ',
    ],
    keywords: ['วอลเปเปอร์', 'wallpaper'],
  },
  {
    id: 'grp-5',
    name: 'กิจกรรม & งานแฟร์ / แคมเปญสาขา',
    color: '#EC4899', // pink
    assignedAds: [
      'บูธงานบ้านและสวนแฟร์ เมืองทองธานี',
      'โปรเปิดสาขาเชียงใหม่ลดพิเศษ30%',
    ],
    keywords: ['แฟร์', 'สาขา', 'บูธ'],
  },
];

export function generateDemoRawData(): {
  main: RawMainRow[];
  status: RawStatusRow[];
  sales: RawSalesRow[];
  adsGroups: AdsGroup[];
} {
  const adsTemplates = [
    'Vdoม่านมอเตอร์บ้านคุณกอล์ฟ',
    'โปรโมชั่นผ้าม่านกัน UV สไตล์มินิมอล',
    'รีวิวม่านม้วนและม่านปรับแสงคอนโดหรู',
    'แนะนำวอลเปเปอร์นำเข้าเกาหลี',
    'ม่านจีบรางเทปแถมสายรวบม่านพรีเมียม',
    'ผ้าม่านสองชั้นกันแสง100% บ้านเดี่ยว',
    'โปรเปิดสาขาเชียงใหม่ลดพิเศษ30%',
    'แคมเปญมู่ลี่ไม้สั่งตัดพิเศษบ้านหรู',
    'ม่านไฟฟ้า Smart Home เชื่อม Google/Alexa',
    'บูธงานบ้านและสวนแฟร์ เมืองทองธานี',
    'ม่านมอเตอร์ Somfy บ้านเดี่ยวหรู',
    'ม่านม้วนกรองแสง Sunscreen ออฟฟิศ',
    'วอลเปเปอร์สั่งพิมพ์ลายธรรมชาติ',
  ];

  const statuses = [
    'ปิดการขาย (ชำระเงินแล้ว)',
    'เสนอราคาเรียบร้อย',
    'นัดวัดพื้นที่หน้างาน',
    'สนใจเบื้องต้น (รอติดต่อกลับ)',
    'กำลังผลิตและติดตั้ง',
    'ยกเลิก/ชะลอโครงการ',
  ];

  const staffList = [
    'กิตติพงษ์ เจริญทรัพย์',
    'ณัฐริกา ศรีสุข',
    'สมชาย ใจดี',
    'วรพรหม มั่นคง',
    'ชลธิชา สว่างวงศ์',
    'ภัทรพล ยิ่งเจริญ',
  ];

  const branches = [
    { code: 'BR-01', name: 'สาขาสุขุมวิท (กทม.)', prov: 'กรุงเทพมหานคร', dist: 'วัฒนา' },
    { code: 'BR-02', name: 'สาขารามอินทรา (กทม.)', prov: 'กรุงเทพมหานคร', dist: 'บางเขน' },
    { code: 'BR-03', name: 'สาขานนทบุรี', prov: 'นนทบุรี', dist: 'ปากเกร็ด' },
    { code: 'BR-04', name: 'สาขาพัทยา-ศรีราชา', prov: 'ชลบุรี', dist: 'ศรีราชา' },
    { code: 'BR-05', name: 'สาขาเชียงใหม่', prov: 'เชียงใหม่', dist: 'เมืองเชียงใหม่' },
  ];

  const sources = [
    'Facebook Ads',
    'Google Search',
    'Line Official',
    'TikTok Ads',
    'Walk-in หน้าร้าน',
    'บอกต่อ/ลูกค้าเก่า (Referral)',
  ];

  const jobTypes = [
    'บ้านเดี่ยว',
    'คอนโดมิเนียม',
    'ทาวน์โฮม',
    'อาคารสำนักงาน / โฮมออฟฟิศ',
    'พูลวิลล่า / บ้านพักตากอากาศ',
    'ร้านอาหาร / คาเฟ่',
  ];

  const firstNames = ['คุณกานต์', 'คุณธนากร', 'คุณวิภาดา', 'คุณพชร', 'คุณศศิธร', 'คุณอรรถพล', 'คุณนลินี', 'คุณเกรียงไกร', 'คุณณัฐพล', 'คุณชัชวาล', 'คุณพิมพ์ใจ', 'คุณอริสา', 'คุณปิยะพงษ์', 'คุณรัชนีกร', 'คุณอัครเดช', 'คุณเบญญาภา', 'คุณสุรชัย', 'คุณวรรณวิมล', 'คุณธีรยุทธ', 'คุณนิภาภัทร'];
  const lastNames = ['เจริญสุข', 'มั่นเจริญ', 'วงศ์ประเสริฐ', 'ศิริพงษ์', 'กิตติคุณ', 'โชคอนันต์', 'แสงทอง', 'รัตนโกสินทร์', 'บุญญานันท์', 'เกษมสุข'];

  const main: RawMainRow[] = [];
  const status: RawStatusRow[] = [];
  const sales: RawSalesRow[] = [];

  // Generate 85 realistic lead records spanning September 2026 and earlier months
  const totalItems = 85;

  for (let i = 1; i <= totalItems; i++) {
    // Generate dates: Year 26 (2026), Months 07, 08, 09, Days 01-28
    const monthNum = i % 3 === 0 ? '07' : i % 2 === 0 ? '08' : '09';
    const dayNum = String((i % 27) + 1).padStart(2, '0');
    const timeSeq = String(10000000 + i * 137).substring(0, 9);
    const leadNo = `L26${monthNum}${dayNum}${timeSeq}`;

    // Main Col Y Ads text formatting matching reality:
    const adName = adsTemplates[i % adsTemplates.length];
    const rawAdsText = `Ads: ${adName}\nOpportunity: \nCause: \nQuotation Amount: \nRemark: สนใจติดตั้งด่วน`;

    main.push({
      leadNo,
      rawAds: rawAdsText,
      extractedAds: adName,
    });

    const branchObj = branches[i % branches.length];
    const staffName = staffList[i % staffList.length];
    const customerName = `${firstNames[i % firstNames.length]} ${lastNames[(i * 3) % lastNames.length]}`;
    const phone = `08${(10000000 + i * 98765).toString().substring(0, 8)}`;
    const source = sources[i % sources.length];
    const job = jobTypes[i % jobTypes.length];
    
    // Status assignment: ~35% closed sales, 20% quoting, 20% site visit, 15% follow-up, 10% cancelled
    let st: string;
    if (i % 3 === 0 || i % 7 === 0) {
      st = 'ปิดการขาย (ชำระเงินแล้ว)';
    } else if (i % 4 === 0) {
      st = 'เสนอราคาเรียบร้อย';
    } else if (i % 5 === 0) {
      st = 'นัดวัดพื้นที่หน้างาน';
    } else if (i % 9 === 0) {
      st = 'ยกเลิก/ชะลอโครงการ';
    } else {
      st = 'สนใจเบื้องต้น (รอติดต่อกลับ)';
    }

    status.push({
      status: st,
      leadNo,
      customerName,
      phone,
      source,
      jobType: job,
      staff: staffName,
      branch: branchObj.name,
      district: branchObj.dist,
      province: branchObj.prov,
    });

    // Sales: For won leads and some others
    if (st === 'ปิดการขาย (ชำระเงินแล้ว)' || i % 4 === 0) {
      const baseAmount = 18000 + ((i * 3791) % 115000);
      const isStatusN = i % 11 !== 0; // 90% have status 'N' (valid), 10% have 'C' (cancelled/test)

      // Maybe 1 or 2 payment records (deposit + final)
      sales.push({
        leadNo,
        paymentDate: `2026-${monthNum}-${dayNum}`,
        amount: Math.round(baseAmount * 0.5),
        salesStatus: isStatusN ? 'N' : 'C',
      });

      if (baseAmount > 40000 && isStatusN) {
        const nextDay = String(Math.min(28, parseInt(dayNum, 10) + 3)).padStart(2, '0');
        sales.push({
          leadNo,
          paymentDate: `2026-${monthNum}-${nextDay}`,
          amount: Math.round(baseAmount * 0.5),
          salesStatus: 'N',
        });
      }
    }
  }

  return {
    main,
    status,
    sales,
    adsGroups: INITIAL_ADS_GROUPS,
  };
}
