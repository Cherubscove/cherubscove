import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { aiGenerate, explainFailure, type AiTask } from '@/lib/ai';

type Props = {
  task: AiTask;
  /** Gathered at click time so the latest form state is used. */
  input: () => Record<string, string>;
  /** Called with the parsed result. Return false to suppress the success toast. */
  onResult: (result: Record<string, string>, text: string | null) => void | false;
  label?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * The one control every hand-typed field gets. It never throws a failure at the
 * admin as a stack trace — `explainFailure` turns a chain outcome into a
 * sentence, because "every model is resting until 4pm" is not a fault.
 */
export default function AiAssistButton({
  task, input, onResult, label = 'Draft with AI', disabled, className = '',
}: Props) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const res = await aiGenerate(task, input());
      if (!res.result && !res.text) {
        toast.error(explainFailure(res));
        return;
      }
      const suppress = onResult(res.result ?? {}, res.text) === false;
      if (!suppress) {
        toast.success(res.provider ? `Drafted with ${res.provider}.` : 'Draft ready.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI request failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy || disabled}
      className={`inline-flex items-center gap-1.5 rounded-md border border-[#E8620A]/40 bg-[#E8620A]/10 px-2.5 py-1.5 text-xs font-medium text-[#E8620A] transition-colors hover:bg-[#E8620A]/20 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
      {busy ? 'Thinking…' : label}
    </button>
  );
}
