import { Toaster } from "@/components/ui/sonner";
import CanvasEditorPage from "@/pages/CanvasEditorPage";
import CanvasListPage from "@/pages/CanvasListPage";
import SettingsPage from "@/pages/SettingsPage";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import type { CSSProperties } from "react";

const toasterStyle = {
  "--normal-bg": "oklch(var(--popover))",
  "--normal-text": "oklch(var(--popover-foreground))",
  "--normal-border": "oklch(var(--border))",
} as CSSProperties;

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster
        theme="dark"
        position="bottom-center"
        duration={5000}
        closeButton
        style={toasterStyle}
      />
    </>
  ),
});

const listRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: CanvasListPage,
});

export const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/canvas/$canvasId",
  component: CanvasEditorPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  listRoute,
  editorRoute,
  settingsRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
