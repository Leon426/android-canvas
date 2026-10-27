"use client";

import type { ComponentLibrary } from "@/lib/componentLibrary";
import { OFFICIAL_PACKAGE_ID } from "@/lib/componentLibrary";
import type { Palette } from "@/lib/tokens";
import { Icon } from "./M3Node";
import { t, useLang } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export function ComponentPackagePicker({ library, palette: p, value, onChange, label }: {
  library: ComponentLibrary;
  palette: Palette;
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = value === OFFICIAL_PACKAGE_ID ? label : library.packages.find((pack) => pack.id === value)?.name ?? label;
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", escape, true);
    return () => { document.removeEventListener("pointerdown", away, true); document.removeEventListener("keydown", escape, true); };
  }, [open]);
  const choices = [{ id: OFFICIAL_PACKAGE_ID, name: label, icon: "verified" }, ...library.packages.map((pack) => ({ id: pack.id, name: pack.name, icon: "deployed_code" }))];
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="m3-press" style={{ width: "100%", minHeight: 48, padding: "0 14px", border: "none", borderRadius: 24, background: open ? p.secondaryContainer : p.surfaceContainerHigh, color: open ? p.onSecondaryContainer : p.onSurface, display: "flex", alignItems: "center", gap: 10, font: "inherit", fontSize: 13, fontWeight: 650, cursor: "pointer", textAlign: "left" }}>
        <Icon name={value === OFFICIAL_PACKAGE_ID ? "verified" : "deployed_code"} size={20} fill />
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{current}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }} style={{ display: "inline-flex" }}>
          <Icon name="arrow_drop_down" size={22} />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && <motion.div
          role="listbox"
          aria-label={label}
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -5, scale: 0.97 }}
          transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 80, padding: 6, borderRadius: 20, background: p.surfaceContainer, boxShadow: "0 6px 20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)", transformOrigin: "top center" }}
        >
          {choices.map((choice, index) => {
            const selected = choice.id === value;
            return <motion.button key={choice.id} role="option" aria-selected={selected} initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.14, delay: index * 0.025, ease: [0.2, 0, 0, 1] }} onClick={() => { onChange(choice.id); setOpen(false); }} className="m3-press" style={{ width: "100%", minHeight: 44, padding: "0 12px", border: "none", borderRadius: 14, background: selected ? p.secondaryContainer : "transparent", color: selected ? p.onSecondaryContainer : p.onSurface, display: "flex", alignItems: "center", gap: 10, font: "inherit", fontSize: 13, cursor: "pointer", textAlign: "left" }}>
              <Icon name={choice.icon} size={19} fill={selected} /><span style={{ flex: 1 }}>{choice.name}</span>{selected && <Icon name="check" size={18} />}
            </motion.button>;
          })}
        </motion.div>}
      </AnimatePresence>
    </div>
  );
}

