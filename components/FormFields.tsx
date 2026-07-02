const labelClasses = "mb-1.5 block text-sm font-medium text-gray-700";

export const inputClasses =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20";

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
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className={labelClasses}>{label}</span>
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
        className="block w-full cursor-pointer text-sm text-gray-500 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-emerald-800 hover:file:bg-emerald-100"
        name={name}
        type="file"
        accept={accept}
        required={required}
      />
      {hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
    </label>
  );
}
