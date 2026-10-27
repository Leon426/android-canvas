"use client";

import type { ComponentLibrary } from "@/lib/componentLibrary";
import { OFFICIAL_PACKAGE_ID } from "@/lib/componentLibrary";
import { RADIUS } from "@/lib/design";
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
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const list = useRef<HTMLDivElement | null>(null);
  const current = value === OFFICIAL_PACKAGE_ID ? label : library.packages.find((pack) => pack.id === value)?.name ?? label;
  /* the list closes back onto the button that opened it, so focus has somewhere to land */
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    /* focus goes to the chosen entry, so the arrow keys start from where the list does */
    (list.current?.querySelector('[aria-selected="true"]') as HTMLElement | null)?.focus();
    const onDown = (event: PointerEvent) => { if (!box.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { event.stopPropagation(); close(); } };
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => { window.removeEventListener("pointerdown", onDown, true); window.removeEventListener("keydown", onKey, true); };
  }, [open]);
  /* the arrow keys walk the entries, Home and End jump to either end */
  const onListKey = (event: React.KeyboardEvent) => {
    const items = Array.from(list.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
    if (!items.length) return;
    const at = items.indexOf(document.activeElement as HTMLElement);
    let next = -1;
    if (event.key === "ArrowDown") next = (at + 1) % items.length;
    else if (event.key === "ArrowUp") next = (at - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    if (next < 0) return;
    event.preventDefault();
    items[next].focus();
  };
  const choices = [{ id: OFFICIAL_PACKAGE_ID, name: label, icon: "verified" }, ...library.packages.map((pack) => ({ id: pack.id, name: pack.name, icon: "deployed_code" }))];
  return (
    <div ref={box} style={{ position: "relative" }}>
      <button ref={trigger} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((value) => !value)} onKeyDown={(event) => { if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) { event.preventDefault(); setOpen(true); } }} className="m3-press" style={{ width: "100%", minHeight: 48, padding: "0 14px", border: "none", borderRadius: RADIUS.pill, background: open ? p.secondaryContainer : p.surfaceContainerHigh, color: open ? p.onSecondaryContainer : p.onSurface, display: "flex", alignItems: "center", gap: 10, font: "inherit", fontSize: 13, fontWeight: 650, cursor: "pointer", textAlign: "left" }}>
        <Icon name={value === OFFICIAL_PACKAGE_ID ? "verified" : "deployed_code"} size={20} fill />
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{current}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }} style={{ display: "inline-flex" }}>
          <Icon name="arrow_drop_down" size={22} />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && <motion.div
          ref={list}
          role="listbox"
          aria-label={label}
          onKeyDown={onListKey}
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -5, scale: 0.97 }}
          transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 80, padding: 6, borderRadius: RADIUS.lg, background: p.surfaceContainer, boxShadow: "0 6px 20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)", transformOrigin: "top center" }}
        >
          {choices.map((choice, index) => {
            const selected = choice.id === value;
            return <motion.button key={choice.id} role="option" aria-selected={selected} tabIndex={-1} initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.14, delay: index * 0.025, ease: [0.2, 0, 0, 1] }} onClick={() => { onChange(choice.id); close(); }} className="m3-press" style={{ width: "100%", minHeight: 44, padding: "0 12px", border: "none", borderRadius: RADIUS.sm, background: selected ? p.secondaryContainer : "transparent", color: selected ? p.onSecondaryContainer : p.onSurface, display: "flex", alignItems: "center", gap: 10, font: "inherit", fontSize: 13, cursor: "pointer", textAlign: "left" }}>
              <Icon name={choice.icon} size={19} fill={selected} /><span style={{ flex: 1 }}>{choice.name}</span>{selected && <Icon name="check" size={18} />}
            </motion.button>;
          })}
        </motion.div>}
      </AnimatePresence>
    </div>
  );
}

