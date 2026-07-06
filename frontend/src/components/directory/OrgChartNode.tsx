import React from "react";

interface OrgChartNodeProps {
  title: string;
  subtitle?: string;
  color?: string;
  children?: React.ReactNode;
  isRoot?: boolean;
}

export function OrgChartNode({ title, subtitle, color = "#6366f1", children, isRoot = false }: OrgChartNodeProps) {
  const hasChildren = React.Children.count(children) > 0;

  return (
    <div className="flex flex-col items-center">
      {/* The Node Box */}
      <div 
        className={`relative z-10 rounded-xl bg-[#121214] border border-white/10 p-4 min-w-[200px] text-center shadow-lg transition-transform hover:scale-105`}
        style={{ borderTop: `4px solid ${color}` }}
      >
        <h3 className="font-bold text-white text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-white/50 mt-1">{subtitle}</p>}
      </div>

      {/* The Children (if any) */}
      {hasChildren && (
        <div className="relative flex flex-col items-center mt-6">
          {/* Vertical Line down from parent */}
          <div className="absolute -top-6 left-1/2 w-px h-6 bg-white/20 -translate-x-1/2"></div>
          
          <div className="flex justify-center gap-6 relative">
            {React.Children.map(children, (child, index) => {
              if (!React.isValidElement(child)) return null;
              
              const childCount = React.Children.count(children);
              const isFirst = index === 0;
              const isLast = index === childCount - 1;
              
              return (
                <div className="relative flex flex-col items-center pt-4">
                  {/* Horizontal connector lines */}
                  {childCount > 1 && (
                    <>
                      {!isFirst && <div className="absolute top-0 left-0 right-1/2 h-px bg-white/20"></div>}
                      {!isLast && <div className="absolute top-0 left-1/2 right-0 h-px bg-white/20"></div>}
                    </>
                  )}
                  {/* Vertical Line up from child to connector */}
                  <div className="absolute top-0 left-1/2 w-px h-4 bg-white/20 -translate-x-1/2"></div>
                  {child}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
