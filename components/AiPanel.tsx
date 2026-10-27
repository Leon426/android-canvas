"use client";

import { useEffect, useRef, useState } from "react";
import { Palette } from "@/lib/tokens";
import { RADIUS } from "@/lib/design";
import { t, useLang } from "@/lib/i18n";
import { AiSettings, PROVIDERS, Provider, providerSpec, switchProvider, updateProviderConfig } from "@/lib/ai";
import { Icon } from "./M3Node";

/** the message shown for a failed request, mapped from the error codes lib/ai throws */
export function aiErrorText(e: unknown, lang: ReturnType<typeof useLang>): string {
  const m = e instanceof Error ? e.message : String(e);
  if (m === "refusal") return t("aiErrorRefusal", lang);
  if (m === "json" || m === "empty") return t("aiErrorJson", lang);
  if (m === "model") return t("aiErrorModel", lang);
  if (m === "insecure") return t("aiErrorInsecure", lang);
  if (/failed to fetch|networkerror|load failed/i.test(m)) return t("aiErrorNetwork", lang);
  return `${t("aiError", lang)}: ${m}`;
}

export type AiActionKey = "behavior" | "describe";

/** The button that asks the model to write the field above it; spins while it works. */
export function AiWriteBtn({ p, busy, disabled, onClick, onCancel, label, title }: { p: Palette; busy: boolean; disabled?: boolean; onClick: () => void; onCancel: () => void; label: string; title: string }) {
  const lang = useLang();
  const shown = busy ? t("cancel", lang) : title;
  return (
    <button
      onClick={busy ? onCancel : onClick}
      disabled={disabled}
      title={shown}
      aria-label={shown}
      className="m3-press"
      style={{
        height: 40,
        padding: "0 16px 0 12px",
        borderRadius: RADIUS.pill,
        border: "none",
        background: disabled ? p.surfaceContainerHighest : p.primary,
        color: disabled ? p.onSurfaceVariant : p.onPrimary,
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled ? "default" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        flex: "0 0 auto",
        opacity: disabled ? 0.6 : 1,
        whiteSpace: "nowrap",
      }}
    >
      <span className={busy ? "m3-spin" : undefined} style={{ display: "inline-flex" }}>
        <Icon name={busy ? "progress_activity" : "auto_awesome"} size={20} />
      </span>
      {/* both labels are laid out so the button keeps one width while it flips */}
      <span style={{ display: "grid" }}>
        <span style={{ gridArea: "1 / 1", visibility: busy ? "hidden" : "visible" }}>{label}</span>
        <span style={{ gridArea: "1 / 1", visibility: busy ? "visible" : "hidden", textAlign: "center" }}>{t("cancel", lang)}</span>
      </span>
    </button>
  );
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function Input({
  value,
  onChange,
  placeholder,
  p,
  type = "text",
  label,
  action,
  onKeyDown,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  p: Palette;
  type?: string;
  label: string;
  action?: React.ReactNode;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={label}
        spellCheck={false}
        autoComplete="off"
        style={{
          width: "100%",
          height: 44,
          padding: action ? "0 42px 0 14px" : "0 14px",
          borderRadius: RADIUS.pill,
          border: `1.5px solid ${focused ? p.primary : p.outlineVariant}`,
          boxShadow: focused ? `0 0 0 1px ${p.primary}` : "none",
          background: p.surface,
          color: p.onSurface,
          fontSize: 13,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 160ms cubic-bezier(0.2, 0, 0, 1), box-shadow 160ms cubic-bezier(0.2, 0, 0, 1)",
        }}
      />
      {action && (
        <div style={{ position: "absolute", right: 8, top: 0, bottom: 0, display: "grid", placeItems: "center" }}>
          {action}
        </div>
      )}
    </div>
  );
}

const Label = ({ children, p, right }: { children: React.ReactNode; p: Palette; right?: React.ReactNode }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: p.onSurfaceVariant, marginBottom: 6, padding: "0 4px" }}>
    <span style={{ flex: 1 }}>{children}</span>
    {right}
  </div>
);

