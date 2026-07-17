const labelClasses = "mb-1.5 block text-sm font-medium text-ink-soft";

export const inputClasses =
  "w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-colors placeholder:text-ink-mute/70 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15";

export function TextInput({
  label,
  name,
  type = "text",
  required = true,
  defaultValue,
  placeholder,
  min,
  max,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block">
      <span className={labelClasses}>{label}</span>
      <input
        className={inputClasses}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        min={min}
        max={max}
      />
    </label>
  );
}

export function TextArea({
  label,
  name,
  defaultValue,
  required = true,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className={labelClasses}>{label}</span>
      <textarea
        className={`min-h-24 ${inputClasses}`}
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
    </label>
  );
}

export function SelectField({
  label,
  name,
  options,
  defaultValue,
  required = false,
}: {
  /** Пустая строка — селект без подписи (например, в компактных фильтрах). */
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      {label && <span className={labelClasses}>{label}</span>}
      <select className={inputClasses} name={name} defaultValue={defaultValue} required={required}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FileInput({
  label,
  name,
  accept,
  required = false,
  hint,
}: {
  label: string;
  name: string;
  accept?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className={labelClasses}>{label}</span>
      <input
        className="block w-full cursor-pointer text-sm text-ink-mute file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-navy-soft file:px-3 file:py-2 file:text-sm file:font-medium file:text-navy-deep hover:file:bg-navy-soft/70"
        name={name}
        type="file"
        accept={accept}
        required={required}
      />
      {hint && <span className="mt-1 block text-xs text-ink-mute/80">{hint}</span>}
    </label>
  );
}
