import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { FORM_FIELD_TYPE_PRESETS, normalizeFieldType, type FormFieldConfig } from '@/lib/adminTypes';

interface Props {
  fields: FormFieldConfig[];
  onChange: (fields: FormFieldConfig[]) => void;
}

const OPTION_TYPES = ['select', 'checkbox', 'radio'];

const inputCls = "bg-[#0F0D0A] border-[#2A2520] text-white placeholder:text-[#6B5E50] focus:border-[#E8620A]";

export default function FormFieldBuilder({ fields, onChange }: Props) {
  const [editingOption, setEditingOption] = useState<{ fieldId: string; index: number; value: string } | null>(null);

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

  const addOption = (fieldIndex: number) => {
    const field = fields[fieldIndex];
    const newOptions = [...(field.options || []), ''];
    updateField(fieldIndex, { options: newOptions });
    setEditingOption({ fieldId: field.id, index: newOptions.length - 1, value: '' });
  };

  const updateOption = (fieldIndex: number, optionIndex: number, value: string) => {
    const field = fields[fieldIndex];
    const newOptions = [...(field.options || [])];
    newOptions[optionIndex] = value;
    updateField(fieldIndex, { options: newOptions });
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const field = fields[fieldIndex];
    const newOptions = (field.options || []).filter((_, i) => i !== optionIndex);
    updateField(fieldIndex, { options: newOptions });
  };

  return (
    <div className="space-y-3">
      <datalist id="form-field-type-presets">
        {FORM_FIELD_TYPE_PRESETS.map(t => <option key={t} value={t} />)}
      </datalist>
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
                <input
                  list="form-field-type-presets"
                  placeholder="Type (e.g. text, date, url…)"
                  value={field.type}
                  onChange={e => updateField(i, { type: e.target.value })}
                  onBlur={e => updateField(i, { type: normalizeFieldType(e.target.value) })}
                  className={`${inputCls} h-8 text-xs`}
                />
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
              <div className="rounded-md border border-[#2A2520] bg-[#1A1814] p-3 space-y-2">
                <div className="text-xs font-semibold text-[#B5A898] mb-2">
                  {field.type === 'select' && 'Dropdown Options'}
                  {field.type === 'checkbox' && 'Checkbox Options'}
                  {field.type === 'radio' && 'Radio Button Options'}
                </div>

                <div className="space-y-1.5">
                  {(field.options || []).map((option, optionIdx) => (
                    <div key={optionIdx} className="flex items-center gap-2 bg-[#0F0D0A] rounded p-2">
                      {field.type === 'checkbox' && (
                        <input
                          type="checkbox"
                          disabled
                          className="accent-[#E8620A]"
                        />
                      )}
                      {field.type === 'radio' && (
                        <input
                          type="radio"
                          disabled
                          className="accent-[#E8620A]"
                        />
                      )}
                      {field.type === 'select' && (
                        <span className="text-xs text-[#6B5E50]">•</span>
                      )}

                      {editingOption?.fieldId === field.id && editingOption?.index === optionIdx ? (
                        <input
                          type="text"
                          value={editingOption.value}
                          onChange={e => setEditingOption({ ...editingOption, value: e.target.value })}
                          autoFocus
                          className={`${inputCls} flex-1 h-7 text-xs rounded px-2`}
                        />
                      ) : (
                        <span className="text-xs text-white flex-1">{option}</span>
                      )}

                      <div className="flex gap-1">
                        {editingOption?.fieldId === field.id && editingOption?.index === optionIdx ? (
                          <>
                            <button
                              onClick={() => {
                                updateOption(i, optionIdx, editingOption.value);
                                setEditingOption(null);
                              }}
                              className="text-green-400 hover:text-green-300 p-0.5"
                              title="Save"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setEditingOption(null)}
                              className="text-[#6B5E50] hover:text-white p-0.5"
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingOption({ fieldId: field.id, index: optionIdx, value: option })}
                              className="text-[#B5A898] hover:text-white p-0.5"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => removeOption(i, optionIdx)}
                              className="text-red-400 hover:text-red-300 p-0.5"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  size="sm"
                  onClick={() => addOption(i)}
                  className="w-full bg-[#E8620A] hover:bg-[#cf5709] text-white h-7 text-xs mt-2"
                >
                  <Plus size={12} className="mr-1" /> Add Option
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