/** The providers as one connected button group; each segment shows the provider's mark in the button's color. */
function ProviderGroup({ value, onChange, p }: { value: Provider; onChange: (k: Provider) => void; p: Palette }) {
  const n = PROVIDERS.length;
  const ref = useRef<HTMLDivElement>(null);
  const move = (from: number, delta: number) => {
    const to = (from + delta + n) % n;
    onChange(PROVIDERS[to].key);
    (ref.current?.children[to] as HTMLElement | undefined)?.focus();
  };
  return (
    <div ref={ref} role="radiogroup" style={{ display: "flex", gap: 3 }}>
      {PROVIDERS.map((pr, i) => {
        const on = pr.key === value;
        const outer = 22;
        const inner = 8;
        const l = i === 0 ? outer : inner;
        const r = i === n - 1 ? outer : inner;
        return (
          <button
            key={pr.key}
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            title={pr.label}
            aria-label={pr.label}
            onClick={() => onChange(pr.key)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(i, 1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                move(i, -1);
              }
            }}
            className="m3-press"
            style={{
              flex: 1,
              height: 44,
              border: "none",
              borderRadius: `${l}px ${r}px ${r}px ${l}px`,
              background: on ? p.primary : p.surfaceContainerHigh,
              color: on ? p.onPrimary : p.onSurfaceVariant,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              transition: "background 160ms, color 160ms",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 22,
                height: 22,
                display: "block",
                background: "currentColor",
                WebkitMaskImage: `url(${BASE}/logos/${pr.key}.svg)`,
                maskImage: `url(${BASE}/logos/${pr.key}.svg)`,
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

/** The AI tab of the left rail: the provider settings. The actions live with each screen on the right. */
export function AiPanel({ p, settings, onSettings, onToast }: {
  p: Palette;
  settings: AiSettings;
  onSettings: (s: AiSettings) => void;
  onToast?: (msg: string, ms?: number, icon?: string) => void;
}) {
  const lang = useLang();
  const spec = providerSpec(settings.provider);

  const [draftKey, setDraftKey] = useState(settings.key);
  const [pasteFeedback, setPasteFeedback] = useState(false);
  const [showKey, setShowKey] = useState(false);
  /* a saved key shows as a masked chip; opening it arms a one-click delete */
  const [editingKey, setEditingKey] = useState(settings.key.trim().length === 0);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const keyBox = useRef<HTMLDivElement>(null);

  /* keep the draft in step with the provider we are looking at */
  useEffect(() => {
    setDraftKey(settings.key);
    setEditingKey(settings.key.trim().length === 0);
    setConfirmingDelete(false);
  }, [settings.provider, settings.key]);

  /* an armed delete is cancelled by clicking elsewhere or pressing Escape */
  useEffect(() => {
    if (!confirmingDelete) return;
    const away = (event: PointerEvent) => { if (!keyBox.current?.contains(event.target as Node)) setConfirmingDelete(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setConfirmingDelete(false); };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", escape, true);
    return () => { document.removeEventListener("pointerdown", away, true); document.removeEventListener("keydown", escape, true); };
  }, [confirmingDelete]);

  const pick = (k: Provider) => {
    if (k === settings.provider) return;
    /* switching away must not silently drop a key the author typed but did not save */
    const draft = draftKey.trim();
    const base = draft && draft !== settings.key.trim()
      ? updateProviderConfig(settings, { key: draft })
      : settings;
    onSettings(switchProvider(base, k));
    setShowKey(false);
  };

  const handleSave = () => {
    if (!draftKey.trim()) return;
    onSettings(updateProviderConfig(settings, { key: draftKey.trim() }));
    setEditingKey(false);
    setConfirmingDelete(false);
    onToast?.(t("saved", lang), 1600, "check");
  };

  const handleDelete = () => {
    onSettings(updateProviderConfig(settings, { key: "" }));
    setDraftKey("");
    setEditingKey(true);
    setConfirmingDelete(false);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const trimmed = text.trim();
        setDraftKey(trimmed);
        setPasteFeedback(true);
        setTimeout(() => setPasteFeedback(false), 1200);
      }
    } catch {}
  };

  const canSave = draftKey.trim().length > 0;
  const savedKey = settings.key.trim();
  const maskedKey = savedKey.length > 3 ? `${savedKey.slice(0, 3)}****` : "****";

  return (
    <div className="no-scrollbar" style={{ height: "100%", overflowY: "auto", padding: "12px 6px 20px 12px", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: p.onSurfaceVariant, padding: "8px 6px 12px" }}>{t("aiSettings", lang)}</div>
        <div style={{ padding: "0 4px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <Label p={p}>{t("aiProvider", lang)}</Label>
              <ProviderGroup value={settings.provider} onChange={pick} p={p} />
            </div>
            <div>
              <Label p={p}>{t("aiModel", lang)}</Label>
              <Input
                label={t("aiModel", lang)}
                value={settings.model}
                onChange={(model) => onSettings(updateProviderConfig(settings, { model }))}
                placeholder={spec.model || "model"}
                p={p}
              />
            </div>
            <div>
              <Label p={p}>{t("aiBaseUrl", lang)}</Label>
              <Input
                label={t("aiBaseUrl", lang)}
                value={settings.baseUrl}
                onChange={(baseUrl) => onSettings(updateProviderConfig(settings, { baseUrl }))}
                placeholder={spec.baseUrl}
                p={p}
              />
            </div>
            <div ref={keyBox}>
              <Label
                p={p}
                right={
                  spec.keysUrl && (
                    <a href={spec.keysUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600, color: p.primary }}>
                      {t("aiGetKey", lang)}
                    </a>
                  )
                }
              >
                {t("aiKey", lang)}
              </Label>
              {savedKey && !editingKey ? (
                confirmingDelete ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    title={t("delete", lang)}
                    aria-label={t("delete", lang)}
                    className="m3-press"
                    style={{
                      width: "100%",
                      minHeight: 44,
                      borderRadius: RADIUS.pill,
                      border: "none",
                      background: p.errorContainer,
                      color: p.onErrorContainer,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <Icon name="delete" size={18} />
                    <span>{t("delete", lang)}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    title={t("aiKey", lang)}
                    aria-label={`${t("aiKey", lang)} ${maskedKey}`}
                    className="m3-press"
                    style={{
                      width: "100%",
                      minHeight: 44,
                      borderRadius: RADIUS.pill,
                      border: "none",
                      background: p.surfaceContainerHighest,
                      color: p.onSurfaceVariant,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "0 14px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    }}
                  >
                    <Icon name="key" size={18} />
                    <span style={{ flex: 1, textAlign: "left" }}>{maskedKey}</span>
                    <Icon name="delete" size={16} />
                  </button>
                )
              ) : (
                <>
                  <Input
                    label={t("aiKey", lang)}
                    value={draftKey}
                    onChange={(val) => {
                      setDraftKey(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canSave) {
                        e.preventDefault();
                        handleSave();
                      }
                    }}
                    placeholder="sk-…"
                    p={p}
                    type={showKey ? "text" : "password"}
                    action={
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        title={showKey ? t("hideKey", lang) : t("showKey", lang)}
                        aria-label={showKey ? t("hideKey", lang) : t("showKey", lang)}
                        className="m3-press"
                        style={{
                          border: "none",
                          background: "transparent",
                          color: p.onSurfaceVariant,
                          cursor: "pointer",
                          display: "grid",
                          placeItems: "center",
                          width: 28,
                          height: 28,
                          borderRadius: RADIUS.pill,
                        }}
                      >
                        <Icon name={showKey ? "visibility_off" : "visibility"} size={18} />
                      </button>
                    }
                  />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                    {/* 快捷粘贴按钮：仅剪贴板图标，无文字，圆形色块按钮 */}
                    <button
                      type="button"
                      onClick={handlePaste}
                      title={t("paste", lang)}
                      aria-label={t("paste", lang)}
                      className="m3-press"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: RADIUS.pill,
                        border: "none",
                        background: pasteFeedback ? p.primary : p.secondaryContainer,
                        color: pasteFeedback ? p.onPrimary : p.onSecondaryContainer,
                        display: "grid",
                        placeItems: "center",
                        cursor: "pointer",
                        transition: "background 160ms, color 160ms, transform 120ms",
                        flexShrink: 0,
                      }}
                    >
                      <Icon name={pasteFeedback ? "check" : "content_paste"} size={18} />
                    </button>

                    {/* 保存按钮：未输入时灰色无法点击 */}
                    <button
                      type="button"
                      disabled={!canSave}
                      onClick={handleSave}
                      title={t("save", lang)}
                      className="m3-press"
                      style={{
                        height: 36,
                        padding: "0 18px",
                        borderRadius: RADIUS.pill,
                        border: "none",
                        background: !canSave ? p.surfaceContainerHighest : p.primary,
                        color: !canSave ? p.onSurfaceVariant : p.onPrimary,
                        opacity: !canSave ? 0.5 : 1,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: !canSave ? "not-allowed" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        transition: "all 160ms",
                      }}
                    >
                      <Icon name="save" size={16} />
                      <span>{t("save", lang)}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 提示文案置于底部 */}
      <div style={{ marginTop: "auto", paddingTop: 28, paddingBottom: 6, display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, lineHeight: 1.5, color: p.onSurfaceVariant }}>
        <span style={{ color: p.primary, flexShrink: 0, marginTop: 1 }}>
          <Icon name="lock" size={16} />
        </span>
        <span>{t("aiKeyHint", lang)}</span>
      </div>
    </div>
  );
}
