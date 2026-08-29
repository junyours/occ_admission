import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, usePage } from '@inertiajs/react';
import { LayoutDashboard, FileText, BarChart3, Users, Eye, HelpCircle, BookOpen, Archive, Calendar, Brain, ChevronRight, ChevronLeft, User, Key, } from 'lucide-react';
import { capitalizeWords } from '../Utils/string';

const MENU_CONFIG = {
    evaluator: [
        {
            title: 'Overview',
            items: [
                {
                    name: 'Dashboard',
                    href: '/evaluator/dashboard',
                    icon: LayoutDashboard,
                },
            ],
        },
        {
            title: 'Exam Management',
            items: [
                {
                    name: 'Department Exams',
                    href: '/evaluator/department-exams',
                    icon: FileText,
                },
                {
                    name: 'Exam Monitoring',
                    href: '/evaluator/exam-monitoring',
                    icon: Eye,
                },
                {
                    name: 'Question Bank',
                    href: '/evaluator/question-bank',
                    icon: HelpCircle,
                },
            ],
        },
        {
            title: 'Results & Analysis',
            items: [
                {
                    name: 'Department Exam Results',
                    href: '/evaluator/exam-results',
                    icon: BarChart3,
                },
                {
                    name: 'Academic Exam Results',
                    href: '/evaluator/student-results',
                    icon: Users,
                },
            ],
        },
    ],
    guidance: [
        {
            title: 'Overview',
            items: [
                {
                    name: 'Dashboard',
                    href: '/guidance/dashboard',
                    icon: LayoutDashboard,
                },
            ],
        },
        {
            title: 'Content Management',
            items: [
                {
                    name: 'Question Bank',
                    href: '/guidance/question-bank',
                    icon: HelpCircle,
                },
                {
                    name: 'Archived Questions',
                    href: '/guidance/archived-questions',
                    icon: Archive,
                },
                {
                    name: 'Courses',
                    href: '/guidance/course-management',
                    icon: BookOpen,
                },
                {
                    name: 'Personality Tests',
                    href: '/guidance/personality-test-management',
                    icon: Brain,
                },
            ],
        },
        {
            title: 'Exam Operations',
            items: [
                {
                    name: 'Exam Management',
                    href: '/guidance/exam-management',
                    icon: FileText,
                },
                {
                    name: 'Registration',
                    href: '/guidance/exam-registration-management',
                    icon: Calendar,
                },
                {
                    name: 'Exam Monitoring',
                    href: '/guidance/exam-monitoring',
                    icon: Eye,
                },
                {
                    name: 'Exam Results',
                    href: '/guidance/exam-results',
                    icon: BarChart3,
                },
            ],
        },
        {
            title: 'Analytics & Insights',
            items: [
                {
                    name: 'Preferred Courses',
                    href: '/guidance/preferred-courses',
                    icon: BarChart3,
                },
            ],
        },
        {
            title: 'AI & Automation',
            items: [
                {
                    name: 'Recommendation Rules',
                    href: '/guidance/recommendation-rules-management',
                    icon: Brain,
                },
            ],
        },
        {
            title: 'Administration',
            items: [
                {
                    name: 'Evaluator Management',
                    href: '/guidance/evaluator-management',
                    icon: Users,
                },
            ],
        },
    ],
    admin: [
        {
            title: 'User Management',
            items: [
                // {
                //     name: 'Users',
                //     href: '/users',
                //     icon: Users,
                // },
                {
                    name: 'Password',
                    href: '/manage-password',
                    icon: Key,
                },
            ],
        },
    ],
};

// ITEMS OR THE BUTTON LINKS
const MenuItem = ({ item, isActive, isCollapsed }) => {
    const IconComponent = item.icon;

    return (
        <Tooltip content={item.name} show={isCollapsed}>
            <Link
                href={item.href}
                className={`flex items-center ${isCollapsed ? 'px-3 py-3 justify-center' : 'px-3 py-2.5'} text-sm font-medium rounded-xl transition-all duration-200 ${isActive
                    ? 'bg-[#1447E6] text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    }`}
            >
                <IconComponent
                    size={20}
                    className={`flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`}
                    strokeWidth={isActive ? 2.5 : 2}
                />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
            </Link>
        </Tooltip>
    );
};

