// Browser notifications + persisted notification record helper
import { db } from "@/lib/db";

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function showBrowserNotification(title: string, body?: string, link?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, { body, icon: "/favicon.ico", tag: link ?? title });
    if (link) {
      n.onclick = () => {
        window.focus();
        window.location.href = link;
      };
    }
  } catch (e) {
    console.warn("notification failed", e);
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
  await db.from("notifications").insert({
    user_id: opts.user_id,
    type: opts.type,
    title: opts.title,
    body: opts.body ?? null,
    link: opts.link ?? null,
  });
  if (opts.showBrowser !== false) showBrowserNotification(opts.title, opts.body, opts.link);
}
