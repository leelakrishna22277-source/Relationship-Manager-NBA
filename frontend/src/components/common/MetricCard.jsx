export const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  onClick
}) => {
  return <div
    onClick={onClick}
    className={`p-space-5 rounded-radius-lg bg-color-7 border border-color-5 shadow-sm transition-all ${onClick ? "cursor-pointer hover:border-color-2 hover:bg-color-6/40" : ""}`}
  >
      <div className="flex items-center justify-between mb-space-3">
        <span className="text-text-xs font-semibold text-color-1/60 uppercase tracking-wider">{title}</span>
        {Icon && <div className="p-2 rounded-radius-md bg-color-6 text-color-2 border border-color-5">
            <Icon className="w-4 h-4" />
          </div>}
      </div>

      <div className="flex items-baseline gap-space-2">
        <span className="text-text-2xl font-bold text-color-1 font-heading">{value}</span>
        {trend && <span
    className={`text-text-xs font-semibold ${trend.isPositive ? "text-emerald-700" : "text-rose-700"}`}
  >
            {trend.value}
          </span>}
      </div>

      {subtitle && <p className="text-[12px] text-color-1/50 mt-1">{subtitle}</p>}
    </div>;
};
