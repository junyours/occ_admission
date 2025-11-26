import React from 'react';

/**
 * Accessible, responsive card wrapper for charts
 */
const ChartCard = ({ title, subtitle, action, children }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-slate-100 border-t-[6px] border-t-[#1447E6]">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-base font-semibold text-[#1D293D] tracking-wide">{title}</h3>
                    {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
                </div>
                {action}
            </div>
            <div className="relative">
                {children}
            </div>
        </div>
    );
};

export default ChartCard;


