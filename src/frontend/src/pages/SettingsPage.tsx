import { Layout } from "@/components/Layout";
import { DefaultModels } from "@/components/settings/DefaultModels";
import { RelayCard } from "@/components/settings/RelayCard";
import { TtsSettings } from "@/components/settings/TtsSettings";
import { Button } from "@/components/ui/button";
import { isRelayConfigured } from "@/lib/relay";
import { useSettingsStore } from "@/store/settingsStore";
import { CheckCircle2, Lock, Plus, Server } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const relays = useSettingsStore((s) => s.config.relays);
  const addRelay = useSettingsStore((s) => s.addRelay);
  const configuredCount = relays.filter(isRelayConfigured).length;

  function handleAdd() {
    addRelay();
    toast.success("已新增中转站", {
      description: "填写接口地址、API Key 和模型后即可使用。",
    });
    requestAnimationFrame(() => {
      const cards = document.querySelectorAll<HTMLElement>(
        "[data-ocid^='settings.relay.card.']",
      );
      const last = cards[cards.length - 1];
      last?.scrollIntoView({ behavior: "smooth", block: "start" });
      last?.querySelector<HTMLInputElement>("input")?.focus({
        preventScroll: true,
      });
    });
  }

  const addButton = (ocid: string) => (
    <Button
      type="button"
      onClick={handleAdd}
      data-ocid={ocid}
      className="h-9 gap-2 rounded-md transition-smooth hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
    >
      <Plus className="h-4 w-4" aria-hidden />
      新增中转站
    </Button>
  );

  return (
    <Layout>
      <div
        className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10"
        data-ocid="settings.page"
      >
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              中转站设置
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              对话、生图、视频与配音都通过你自己的 OpenAI 兼容中转站调用。
            </p>
          </div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-success"
            data-ocid="settings.autosave.success_state"
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            修改即自动保存到本浏览器
          </span>
        </header>

        <div
          className="flex gap-3 rounded-lg border border-border bg-accent/40 p-4 text-xs leading-relaxed text-accent-foreground"
          data-ocid="settings.privacy.panel"
        >
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p>
            所有设置只保存在当前浏览器的本地存储（localStorage）中，不会上传到任何服务器。
            请求由浏览器直接发往你的中转站；换浏览器或清除站点数据后需要重新填写。
          </p>
        </div>

        <section
          className="flex flex-col gap-4"
          aria-labelledby="relays-title"
          data-ocid="settings.relays.section"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2
                id="relays-title"
                className="font-display text-base font-semibold"
              >
                中转站
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                共 {relays.length} 个，已配置连接 {configuredCount} 个
              </p>
            </div>
            {relays.length > 0 && addButton("settings.relay.add_button")}
          </div>

          {relays.length === 0 ? (
            <div
              className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-panel px-6 py-12 text-center"
              data-ocid="settings.relays.empty_state"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Server className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="font-display text-sm font-semibold">
                  还没有中转站
                </p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  新增一个中转站，填写接口地址与 API
                  Key，再添加它提供的对话、生图、视频模型。
                </p>
              </div>
              {addButton("settings.relay.empty.add_button")}
            </div>
          ) : (
            <div
              className="flex flex-col gap-4"
              data-ocid="settings.relay.list"
            >
              {relays.map((relay, i) => (
                <RelayCard key={relay.id} relay={relay} index={i + 1} />
              ))}
            </div>
          )}
        </section>

        <DefaultModels />
        <TtsSettings />
      </div>
    </Layout>
  );
}
