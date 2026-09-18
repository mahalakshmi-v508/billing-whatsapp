import React from "react";

export default function PageHeader({
  title,
  subtitle,
  badge,
  breadcrumbs,
  actions,
  children
}) {
  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5 font-medium">
            {breadcrumbs.map((bc, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span>/</span>}
                {bc.path ? (
                  <a href={bc.path} className="hover:text-indigo-600 transition-colors">
                    {bc.label}
                  </a>
                ) : (
                  <span className="text-slate-600">{bc.label}</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
            {title}
          </h1>
          {badge && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-1 font-normal">
            {subtitle}
          </p>
        )}
      </div>

      {(actions || children) && (
        <div className="flex items-center gap-2.5 flex-wrap">
          {actions}
          {children}
        </div>
      )}
    </div>
  );
}