export function ComponentLibraryPanel({ library, palette: p, onActive, onCreate, onRename, onDelete }: {
  library: ComponentLibrary;
  palette: Palette;
  onActive: (id: string) => void;
  onCreate: (name: string) => void;
  onRename?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
}) {
  const lang = useLang();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [rename, setRename] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuId) return;
    const away = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuId(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuId(null);
    };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", away, true);
      document.removeEventListener("keydown", escape, true);
    };
  }, [menuId]);
  const active = library.packages.find((pack) => pack.id === library.activePackageId);
  const buttonStyle = { border: "none", borderRadius: 18, minHeight: 38, padding: "8px 12px", font: "inherit", cursor: "pointer" } as const;

  const deleteConfirmText = (packName: string) =>
    lang === "zh"
      ? `删除“${packName}”？画布实例会保留外观并脱离组件包。`
      : lang === "ja"
        ? `「${packName}」を削除しますか？キャンバスの部品は外見を保ったまま切り離されます。`
        : lang === "ko"
          ? `“${packName}”을(를) 삭제하시겠습니까? 캔버스의 부품은 모양을 유지한 채 연결이 해제됩니다.`
          : `Delete “${packName}”? Canvas instances will keep their appearance and detach.`;

  return (
    <div className="no-scrollbar" style={{ height: "100%", overflowY: "auto", padding: "10px 8px 20px 14px", color: p.onSurface }}>
      <ComponentPackagePicker library={library} palette={p} value={library.activePackageId} onChange={onActive} label={t("officialPackage", lang)} />

      {creating ? (
        <div style={{ marginTop: 12, padding: 10, borderRadius: 14, background: p.surfaceContainerLow, display: "grid", gap: 8 }}>
          <input autoFocus value={name} aria-label={t("packageName", lang)} placeholder={t("packageName", lang)} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => {
            if (event.key === "Enter" && name.trim()) { onCreate(name.trim()); setName(""); setCreating(false); }
            if (event.key === "Escape") { setName(""); setCreating(false); }
          }} style={{ minHeight: 38, borderRadius: 10, padding: "0 10px", border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface }} />
          <div style={{ display: "flex", gap: 6 }}>
            <button style={{ ...buttonStyle, flex: 1, background: p.surfaceContainerHigh, color: p.onSurface }} onClick={() => { setName(""); setCreating(false); }}>{t("cancel", lang)}</button>
            <button disabled={!name.trim()} style={{ ...buttonStyle, flex: 1, background: p.primary, color: p.onPrimary, opacity: name.trim() ? 1 : 0.5 }} onClick={() => { onCreate(name.trim()); setName(""); setCreating(false); }}>{t("create", lang)}</button>
          </div>
        </div>
      ) : (
        <button style={{ ...buttonStyle, width: "100%", marginTop: 12, background: p.primaryContainer, color: p.onPrimaryContainer, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={() => { setName(`${t("customPackageDefault", lang)} ${library.packages.length + 1}`); setCreating(true); }}>
          <Icon name="create_new_folder" size={19} /> {t("createPackage", lang)}
        </button>
      )}

      <div style={{ marginTop: 18, display: "grid", gap: 8 }}>
        <div role="button" tabIndex={0} onClick={() => onActive(OFFICIAL_PACKAGE_ID)} style={{ padding: 12, borderRadius: 16, background: library.activePackageId === OFFICIAL_PACKAGE_ID ? p.secondaryContainer : p.surfaceContainerLow, color: library.activePackageId === OFFICIAL_PACKAGE_ID ? p.onSecondaryContainer : p.onSurface, cursor: "pointer" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700 }}><Icon name="verified" size={19} />{t("officialPackage", lang)}</div>
          <div style={{ marginTop: 5, fontSize: 12, color: p.onSurfaceVariant }}>Material 3 / Material 3 Expressive</div>
        </div>
        {library.packages.map((pack) => {
          const activePack = pack.id === library.activePackageId;
          const editing = renamingId === pack.id;
          const deleting = deletingId === pack.id;
          return (
            <div key={pack.id} style={{ borderRadius: 18, padding: 4, background: activePack ? p.primaryContainer : p.surfaceContainerLow, color: activePack ? p.onPrimaryContainer : p.onSurface }}>
              {editing ? (
                <div style={{ padding: 8, display: "grid", gap: 8 }}>
                  <input autoFocus aria-label={t("newPackageName", lang)} value={rename} onChange={(event) => setRename(event.target.value)} onKeyDown={(event) => {
                    if (event.key === "Enter" && rename.trim()) { onRename?.(pack.id, rename.trim()); setRenamingId(null); setMenuId(null); }
                    if (event.key === "Escape") setRenamingId(null);
                  }} style={{ minHeight: 38, borderRadius: 12, padding: "0 10px", border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface }} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={{ ...buttonStyle, flex: 1, background: "transparent", color: "inherit" }} onClick={() => setRenamingId(null)}>{t("cancel", lang)}</button>
                    <button disabled={!rename.trim()} style={{ ...buttonStyle, flex: 1, background: p.primary, color: p.onPrimary, opacity: rename.trim() ? 1 : 0.5 }} onClick={() => { onRename?.(pack.id, rename.trim()); setRenamingId(null); setMenuId(null); }}>{t("save", lang)}</button>
                  </div>
                </div>
              ) : deleting ? (
                <div style={{ padding: 10 }}>
                  <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 9 }}>{deleteConfirmText(pack.name)}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={{ ...buttonStyle, flex: 1, background: "transparent", color: "inherit" }} onClick={() => setDeletingId(null)}>{t("cancel", lang)}</button>
                    <button style={{ ...buttonStyle, flex: 1, background: p.errorContainer, color: p.onErrorContainer }} onClick={() => { onDelete?.(pack.id); setDeletingId(null); setMenuId(null); }}>{t("delete", lang)}</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center" }}>
                  <button onClick={() => onActive(pack.id)} style={{ ...buttonStyle, flex: 1, textAlign: "left", borderRadius: 14, padding: 10, background: "transparent", color: "inherit" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700 }}><Icon name="deployed_code" size={19} />{pack.name}</div>
                    <div style={{ marginTop: 5, fontSize: 12, opacity: 0.72 }}>{pack.definitions.length} {t("componentCount", lang)}</div>
                  </button>
                  <div ref={menuId === pack.id ? menuRef : undefined} style={{ position: "relative", alignSelf: "stretch", display: "grid", placeItems: "center" }}>
                    <button aria-label={t("packageActions", lang)} aria-expanded={menuId === pack.id} onClick={() => setMenuId((id) => id === pack.id ? null : pack.id)} style={{ width: 40, height: 40, borderRadius: 20, border: "none", background: menuId === pack.id ? p.secondaryContainer : "transparent", color: "inherit", cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="more_vert" size={20} /></button>
                    {menuId === pack.id && <div style={{ position: "absolute", right: 0, top: 44, zIndex: 90, minWidth: 132, padding: 6, borderRadius: 18, background: p.surfaceContainer, color: p.onSurface, boxShadow: "0 6px 20px rgba(0,0,0,0.18)" }}>
                      <button style={{ ...buttonStyle, width: "100%", background: "transparent", color: p.onSurface, display: "flex", alignItems: "center", gap: 8 }} onClick={() => { setRename(pack.name); setRenamingId(pack.id); setMenuId(null); }}><Icon name="edit" size={18} />{t("rename", lang)}</button>
                      <button style={{ ...buttonStyle, width: "100%", background: "transparent", color: p.error, display: "flex", alignItems: "center", gap: 8 }} onClick={() => { setDeletingId(pack.id); setMenuId(null); }}><Icon name="delete" size={18} />{t("delete", lang)}</button>
                    </div>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {active && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{active.name}</div>
          {active.definitions.length ? active.definitions.map((definition) => (
            <div key={definition.id} style={{ padding: "10px 12px", borderRadius: 12, marginBottom: 6, background: p.surfaceContainer }}>
              <div style={{ fontSize: 13, fontWeight: 650 }}>{definition.name}</div>
              <div style={{ fontSize: 11, color: p.onSurfaceVariant, marginTop: 3 }}>{definition.baseKind}</div>
            </div>
          )) : <div style={{ padding: 14, borderRadius: 14, background: p.surfaceContainerLow, fontSize: 12, lineHeight: 1.5, color: p.onSurfaceVariant }}>{t("emptyPackage", lang)}<br />{t("emptyPackageHint", lang)}</div>}
        </div>
      )}
    </div>
  );
}

