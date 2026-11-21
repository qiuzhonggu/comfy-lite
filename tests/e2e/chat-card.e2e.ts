// Generated from tests/e2e/specs/chat-card.json (spec 80444f58f0060e78). Edit the spec, not this file.
import { test } from "@e2e-dev/web";
import type { Locator, Screen } from "e2e";
import { expect } from "e2e";

/** Steps this flow's recording found already done; strict replay skips them, as they have nothing to replay. */
const skippedSteps: readonly number[] = JSON.parse(process.env.CAFFEINE_E2E_SKIP_STEPS ?? "[]");

const recording = process.env.CAFFEINE_E2E_MODE === "record" || process.env.CAFFEINE_E2E_MODE === "heal";

/** Whether `holds` turns true within the assertion timeout. */
async function eventually(holds: () => Promise<boolean>): Promise<boolean> {
  const deadline = Date.now() + 5000;
  for (;;) {
    if (await holds()) return true;
    if (Date.now() >= deadline) return false;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

function flowChecks() {
  let failed = 0;
  return {
    /** Spec check `index`: a failure fails a strict replay at once and is kept otherwise. */
    async check(index: number, verify: () => Promise<void>, holds: () => Promise<boolean>): Promise<void> {
      if (!recording) return verify();
      if (failed === 0) {
        try {
          return await verify();
        } catch (error) {
          if ((error as { code?: unknown }).code !== "ASSERTION_FAILED") throw error;
        }
      } else if (await eventually(holds)) {
        return;
      }
      failed += 1;
      expect.soft(false, `check ${String(index)}`).toBe(true);
    },
  };
}

/** `text` as a case-insensitive pattern in which each run of spaces also matches none. */
function spacedText(text: string): RegExp {
  const words = text.trim().split(/\s+/).map((word) => word.replace(/[.*+?^$(){}|[\]\\]/g, "\\$&"));
  return new RegExp(words.join("\\s*"), "i");
}

/** Words the screen shows: visible text, the placeholder of an input that shows it, or a field that holds it right after the step that typed it. */
async function shownText(screen: Screen, text: string, typed = false, pattern?: RegExp): Promise<Locator> {
  const asText = screen.getByText(pattern ?? spacedText(text), { visible: true }).first();
  const field = pattern === undefined ? { exact: false, visible: true } : { exact: true, visible: true };
  const asPlaceholder = screen.getByPlaceholder(text, field).first();
  const asValue = screen.getByDisplayValue(text, field).first();
  for (let waited = 0; waited < 5000; waited += 250) {
    if (await asText.isVisible()) return asText;
    if (await asPlaceholder.isVisible()) return asPlaceholder;
    if (typed && (await asValue.isVisible())) return asValue;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return asText;
}

test("chat-card", async ({ app, agent, screen, browser }) => {
  const flow = flowChecks();
  await browser.route("https://relay.test/v1/chat/completions", async (route) => {
    await route.fulfill({ status: 200, json: {"choices":[{"finish_reason":"stop","index":0,"message":{"content":"你好，我是测试回复","role":"assistant"}}],"id":"chatcmpl-test","model":"gpt-4o","object":"chat.completion"} });
  });
  await app.open("/");

  if (!skippedSteps.includes(0)) await agent.act("Open 设置\nDo not do the next step yet: Press 新增中转站", { maxModelCalls: 20 });
  await flow.check(0, async () => { await expect(await shownText(screen, "新增中转站")).toBeVisible({ timeout: 15000 }); }, async () => (await shownText(screen, "新增中转站")).isVisible());

  if (!skippedSteps.includes(1)) await agent.act("Press 新增中转站\nDo not do the next step yet: Fill 接口地址 with https://relay.test and API Key with sk-test123, and add gpt-4o to 对话模型 with 添加", { maxModelCalls: 20 });
  await flow.check(1, async () => { await expect(await shownText(screen, "接口地址")).toBeVisible(); }, async () => (await shownText(screen, "接口地址")).isVisible());

  if (!skippedSteps.includes(2)) await agent.act("Fill 接口地址 with https://relay.test and API Key with sk-test123, and add gpt-4o to 对话模型 with 添加\nDo not do the next step yet: Open 画布 from the top navigation", { maxModelCalls: 20 });
  await flow.check(2, async () => { await expect(await shownText(screen, "gpt-4o", true)).toBeVisible(); }, async () => (await shownText(screen, "gpt-4o", true)).isVisible());

  if (!skippedSteps.includes(3)) await agent.act("Open 画布 from the top navigation\nDo not do the next step yet: Open 示例分镜画布", { maxModelCalls: 20 });
  await flow.check(3, async () => { await expect(await shownText(screen, "示例分镜画布")).toBeVisible(); }, async () => (await shownText(screen, "示例分镜画布")).isVisible());

  if (!skippedSteps.includes(4)) await agent.act("Open 示例分镜画布\nDo not do the next step yet: Press AI 对话 in the 添加卡片 toolbar", { maxModelCalls: 20 });
  await flow.check(4, async () => { await expect(await shownText(screen, "分镜 1 · 关键帧")).toBeVisible(); }, async () => (await shownText(screen, "分镜 1 · 关键帧")).isVisible());

  if (!skippedSteps.includes(5)) await agent.act("Press AI 对话 in the 添加卡片 toolbar\nDo not do the next step yet: Send 你好 from the new AI 对话 card", { maxModelCalls: 20 });
  await flow.check(5, async () => { await expect(await shownText(screen, "gpt-4o")).toBeVisible(); }, async () => (await shownText(screen, "gpt-4o")).isVisible());

  if (!skippedSteps.includes(6)) await agent.act("Send 你好 from the new AI 对话 card", { maxModelCalls: 20 });
  await flow.check(6, async () => { await expect(await shownText(screen, "你好，我是测试回复")).toBeVisible(); }, async () => (await shownText(screen, "你好，我是测试回复")).isVisible());
});
