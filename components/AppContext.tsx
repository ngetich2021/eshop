"use client";

/**
 * AppContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides:
 *   • Global language selection (10 languages, RTL-aware)
 *   • Global accessibility settings (font size, high contrast, reduced motion)
 *
 * Key rules followed:
 *   • NO setState() inside an effect body — state is lazy-initialised from
 *     localStorage via the initializer function passed to useState().
 *   • Effects are used ONLY to sync derived state to external systems
 *     (document.documentElement attributes / class list).
 *   • All TypeScript types are explicit — no implicit `any`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Language =
  | "en"
  | "sw"
  | "fr"
  | "ar"
  | "zh"
  | "hi"
  | "es"
  | "pt"
  | "de"
  | "ja";

export type FontSize = "normal" | "large" | "xlarge";

export interface A11yState {
  fontSize: FontSize;
  highContrast: boolean;
  reducedMotion: boolean;
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

interface A11yContextValue {
  a11y: A11yState;
  setFontSize: (size: FontSize) => void;
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
}

// ─── Language metadata ────────────────────────────────────────────────────────

export const LANGUAGES: ReadonlyArray<{
  readonly code: Language;
  readonly label: string;
  readonly native: string;
  readonly flag: string;
  readonly dir: "ltr" | "rtl";
}> = [
  { code: "en", label: "English",    native: "English",   flag: "🇬🇧", dir: "ltr" },
  { code: "sw", label: "Swahili",    native: "Kiswahili", flag: "🇰🇪", dir: "ltr" },
  { code: "fr", label: "French",     native: "Français",  flag: "🇫🇷", dir: "ltr" },
  { code: "ar", label: "Arabic",     native: "العربية",   flag: "🇸🇦", dir: "rtl" },
  { code: "zh", label: "Chinese",    native: "中文",       flag: "🇨🇳", dir: "ltr" },
  { code: "hi", label: "Hindi",      native: "हिन्दी",     flag: "🇮🇳", dir: "ltr" },
  { code: "es", label: "Spanish",    native: "Español",   flag: "🇪🇸", dir: "ltr" },
  { code: "pt", label: "Portuguese", native: "Português", flag: "🇧🇷", dir: "ltr" },
  { code: "de", label: "German",     native: "Deutsch",   flag: "🇩🇪", dir: "ltr" },
  { code: "ja", label: "Japanese",   native: "日本語",     flag: "🇯🇵", dir: "ltr" },
] as const;

// ─── Translations ─────────────────────────────────────────────────────────────

type TranslationMap = Readonly<Record<string, string>>;
type Translations   = Readonly<Record<Language, TranslationMap>>;

const translations: Translations = {
  en: {
    dashboard: "Dashboard", inventory: "Inventory", products: "Products",
    "adjust stock": "Adjust Stock", sales: "Sales", sold: "Sold", quote: "Quote",
    finance: "Finance", payments: "Payments", expenses: "Expenses", credit: "Credit",
    advance: "Advance", salary: "Salary", wallet: "Wallet", margin: "Margin",
    suppliers: "Suppliers", hr: "HR", staff: "Staff", payroll: "Payroll",
    "login info": "Login Info", reports: "Reports", assets: "Assets",
    buy: "Buy", shops: "Shops", logout: "Logout", hey: "Hey",
    no_access: "No sections assigned. Contact your admin.",
    language: "Language", accessibility: "Accessibility",
    font_size: "Font Size", high_contrast: "High Contrast",
    reduced_motion: "Reduced Motion", normal: "Normal", large: "Large",
    x_large: "X-Large", notifications: "Notifications",
    search_language: "Search language...", admin: "Admin",
    close_menu: "Close menu", toggle_menu: "Toggle menu",
    collapse_sidebar: "Collapse sidebar",
  },
  sw: {
    dashboard: "Dashibodi", inventory: "Hesabu ya Bidhaa", products: "Bidhaa",
    "adjust stock": "Rekebisha Hisa", sales: "Mauzo", sold: "Zilizouzwa", quote: "Nukuu",
    finance: "Fedha", payments: "Malipo", expenses: "Gharama", credit: "Mkopo",
    advance: "Malipo ya Mapema", salary: "Mshahara", wallet: "Mkoba", margin: "Faida",
    suppliers: "Wasambazaji", hr: "Rasilimali Watu", staff: "Wafanyakazi",
    payroll: "Orodha ya Mishahara", "login info": "Taarifa za Kuingia",
    reports: "Ripoti", assets: "Mali", buy: "Nunua", shops: "Maduka",
    logout: "Toka", hey: "Habari",
    no_access: "Hakuna sehemu zilizopewa. Wasiliana na msimamizi.",
    language: "Lugha", accessibility: "Ufikiaji", font_size: "Ukubwa wa Maandishi",
    high_contrast: "Mwangaza Mkubwa", reduced_motion: "Kupunguza Mwendo",
    normal: "Kawaida", large: "Kubwa", x_large: "Kubwa Zaidi",
    notifications: "Arifa", search_language: "Tafuta lugha...", admin: "Msimamizi",
    close_menu: "Funga menyu", toggle_menu: "Badilisha menyu",
    collapse_sidebar: "Punguza upau",
  },
  fr: {
    dashboard: "Tableau de bord", inventory: "Inventaire", products: "Produits",
    "adjust stock": "Ajuster le stock", sales: "Ventes", sold: "Vendu", quote: "Devis",
    finance: "Finance", payments: "Paiements", expenses: "Dépenses", credit: "Crédit",
    advance: "Avance", salary: "Salaire", wallet: "Portefeuille", margin: "Marge",
    suppliers: "Fournisseurs", hr: "RH", staff: "Personnel", payroll: "Paie",
    "login info": "Infos de connexion", reports: "Rapports", assets: "Actifs",
    buy: "Acheter", shops: "Boutiques", logout: "Déconnexion", hey: "Salut",
    no_access: "Aucune section assignée. Contactez votre administrateur.",
    language: "Langue", accessibility: "Accessibilité", font_size: "Taille de police",
    high_contrast: "Contraste élevé", reduced_motion: "Mouvement réduit",
    normal: "Normal", large: "Grand", x_large: "Très grand",
    notifications: "Notifications", search_language: "Rechercher une langue...",
    admin: "Administrateur", close_menu: "Fermer le menu",
    toggle_menu: "Basculer le menu", collapse_sidebar: "Réduire la barre",
  },
  ar: {
    dashboard: "لوحة التحكم", inventory: "المخزون", products: "المنتجات",
    "adjust stock": "تعديل المخزون", sales: "المبيعات", sold: "المباع", quote: "عرض سعر",
    finance: "المالية", payments: "المدفوعات", expenses: "المصروفات", credit: "الائتمان",
    advance: "سلفة", salary: "الراتب", wallet: "المحفظة", margin: "الهامش",
    suppliers: "الموردون", hr: "الموارد البشرية", staff: "الموظفون",
    payroll: "كشف الرواتب", "login info": "بيانات الدخول",
    reports: "التقارير", assets: "الأصول", buy: "شراء", shops: "المتاجر",
    logout: "تسجيل الخروج", hey: "مرحبًا",
    no_access: "لا توجد أقسام مخصصة. تواصل مع المشرف.",
    language: "اللغة", accessibility: "إمكانية الوصول", font_size: "حجم الخط",
    high_contrast: "تباين عالٍ", reduced_motion: "تقليل الحركة",
    normal: "عادي", large: "كبير", x_large: "كبير جدًا",
    notifications: "الإشعارات", search_language: "ابحث عن لغة...", admin: "مشرف",
    close_menu: "إغلاق القائمة", toggle_menu: "تبديل القائمة",
    collapse_sidebar: "طي الشريط الجانبي",
  },
  zh: {
    dashboard: "仪表板", inventory: "库存", products: "产品",
    "adjust stock": "调整库存", sales: "销售", sold: "已售", quote: "报价",
    finance: "财务", payments: "付款", expenses: "费用", credit: "信用",
    advance: "预支", salary: "工资", wallet: "钱包", margin: "利润率",
    suppliers: "供应商", hr: "人力资源", staff: "员工", payroll: "工资单",
    "login info": "登录信息", reports: "报告", assets: "资产",
    buy: "购买", shops: "商店", logout: "退出", hey: "嗨",
    no_access: "未分配部分。请联系管理员。",
    language: "语言", accessibility: "无障碍", font_size: "字体大小",
    high_contrast: "高对比度", reduced_motion: "减少动画",
    normal: "正常", large: "大", x_large: "超大",
    notifications: "通知", search_language: "搜索语言...", admin: "管理员",
    close_menu: "关闭菜单", toggle_menu: "切换菜单", collapse_sidebar: "折叠侧栏",
  },
  hi: {
    dashboard: "डैशबोर्ड", inventory: "इन्वेंटरी", products: "उत्पाद",
    "adjust stock": "स्टॉक समायोजित करें", sales: "बिक्री", sold: "बेचा गया",
    quote: "उद्धरण", finance: "वित्त", payments: "भुगतान", expenses: "खर्च",
    credit: "क्रेडिट", advance: "अग्रिम", salary: "वेतन", wallet: "वॉलेट",
    margin: "मार्जिन", suppliers: "आपूर्तिकर्ता", hr: "मानव संसाधन",
    staff: "कर्मचारी", payroll: "पेरोल", "login info": "लॉगिन जानकारी",
    reports: "रिपोर्ट", assets: "संपत्ति", buy: "खरीदें", shops: "दुकानें",
    logout: "लॉगआउट", hey: "नमस्ते",
    no_access: "कोई अनुभाग नहीं सौंपा गया। व्यवस्थापक से संपर्क करें।",
    language: "भाषा", accessibility: "पहुँच", font_size: "फ़ॉन्ट आकार",
    high_contrast: "उच्च कंट्रास्ट", reduced_motion: "कम मोशन",
    normal: "सामान्य", large: "बड़ा", x_large: "बहुत बड़ा",
    notifications: "सूचनाएं", search_language: "भाषा खोजें...", admin: "प्रशासक",
    close_menu: "मेनू बंद करें", toggle_menu: "मेनू टॉगल करें",
    collapse_sidebar: "साइडबार छुपाएं",
  },
  es: {
    dashboard: "Panel", inventory: "Inventario", products: "Productos",
    "adjust stock": "Ajustar stock", sales: "Ventas", sold: "Vendido",
    quote: "Cotización", finance: "Finanzas", payments: "Pagos",
    expenses: "Gastos", credit: "Crédito", advance: "Anticipo",
    salary: "Salario", wallet: "Billetera", margin: "Margen",
    suppliers: "Proveedores", hr: "RRHH", staff: "Personal", payroll: "Nómina",
    "login info": "Info de sesión", reports: "Informes", assets: "Activos",
    buy: "Comprar", shops: "Tiendas", logout: "Cerrar sesión", hey: "Hola",
    no_access: "Sin secciones asignadas. Contacta al administrador.",
    language: "Idioma", accessibility: "Accesibilidad", font_size: "Tamaño de fuente",
    high_contrast: "Alto contraste", reduced_motion: "Movimiento reducido",
    normal: "Normal", large: "Grande", x_large: "Extra grande",
    notifications: "Notificaciones", search_language: "Buscar idioma...",
    admin: "Administrador", close_menu: "Cerrar menú",
    toggle_menu: "Alternar menú", collapse_sidebar: "Contraer barra",
  },
  pt: {
    dashboard: "Painel", inventory: "Inventário", products: "Produtos",
    "adjust stock": "Ajustar estoque", sales: "Vendas", sold: "Vendido",
    quote: "Orçamento", finance: "Finanças", payments: "Pagamentos",
    expenses: "Despesas", credit: "Crédito", advance: "Adiantamento",
    salary: "Salário", wallet: "Carteira", margin: "Margem",
    suppliers: "Fornecedores", hr: "RH", staff: "Funcionários",
    payroll: "Folha de pagamento", "login info": "Info de login",
    reports: "Relatórios", assets: "Ativos", buy: "Comprar", shops: "Lojas",
    logout: "Sair", hey: "Olá",
    no_access: "Nenhuma seção atribuída. Contacte o administrador.",
    language: "Idioma", accessibility: "Acessibilidade",
    font_size: "Tamanho da fonte", high_contrast: "Alto contraste",
    reduced_motion: "Movimento reduzido", normal: "Normal", large: "Grande",
    x_large: "Extra grande", notifications: "Notificações",
    search_language: "Pesquisar idioma...", admin: "Administrador",
    close_menu: "Fechar menu", toggle_menu: "Alternar menu",
    collapse_sidebar: "Recolher barra",
  },
  de: {
    dashboard: "Dashboard", inventory: "Lagerbestand", products: "Produkte",
    "adjust stock": "Bestand anpassen", sales: "Verkauf", sold: "Verkauft",
    quote: "Angebot", finance: "Finanzen", payments: "Zahlungen",
    expenses: "Ausgaben", credit: "Kredit", advance: "Vorschuss",
    salary: "Gehalt", wallet: "Brieftasche", margin: "Marge",
    suppliers: "Lieferanten", hr: "Personal", staff: "Mitarbeiter",
    payroll: "Gehaltsabrechnung", "login info": "Login-Daten",
    reports: "Berichte", assets: "Vermögen", buy: "Kaufen", shops: "Geschäfte",
    logout: "Abmelden", hey: "Hallo",
    no_access: "Keine Abschnitte zugewiesen. Admin kontaktieren.",
    language: "Sprache", accessibility: "Barrierefreiheit",
    font_size: "Schriftgröße", high_contrast: "Hoher Kontrast",
    reduced_motion: "Reduzierte Bewegung", normal: "Normal", large: "Groß",
    x_large: "Sehr groß", notifications: "Benachrichtigungen",
    search_language: "Sprache suchen...", admin: "Administrator",
    close_menu: "Menü schließen", toggle_menu: "Menü umschalten",
    collapse_sidebar: "Seitenleiste einklappen",
  },
  ja: {
    dashboard: "ダッシュボード", inventory: "在庫", products: "製品",
    "adjust stock": "在庫調整", sales: "売上", sold: "売却済み", quote: "見積",
    finance: "財務", payments: "支払い", expenses: "経費", credit: "クレジット",
    advance: "前払い", salary: "給料", wallet: "ウォレット", margin: "利益率",
    suppliers: "サプライヤー", hr: "人事", staff: "スタッフ", payroll: "給与計算",
    "login info": "ログイン情報", reports: "レポート", assets: "資産",
    buy: "購入", shops: "ショップ", logout: "ログアウト", hey: "こんにちは",
    no_access: "セクションが割り当てられていません。管理者に連絡してください。",
    language: "言語", accessibility: "アクセシビリティ", font_size: "フォントサイズ",
    high_contrast: "ハイコントラスト", reduced_motion: "モーション軽減",
    normal: "標準", large: "大", x_large: "特大",
    notifications: "通知", search_language: "言語を検索...", admin: "管理者",
    close_menu: "メニューを閉じる", toggle_menu: "メニュー切替",
    collapse_sidebar: "サイドバーを折りたたむ",
  },
} satisfies Translations;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidLanguage(value: unknown): value is Language {
  return typeof value === "string" && value in translations;
}

function isValidFontSize(value: unknown): value is FontSize {
  return value === "normal" || value === "large" || value === "xlarge";
}

function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "en";
  try {
    const stored = localStorage.getItem("app-language");
    return isValidLanguage(stored) ? stored : "en";
  } catch {
    return "en";
  }
}

function getInitialA11y(): A11yState {
  const defaults: A11yState = {
    fontSize: "normal",
    highContrast: false,
    reducedMotion: false,
  };
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem("app-a11y");
    if (!raw) return defaults;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return defaults;
    const p = parsed as Record<string, unknown>;
    return {
      fontSize:      isValidFontSize(p.fontSize) ? p.fontSize : defaults.fontSize,
      highContrast:  typeof p.highContrast  === "boolean" ? p.highContrast  : defaults.highContrast,
      reducedMotion: typeof p.reducedMotion === "boolean" ? p.reducedMotion : defaults.reducedMotion,
    };
  } catch {
    return defaults;
  }
}

function getLangMeta(code: Language) {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

// ─── Contexts ─────────────────────────────────────────────────────────────────

const LanguageContext = createContext<LanguageContextValue | null>(null);
const A11yContext     = createContext<A11yContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { readonly children: ReactNode }) {
  /**
   * Lazy initialisers read localStorage ONCE on mount — no setState inside
   * an effect, which avoids the cascading-render warning.
   */
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);
  const [a11y,     setA11yState]     = useState<A11yState>(getInitialA11y);

  // ── Effect 1: sync language → <html lang> and <html dir> ────────────────
  // Only writes to the DOM (external system). Never calls setState.
  useEffect(() => {
    const meta = getLangMeta(language);
    document.documentElement.lang = language;
    document.documentElement.dir  = meta.dir;
  }, [language]);

  // ── Effect 2: sync a11y state → <html> class list ───────────────────────
  // Only writes to the DOM (external system). Never calls setState.
  useEffect(() => {
    const root = document.documentElement;

    // Font size
    root.classList.remove("fs-normal", "fs-large", "fs-xlarge");
    root.classList.add(`fs-${a11y.fontSize}`);

    // Toggles
    root.classList.toggle("high-contrast",  a11y.highContrast);
    root.classList.toggle("reduced-motion", a11y.reducedMotion);
  }, [a11y]);

  // ── Language setter (also persists to localStorage) ──────────────────────
  const setLanguage = useCallback((lang: Language) => {
    if (!isValidLanguage(lang)) return;
    try { localStorage.setItem("app-language", lang); } catch { /* SSR / private mode */ }
    setLanguageState(lang);
  }, []);

  // ── A11y updater (also persists to localStorage) ─────────────────────────
  const updateA11y = useCallback((next: A11yState) => {
    try { localStorage.setItem("app-a11y", JSON.stringify(next)); } catch { /* SSR */ }
    setA11yState(next);
  }, []);

  const setFontSize = useCallback(
    (size: FontSize) => updateA11y({ ...a11y, fontSize: size }),
    [a11y, updateA11y],
  );

  const toggleHighContrast = useCallback(
    () => updateA11y({ ...a11y, highContrast: !a11y.highContrast }),
    [a11y, updateA11y],
  );

  const toggleReducedMotion = useCallback(
    () => updateA11y({ ...a11y, reducedMotion: !a11y.reducedMotion }),
    [a11y, updateA11y],
  );

  // ── Translation helper ────────────────────────────────────────────────────
  const t = useCallback(
    (key: string): string => {
      const k = key.toLowerCase();
      return translations[language][k] ?? translations.en[k] ?? key;
    },
    [language],
  );

  const dir = getLangMeta(language).dir;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      <A11yContext.Provider
        value={{ a11y, setFontSize, toggleHighContrast, toggleReducedMotion }}
      >
        {children}
      </A11yContext.Provider>
    </LanguageContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <AppProvider>");
  return ctx;
}

export function useAccessibility(): A11yContextValue {
  const ctx = useContext(A11yContext);
  if (!ctx) throw new Error("useAccessibility must be used inside <AppProvider>");
  return ctx;
}