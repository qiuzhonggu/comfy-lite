# Project Guidance

## User Preferences

- Lightweight, much simpler than ComfyUI
- Canvas saved entirely locally in the browser
- Image generation, chat, video and voice all go through the user's own third-party relay
- Interface in Chinese
- Image generation, chat, video and voice all go through the user's own third-party relays
- Each node chooses which relay and which model it uses

## Accepted Requirements

- 用于视频创作的画布参考工具，类似 ComfyUI 但更轻量
- 画布完全保存在本地
- 生图通过第三方中转站调用
- AI 对话通过第三方中转站调用
- 视频生成通过第三方中转站调用
- 语音通过第三方中转站调用
- 设置中的生图、对话、视频都支持多个中转站，每个中转站可有多个模型
- 每个节点都可以选择用哪个中转站的哪个模型来操作
- 整个画布支持 AI 操作，在最右边添加 AI 对话面板
- 整个画布和节点都支持右键菜单操作

## Verified Commands

- **typecheck**: `pnpm typecheck`
- **fix**: `pnpm fix`
- **build**: `pnpm build`

## Learnings

- The app has no sign-in; canvases and media live in browser IndexedDB (lib/storage.ts) and relay settings in localStorage (store/settingsStore.ts).
- All AI calls go directly from the browser to the user's OpenAI-compatible relay through src/frontend/src/lib/relay.ts.
- canvasStore.ts openCanvas always reloads from IndexedDB and flushSave keeps the stored name unless renamed in the editor, so list-page renames stick.
- Pages wrap themselves in Layout; the editor uses Layout variant compact with title and actions slots for a fullscreen canvas.
- Backend holds no product data: main.mo keeps template authorization, an empty OQL Expose and getApiDoc in mixins/api-doc.mo.
- The 生图 card's 生成 button is disabled until it has connected prompt text or a description.
- Settings page autosaves (no 保存设置 button); 测试连接 appears only inside a relay card after pressing 新增中转站.
- E2E checks: getByRole button name 生成 substring-matches several buttons; check card titles like 生图-1 / 生图-2 instead of counting 生成 buttons.
- E2E tester cannot right-click empty canvas space; test context menus by right-clicking node cards.
- An image card needs a 生图模型 on a relay before it runs; otherwise it shows the setup hint.
