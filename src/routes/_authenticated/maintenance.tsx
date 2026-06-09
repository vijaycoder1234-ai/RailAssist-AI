import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { db, type IncidentRow } from "@/lib/db";
import { notifyUser, ensureNotificationPermission } from "@/lib/notifications";
import { Wrench, ImagePlus, Loader2, CheckCircle2, Clock, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/maintenance")({
  head: () => ({ meta: [{ title: "Maintenance Dashboard — RailAssist AI" }] }),
  component: MaintenancePage,
});

type TaskStatus = "assigned" | "accepted" | "in_progress" | "awaiting_verification" | "completed" | "rejected";
interface Task {
  id: string;
  incident_id: string;
  assigned_to: string;
  assigned_by: string | null;
  priority: "low" | "medium" | "high" | "critical";
  status: TaskStatus;
  due_at: string | null;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  before_photos: string[] | null;
  after_photos: string[] | null;
  completion_report: string | null;
  remarks: string | null;
  created_at: string;
}

const priorityTone: Record<Task["priority"], string> = {
  low: "bg-success/15 text-success border-success/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  high: "bg-safety/15 text-safety border-safety/30",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
};

function MaintenancePage() {
  const { user, isMaintenance, isSuperAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [incidents, setIncidents] = useState<Record<string, IncidentRow>>({});
  const [tab, setTab] = useState<"active" | TaskStatus>("active");
  const [selected, setSelected] = useState<Task | null>(null);

  useEffect(() => { ensureNotificationPermission(); }, []);

  useEffect(() => {
    if (loading) return;
    if (!isMaintenance && !isSuperAdmin) navigate({ to: "/dashboard" });
  }, [loading, isMaintenance, isSuperAdmin, navigate]);

  const load = async () => {
    if (!user) return;
    const { data, error } = await db
      .from("maintenance_tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    const list = (data as Task[]) ?? [];
    setTasks(list);
    const ids = Array.from(new Set(list.map((t) => t.incident_id)));
    if (ids.length) {
      const { data: incs } = await db.from("incidents").select("*").in("id", ids);
      const map: Record<string, IncidentRow> = {};
      ((incs as IncidentRow[]) ?? []).forEach((i) => { map[i.id] = i; });
      setIncidents(map);
    }
  };
  useEffect(() => { load(); }, [user]);

  const filtered = useMemo(() => {
    if (tab === "active") return tasks.filter((t) => !["completed", "rejected"].includes(t.status));
    return tasks.filter((t) => t.status === tab);
  }, [tasks, tab]);

  const counts = useMemo(() => ({
    assigned: tasks.filter((t) => t.status === "assigned").length,
    in_progress: tasks.filter((t) => t.status === "in_progress" || t.status === "accepted").length,
    awaiting: tasks.filter((t) => t.status === "awaiting_verification").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  }), [tasks]);

  return (
    <AppShell kind="inspector">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Maintenance Workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track assigned repair tasks and upload completion evidence.</p>
        </div>
        <Badge variant="secondary"><Wrench className="h-3 w-3 mr-1" /> Maintenance Team</Badge>
      </div>

      <div className="mt-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Kpi label="New" value={counts.assigned} icon={Clock} tone="text-warning" />
        <Kpi label="Active" value={counts.in_progress} icon={Activity} tone="text-safety" />
        <Kpi label="Awaiting Verification" value={counts.awaiting} icon={Clock} tone="text-primary" />
        <Kpi label="Completed" value={counts.completed} icon={CheckCircle2} tone="text-success" />
      </div>

      <Card className="mt-6">
        <CardContent className="p-4 sm:p-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-4">
            <TabsList>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="assigned">New</TabsTrigger>
              <TabsTrigger value="in_progress">In progress</TabsTrigger>
              <TabsTrigger value="awaiting_verification">Awaiting</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Incident</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No tasks here.</TableCell></TableRow>
                )}
                {filtered.map((t) => {
                  const inc = incidents[t.incident_id];
                  return (
                    <TableRow key={t.id} className="cursor-pointer" onClick={() => setSelected(t)}>
                      <TableCell>
                        <div className="font-medium">{inc?.title ?? "—"}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{inc?.description}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className={`capitalize ${priorityTone[t.priority]}`}>{t.priority}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{t.status.replace("_", " ")}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.due_at ? new Date(t.due_at).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-right"><Button size="sm" variant="ghost">Open →</Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && user && (
          <TaskDialog
            task={selected}
            incident={incidents[selected.incident_id]}
            userId={user.id}
            onChanged={() => { load(); }}
            onClose={() => setSelected(null)}
          />
        )}
      </Dialog>
    </AppShell>
  );
}

function Kpi({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Wrench; tone: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${tone}`} />
        </div>
        <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function TaskDialog({ task, incident, userId, onChanged, onClose }: {
  task: Task; incident: IncidentRow | undefined; userId: string; onChanged: () => void; onClose: () => void;
}) {
  const [report, setReport] = useState(task.completion_report ?? "");
  const [beforeFiles, setBeforeFiles] = useState<File[]>([]);
  const [afterFiles, setAfterFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const updateStatus = async (status: TaskStatus, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    const patch: Record<string, unknown> = { status, ...extra };
    if (status === "accepted") patch.accepted_at = new Date().toISOString();
    if (status === "in_progress") patch.started_at = new Date().toISOString();
    if (status === "awaiting_verification") patch.completed_at = new Date().toISOString();
    const { error } = await db.from("maintenance_tasks").update(patch).eq("id", task.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Status: ${status.replace("_", " ")}`);
    if (incident) {
      // notify reporter of status change
      await notifyUser({
        user_id: incident.reporter_id,
        type: "task_status",
        title: `Maintenance update on "${incident.title}"`,
        body: `New status: ${status.replace("_", " ")}`,
        link: "/incidents",
      });
    }
    onChanged();
  };

  const uploadPhotos = async (files: File[], slot: "before_photos" | "after_photos") => {
    if (!files.length) return [];
    setBusy(true);
    const paths: string[] = [];
    for (const f of files) {
      const path = `${userId}/${task.id}/${slot}/${Date.now()}-${f.name}`;
      const { error } = await db.storage.from("maintenance-evidence").upload(path, f, { upsert: false });
      if (error) { toast.error(`Upload failed: ${error.message}`); continue; }
      paths.push(path);
    }
    const current = (task[slot] ?? []) as string[];
    await db.from("maintenance_tasks").update({ [slot]: [...current, ...paths] }).eq("id", task.id);
    setBusy(false);
    toast.success(`${paths.length} ${slot.replace("_", " ")} uploaded`);
    onChanged();
  };

  const submitCompletion = async () => {
    if (!report.trim()) { toast.error("Add a completion report"); return; }
    await db.from("maintenance_tasks").update({ completion_report: report }).eq("id", task.id);
    await updateStatus("awaiting_verification");
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{incident?.title ?? "Maintenance Task"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        {incident && <p className="whitespace-pre-wrap text-muted-foreground">{incident.description}</p>}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={`capitalize ${priorityTone[task.priority]}`}>{task.priority}</Badge>
          <Badge variant="outline" className="capitalize">{task.status.replace("_", " ")}</Badge>
          {task.due_at && <Badge variant="outline">Due {new Date(task.due_at).toLocaleDateString()}</Badge>}
        </div>

        {task.status === "assigned" && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => updateStatus("accepted")} disabled={busy}>Accept task</Button>
            <Button size="sm" variant="outline" onClick={() => updateStatus("rejected")} disabled={busy}>Reject</Button>
          </div>
        )}
        {task.status === "accepted" && (
          <Button size="sm" onClick={() => updateStatus("in_progress")} disabled={busy}>Start repair</Button>
        )}

        {(task.status === "in_progress" || task.status === "accepted") && (
          <>
            <div>
              <Label>Before repair photos</Label>
              <div className="flex items-center gap-2 mt-1">
                <label className="inline-flex items-center gap-1.5 text-sm cursor-pointer rounded-md border px-3 py-1.5 hover:bg-accent">
                  <ImagePlus className="h-4 w-4" /> Select
                  <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => setBeforeFiles(Array.from(e.target.files ?? []))} />
                </label>
                {beforeFiles.length > 0 && <Button size="sm" variant="outline" onClick={() => uploadPhotos(beforeFiles, "before_photos")} disabled={busy}>Upload {beforeFiles.length}</Button>}
                <span className="text-xs text-muted-foreground">{(task.before_photos ?? []).length} uploaded</span>
              </div>
            </div>
            <div>
              <Label>After repair photos</Label>
              <div className="flex items-center gap-2 mt-1">
                <label className="inline-flex items-center gap-1.5 text-sm cursor-pointer rounded-md border px-3 py-1.5 hover:bg-accent">
                  <ImagePlus className="h-4 w-4" /> Select
                  <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => setAfterFiles(Array.from(e.target.files ?? []))} />
                </label>
                {afterFiles.length > 0 && <Button size="sm" variant="outline" onClick={() => uploadPhotos(afterFiles, "after_photos")} disabled={busy}>Upload {afterFiles.length}</Button>}
                <span className="text-xs text-muted-foreground">{(task.after_photos ?? []).length} uploaded</span>
              </div>
            </div>
            <div>
              <Label>Completion report</Label>
              <Textarea rows={4} value={report} onChange={(e) => setReport(e.target.value)} placeholder="Describe the repair performed, parts used, and post-repair checks." />
            </div>
            <Button onClick={submitCompletion} disabled={busy}>
              {busy ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Submitting…</> : "Mark complete & request verification"}
            </Button>
          </>
        )}

        {task.status === "awaiting_verification" && (
          <Card className="border-warning/40 bg-warning/5"><CardContent className="p-3 text-sm">Awaiting admin verification. The reporter has been notified.</CardContent></Card>
        )}
        {task.status === "completed" && (
          <Card className="border-success/40 bg-success/5"><CardContent className="p-3 text-sm">Task verified and closed. {task.remarks ? `Admin notes: ${task.remarks}` : ""}</CardContent></Card>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </DialogFooter>
    </DialogContent>
  );
}