// MENU GROUPS
const MenuGroup = ({ group, groupIndex, totalGroups, isCollapsed, url }) => (
    <div className="space-y-2">
        {/* Group Header */}
        {!isCollapsed && (
            <div className="px-3 py-2 mb-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                    {group.title}
                </h3>
            </div>
        )}

        <div className="space-y-1">
            {group.items.map((item) => {
                const isActive = url.startsWith(item.href);
                return <MenuItem key={item.name} item={item} isActive={isActive} isCollapsed={isCollapsed} />;
            })}
        </div>

        {groupIndex < totalGroups - 1 && !isCollapsed && (
            <div className="border-t border-slate-700/50 my-4" />
        )}
    </div>
);

// MAIN
const Sidebar = ({ user }) => {
    const { url } = usePage();
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved ? JSON.parse(saved) : false;
    });

    // Persist collapsed state
    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
    }, [isCollapsed]);

    const userRole = user?.role || 'guidance';
    const menuGroups = MENU_CONFIG[userRole] || MENU_CONFIG.guidance;

    return (
        <div className="relative h-full">
            <div
                className={`bg-[#1D293D] text-white transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-60'
                    } h-full flex flex-col overflow-visible border-r border-slate-700/50`}
            >
                <div className="px-2 py-4 flex-1 overflow-y-auto no-scrollbar overflow-visible">
                    <SidebarHeader
                        isCollapsed={isCollapsed}
                        userRole={userRole}
                    />

                    <nav className="space-y-6">
                        {menuGroups.map((group, groupIndex) => (
                            <MenuGroup
                                key={group.title}
                                group={group}
                                groupIndex={groupIndex}
                                totalGroups={menuGroups.length}
                                isCollapsed={isCollapsed}
                                url={url}
                            />
                        ))}
                    </nav>
                </div>
            </div>

            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute top-4 -right-4.5 bg-[#1D293D] p-2 rounded-lg hover:bg-[#1D293D]/90 transition-colors focus:outline-none z-50 cursor-pointer"
                title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
                {isCollapsed ? (
                    <ChevronRight size={20} className="text-white" />
                ) : (
                    <ChevronLeft size={20} className="text-white" />
                )}
            </button>
        </div>
    );
};

// ================================================================================================================================= //
// HEADER
const SidebarHeader = ({ isCollapsed, userRole }) => (
    <div className={`flex items-center gap-3 mb-8 ${isCollapsed && 'justify-center'}`}>
        <div className="w-10 h-10 bg-[#1447E6] rounded-xl flex items-center justify-center flex-shrink-0">
            <User size={24} className="text-white" />
        </div>
        <div className={`${isCollapsed && 'hidden'}`}>
            <div className="text-base font-bold text-white">
                {capitalizeWords(userRole)}
            </div>
            <div className="text-xs text-slate-400">Control Panel</div>
        </div>
    </div>
);

const Tooltip = ({ children, content, show }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const anchorRef = useRef(null);

    if (!show) return children;

    const handleMouseEnter = () => {
        try {
            const el = anchorRef.current;
            if (el) {
                const rect = el.getBoundingClientRect();
                setPos({
                    top: rect.top + rect.height / 2,
                    left: rect.right + 12,
                });
            }
        } catch {
            // Silent fail for edge cases
        }
        setIsVisible(true);
    };

    return (
        <div
            className="relative group"
            ref={anchorRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible &&
                createPortal(
                    <div
                        style={{
                            position: 'fixed',
                            top: pos.top,
                            left: pos.left,
                            transform: 'translateY(-50%)',
                        }}
                        className="pointer-events-none z-[99999]"
                    >
                        <div className="bg-[#1D293D] text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap border border-slate-700 font-medium">
                            {content}
                            <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-[#1D293D]" />
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
};

export default Sidebar;