export function ComponentLibraryPanel({ library, palette: p, onActive, onCreate, onRename, onDelete, onRenameDefinition, onDeleteDefinition }: {
  library: ComponentLibrary;
  palette: Palette;
  onActive: (id: string) => void;
  onCreate: (name: string) => void;
  onRename?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
  onRenameDefinition?: (packageId: string, definitionId: string, name: string) => void;
  onDeleteDefinition?: (packageId: string, definitionId: string) => void;
}) {
  const lang = useLang();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [rename, setRename] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [defMenuId, setDefMenuId] = useState<string | null>(null);
  const [renamingDefId, setRenamingDefId] = useState<string | null>(null);
  const [renameDef, setRenameDef] = useState("");
  const [deletingDefId, setDeletingDefId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const defMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuId && !defMenuId) return;
    const away = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuId && !menuRef.current?.contains(target)) setMenuId(null);
      if (defMenuId && !defMenuRef.current?.contains(target)) setDefMenuId(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenuId(null); setDefMenuId(null); }
    };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", away, true);
      document.removeEventListener("keydown", escape, true);
    };
  }, [menuId, defMenuId]);
  const active = library.packages.find((pack) => pack.id === library.activePackageId);
  const buttonStyle = { border: "none", borderRadius: RADIUS.pill, minHeight: 38, padding: "8px 12px", font: "inherit", cursor: "pointer" } as const;

  const deleteConfirmText = (packName: string) => t("deletePackageConfirm", lang).replace("{name}", () => packName);

  return (
    <div className="no-scrollbar" style={{ height: "100%", overflowY: "auto", padding: "10px 8px 20px 14px", color: p.onSurface }}>
      <ComponentPackagePicker library={library} palette={p} value={library.activePackageId} onChange={onActive} label={t("officialPackage", lang)} />

      {creating ? (
        <div style={{ marginTop: 12, padding: 10, borderRadius: RADIUS.sm, background: p.surfaceContainerLow, display: "grid", gap: 8 }}>
          <input autoFocus value={name} aria-label={t("packageName", lang)} placeholder={t("packageName", lang)} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => {
            if (event.key === "Enter" && name.trim()) { onCreate(name.trim()); setName(""); setCreating(false); }
            if (event.key === "Escape") { setName(""); setCreating(false); }
          }} style={{ minHeight: 38, borderRadius: RADIUS.xs, padding: "0 10px", border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface }} />
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
        <div role="button" tabIndex={0} onClick={() => onActive(OFFICIAL_PACKAGE_ID)} style={{ padding: 12, borderRadius: RADIUS.md, background: library.activePackageId === OFFICIAL_PACKAGE_ID ? p.secondaryContainer : p.surfaceContainerLow, color: library.activePackageId === OFFICIAL_PACKAGE_ID ? p.onSecondaryContainer : p.onSurface, cursor: "pointer" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700 }}><Icon name="verified" size={19} />{t("officialPackage", lang)}</div>
          <div style={{ marginTop: 5, fontSize: 12, color: p.onSurfaceVariant }}>Material 3 / Material 3 Expressive</div>
        </div>
        {library.packages.map((pack) => {
          const activePack = pack.id === library.activePackageId;
          const editing = renamingId === pack.id;
          const deleting = deletingId === pack.id;
          return (
            <div key={pack.id} style={{ borderRadius: RADIUS.md, padding: 4, background: activePack ? p.primaryContainer : p.surfaceContainerLow, color: activePack ? p.onPrimaryContainer : p.onSurface }}>
              {editing ? (
                <div style={{ padding: 8, display: "grid", gap: 8 }}>
                  <input autoFocus aria-label={t("newPackageName", lang)} value={rename} onChange={(event) => setRename(event.target.value)} onKeyDown={(event) => {
                    if (event.key === "Enter" && rename.trim()) { onRename?.(pack.id, rename.trim()); setRenamingId(null); setMenuId(null); }
                    if (event.key === "Escape") setRenamingId(null);
                  }} style={{ minHeight: 38, borderRadius: RADIUS.sm, padding: "0 10px", border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface }} />
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
                  <button onClick={() => onActive(pack.id)} style={{ ...buttonStyle, flex: 1, textAlign: "left", borderRadius: RADIUS.sm, padding: 10, background: "transparent", color: "inherit" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700 }}><Icon name="deployed_code" size={19} />{pack.name}</div>
                    <div style={{ marginTop: 5, fontSize: 12, opacity: 0.72 }}>{pack.definitions.length} {t("componentCount", lang)}</div>
                  </button>
                  <div ref={menuId === pack.id ? menuRef : undefined} style={{ position: "relative", alignSelf: "stretch", display: "grid", placeItems: "center" }}>
                    <button aria-label={t("packageActions", lang)} aria-expanded={menuId === pack.id} onClick={() => setMenuId((id) => id === pack.id ? null : pack.id)} style={{ width: 40, height: 40, borderRadius: RADIUS.pill, border: "none", background: menuId === pack.id ? p.secondaryContainer : "transparent", color: "inherit", cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="more_vert" size={20} /></button>
                    {menuId === pack.id && <div style={{ position: "absolute", right: 0, top: 44, zIndex: 90, minWidth: 132, padding: 6, borderRadius: RADIUS.md, background: p.surfaceContainer, color: p.onSurface, boxShadow: "0 6px 20px rgba(0,0,0,0.18)" }}>
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
          {active.definitions.length ? active.definitions.map((definition) => {
            const editingDef = renamingDefId === definition.id;
            const deletingDef = deletingDefId === definition.id;
            return (
              <div key={definition.id} style={{ padding: "10px 12px", borderRadius: RADIUS.sm, marginBottom: 6, background: p.surfaceContainer }}>
                {editingDef ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <input autoFocus aria-label={t("componentName", lang)} value={renameDef} onChange={(event) => setRenameDef(event.target.value)} onKeyDown={(event) => {
                      if (event.key === "Enter" && renameDef.trim()) { onRenameDefinition?.(active.id, definition.id, renameDef.trim()); setRenamingDefId(null); setRenameDef(""); }
                      if (event.key === "Escape") setRenamingDefId(null);
                    }} style={{ minHeight: 38, borderRadius: RADIUS.xs, padding: "0 10px", border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface }} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={{ ...buttonStyle, flex: 1, background: "transparent", color: "inherit" }} onClick={() => setRenamingDefId(null)}>{t("cancel", lang)}</button>
                      <button disabled={!renameDef.trim()} style={{ ...buttonStyle, flex: 1, background: p.primary, color: p.onPrimary, opacity: renameDef.trim() ? 1 : 0.5 }} onClick={() => { onRenameDefinition?.(active.id, definition.id, renameDef.trim()); setRenamingDefId(null); setRenameDef(""); }}>{t("save", lang)}</button>
                    </div>
                  </div>
                ) : deletingDef ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ fontSize: 12, lineHeight: 1.5 }}>{t("deleteComponentConfirm", lang)}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={{ ...buttonStyle, flex: 1, background: "transparent", color: "inherit" }} onClick={() => setDeletingDefId(null)}>{t("cancel", lang)}</button>
                      <button style={{ ...buttonStyle, flex: 1, background: p.errorContainer, color: p.onErrorContainer }} onClick={() => { onDeleteDefinition?.(active.id, definition.id); setDeletingDefId(null); setDefMenuId(null); }}>{t("delete", lang)}</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 650 }}>{definition.name}</div>
                      <div style={{ fontSize: 11, color: p.onSurfaceVariant, marginTop: 3 }}>{definition.baseKind}</div>
                    </div>
                    {(onRenameDefinition || onDeleteDefinition) && (
                      <div ref={defMenuId === definition.id ? defMenuRef : undefined} style={{ position: "relative", alignSelf: "stretch", display: "grid", placeItems: "center" }}>
                        <button aria-label={t("componentActions", lang)} aria-expanded={defMenuId === definition.id} onClick={() => setDefMenuId((id) => id === definition.id ? null : definition.id)} style={{ width: 32, height: 32, borderRadius: RADIUS.pill, border: "none", background: defMenuId === definition.id ? p.secondaryContainer : "transparent", color: p.onSurfaceVariant, cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="more_vert" size={18} /></button>
                        {defMenuId === definition.id && <div style={{ position: "absolute", right: 0, top: 36, zIndex: 90, minWidth: 120, padding: 6, borderRadius: RADIUS.md, background: p.surfaceContainer, color: p.onSurface, boxShadow: "0 6px 20px rgba(0,0,0,0.18)" }}>
                          {onRenameDefinition && <button style={{ ...buttonStyle, width: "100%", background: "transparent", color: p.onSurface, display: "flex", alignItems: "center", gap: 8 }} onClick={() => { setRenameDef(definition.name); setRenamingDefId(definition.id); setDefMenuId(null); }}><Icon name="edit" size={18} />{t("rename", lang)}</button>}
                          {onDeleteDefinition && <button style={{ ...buttonStyle, width: "100%", background: "transparent", color: p.error, display: "flex", alignItems: "center", gap: 8 }} onClick={() => { setDeletingDefId(definition.id); setDefMenuId(null); }}><Icon name="delete" size={18} />{t("delete", lang)}</button>}
                        </div>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          }) : <div style={{ padding: 14, borderRadius: RADIUS.sm, background: p.surfaceContainerLow, fontSize: 12, lineHeight: 1.5, color: p.onSurfaceVariant }}>{t("emptyPackage", lang)}<br />{t("emptyPackageHint", lang)}</div>}
        </div>
      )}
    </div>
  );
}

