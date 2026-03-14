export interface Subscription {
  id: string;
  userName: string;
  planName: string;
  status: "نشط" | "معلق";
  startDate: string;
  amount: number;
  amountDisplay: string;
}

export interface Order {
  id: string;
  displayId: string;
  userName: string;
  itemsSummary: string;
  status: "قيد التوصيل" | "قيد التحضير" | "مكتمل" | "معلق";
  date: string;
  amount: number;
  amountDisplay: string;
}

export const recentSubscriptions: Subscription[] = [
  {
    id: "1",
    userName: "أحمد محمد",
    planName: "Premium Monthly",
    status: "نشط",
    startDate: "2026-03-01",
    amount: 500,
    amountDisplay: "500 ريال",
  },
  {
    id: "2",
    userName: "فاطمة علي",
    planName: "Standard Weekly",
    status: "معلق",
    startDate: "2026-03-10",
    amount: 200,
    amountDisplay: "200 ريال",
  },
  {
    id: "3",
    userName: "عمر خالد",
    planName: "Premium Weekly",
    status: "نشط",
    startDate: "2026-03-08",
    amount: 350,
    amountDisplay: "350 ريال",
  },
  {
    id: "4",
    userName: "سارة حسن",
    planName: "Standard Monthly",
    status: "نشط",
    startDate: "2026-03-05",
    amount: 400,
    amountDisplay: "400 ريال",
  },
  {
    id: "5",
    userName: "محمد عبدالله",
    planName: "Premium Monthly",
    status: "معلق",
    startDate: "2026-03-09",
    amount: 500,
    amountDisplay: "500 ريال",
  },
];

export const recentOrders: Order[] = [
  {
    id: "ORD-001",
    displayId: "ORD-001",
    userName: "أحمد محمد",
    itemsSummary: "دجاج مشوي، أرز بسمتي",
    status: "قيد التوصيل",
    date: "2026-03-14",
    amount: 50,
    amountDisplay: "50 ريال",
  },
  {
    id: "ORD-002",
    displayId: "ORD-002",
    userName: "فاطمة علي",
    itemsSummary: "سلمون، خضار مشكلة",
    status: "قيد التحضير",
    date: "2026-03-14",
    amount: 75,
    amountDisplay: "75 ريال",
  },
  {
    id: "ORD-003",
    displayId: "ORD-003",
    userName: "عمر خالد",
    itemsSummary: "لحم بقري، بطاطا مهروسة",
    status: "مكتمل",
    date: "2026-03-13",
    amount: 65,
    amountDisplay: "65 ريال",
  },
  {
    id: "ORD-004",
    displayId: "ORD-004",
    userName: "سارة حسن",
    itemsSummary: "دجاج تريياكي، أرز أبيض",
    status: "قيد التحضير",
    date: "2026-03-14",
    amount: 55,
    amountDisplay: "55 ريال",
  },
  {
    id: "ORD-005",
    displayId: "ORD-005",
    userName: "محمد عبدالله",
    itemsSummary: "سمك مشوي، سلطة يونانية",
    status: "معلق",
    date: "2026-03-14",
    amount: 70,
    amountDisplay: "70 ريال",
  },
];
