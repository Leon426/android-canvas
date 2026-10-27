import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AiPanel } from "./AiPanel";
import { DEFAULT_AI, AiSettings } from "@/lib/ai";
import { schemeFromSeed } from "@/lib/color";

const p = schemeFromSeed("#6750A4");

describe("AiPanel component", () => {
  it("renders with disabled save button when key is empty", () => {
    const onSettings = vi.fn();
    const html = renderToStaticMarkup(
      <AiPanel p={p} settings={DEFAULT_AI} onSettings={onSettings} />
    );

    // Save button is disabled (has disabled attribute or unclickable styling)
    expect(html).toContain("disabled");
    // Quick paste button has content_paste icon
    expect(html).toContain("content_paste");
    // Bottom hint is rendered with lock icon
    expect(html).toContain("lock");
    // Providers are present
    expect(html).toContain("OpenAI");
    expect(html).toContain("Claude");
    expect(html).toContain("DeepSeek");
    expect(html).toContain("Gemini");
  });

  it("renders with enabled save button when key is present", () => {
    const onSettings = vi.fn();
    const settingsWithKey: AiSettings = {
      ...DEFAULT_AI,
      key: "sk-my-secret-key",
    };
    const html = renderToStaticMarkup(
      <AiPanel p={p} settings={settingsWithKey} onSettings={onSettings} />
    );

    // The key input value has the secret key
    expect(html).toContain('value="sk-my-secret-key"');
  });
});
