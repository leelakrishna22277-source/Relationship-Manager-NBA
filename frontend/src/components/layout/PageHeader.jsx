export const PageHeader = ({ title, subtitle, actions }) => {
  return <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-4 pb-space-5 border-b border-color-5">
      <div>
        <h1 className="text-text-xl sm:text-text-2xl font-bold text-color-1 font-heading">{title}</h1>
        {subtitle && <p className="text-text-xs text-color-1/60 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-space-2.5">{actions}</div>}
    </div>;
};
