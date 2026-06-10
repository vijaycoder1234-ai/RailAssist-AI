import { useEffect, useState, useCallback } from "react";
import { Bell, BellOff, Check, CheckCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { db } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";
import {
  getNotificationPermission, requestNotificationPermission, type PermissionState,
} from "@/lib/notifications";
import { toast } from "sonner";

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const [perm, setPerm] = useState<PermissionState>("default");
  const [open, setOpen] = useState(false);

  useEffect(() => { setPerm(getNotificationPermission()); }, []);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await db.from("notifications").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(25);
    setItems((data as Notif[]) ?? []);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = db
      .from("notifications")
      // realtime fallback: simple poll every 30s
      ;
    void channel;
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [user, load]);

  const unread = items.filter((n) => !n.read).length;

  const askPerm = async () => {
    const next = await requestNotificationPermission();
    setPerm(next);
    if (next === "granted") toast.success("Browser notifications enabled");
    else if (next === "denied") toast.info("We'll show alerts here in-app instead");
  };

  const markAllRead = async () => {
    if (!user) return;
    await db.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    load();
  };
  const markRead = async (id: string) => {
    await db.from("notifications").update({ read: true }).eq("id", id);
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2.5 border-b">
          <div className="font-display font-semibold text-sm">Notifications</div>
          {unread > 0 && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={markAllRead}>
              <CheckCheck className="h-3 w-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>

        {perm === "default" && (
          <div className="px-3 py-2.5 border-b bg-primary/5 text-xs flex items-center gap-2">
            <Bell className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="flex-1">Get desktop alerts for critical incidents</span>
            <Button size="sm" className="h-7 text-xs" onClick={askPerm}>Enable</Button>
          </div>
        )}
        {perm === "denied" && (
          <div className="px-3 py-2.5 border-b bg-warning/10 text-xs flex items-center gap-2">
            <BellOff className="h-3.5 w-3.5 text-warning shrink-0" />
            <span>Browser notifications blocked — alerts will appear here.</span>
          </div>
        )}

        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              <AlertCircle className="h-5 w-5 mx-auto mb-2 opacity-50" />
              No notifications yet.
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`px-3 py-2.5 text-sm cursor-pointer hover:bg-accent ${!n.read ? "bg-primary/5" : ""}`}
                  onClick={() => {
                    markRead(n.id);
                    if (n.link) { window.location.href = n.link; setOpen(false); }
                  }}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{n.title}</div>
                      {n.body && <div className="text-xs text-muted-foreground line-clamp-2">{n.body}</div>}
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>
                    {n.read && <Check className="h-3 w-3 text-muted-foreground mt-1" />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Backwards-compatible default for the legacy export name
export { NotificationBell as default };
// Use Badge for tree-shaking awareness in case of future variants
void Badge;
