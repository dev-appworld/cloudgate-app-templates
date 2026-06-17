// Settings page.
import { useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { stagesApi, tagsApi, seedApi } from '@/services/crm';
import {
  Card,
  Spinner,
  ErrorState,
  EmptyState,
  Button,
  Input,
  Field,
  Badge,
  PageHeader,
} from '@/components/ui';
import { useToast } from '@/components/Toast';

const COLOR_CHOICES = ['#4f46e5', '#7c3aed', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#64748b'];

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {COLOR_CHOICES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`h-6 w-6 rounded-full ring-2 ${value === c ? 'ring-slate-900' : 'ring-transparent'}`}
          style={{ backgroundColor: c }}
          aria-label={c}
        />
      ))}
    </div>
  );
}

function StagesPanel() {
  const toast = useToast();
  const list = useAsync(() => stagesApi.list(), []);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_CHOICES[0]);
  const [busy, setBusy] = useState(false);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const existing = list.data || [];
      await stagesApi.create({ name, color, sort: existing.length, isWon: false, isLost: false });
      setName('');
      toast.success('Stage added.');
      list.reload();
    } catch (err) {
      toast.error(err?.message || 'Failed to add stage.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete stage "${row.Name}"?`)) return;
    try {
      await stagesApi.remove(row.Id);
      toast.success('Stage deleted.');
      list.reload();
    } catch (err) {
      toast.error(err?.message || 'Failed to delete stage.');
    }
  };

  const rows = list.data || [];

  return (
    <Card title="Pipeline stages">
      <div className="p-5">
        <form onSubmit={add} className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-end">
          <Field label="Stage name" className="grow">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Negotiation" />
          </Field>
          <Field label="Color">
            <ColorPicker value={color} onChange={setColor} />
          </Field>
          <Button type="submit" loading={busy}>
            Add
          </Button>
        </form>

        {list.loading ? (
          <Spinner />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : !rows.length ? (
          <EmptyState title="No stages yet" message="Add stages to build your pipeline." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((s) => (
              <li key={s.Id} className="flex items-center gap-3 py-2.5">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.Color || '#64748b' }} />
                <span className="min-w-0 grow truncate text-sm font-medium text-slate-800">{s.Name}</span>
                {s.IsWon ? <Badge color="green">won</Badge> : null}
                {s.IsLost ? <Badge color="red">lost</Badge> : null}
                <Button variant="ghost" size="sm" className="shrink-0 text-rose-600" onClick={() => remove(s)}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function TagsPanel() {
  const toast = useToast();
  const list = useAsync(() => tagsApi.list(), []);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_CHOICES[1]);
  const [busy, setBusy] = useState(false);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await tagsApi.create({ name, color });
      setName('');
      toast.success('Tag added.');
      list.reload();
    } catch (err) {
      toast.error(err?.message || 'Failed to add tag.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete tag "${row.Name}"?`)) return;
    try {
      await tagsApi.remove(row.Id);
      toast.success('Tag deleted.');
      list.reload();
    } catch (err) {
      toast.error(err?.message || 'Failed to delete tag.');
    }
  };

  const rows = list.data || [];

  return (
    <Card title="Tags">
      <div className="p-5">
        <form onSubmit={add} className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-end">
          <Field label="Tag name" className="grow">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Enterprise" />
          </Field>
          <Field label="Color">
            <ColorPicker value={color} onChange={setColor} />
          </Field>
          <Button type="submit" loading={busy}>
            Add
          </Button>
        </form>

        {list.loading ? (
          <Spinner />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : !rows.length ? (
          <EmptyState title="No tags yet" message="Tags help you categorise leads." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {rows.map((t) => (
              <span
                key={t.Id}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: t.Color || '#3b82f6' }}
              >
                {t.Name}
                <button
                  type="button"
                  onClick={() => remove(t)}
                  className="opacity-70 transition-opacity hover:opacity-100"
                  aria-label="Delete tag"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function SampleDataPanel() {
  const toast = useToast();
  const [busy, setBusy] = useState('');

  const run = async (reset) => {
    const msg = reset
      ? 'Reset all CRM data and reload the sample set? This deletes existing leads, companies, activities and tasks.'
      : 'Load the sample data set? Existing records are kept; only missing samples are added.';
    if (!window.confirm(msg)) return;
    setBusy(reset ? 'reset' : 'load');
    try {
      const r = await seedApi.run(reset);
      toast.success(`Done — ${r.Leads ?? 0} leads, ${r.Companies ?? 0} companies, ${r.Tasks ?? 0} tasks.`);
    } catch (err) {
      toast.error(err?.message || 'Failed to load sample data.');
    } finally {
      setBusy('');
    }
  };

  return (
    <Card title="Sample data">
      <div className="flex flex-col gap-3 p-5">
        <p className="text-sm text-slate-600">
          Populate this CRM with a realistic demo set (companies, leads across the pipeline, activities
          and tasks). Useful when standing up a new instance.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" loading={busy === 'load'} onClick={() => run(false)}>
            Load sample data
          </Button>
          <Button variant="danger" loading={busy === 'reset'} onClick={() => run(true)}>
            Reset &amp; reseed
          </Button>
        </div>
        <p className="text-xs text-slate-400">
          “Load” fills gaps without touching your records. “Reset &amp; reseed” wipes CRM data first.
        </p>
      </div>
    </Card>
  );
}

const Settings = () => {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Settings" subtitle="Configure your pipeline, tags and integrations." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StagesPanel />
        <TagsPanel />
      </div>
      <SampleDataPanel />
      <Card title="Email (SendGrid)">
        <div className="p-5 text-sm text-slate-600">
          <p>
            Outbound email uses SendGrid via the Cloudgate <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">/email-send</code>{' '}
            workflow endpoint. To enable sending, configure your SendGrid API key and a verified sender
            in the Cloudgate project environment settings (server-side). No keys are stored in the browser.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Until SendGrid is configured, the Compose panel on a lead will show a friendly error when sending.
          </p>
        </div>
      </Card>
    </div>
  );
};

export { Settings };
