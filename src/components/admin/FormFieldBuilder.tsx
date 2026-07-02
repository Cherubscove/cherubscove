import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import type { FormFieldConfig } from '@/lib/adminTypes';

interface Props {
  fields: FormFieldConfig[];
  onChange: (fields: FormFieldConfig[]) => void;
}

const FIELD_TYPES = ['text', 'email', 'tel', 'textarea', 'select', 'checkbox', 'radio'] as const;
const FIELD_TYPE_LABELS: Record<typeof FIELD_TYPES[number], string> = {
  text: 'Text',
  email: 'Email',
  tel: 'Phone',
  textarea: 'Paragraph',
  select: 'Dropdown',
  checkbox: 'Checkboxes',
  radio: 'Radio buttons',
};
const OPTION_TYPES = ['select', 'checkbox', 'radio'];

const inputCls = "bg-[#0F0D0A] border-[#2A2520] text-white placeholder:text-[#6B5E50] focus:border-[#E8620A]";

export default function FormFieldBuilder({ fields, onChange }: Props) {
  const addField = () => {
    onChange([...fields, {
      id: `field_${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
      placeholder: '',
    }]);
  };

  const updateField = (index: number, updates: Partial<FormFieldConfig>) => {
    const updated = fields.map((f, i) => i === index ? { ...f, ...updates } : f);
    onChange(updated);
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= fields.length) return;
    const updated = [...fields];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[#B5A898]">Registration Form Fields</label>
        <Button size="sm" onClick={addField} className="bg-[#E8620A] hover:bg-[#cf5709] text-white h-7 text-xs">
          <Plus size={12} className="mr-1" /> Add Field
        </Button>
      </div>

      {fields.length === 0 && (
        <p className="text-xs text-[#6B5E50] text-center py-4">No form fields. Click "Add Field" to create the registration form.</p>
      )}

      {fields.map((field, i) => (
        <Card key={field.id} className="bg-[#0F0D0A] border-[#2A2520]">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveField(i, -1)} className="text-[#6B5E50] hover:text-white text-xs" disabled={i === 0}>▲</button>
                <button onClick={() => moveField(i, 1)} className="text-[#6B5E50] hover:text-white text-xs" disabled={i === fields.length - 1}>▼</button>
              </div>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                <Input
                  placeholder="Label *"
                  value={field.label}
                  onChange={e => updateField(i, { label: e.target.value })}
                  className={`${inputCls} h-8 text-xs`}
                />
                <select
                  value={field.type}
                  onChange={e => updateField(i, { type: e.target.value as FormFieldConfig['type'] })}
                  className={`${inputCls} rounded-md px-2 h-8 text-xs border`}
                >
                  {FIELD_TYPES.map(t => <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>)}
                </select>
                <Input
                  placeholder="Placeholder"
                  value={field.placeholder}
                  onChange={e => updateField(i, { placeholder: e.target.value })}
                  className={`${inputCls} h-8 text-xs`}
                />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-[#B5A898] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={e => updateField(i, { required: e.target.checked })}
                      className="accent-[#E8620A]"
                    />
                    Required
                  </label>
                  <Button size="sm" variant="ghost" onClick={() => removeField(i)} className="text-red-400 hover:text-red-300 h-7 w-7 p-0 ml-auto">
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            </div>
            {OPTION_TYPES.includes(field.type) && (
              <div>
                <label className="text-xs text-[#B5A898] block mb-1">Options (one per line)</label>
                <textarea
                  placeholder="Enter one option per line"
                  value={(field.options || []).join('\n')}
                  onChange={e => updateField(i, { options: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                  className={`${inputCls} min-h-[88px] text-xs rounded-md w-full resize-y p-2`}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
