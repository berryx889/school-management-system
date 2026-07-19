// Minimal stroke-icon set (24x24, currentColor) used in place of emoji throughout
// the app, so every portal shares one consistent, monochrome icon language.
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function Svg({ children, className = 'h-5 w-5' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

export const IconHome = (p) => <Svg {...p}><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" /></Svg>;

export const IconGraduationCap = (p) => <Svg {...p}><path d="M2 9 12 4l10 5-10 5-10-5Z" /><path d="M6 11.5V17c0 1.1 2.7 3 6 3s6-1.9 6-3v-5.5" /><path d="M22 9v6" /></Svg>;

export const IconUser = (p) => <Svg {...p}><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c1.4-3.4 4.4-5.5 7.5-5.5s6.1 2.1 7.5 5.5" /></Svg>;

export const IconUsers = (p) => <Svg {...p}><circle cx="9" cy="8" r="3.2" /><path d="M2.8 19c1.2-3 3.4-4.8 6.2-4.8s5 1.8 6.2 4.8" /><path d="M15.5 5.2a3.2 3.2 0 0 1 0 6.2" /><path d="M16.3 14.4c2.3.4 4 2 4.9 4.6" /></Svg>;

export const IconBuilding = (p) => <Svg {...p}><rect x="4" y="3" width="11" height="18" rx="1" /><path d="M9 21v-4h1M15 9h5v12h-5M9 7h1M9 11h1M9 15h1" /></Svg>;

export const IconBook = (p) => <Svg {...p}><path d="M4 5a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V5Z" /><path d="M4 18a2 2 0 0 1 2-2h12" /></Svg>;

export const IconLink = (p) => <Svg {...p}><path d="M9.5 14.5 14.5 9.5" /><path d="M10.5 6.5 12 5a4 4 0 1 1 5.66 5.66l-1.5 1.5" /><path d="M13.5 17.5 12 19a4 4 0 1 1-5.66-5.66l1.5-1.5" /></Svg>;

export const IconCalendar = (p) => <Svg {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></Svg>;

export const IconCamera = (p) => <Svg {...p}><path d="M4 8.5a1 1 0 0 1 1-1h2.2l1-1.7h7.6l1 1.7H19a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8.5Z" /><circle cx="12" cy="13" r="3.3" /></Svg>;

export const IconUtensils = (p) => <Svg {...p}><path d="M6 3v7a2 2 0 0 0 4 0V3M8 10v11M15 3c-1.5 1.5-2 3-2 5s1 3 2 3v10" /></Svg>;

export const IconEdit = (p) => <Svg {...p}><path d="M4 20h4.2L19 9.2a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8V20Z" /><path d="M13.5 6 18 10.5" /></Svg>;

export const IconBarChart = (p) => <Svg {...p}><path d="M4 20V10M11 20V4M18 20v-7" /><path d="M2.5 20h19" /></Svg>;

export const IconFileText = (p) => <Svg {...p}><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></Svg>;

export const IconLock = (p) => <Svg {...p}><rect x="5" y="10.5" width="14" height="9.5" rx="1.5" /><path d="M8 10.5V7.5a4 4 0 1 1 8 0v3" /></Svg>;

export const IconUnlock = (p) => <Svg {...p}><rect x="5" y="10.5" width="14" height="9.5" rx="1.5" /><path d="M8 10.5V7.5a4 4 0 0 1 7.5-2" /></Svg>;

export const IconWallet = (p) => <Svg {...p}><path d="M3.5 7.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V7.5Z" /><path d="M15.5 12.5h3.5v3h-3.5a1.5 1.5 0 0 1 0-3Z" /></Svg>;

export const IconReceipt = (p) => <Svg {...p}><path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V3Z" /><path d="M9 8h6M9 12h6" /></Svg>;

export const IconClipboardList = (p) => <Svg {...p}><rect x="5.5" y="4.5" width="13" height="16" rx="1.5" /><rect x="9" y="3" width="6" height="3" rx="1" /><path d="M9 11h6M9 15h6" /></Svg>;

export const IconMegaphone = (p) => <Svg {...p}><path d="M4 10.5v3a1 1 0 0 0 1 1h1.5l1 4.5h2l-1-4.5H12L18 18V6l-6 3.5H6.5a1 1 0 0 0-1 1Z" transform="translate(0,-1)" /></Svg>;

export const IconSettings = (p) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.4 5.6l-1.5 1.5M7.1 16.9l-1.5 1.5M18.4 18.4l-1.5-1.5M7.1 7.1 5.6 5.6" /></Svg>;

export const IconCheckCircle = (p) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M8.3 12.3 11 15l5-5.5" /></Svg>;

export const IconAlertTriangle = (p) => <Svg {...p}><path d="M12 4 21 19.5H3L12 4Z" /><path d="M12 10v4M12 17h.01" /></Svg>;

export const IconClock = (p) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>;

export const IconCreditCard = (p) => <Svg {...p}><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="M3 10h18M6.5 14.5h3" /></Svg>;

export const IconTrendingUp = (p) => <Svg {...p}><path d="M3.5 16 10 9.5l4 4 6.5-7" /><path d="M15 6.5h5.5V12" /></Svg>;

export const IconMessageCircle = (p) => <Svg {...p}><path d="M12 20c4.7 0 8.5-3.4 8.5-7.5S16.7 5 12 5s-8.5 3.4-8.5 7.5c0 1.7.6 3.2 1.7 4.5L4.5 20l4-1.2c1 .4 2.2.7 3.5.7Z" /></Svg>;

export const IconInbox = (p) => <Svg {...p}><path d="M4 12.5h4.5l1.5 2.5h4l1.5-2.5H20" /><path d="M4.5 7 4 12.5V18a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 18v-5.5L19.5 7a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 7Z" /></Svg>;

export const IconPrinter = (p) => <Svg {...p}><path d="M7 8.5V4h10v4.5" /><rect x="4.5" y="8.5" width="15" height="8" rx="1.5" /><path d="M7 15.5h10V20H7v-4.5Z" /></Svg>;

export const IconSmartphone = (p) => <Svg {...p}><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18.5h2" /></Svg>;

export const IconShield = (p) => <Svg {...p}><path d="M12 3.5 19 6v6c0 4.5-3 7.5-7 8.5-4-1-7-4-7-8.5V6l7-2.5Z" /><path d="M9 12l2 2 4-4.5" /></Svg>;

export const IconMenu = (p) => <Svg {...p}><path d="M4 6.5h16M4 12h16M4 17.5h16" /></Svg>;

export const IconArrowLeft = (p) => <Svg {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></Svg>;

export const IconChevronRight = (p) => <Svg {...p}><path d="m9 6 6 6-6 6" /></Svg>;

export const IconPlus = (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;

export const IconUpload = (p) => <Svg {...p}><path d="M12 15.5V4.5M8 8.5 12 4.5 16 8.5" /><path d="M4.5 15.5V18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2.5" /></Svg>;

export const IconDownload = (p) => <Svg {...p}><path d="M12 4.5v11M8 11.5 12 15.5 16 11.5" /><path d="M4.5 15.5V18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2.5" /></Svg>;

export const IconX = (p) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>;

export const IconArrowRight = (p) => <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>;

export const IconSparkle = (p) => <Svg {...p}><path d="M12 3.5c.5 3 2 5.3 5 5.8-3 .5-4.5 2.8-5 5.8-.5-3-2-5.3-5-5.8 3-.5 4.5-2.8 5-5.8Z" /><path d="M19 15.5c.25 1.2.9 2 2.1 2.3-1.2.3-1.85 1.1-2.1 2.3-.25-1.2-.9-2-2.1-2.3 1.2-.3 1.85-1.1 2.1-2.3Z" /></Svg>;
