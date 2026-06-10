// Browser notifications + persisted in-app notification helpers
import { db } from "@/lib/db";

export type PermissionState = "granted" | "denied" | "default" | "unsupported";

export function getNotificationPermission(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as PermissionState;
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission as PermissionState;
  try {
    const res = await Notification.requestPermission();
    return res as PermissionState;
  } catch {
    return "denied";
  }
}

/** Backwards-compatible: silently checks/asks but never throws. */
export async function ensureNotificationPermission(): Promise<PermissionState> {
  return requestNotificationPermission();
}

export function showBrowserNotification(title: string, body?: string, link?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;
  try {
    const n = new Notification(title, { body, icon: "/favicon.ico", tag: link ?? title });
    if (link) {
      n.onclick = () => {
        window.focus();
        window.location.href = link;
      };
    }
    return true;
  } catch (e) {
    console.warn("notification failed", e);
    return false;
  }
}

export async function notifyUser(opts: {
  user_id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  showBrowser?: boolean;
}) {
  // Always persist in-app so the user sees it even when browser perms are denied.
  await db.from("notifications").insert({
    user_id: opts.user_id,
    type: opts.type,
    title: opts.title,
    body: opts.body ?? null,
    link: opts.link ?? null,
  });
  if (opts.showBrowser !== false) showBrowserNotification(opts.title, opts.body, opts.link);
}
