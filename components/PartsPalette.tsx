"use client";

import { useState } from "react";
import { CATEGORIES, KIND_ORDER, KIND_SPEC, PALETTE_HIDDEN, Category, Kind, Palette } from "@/lib/tokens";
import { KIND_TEXT, useLang } from "@/lib/i18n";
import { Section, Tile } from "./ui";

const CATEGORY_TEXT = {
  ja: { actions: "操作", navigation: "ナビゲーション", containment: "コンテナ", inputs: "入力", content: "コンテンツ", progress: "進捗" },
  zh: { actions: "操作", navigation: "导航", containment: "容器", inputs: "输入", content: "内容", progress: "进度" },
  ko: { actions: "동작", navigation: "내비게이션", containment: "컨테이너", inputs: "입력", content: "콘텐츠", progress: "진행 상태" },
} satisfies Record<string, Record<Category, string>>;

export function PartsPalette({
  palette: p,
  onPartPointerDown,
  onPartActivate,
  onExamplePointerDown,
  onExampleActivate,
}: {
  palette: Palette;
  onPartPointerDown: (e: React.PointerEvent, kind: Kind) => void;
  /** a tile chosen with the keyboard or a screen reader adds its part without a drag */
  onPartActivate: (kind: Kind) => void;
  onExamplePointerDown?: (e: React.PointerEvent, templateId: string) => void;
  onExampleActivate?: (templateId: string) => void;
}) {
  const lang = useLang();
  const [openCat, setOpenCat] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("m3e:palette:openCat");
        if (saved !== null) {
          if (saved === "" || saved === "none") return null;
          if (CATEGORIES.some((c) => c.key === saved) || saved === "examples") return saved;
        }
        const legacy = CATEGORIES.find((c) => localStorage.getItem(`m3e:sec:cat:${c.key}`) === "1");
        if (legacy) return legacy.key;
      } catch {}
    }
    return "actions";
  });

  const handleToggle = (catKey: string, willOpen: boolean) => {
    const next = willOpen ? catKey : null;
    setOpenCat(next);
    try {
      localStorage.setItem("m3e:palette:openCat", next ?? "none");
    } catch {}
  };
  const labelOf = (k: Kind) => (lang === "en" ? KIND_SPEC[k].label : (KIND_TEXT[lang][k]?.noun ?? KIND_SPEC[k].label));

  const tile = (k: Kind) => {
    const s = KIND_SPEC[k];
    return (
      <Tile
        key={k}
        icon={s.paletteIcon}
        label={labelOf(k)}
        p={p}
        onPointerDown={(e) => onPartPointerDown(e, k)}
        onClick={() => onPartActivate(k)}
      />
    );
  };

  const grid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(78px, 1fr))",
    gap: 6,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      <div className="no-scrollbar" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "6px 8px 20px 14px" }}>
        {CATEGORIES.map((c) => (
          <Section
            key={c.key}
            id={`cat:${c.key}`}
            icon={c.icon}
            title={lang === "en" ? c.label : CATEGORY_TEXT[lang][c.key]}
            p={p}
            m3Card
            open={openCat === c.key}
            onToggle={(willOpen) => handleToggle(c.key, willOpen)}
          >
            <div style={grid}>{KIND_ORDER.filter((k) => KIND_SPEC[k].category === c.key && !PALETTE_HIDDEN.includes(k)).map(tile)}</div>
          </Section>
        ))}
        <Section
          id="cat:examples"
          icon="view_quilt"
          title={lang === "zh" ? "示例" : lang === "ja" ? "サンプル" : lang === "ko" ? "예시" : "Examples"}
          p={p}
          m3Card
          open={openCat === "examples"}
          onToggle={(willOpen) => handleToggle("examples", willOpen)}
        >
          <div style={grid}>
            <Tile
              key="example:login"
              icon="smartphone"
              label={lang === "zh" ? "登陆界面" : lang === "ja" ? "ログイン画面" : lang === "ko" ? "로그인 화면" : "Login screen"}
              p={p}
              onPointerDown={(e) => onExamplePointerDown?.(e, "login")}
              onClick={() => onExampleActivate?.("login")}
            />
          </div>
        </Section>
      </div>
    </div>
  );
}
