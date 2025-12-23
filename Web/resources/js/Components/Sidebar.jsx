import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, usePage } from '@inertiajs/react';

// Tooltip component for collapsed sidebar
const Tooltip = ({ children, content, show }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const anchorRef = useRef(null);

    // Debug logging
    console.log('[Tooltip] show:', show, 'content:', content);

    if (!show) {
        return children;
    }

    return (
        <div 
            className="relative group"
            ref={anchorRef}
            onMouseEnter={() => {
                try {
                    const el = anchorRef.current;
                    if (el) {
                        const r = el.getBoundingClientRect();
                        setPos({ top: r.top + r.height / 2, left: r.right + 12 });
                    }
                } catch {}
                setIsVisible(true);
            }}
            onMouseLeave={() => {
                setIsVisible(false);
            }}
        >
            {children}
            {isVisible && createPortal(
                <div style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translateY(-50%)' }} className="pointer-events-none z-[99999]">
                    <div className="bg-[#1D293D] text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap border border-slate-700 font-medium">
                        {content}
                        <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-[#1D293D]"></div>
                    </div>
                </div>, document.body)
            }
        </div>
    );
};

const Sidebar = ({ user }) => {
    const { url } = usePage();
    const [isCollapsed, setIsCollapsed] = useState(() => {
        // Initialize from localStorage, default to false if not set
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved ? JSON.parse(saved) : false;
    });

    // Save to localStorage whenever isCollapsed changes
    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
    }, [isCollapsed]);

    const evaluatorMenuItems = [
        { name: 'Dashboard', href: '/evaluator/dashboard', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z' },
        { name: 'Exams', href: '/evaluator/exams', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
        { name: 'Results', href: '/evaluator/results', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
        { name: 'Students', href: '/evaluator/students', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z' },
        { name: 'Profile', href: '/evaluator/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    ];

    const evaluatorMenuGroups = [
        {
            title: 'Overview',
            items: [
                { name: 'Dashboard', href: '/evaluator/dashboard', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z' }
            ]
        },
        {
            title: 'Exam Management',
            items: [
                { name: 'Department Exams', href: '/evaluator/department-exams', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                { name: 'Exam Monitoring', href: '/evaluator/exam-monitoring',  icon: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 11-6 0 3 3 0 016 0z' },
                { name: 'Question Bank', href: '/evaluator/question-bank', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
            ]
        },
        {
            title: 'Results & Analysis',
            items: [
                { name: 'Department Exam Results', href: '/evaluator/exam-results', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                { name: 'Academic Exam Results', href: '/evaluator/student-results', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }
            ]
        },
        // {
        //     title: 'Account',
        //     items: [
        //         { name: 'Profile', href: '/evaluator/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }
        //     ]
        // }
    ];

    // Reorganized guidance menu items with logical groups
    const guidanceMenuGroups = [
        {
            title: 'Overview',
            items: [
                { name: 'Dashboard', href: '/guidance/dashboard', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z' }
            ]
        },
        {
            title: 'Content Management',
            items: [
                { name: 'Question Bank', href: '/guidance/question-bank', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                { name: 'Archived Questions', href: '/guidance/archived-questions', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
                { name: 'Courses', href: '/guidance/course-management', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
                { name: 'Personality Tests', href: '/guidance/personality-test-management', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }
            ]
        },
        {
            title: 'Exam Operations',
            items: [
                { name: 'Exam Management', href: '/guidance/exam-management', icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                { name: 'Registration', href: '/guidance/exam-registration-management', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                { name: 'Exam Monitoring', href: '/guidance/exam-monitoring', icon: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 11-6 0 3 3 0 016 0z' },
                { name: 'Exam Results', href: '/guidance/exam-results', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }
            ]
        },
        {
            title: 'Analytics & Insights',
            items: [
                { name: 'Preferred Courses', href: '/guidance/preferred-courses', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }
            ]
        },
        {
            title: 'AI & Automation',
            items: [
                { name: 'Recommendation Rules', href: '/guidance/recommendation-rules-management', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
            ]
        },
        {
            title: 'Administration',
            items: [
                { name: 'Evaluator Management', href: '/guidance/evaluator-management', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z' }
            ]
        }
    ];

    const menuItems = user?.role === 'evaluator' ? evaluatorMenuGroups : null;

    return (
        <div className={`bg-[#1D293D] text-white transition-all duration-300 ease-in-out ${isCollapsed ? 'w-29' : 'w-70'} h-full flex flex-col overflow-visible border-r border-slate-700/50`}>
            <div className="p-5 flex-1 overflow-y-auto no-scrollbar overflow-visible">
                {/* Header with collapse button */}
                <div className="flex items-center justify-between mb-8" >
                    {!isCollapsed && (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#1447E6] rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-base font-bold text-white">
                                    {user?.role === 'evaluator' ? 'Evaluator' : 'Guidance'}
                                </div>
                                <div className="text-xs text-slate-400">Control Panel</div>
                            </div>
                        </div>
                    )}
                    {isCollapsed && (
                        <div className="w-10 h-10 bg-[#1447E6] rounded-xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`p-2 rounded-lg hover:bg-slate-700/50 transition-colors focus:outline-none ${isCollapsed ? 'mx-auto' : ''}`}
                        title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                    >
                        <svg
                            className="h-5 w-5 text-slate-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            {isCollapsed ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="space-y-6">
                    {user?.role === 'evaluator' ? (
                        // Evaluator menu (grouped)
                        menuItems.map((group, groupIndex) => (
                            <div key={group.title} className="space-y-2">
                                {/* Group Header */}
                                {!isCollapsed && (
                                    <div className="px-3 py-2 mb-2">
                                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                                            {group.title}
                                        </h3>
                                    </div>
                                )}
                                
                                {/* Group Items */}
                                <div className="space-y-1">
                                    {group.items.map((item) => {
                                        const isActive = url.startsWith(item.href);
                                        return (
                                            <Tooltip key={item.name} content={item.name} show={isCollapsed}>
                                                <Link
                                                    href={item.href}
                                                    className={`flex items-center ${isCollapsed ? 'px-3 py-3 justify-center' : 'px-3 py-2.5'} text-sm font-medium rounded-xl transition-all duration-200 ${
                                                        isActive
                                                            ? 'bg-[#1447E6] text-white shadow-sm'
                                                            : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                                                    }`}
                                                >
                                                    <svg
                                                        className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`}
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        strokeWidth={isActive ? 2.5 : 2}
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d={item.icon}
                                                        />
                                                    </svg>
                                                    {!isCollapsed && (
                                                        <span className="truncate">{item.name}</span>
                                                    )}
                                                </Link>
                                            </Tooltip>
                                        );
                                    })}
                                </div>
                                
                                {/* Separator between groups (except for last group) */}
                                {groupIndex < menuItems.length - 1 && !isCollapsed && (
                                    <div className="border-t border-slate-700/50 my-4"></div>
                                )}
                            </div>
                        ))
                    ) : (
                        // Guidance menu (grouped)
                        guidanceMenuGroups.map((group, groupIndex) => (
                            <div key={group.title} className="space-y-2">
                                {/* Group Header */}
                                {!isCollapsed && (
                                    <div className="px-3 py-2 mb-2">
                                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                                            {group.title}
                                        </h3>
                                    </div>
                                )}
                                
                                {/* Group Items */}
                                <div className="space-y-1">
                                    {group.items.map((item) => {
                                        const isActive = url.startsWith(item.href);
                                        return (
                                            <Tooltip key={item.name} content={item.name} show={isCollapsed}>
                                                <Link
                                                    href={item.href}
                                                    className={`flex items-center ${isCollapsed ? 'px-3 py-3 justify-center' : 'px-3 py-2.5'} text-sm font-medium rounded-xl transition-all duration-200 ${
                                                        isActive
                                                            ? 'bg-[#1447E6] text-white shadow-sm'
                                                            : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                                                    }`}
                                                >
                                                    <svg
                                                        className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`}
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        strokeWidth={isActive ? 2.5 : 2}
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d={item.icon}
                                                        />
                                                    </svg>
                                                    {!isCollapsed && (
                                                        <span className="truncate">{item.name}</span>
                                                    )}
                                                </Link>
                                            </Tooltip>
                                        );
                                    })}
                                </div>
                                
                                {/* Separator between groups (except for last group) */}
                                {groupIndex < guidanceMenuGroups.length - 1 && !isCollapsed && (
                                    <div className="border-t border-slate-700/50 my-4"></div>
                                )}
                            </div>
                        ))
                    )}
                </nav>
            </div>
        </div>
    );
};

export default Sidebar; 