export function TextInput({
  label,
  name,
  type = "text",
  required = true,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-gray-700">{label}</span>
      <input
        className="w-full border border-gray-300 px-3 py-2"
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
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
      <span className="mb-1 block text-gray-700">{label}</span>
      <textarea
        className="min-h-24 w-full border border-gray-300 px-3 py-2"
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
    </label>
  );
}
