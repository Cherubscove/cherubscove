import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Sparkles, Plus, Trash2, Save, RefreshCw, ArrowUp, ArrowDown, Loader2,
  ToggleLeft, ToggleRight, CheckCircle2, AlertTriangle, Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  aiAdmin, DEFAULT_AI_FLAGS, type AiFlags, type AiProviderRow,
} from '@/lib/ai';

const FEATURE_LABELS: { key: keyof AiFlags; label: string; hint: string }[] = [
  { key: 'newsletter', label: 'Newsletter drafting', hint: 'Draft subject and body from a short brief' },
  { key: 'seo', label: 'SEO copy', hint: 'Write page titles and meta descriptions' },
  { key: 'events', label: 'Event descriptions', hint: 'Write event blurbs and post-registration messages' },
  { key: 'assistant', label: 'Field assistant', hint: 'The "Draft with AI" button on hand-typed fields' },
];

type Draft = Partial<AiProviderRow> & { api_key?: string };

/**
 * The parent holds its own copy of the flags to decide which AI buttons to
 * render, so a toggle here has to tell it. Without that, switching AI on wrote
 * to the database and updated this tab while every button elsewhere in the
 * console stayed hidden until a full page reload.
 */
export default function AiSettingsTab({ onFlagsChange }: { onFlagsChange?: (f: AiFlags) => void } = {}) {
  const [rows, setRows] = useState<AiProviderRow[]>([]);
  const [known, setKnown] = useState<string[]>([]);
  const [flags, setFlags] = useState<AiFlags>(DEFAULT_AI_FLAGS);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [modelLists, setModelLists] = useState<Record<string, string[]>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, f] = await Promise.all([aiAdmin.list(), aiAdmin.flags()]);
      setRows(list.providers);
      setKnown(list.known_providers);
      setFlags(f.flags);
      onFlagsChange?.(f.flags);
      setDrafts({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load AI settings.');
    } finally {
      setLoading(false);
    }
  }, [onFlagsChange]);

  useEffect(() => { void load(); }, [load]);

  const draftFor = (r: AiProviderRow): Draft => drafts[r.id] ?? r;
  const setDraft = (id: string, patch: Draft) =>
    setDrafts(d => ({ ...d, [id]: { ...(d[id] ?? rows.find(r => r.id === id) ?? {}), ...patch } }));

  const save = async (r: AiProviderRow) => {
    setBusyId(r.id);
    try {
      const d = draftFor(r);
      await aiAdmin.upsert({ ...d, id: r.id });
      toast.success('Saved.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally { setBusyId(null); }
  };

  const addRow = async () => {
    try {
      // Seeded blank and disabled on purpose: a guessed model id gives the
      // admin two things to fix instead of one.
      await aiAdmin.upsert({ provider: known[0] ?? 'groq', model: '', enabled: false, position: rows.length });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add a row.');
    }
  };

  const remove = async (r: AiProviderRow) => {
    if (!confirm(`Remove ${r.provider} / ${r.model || 'unconfigured'} from the chain?`)) return;
    try { await aiAdmin.remove(r.id); await load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Delete failed.'); }
  };

  const move = async (index: number, delta: number) => {
    const next = [...rows];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
    try { await aiAdmin.reorder(next.map(r => r.id)); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Reorder failed.'); void load(); }
  };

  const fetchModels = async (r: AiProviderRow) => {
    setBusyId(r.id);
    try {
      const { models } = await aiAdmin.models(r.id);
      setModelLists(m => ({ ...m, [r.id]: models }));
      toast.success(`${models.length} model(s) available.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not fetch models.');
    } finally { setBusyId(null); }
  };

  const test = async (r: AiProviderRow) => {
    setBusyId(r.id);
    try {
      const res = await aiAdmin.test(r.id);
      if (res.ok) toast.success(`${r.provider} replied: "${res.reply}"`);
      else toast.error(res.error ?? 'No usable reply.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test failed.');
    } finally { setBusyId(null); }
  };

  const toggleFlag = async (key: keyof AiFlags) => {
    const next = { ...flags, [key]: !flags[key] };
    setFlags(next);
    onFlagsChange?.(next);
    try {
      await aiAdmin.setFlags(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save switches.');
      setFlags(flags);
      onFlagsChange?.(flags);
    }
  };

  const resting = rows.filter(r => r.enabled && r.cooldown);
  const allResting = resting.length > 0 && resting.length === rows.filter(r => r.enabled).length;

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-[#B5A898]">
        <Loader2 size={16} className="animate-spin" /> Loading AI settings…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {allResting && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          <Clock size={16} className="mt-0.5 shrink-0" />
          <span>
            Every model is resting until{' '}
            {new Date(resting.map(r => r.cooldown!.until).sort()[0]).toLocaleString()}.
            Nothing is lost and nothing needs doing.
          </span>
        </div>
      )}

      <Card className="border-[#3A332C] bg-[#1E1B1A]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-[#F5EFE6]">
              <Sparkles size={16} className="text-[#E8620A]" /> AI Features
            </CardTitle>
            <p className="mt-1 text-xs text-[#6B5E50]">
              The master switch turns everything off at once. Switched-off features fall back to
              what the admin types by hand — nothing breaks.
            </p>
          </div>
          <button onClick={() => toggleFlag('enabled')} className={flags.enabled ? 'text-green-400' : 'text-[#6B5E50]'}>
            {flags.enabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
          </button>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {FEATURE_LABELS.map(f => (
            <div
              key={f.key}
              className={`flex items-center justify-between rounded-md border border-[#3A332C] p-3 ${flags.enabled ? '' : 'opacity-50'}`}
            >
              <div>
                <p className="text-sm text-[#F5EFE6]">{f.label}</p>
                <p className="text-xs text-[#6B5E50]">{f.hint}</p>
              </div>
              <button
                onClick={() => toggleFlag(f.key)}
                disabled={!flags.enabled}
                className={flags[f.key] ? 'text-green-400' : 'text-[#6B5E50]'}
              >
                {flags[f.key] ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-[#3A332C] bg-[#1E1B1A]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-[#F5EFE6]">Model chain</CardTitle>
            <p className="mt-1 max-w-2xl text-xs text-[#6B5E50]">
              Tried top to bottom; the first usable answer wins. Interleave vendors rather than
              grouping a vendor's models together — a per-minute limit is charged against the
              account, so three rows from one vendor in a row burn three doomed attempts. Put paid
              providers last and give them a daily cap.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={load} className="border-[#3A332C] text-[#B5A898]">
              <RefreshCw size={13} className="mr-1.5" /> Refresh
            </Button>
            <Button size="sm" onClick={addRow} className="bg-[#E8620A] hover:bg-[#ca5209]">
              <Plus size={13} className="mr-1.5" /> Add model
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!rows.length && (
            <p className="py-6 text-center text-sm text-[#6B5E50]">
              No models configured. Add one, paste a key, save, then pick a model from the live list.
            </p>
          )}

          {rows.map((r, i) => {
            const d = draftFor(r);
            const dirty = !!drafts[r.id];
            return (
              <div key={r.id} className="rounded-lg border border-[#3A332C] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-6 shrink-0 text-center text-xs text-[#6B5E50]">{i + 1}</span>

                  <select
                    value={d.provider ?? ''}
                    onChange={e => setDraft(r.id, { provider: e.target.value })}
                    className="h-9 rounded-md border border-[#3A332C] bg-[#12100F] px-2 text-sm text-[#F5EFE6]"
                  >
                    {known.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>

                  {modelLists[r.id] ? (
                    <select
                      value={d.model ?? ''}
                      onChange={e => setDraft(r.id, { model: e.target.value })}
                      className="h-9 min-w-[200px] flex-1 rounded-md border border-[#3A332C] bg-[#12100F] px-2 text-sm text-[#F5EFE6]"
                    >
                      <option value="">— pick a model —</option>
                      {modelLists[r.id].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  ) : (
                    <Input
                      value={d.model ?? ''}
                      placeholder="model id"
                      onChange={e => setDraft(r.id, { model: e.target.value })}
                      className="h-9 min-w-[180px] flex-1 border-[#3A332C] bg-[#12100F] text-sm text-[#F5EFE6]"
                    />
                  )}

                  <Input
                    type="password"
                    value={(d.api_key as string) ?? ''}
                    placeholder={r.has_key ? `saved (${r.api_key})` : 'API key'}
                    onChange={e => setDraft(r.id, { api_key: e.target.value })}
                    className="h-9 w-40 border-[#3A332C] bg-[#12100F] text-sm text-[#F5EFE6]"
                  />

                  <Input
                    type="number"
                    value={d.daily_limit ?? ''}
                    placeholder="daily cap"
                    title="Our own ceiling, below the vendor's. Leave blank for uncapped."
                    onChange={e => setDraft(r.id, { daily_limit: e.target.value === '' ? null : Number(e.target.value) })}
                    className="h-9 w-24 border-[#3A332C] bg-[#12100F] text-sm text-[#F5EFE6]"
                  />

                  <button
                    onClick={() => setDraft(r.id, { enabled: !d.enabled })}
                    title={d.enabled ? 'Enabled' : 'Disabled'}
                    className={d.enabled ? 'text-green-400' : 'text-[#6B5E50]'}
                  >
                    {d.enabled ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                  </button>

                  <div className="ml-auto flex items-center gap-1">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-[#B5A898] disabled:opacity-30"><ArrowUp size={14} /></button>
                    <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="p-1 text-[#B5A898] disabled:opacity-30"><ArrowDown size={14} /></button>
                    <Button size="sm" variant="outline" disabled={busyId === r.id || !r.has_key} onClick={() => fetchModels(r)} className="border-[#3A332C] text-[#B5A898]">Models</Button>
                    <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => test(r)} className="border-[#3A332C] text-[#B5A898]">Test</Button>
                    <Button size="sm" disabled={busyId === r.id || !dirty} onClick={() => save(r)} className="bg-[#E8620A] hover:bg-[#ca5209]">
                      <Save size={13} className="mr-1" /> Save
                    </Button>
                    <button onClick={() => remove(r)} className="p-1 text-red-400/70 hover:text-red-400"><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-8 text-xs">
                  <span className="text-[#6B5E50]">
                    {r.calls_today} call{r.calls_today === 1 ? '' : 's'} today
                    {r.daily_limit != null && ` of ${r.daily_limit}`}
                    {r.failures_today > 0 && ` · ${r.failures_today} refused`}
                  </span>
                  {r.last_used_at && (
                    <span className="flex items-center gap-1 text-green-400/70">
                      <CheckCircle2 size={11} /> last used {new Date(r.last_used_at).toLocaleString()}
                    </span>
                  )}
                  {r.cooldown && (
                    <span className="flex items-center gap-1 text-amber-400/80">
                      <Clock size={11} /> resting until {new Date(r.cooldown.until).toLocaleTimeString()}
                    </span>
                  )}
                  {r.last_error && (
                    <span className="flex items-center gap-1 text-red-400/70" title={r.last_error}>
                      <AlertTriangle size={11} /> {r.last_error.slice(0, 90)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
