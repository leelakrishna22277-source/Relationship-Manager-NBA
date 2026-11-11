export const FormField = ({
  label,
  id,
  error,
  children,
  hint,
  required
}) => {
  return <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-text-xs font-semibold text-color-1/80">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
        {hint && <span className="text-[11px] text-color-1/40">{hint}</span>}
      </div>

      {children}

      {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}
    </div>;
};
