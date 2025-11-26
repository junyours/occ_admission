    import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

const RecommendationRulesManagement = ({ user, rules, personalityTypes, courses }) => {
    // Add safety checks for props and ensure all data is sanitized
    const safeRules = (rules?.data || rules || []).map(rule => ({
        ...rule,
        personality_type: typeof rule.personality_type === 'object' ? rule.personality_type.type : String(rule.personality_type || ''),
        min_score: Number(rule.min_score || 0),
        max_score: Number(rule.max_score || 0),
        id: rule.id || 0,
        created_at: rule.created_at || null,
        academic_year: rule.academic_year || null,
        recommended_course: rule.recommended_course ? {
            ...rule.recommended_course,
            course_code: String(rule.recommended_course.course_code || ''),
            course_name: String(rule.recommended_course.course_name || '')
        } : null
    }));
    const safePersonalityTypes = (personalityTypes || []).map(type => ({
        ...type,
        type: String(type.type || ''),
        title: String(type.title || ''),
        description: String(type.description || '')
    }));
    const safeCourses = (courses || []).map(course => ({
        ...course,
        id: course.id || 0,
        course_code: String(course.course_code || ''),
        course_name: String(course.course_name || '')
    }));
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [expandedPersonalities, setExpandedPersonalities] = useState({});
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [notificationData, setNotificationData] = useState({
        personalityTypes: [],
        courseCount: 0,
        message: ''
    });
    const [formData, setFormData] = useState({
        personality_type: '',
        min_score: 10, // Set default minimum to 10%
        max_score: 100,
        recommended_course_ids: [] // Changed to array for multiple courses
    });

    // Function to show notification modal
    const showNotification = (personalityTypes, courseCount, message, detailedInfo = null) => {
        setNotificationData({
            personalityTypes,
            courseCount,
            message,
            detailedInfo // Store detailed info for better display
        });
        setShowNotificationModal(true);
        
        // Auto-close after 30 seconds
        setTimeout(() => {
            setShowNotificationModal(false);
        }, 30000);
    };

    // Smart filtering function: Only show courses in score ranges where student can meet the minimum passing rate
    const isCourseCompatibleWithScoreRange = (coursePassingRate, minScore, maxScore) => {
        // Course can only appear in ranges where the student's minimum score meets or exceeds the course's passing rate
        return minScore >= coursePassingRate;
    };

    // Function to get compatible courses for a specific score range
    const getCompatibleCoursesForScoreRange = (courses, minScore, maxScore) => {
        return courses.filter(course => {
            const passingRate = course.passing_rate || 80;
            return isCourseCompatibleWithScoreRange(passingRate, minScore, maxScore);
        });
    };

    // Function to explain the smart filtering logic
    const getSmartFilteringExplanation = () => {
        return {
            title: "Smart Course-Score Compatibility",
            explanation: "The system automatically filters courses based on logical score requirements:",
            examples: [
                "BSIT (75% passing rate) → Can appear in 75%+ score ranges",
                "BSBA-FM (80% passing rate) → Can appear in 80%+ score ranges", 
                "BSN Nursing (90% passing rate) → Can ONLY appear in 90%+ score ranges"
            ],
            logic: "A course only appears in score ranges where the student's minimum score meets or exceeds the course's minimum passing rate requirement."
        };
    };

    // Detect when new rules are added and show notification modal
    useEffect(() => {
        // Check if we should show notifications for new rules
        const shouldShowNotifications = localStorage.getItem('showNewRuleNotifications') === 'true';
        const lastRuleCount = parseInt(localStorage.getItem('lastRuleCount') || '0');
        const lastPersonalityRules = JSON.parse(localStorage.getItem('lastPersonalityRules') || '{}');
        
        if (shouldShowNotifications && safeRules.length > lastRuleCount) {
            console.log('Detected new rules added, showing notification modal');
            console.log('Previous rule count:', lastRuleCount, 'Current rule count:', safeRules.length);
            
            // Get the current rule count per personality type
            const currentRuleCounts = {};
            const newRulesByPersonality = {};
            
            safeRules.forEach(rule => {
                const personalityType = rule.personality_type;
                currentRuleCounts[personalityType] = (currentRuleCounts[personalityType] || 0) + 1;
            });
            
            console.log('Current rule counts per personality type:', currentRuleCounts);
            console.log('Previous rule counts per personality type:', lastPersonalityRules);
            
            // Find personality types that actually got new rules
            const personalityTypesWithNewRules = [];
            let totalNewRules = 0;
            
            Object.keys(currentRuleCounts).forEach(personalityType => {
                const currentCount = currentRuleCounts[personalityType];
                const previousCount = lastPersonalityRules[personalityType] || 0;
                const newRulesForThisType = currentCount - previousCount;
                
                if (newRulesForThisType > 0) {
                    personalityTypesWithNewRules.push({
                        type: personalityType,
                        newCount: newRulesForThisType,
                        totalCount: currentCount
                    });
                    totalNewRules += newRulesForThisType;
                }
            });
            
            // Sort by number of new rules (most new rules first)
            personalityTypesWithNewRules.sort((a, b) => b.newCount - a.newCount);
            
            console.log('Personality types with new rules:', personalityTypesWithNewRules);
            
            if (personalityTypesWithNewRules.length > 0) {
                // Show notification modal with the actual personality types that got new rules
                showNotification(
                    personalityTypesWithNewRules.map(p => p.type),
                    totalNewRules,
                    `New recommendation rules have been generated!`,
                    personalityTypesWithNewRules // Pass detailed info for better display
                );
            }
            
            // Clear the flag and update stored data
            localStorage.removeItem('showNewRuleNotifications');
            localStorage.removeItem('lastRuleCount');
            localStorage.setItem('lastPersonalityRules', JSON.stringify(currentRuleCounts));
        }
    }, [safeRules, safePersonalityTypes]); // Run when rules or personality types change



    const handleSubmit = (e) => {
        e.preventDefault();
        
        router.post('/guidance/recommendation-rules', formData, {
            onSuccess: (response) => {
                setShowCreateModal(false);
                
                // Show notification modal for the new rule
                showNotification(
                    [formData.personality_type],
                    1,
                    `New recommendation rule created for ${formData.personality_type}!`
                );
                
                setFormData({
                    personality_type: '',
                    min_score: 75,
                    max_score: 100,
                    recommended_course_ids: []
                });
                window.showAlert('Recommendation rule created successfully', 'success');
            },
            onError: (errors) => {
                window.showAlert('Failed to create recommendation rule', 'error');
            }
        });
    };

    const handleEdit = (rule) => {
        setEditingRule(rule);
        setFormData({
            personality_type: rule.personality_type,
            min_score: rule.min_score,
            max_score: rule.max_score,
            recommended_course_ids: rule.recommended_course_id ? [rule.recommended_course_id] : []
        });
    };

    const handleUpdate = (ruleId) => {
        router.put(`/guidance/recommendation-rules/${ruleId}`, formData, {
            onSuccess: () => {
                // Show notification modal for the updated rule
                showNotification(
                    [formData.personality_type],
                    1,
                    `Recommendation rule updated for ${formData.personality_type}!`
                );
                
                closeEditModal();
                window.showAlert('Recommendation rule updated successfully', 'success');
            },
            onError: (errors) => {
                window.showAlert('Failed to update recommendation rule', 'error');
            }
        });
    };

    const handleDelete = (ruleId) => {
        if (confirm('Are you sure you want to delete this recommendation rule?')) {
            router.delete(`/guidance/recommendation-rules/${ruleId}`, {
                onSuccess: () => {
                    window.showAlert('Recommendation rule deleted successfully', 'success');
                },
                onError: (errors) => {
                    window.showAlert('Failed to delete recommendation rule', 'error');
                }
            });
        }
    };

    const togglePersonalityExpansion = (personalityType) => {
        setExpandedPersonalities(prev => ({
            ...prev,
            [personalityType]: !prev[personalityType]
        }));
    };

    const openEditModal = (rule) => {
        setEditingRule(rule);
        setFormData({
            personality_type: rule.personality_type,
            min_score: rule.min_score,
            max_score: rule.max_score,
            recommended_course_ids: rule.recommended_course_id ? [rule.recommended_course_id] : []
        });
        setShowEditModal(true);
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        setEditingRule(null);
        setFormData({
            personality_type: '',
            min_score: 10,
            max_score: 100,
            recommended_course_ids: []
        });
    };

    const openCreateModal = () => {
        setFormData({
            personality_type: '',
            min_score: 75,
            max_score: 100,
            recommended_course_ids: []
        });
        setShowCreateModal(true);
    };

    const closeCreateModal = () => {
        setShowCreateModal(false);
        setFormData({
            personality_type: '',
            min_score: 75,
            max_score: 100,
            recommended_course_ids: []
        });
    };

    return (
        <Layout user={user}>
            <div className="min-h-screen bg-slate-50 animate-up" style={{ animationDelay: '60ms' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-up" style={{ animationDelay: '120ms' }}>
                    {/* Enhanced Header Section */}
                    <div className="mb-8 rounded-3xl border border-[#1D293D] bg-[#1D293D] text-white shadow-sm overflow-hidden animate-fadeIn animate-up" style={{ animationDelay: '180ms' }}>
                        <div className="px-8 py-8">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center mb-6">
                                        <div className="w-14 h-14 bg-white/10 border border-white/15 rounded-2xl flex items-center justify-center mr-4">
                                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h1 className="text-3xl font-bold mb-2 md:text-4xl">Recommendation Rules</h1>
                                            <p className="text-white/80 text-sm">Intelligent course matching based on personality types and academic performance</p>
                                        </div>
                                    </div>
                                    
                                    {/* Enhanced Stats Grid */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                                        <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-4 shadow-sm">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center mr-3">
                                                    <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold text-[#1D293D]">{safeRules.length}</div>
                                                    <div className="text-xs text-slate-500">Total Rules</div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-4 shadow-sm">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center mr-3">
                                                    <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold text-[#1D293D]">{Object.keys(safeRules.reduce((acc, rule) => ({ ...acc, [rule.personality_type]: true }), {})).length}</div>
                                                    <div className="text-xs text-slate-500">Active Types</div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-4 shadow-sm">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center mr-3">
                                                    <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.75 2.524z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold text-[#1D293D]">{safeCourses.length}</div>
                                                    <div className="text-xs text-slate-500">Available Courses</div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-4 shadow-sm">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center mr-3">
                                                    <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold text-[#1D293D]">{safePersonalityTypes.length}</div>
                                                    <div className="text-xs text-slate-500">Personality Types</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Action Panel */}
                    <div className="mb-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn animate-up" style={{ animationDelay: '220ms' }}>
                        <div className="px-8 py-6 border-b border-slate-200 bg-slate-50">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex items-center mb-4 lg:mb-0">
                                    <div className="w-14 h-14 bg-[#1447E6]/10 rounded-2xl flex items-center justify-center mr-4">
                                        <svg className="w-8 h-8 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-[#1D293D] mb-1">Rule Management Center</h2>
                                        <p className="text-slate-600">Create, manage, and optimize course recommendation rules</p>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={openCreateModal}
                                        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#1447E6] text-white rounded-xl font-semibold transition-colors duration-150 hover:bg-[#1240d0] shadow-sm"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Add New Rule
                                    </button>
                                    
                                    <button
                                        onClick={() => {
                                            // Store current state before generating new rules
                                            const currentRuleCounts = {};
                                            safeRules.forEach(rule => {
                                                const personalityType = rule.personality_type;
                                                currentRuleCounts[personalityType] = (currentRuleCounts[personalityType] || 0) + 1;
                                            });
                                            
                                            localStorage.setItem('lastPersonalityRules', JSON.stringify(currentRuleCounts));
                                            localStorage.setItem('lastRuleCount', safeRules.length.toString());
                                            
                                            router.post('/guidance/generate-all-rules', {}, {
                                                onSuccess: (response) => {
                                                    console.log('Response received:', response);
                                                    console.log('Response props:', response?.props);
                                                    console.log('Response flash:', response?.props?.flash);
                                                    console.log('Response errors:', response?.props?.errors);
                                                    
                                                    // Check if there are any flash messages indicating success
                                                    if (response?.props?.flash?.success) {
                                                        console.log('Success flash message:', response.props.flash.success);
                                                        
                                                        // Set a flag to indicate we should show notifications on next page load
                                                        localStorage.setItem('showNewRuleNotifications', 'true');
                                                        window.showAlert('New recommendation rules added successfully', 'success');
                                                    } else {
                                                        console.log('No success flash message, using fallback');
                                                        localStorage.setItem('showNewRuleNotifications', 'true');
                                                        window.showAlert('New recommendation rules added successfully', 'success');
                                                    }
                                                },
                                                onError: (errors) => {
                                                    window.showAlert('Failed to generate rules', 'error');
                                                }
                                            });
                                        }}
                                        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-600 text-white rounded-xl font-semibold transition-colors duration-150 hover:bg-slate-700 shadow-sm"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        Auto-Generate Rules
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        {/* Smart System Info */}
                        <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 animate-up" style={{ animationDelay: '260ms' }}>
                            <div className="flex items-start">
                                <div className="w-10 h-10 bg-[#1447E6]/10 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                                    <svg className="w-6 h-6 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-[#1D293D] mb-2">Smart Compatibility System</h3>
                                    <p className="text-slate-700 mb-3">
                                        Our intelligent system automatically filters courses based on logical score requirements. 
                                        Courses only appear in score ranges where students can realistically meet the minimum passing rate.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                                            <div className="text-sm font-medium text-[#1D293D] mb-1">Example 1</div>
                                            <div className="text-xs text-slate-600">BSIT (75% passing) → Shows in 75%+ ranges</div>
                                        </div>
                                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                                            <div className="text-sm font-medium text-[#1D293D] mb-1">Example 2</div>
                                            <div className="text-xs text-slate-600">BSBA-FM (80% passing) → Shows in 80%+ ranges</div>
                                        </div>
                                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                                            <div className="text-sm font-medium text-[#1D293D] mb-1">Example 3</div>
                                            <div className="text-xs text-slate-600">BSN Nursing (90% passing) → Shows in 90%+ ranges</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>



                {/* Edit Rule Form */}
                {editingRule && (
                    <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border-l-4 border-green-500 animate-fadeIn">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Recommendation Rule
                        </h2>
                        <form onSubmit={(e) => { e.preventDefault(); handleUpdate(editingRule.id); }} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Personality Type
                                    </label>
                                    <select
                                        value={formData.personality_type}
                                        onChange={(e) => setFormData({...formData, personality_type: e.target.value})}
                                        className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    >
                                        <option value="">Select Personality Type</option>
                                        {safePersonalityTypes.map((type) => (
                                            <option key={type.type} value={type.type}>
                                                {type.type} - {type.title || ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Recommended Courses
                                    </label>
                                    <div className="border border-slate-300 rounded-md p-3 max-h-48 overflow-y-auto">
                                        {safeCourses.map((course) => (
                                            <label key={course.id} className="flex items-center space-x-3 py-2">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.recommended_course_ids.includes(course.id.toString())}
                                                    onChange={(e) => {
                                                        const courseId = course.id.toString();
                                                        if (e.target.checked) {
                                                            setFormData({
                                                                ...formData,
                                                                recommended_course_ids: [...formData.recommended_course_ids, courseId]
                                                            });
                                                        } else {
                                                            setFormData({
                                                                ...formData,
                                                                recommended_course_ids: formData.recommended_course_ids.filter(id => id !== courseId)
                                                            });
                                                        }
                                                    }}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                                                />
                                                <span className="text-sm text-slate-900">
                                                {course.course_code || ''} - {course.course_name || ''}
                                                </span>
                                                <span className="text-xs text-green-600 font-medium">
                                                    ({course.passing_rate || 80}%)
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">Select courses to recommend for this personality type</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Minimum Score (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.min_score}
                                        onChange={(e) => setFormData({...formData, min_score: parseInt(e.target.value)})}
                                        className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        min="10"
                                        max="100"
                                        required
                                    />
                                    <p className="text-sm text-slate-500 mt-1">Minimum score range: 10% - 100%</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Maximum Score (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.max_score}
                                        onChange={(e) => setFormData({...formData, max_score: parseInt(e.target.value)})}
                                        className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        min="0"
                                        max="100"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingRule(null);
                                        setFormData({
                                            personality_type: '',
                                            min_score: 10,
                                            max_score: 100,
                                            recommended_course_ids: []
                                        });
                                    }}
                                    className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                >
                                    Update Rule
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                    {/* Enhanced Rules List */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn animate-up" style={{ animationDelay: '300ms' }}>
                        <div className="px-8 py-6 border-b border-slate-200 bg-slate-50 animate-up" style={{ animationDelay: '320ms' }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="w-12 h-12 bg-[#1447E6]/10 rounded-2xl flex items-center justify-center mr-4">
                                        <svg className="w-7 h-7 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-[#1D293D] mb-1">Personality-Based Rules</h3>
                                        <p className="text-slate-600">Intelligent course recommendations organized by personality types</p>
                                    </div>
                                </div>
                                
                                {/* Quick Stats */}
                                <div className="hidden lg:flex items-center space-x-6">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-[#1D293D]">{Object.keys(safeRules.reduce((acc, rule) => ({ ...acc, [rule.personality_type]: true }), {})).length}</div>
                                        <div className="text-xs text-slate-500">Active Types</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-[#1D293D]">{safeRules.length}</div>
                                        <div className="text-xs text-slate-500">Total Rules</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    
                    {(() => {
                        // Group rules by personality type
                        const groupedRules = {};
                        safeRules.forEach(rule => {
                            const personalityType = typeof rule.personality_type === 'object' ? rule.personality_type.type : String(rule.personality_type || '');
                            if (!groupedRules[personalityType]) {
                                groupedRules[personalityType] = [];
                            }
                            groupedRules[personalityType].push(rule);
                        });

                                                return Object.keys(groupedRules).length > 0 ? (
                            <div className="p-6 space-y-4 animate-up" style={{ animationDelay: '340ms' }}>
                                {Object.entries(groupedRules).map(([personalityType, rules], idx) => {
                                    const personalityTypeInfo = safePersonalityTypes.find(t => t.type === personalityType);
                                    const isExpanded = expandedPersonalities[personalityType];
                                    
                                    // Compute visible (compatible) course count across all rules for this personality
                                    const totalVisible = rules.filter(rule => {
                                        if (!rule.recommended_course) return false;
                                        const minScore = Math.min(rule.min_score, rule.max_score);
                                        const coursePassingRate = rule.recommended_course.passing_rate || 80;
                                        return isCourseCompatibleWithScoreRange(coursePassingRate, minScore, Math.max(rule.min_score, rule.max_score));
                                    }).length;

                                    return (
                                        <div key={personalityType} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden animate-fadeIn animate-up" style={{ animationDelay: `${160 + idx * 80}ms` }}>
                                            {/* Enhanced Personality Type Header */}
                                            <button
                                                onClick={() => togglePersonalityExpansion(personalityType)}
                                                className="w-full p-6 bg-slate-50 hover:bg-[#1447E6]/5 transition-all duration-300 flex items-center justify-between border-l-4 border-[#1447E6] group"
                                            >
                                                <div className="flex items-center flex-1">
                                                    <div className="w-12 h-12 bg-[#1447E6] rounded-2xl flex items-center justify-center mr-4 group-hover:scale-105 transition-transform duration-300">
                                                        <span className="text-white font-bold text-lg">{personalityType}</span>
                                                    </div>
                                                    
                                                    <div className="flex-1">
                                                        <div className="flex items-center mb-2 flex-wrap gap-2">
                                                            <h4 className="text-xl font-bold text-[#1D293D]">
                                                                {personalityTypeInfo?.title || 'Unknown Type'}
                                                            </h4>
                                                            <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                                                                {personalityType}
                                                            </span>
                                                            {/* Display academic year if available - show unique academic years from rules */}
                                                            {(() => {
                                                                const academicYears = [...new Set(rules.map(r => r.academic_year).filter(Boolean))];
                                                                return academicYears.length > 0 && (
                                                                    <span className="inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-700 border border-blue-300">
                                                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                        </svg>
                                                                        {academicYears.length === 1 ? academicYears[0] : `${academicYears.length} Academic Years`}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                        
                                                        {personalityTypeInfo?.description && (
                                                            <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                                                                {personalityTypeInfo.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center space-x-4 ml-4">
                                                    <div className="text-right">
                                                        <div className="text-lg font-bold text-[#1D293D]">{totalVisible}</div>
                                                        <div className="text-xs text-slate-500">visible courses</div>
                                                    </div>
                                                    
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:bg-[#1447E6]/10 transition-colors duration-300">
                                                        <svg 
                                                            className={`w-6 h-6 text-slate-500 group-hover:text-[#1447E6] transition-all duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                                            fill="none" 
                                                            stroke="currentColor" 
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </button>

                                            {/* Enhanced Collapsible Content */}
                                            {isExpanded && (
                                                <div className="p-6 bg-slate-50 border-t border-slate-200">
                                                    {/* Score Range Groups */}
                                                    {(() => {
                                                        const scoreGroups = {};
                                                        rules.forEach(rule => {
                                                            const low = Math.min(rule.min_score, rule.max_score);
                                                            const high = Math.max(rule.min_score, rule.max_score);
                                                            const scoreRange = `${low}%-${high}%`;
                                                            if (!scoreGroups[scoreRange]) {
                                                                scoreGroups[scoreRange] = [];
                                                            }
                                                            scoreGroups[scoreRange].push(rule);
                                                        });

                                                        return (
                                                            <div className="space-y-6">
                                                                {Object.entries(scoreGroups).map(([scoreRange, scoreRules]) => {
                                                                    // Extract min and max scores from the range string
                                                                    const [minScoreStr, maxScoreStr] = scoreRange.replace('%', '').split('-');
                                                                    const minScore = parseInt(minScoreStr);
                                                                    const maxScore = parseInt(maxScoreStr);
                                                                    
                                                                    // Determine which rules are compatible with this score range
                                                                    const compatibleRules = scoreRules.filter(rule => {
                                                                        if (!rule.recommended_course) return false;
                                                                        const coursePassingRate = rule.recommended_course.passing_rate || 80;
                                                                        return isCourseCompatibleWithScoreRange(coursePassingRate, minScore, maxScore);
                                                                    });

                                                                    // Skip this score range if no compatible courses
                                                                    if (compatibleRules.length === 0) {
                                                                        return null;
                                                                    }

                                                                    return (
                                                                        <div key={scoreRange} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                                                            {/* Score Range Header */}
                                                                            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                                                                                <div className="flex items-center justify-between">
                                                                                    <div className="flex items-center">
                                                                                        <div className="w-10 h-10 bg-[#1447E6] rounded-xl flex items-center justify-center mr-3">
                                                                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                                                            </svg>
                                                                                        </div>
                                                                                        <div>
                                                                                            <h5 className="text-lg font-bold text-[#1D293D]">Score Range: {scoreRange}</h5>
                                                                                            <p className="text-sm text-slate-600">Courses compatible with this score range</p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex items-center space-x-3">
                                                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                                                                                            {compatibleRules.length} course{compatibleRules.length !== 1 ? 's' : ''}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                                
                                                                                {/* Smart Compatibility Info */}
                                                                                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                                                                    <div className="flex items-center">
                                                                                        <svg className="w-5 h-5 text-[#1447E6] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                                        </svg>
                                                                                        <span className="text-sm font-medium text-[#1D293D]">
                                                                                            Smart Filter: Only showing courses where student score ({minScore}%+) meets course minimum requirement
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            {/* Enhanced Course Cards */}
                                                                            <div className="p-6">
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                                    {compatibleRules.map((rule) => (
                                                                                        <div key={rule.id} className="group bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-[#1447E6]/30 transition-all duration-300">
                                                                                            <div className="flex items-start justify-between mb-3">
                                                                                                <div className="flex-1">
                                                                                                    <div className="flex items-center mb-2">
                                                                                                        <div className="w-8 h-8 bg-[#1447E6] rounded-lg flex items-center justify-center mr-3">
                                                                                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                                                                            </svg>
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <div className="font-bold text-[#1D293D] text-sm">
                                                                                                                {rule.recommended_course?.course_code || 'N/A'}
                                                                                                            </div>
                                                                                                            <div className="text-xs text-slate-500">
                                                                                                                {rule.recommended_course?.course_name || 'N/A'}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    
                                                                    {/* Course Tags */}
                                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                                        {rule.academic_year && (
                                                                            <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 border border-blue-300">
                                                                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                                </svg>
                                                                                {rule.academic_year}
                                                                            </span>
                                                                        )}
                                                                        <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
                                                                            {rule.recommended_course?.passing_rate || 80}% passing
                                                                        </span>
                                                                        <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
                                                                            {scoreRange}
                                                                        </span>
                                                                    </div>
                                                                                                    
                                                                                                    {/* Compatibility Indicator */}
                                                                                                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                                                                                                        <div className="flex items-center">
                                                                                                            <svg className="w-4 h-4 text-[#1447E6] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                                                            </svg>
                                                                                                            <span className="text-xs font-medium text-[#1D293D]">
                                                                                                                Compatible: Student {minScore}%+ meets {rule.recommended_course?.passing_rate || 80}% requirement
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                                
                                                                                                {/* Action Buttons */}
                                                                                                <div className="flex flex-col space-y-2 ml-3">
                                                                                                    <button
                                                                                                        onClick={() => openEditModal(rule)}
                                                                                                        className="group/btn inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#1447E6]/10 text-[#1447E6] hover:bg-[#1447E6]/20 transition-all duration-200"
                                                                                                        title="Edit Rule"
                                                                                                    >
                                                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                                                        </svg>
                                                                                                    </button>
                                                                                                    <button
                                                                                                        onClick={() => handleDelete(rule.id)}
                                                                                                        className="group/btn inline-flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all duration-200"
                                                                                                        title="Delete Rule"
                                                                                                    >
                                                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                                                        </svg>
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-20 px-8">
                                <div className="max-w-2xl mx-auto">
                                    {/* Enhanced Empty State */}
                                    <div className="mb-8">
                                        <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                            <svg className="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-3xl font-bold text-[#1D293D] mb-4">No Recommendation Rules Found</h3>
                                        <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                                            Get started by automatically generating intelligent recommendation rules based on your courses and personality types. 
                                            Our AI system will analyze course content and create compatible rules without affecting existing ones.
                                        </p>
                                    </div>
                                    
                                    {/* Action Button */}
                                    <div className="mb-8">
                                        <button
                                            onClick={() => {
                                                // Store current state before generating new rules
                                                const currentRuleCounts = {};
                                                safeRules.forEach(rule => {
                                                    const personalityType = rule.personality_type;
                                                    currentRuleCounts[personalityType] = (currentRuleCounts[personalityType] || 0) + 1;
                                                });
                                                
                                                localStorage.setItem('lastPersonalityRules', JSON.stringify(currentRuleCounts));
                                                localStorage.setItem('lastRuleCount', safeRules.length.toString());
                                                
                                                router.post('/guidance/generate-all-rules', {}, {
                                                    onSuccess: (response) => {
                                                        console.log('Response received (second button):', response);
                                                        console.log('Response props (second button):', response?.props);
                                                        console.log('Response flash (second button):', response?.props?.flash);
                                                        console.log('Response errors (second button):', response?.props?.errors);
                                                        
                                                        // Check if there are any flash messages indicating success
                                                        if (response?.props?.flash?.success) {
                                                            console.log('Success flash message (second button):', response.props.flash.success);
                                                            
                                                            // Set a flag to indicate we should show notifications on next page load
                                                            localStorage.setItem('showNewRuleNotifications', 'true');
                                                            window.showAlert('New recommendation rules added successfully!', 'success');
                                                        } else {
                                                            console.log('No success flash message (second button), using fallback');
                                                            localStorage.setItem('showNewRuleNotifications', 'true');
                                                            window.showAlert('New recommendation rules added successfully!', 'success');
                                                        }
                                                    },
                                                    onError: (errors) => {
                                                        window.showAlert('Failed to generate rules', 'error');
                                                    }
                                                });
                                            }}
                                            className="inline-flex items-center px-10 py-5 bg-[#1447E6] text-white rounded-2xl font-bold text-lg transition-colors duration-150 hover:bg-[#1240d0] shadow-sm"
                                        >
                                            <svg className="w-6 h-6 mr-3 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            <span className="relative z-10">Generate Smart Rules</span>
                                        </button>
                                    </div>
                                    
                                    {/* Features Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-300">
                                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                </svg>
                                            </div>
                                            <h4 className="text-lg font-bold text-[#1D293D] mb-2">Smart Analysis</h4>
                                            <p className="text-sm text-slate-600">Analyzes course content and personality compatibility using advanced AI algorithms</p>
                                        </div>
                                        
                                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-300">
                                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                            </div>
                                            <h4 className="text-lg font-bold text-[#1D293D] mb-2">Score Ranges</h4>
                                            <p className="text-sm text-slate-600">Creates rules for multiple score ranges (10-39%, 40-69%, 70-100%) automatically</p>
                                        </div>
                                        
                                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-300">
                                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                                                </svg>
                                            </div>
                                            <h4 className="text-lg font-bold text-[#1D293D] mb-2">Personality Match</h4>
                                            <p className="text-sm text-slate-600">Only generates rules for compatible personality types based on course content</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                    </div>
                </div>
            </div>

            {/* Edit Rule Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-clear bg-opacity-20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-[#1D293D] px-8 py-6 text-white">
                            <h3 className="text-lg font-semibold">Edit Recommendation Rule</h3>
                            <button
                                onClick={closeEditModal}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="px-8 py-6">
                            <form onSubmit={(e) => { e.preventDefault(); handleUpdate(editingRule.id); }} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Personality Type
                                        </label>
                                        <select
                                            value={formData.personality_type}
                                            onChange={(e) => setFormData({...formData, personality_type: e.target.value})}
                                            className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        >
                                            <option value="">Select Personality Type</option>
                                            {safePersonalityTypes.map((type) => (
                                                <option key={type.type} value={type.type}>
                                                    {type.type} - {type.title || ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Recommended Courses
                                            <span className="text-xs text-slate-500 ml-2">
                                                ({formData.recommended_course_ids.length} selected)
                                            </span>
                                        </label>
                                        <div className="border border-slate-300 rounded-md p-3 max-h-48 overflow-y-auto">
                                            {safeCourses.length > 0 ? (
                                                <div className="space-y-2">
                                                    {safeCourses.map((course) => (
                                                        <label key={course.id} className="flex items-center space-x-3 py-2 hover:bg-slate-50 rounded px-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.recommended_course_ids.includes(course.id.toString())}
                                                                onChange={(e) => {
                                                                    const courseId = course.id.toString();
                                                                    if (e.target.checked) {
                                                                        setFormData({
                                                                            ...formData,
                                                                            recommended_course_ids: [...formData.recommended_course_ids, courseId]
                                                                        });
                                                                    } else {
                                                                        setFormData({
                                                                            ...formData,
                                                                            recommended_course_ids: formData.recommended_course_ids.filter(id => id !== courseId)
                                                                        });
                                                                    }
                                                                }}
                                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-sm font-medium text-slate-900 truncate">
                                                                    {course.course_code || ''} - {course.course_name || ''}
                                                                </div>
                                                                <div className="text-xs text-slate-500 truncate">
                                                                    {course.description || 'No description available'}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                                                                    ({course.passing_rate || 80}%)
                                                                </span>
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-4 text-slate-500">
                                                    <p className="text-sm">No courses available</p>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500 mt-1">
                                            Select courses that would be suitable for students with this personality type
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Minimum Score (%)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.min_score}
                                            onChange={(e) => setFormData({...formData, min_score: parseInt(e.target.value)})}
                                            className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            min="10"
                                            max="100"
                                            required
                                        />
                                        <p className="text-sm text-slate-500 mt-1">Minimum score range: 10% - 100%</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Maximum Score (%)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.max_score}
                                            onChange={(e) => setFormData({...formData, max_score: parseInt(e.target.value)})}
                                            className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            min="0"
                                            max="100"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                {/* Summary of what will be updated */}
                                {formData.personality_type && formData.recommended_course_ids.length > 0 && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div className="flex items-start">
                                            <svg className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div>
                                                <h3 className="text-sm font-medium text-green-800">Update Summary</h3>
                                                <p className="text-sm text-green-700 mt-1">
                                                    This will update the recommendation rule for <strong>{formData.personality_type}</strong> personality type with score range <strong>{formData.min_score}% - {formData.max_score}%</strong>.
                                                </p>
                                                <div className="mt-2 text-xs text-green-600">
                                                    Selected courses: {formData.recommended_course_ids.map(id => {
                                                        const course = safeCourses.find(c => c.id.toString() === id);
                                                        return course ? course.course_code :'';
                                                    }).join(', ')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={closeEditModal}
                                        className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!formData.personality_type || formData.recommended_course_ids.length === 0}
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                                    >
                                        Update Rule
                                    </button>
                                </div>
                            </form>
                            </div>
                    </div>
                </div>
            )}

            {/* Create Rule Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-clear bg-opacity-20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-[#1D293D] px-8 py-6 text-white">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add Recommendation Rule
                            </h2>
                            <button
                                onClick={closeCreateModal}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="px-8 py-6">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                            <div className="flex items-start">
                                <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <h3 className="text-sm font-medium text-[#1D293D]">How it works</h3>
                                    <p className="text-sm text-slate-600 mt-1">
                                        Select a personality type and choose multiple courses that would be suitable for students with that personality. 
                                        The system will create separate rules for each course with the specified score range. Use "Add Missing Rules" to automatically add rules for new courses.
                                    </p>
                                </div>
                            </div>
                            </div>
                        
                            <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Personality Type
                                        {(() => {
                                            const personalityTypesWithRules = new Set(safeRules.map(rule => rule.personality_type));
                                            const missingPersonalityTypes = safePersonalityTypes.filter(type => !personalityTypesWithRules.has(type.type));
                                            
                                            if (missingPersonalityTypes.length > 0) {
                                                return (
                                                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        {missingPersonalityTypes.length} missing
                                                    </span>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </label>
                                    <select
                                        value={formData.personality_type}
                                        onChange={(e) => setFormData({...formData, personality_type: e.target.value})}
                                        className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    >
                                        <option value="">Select Personality Type</option>
                                        {(() => {
                                            // Find personality types that don't have any rules
                                            const personalityTypesWithRules = new Set(safeRules.map(rule => rule.personality_type));
                                            const missingPersonalityTypes = safePersonalityTypes.filter(type => !personalityTypesWithRules.has(type.type));
                                            const personalityTypesWithRulesList = safePersonalityTypes.filter(type => personalityTypesWithRules.has(type.type));
                                            
                                            return (
                                                <>
                                                    {/* Missing personality types at the top */}
                                                    {missingPersonalityTypes.length > 0 && (
                                                        <optgroup label="⚠️ Missing Rules - Add These First">
                                                            {missingPersonalityTypes.map((type) => (
                                                                <option key={type.type} value={type.type} className="text-red-600 font-semibold">
                                                                    🔴 {type.type} - {type.title} (No Rules)
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    )}
                                                    
                                                    {/* Personality types that already have rules */}
                                                    {personalityTypesWithRulesList.length > 0 && (
                                                        <optgroup label="✅ Already Have Rules">
                                                            {personalityTypesWithRulesList.map((type) => (
                                                                <option key={type.type} value={type.type}>
                                                                    {type.type} - {type.title}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </select>
                                    {(() => {
                                        const personalityTypesWithRules = new Set(safeRules.map(rule => rule.personality_type));
                                        const missingPersonalityTypes = safePersonalityTypes.filter(type => !personalityTypesWithRules.has(type.type));
                                        
                                        if (missingPersonalityTypes.length > 0) {
                                            return (
                                                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                                    <div className="flex items-start">
                                                        <svg className="w-4 h-4 text-amber-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                        </svg>
                                                        <div className="text-xs text-amber-700">
                                                            <strong>Tip:</strong> {missingPersonalityTypes.length} personality type{missingPersonalityTypes.length !== 1 ? 's' : ''} don't have any rules yet. 
                                                            Consider adding rules for these types first to ensure all students receive course recommendations.
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Recommended Courses
                                        <span className="text-xs text-slate-500 ml-2">
                                            ({formData.recommended_course_ids.length} selected)
                                        </span>
                                    </label>
                                    <div className="border border-slate-300 rounded-md p-3 max-h-48 overflow-y-auto">
                                        {safeCourses.length > 0 ? (
                                            <div className="space-y-2">
                                                {safeCourses.map((course) => (
                                                    <label key={course.id} className="flex items-center space-x-3 py-2 hover:bg-slate-50 rounded px-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.recommended_course_ids.includes(course.id.toString())}
                                                            onChange={(e) => {
                                                                const courseId = course.id.toString();
                                                                if (e.target.checked) {
                                                                    setFormData({
                                                                        ...formData,
                                                                        recommended_course_ids: [...formData.recommended_course_ids, courseId]
                                                                    });
                                                                } else {
                                                                    setFormData({
                                                                        ...formData,
                                                                        recommended_course_ids: formData.recommended_course_ids.filter(id => id !== courseId)
                                                                    });
                                                                }
                                                            }}
                                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-medium text-slate-900 truncate">
                                                                {course.course_code} - {course.course_name}
                                                            </div>
                                                            <div className="text-xs text-slate-500 truncate">
                                                                {course.description || 'No description available'}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                                                                {course.passing_rate || 80}%
                                                            </span>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 text-slate-500">
                                                <svg className="mx-auto h-8 w-8 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                </svg>
                                                <p className="text-sm">No courses available</p>
                                                <p className="text-xs text-slate-400">Add courses in Course Management first</p>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Select courses that would be suitable for students with this personality type
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Minimum Score (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.min_score}
                                        onChange={(e) => setFormData({...formData, min_score: parseInt(e.target.value)})}
                                        className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        min="10"
                                        max="100"
                                        required
                                    />
                                    <p className="text-sm text-slate-500 mt-1">Minimum score range: 10% - 100%</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Maximum Score (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.max_score}
                                        onChange={(e) => setFormData({...formData, max_score: parseInt(e.target.value)})}
                                        className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        min="0"
                                        max="100"
                                        required
                                    />
                                </div>
                            </div>
                            {/* Summary of what will be created */}
                            {formData.personality_type && formData.recommended_course_ids.length > 0 && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <svg className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div>
                                            <h3 className="text-sm font-medium text-green-800">Summary</h3>
                                            <p className="text-sm text-green-700 mt-1">
                                                This will create <strong>{formData.recommended_course_ids.length} recommendation rule{formData.recommended_course_ids.length !== 1 ? 's' : ''}</strong> for 
                                                <strong> {formData.personality_type}</strong> personality type with score range <strong>{formData.min_score}% - {formData.max_score}%</strong>.
                                            </p>
                                            <div className="mt-2 text-xs text-green-600">
                                                Selected courses: {formData.recommended_course_ids.map(id => {
                                                    const course = safeCourses.find(c => c.id.toString() === id);
                                                    return course ? course.course_code : 'Unknown';
                                                }).join(', ')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeCreateModal}
                                    className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!formData.personality_type || formData.recommended_course_ids.length === 0}
                                    className="px-4 py-2 bg-[#1447E6] text-white rounded-md hover:bg-[#1240d0] disabled:bg-slate-400 disabled:cursor-not-allowed"
                                >
                                    Add {formData.recommended_course_ids.length > 0 ? `${formData.recommended_course_ids.length} Rule${formData.recommended_course_ids.length !== 1 ? 's' : ''}` : 'Rule'}
                                </button>
                            </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Modal */}
            {showNotificationModal && (
                <div className="fixed top-4 right-4 z-50 animate-fadeIn">
                    <div className="bg-white rounded-lg shadow-2xl border-l-4 border-green-500 p-6 max-w-sm w-full">
                        {/* Header with close button */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900">New Rules Added!</h3>
                            </div>
                            <button
                                onClick={() => setShowNotificationModal(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        {/* Content */}
                        <div className="space-y-3">
                            <p className="text-slate-700">{notificationData.message}</p>
                            
                            <div className="bg-green-50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-green-800">Personality Types with New Rules:</span>
                                    <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                                        {notificationData.personalityTypes.length}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {notificationData.detailedInfo ? (
                                        // Show detailed breakdown with counts
                                        notificationData.detailedInfo.map((personality, index) => {
                                            const personalityInfo = safePersonalityTypes.find(p => p.type === personality.type);
                                            return (
                                                <div key={index} className="flex items-center justify-between bg-white rounded-lg p-2 border border-green-200">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            {personality.type}
                                                        </span>
                                                        <span className="text-xs text-slate-600">
                                                            {personalityInfo?.title || 'Unknown Type'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-xs text-green-600 font-medium">
                                                            +{personality.newCount} new
                                                        </span>
                                                        <span className="text-xs text-slate-500">
                                                            ({personality.totalCount} total)
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        // Fallback to simple display
                                        <div className="flex flex-wrap gap-2">
                                            {notificationData.personalityTypes.map((type, index) => (
                                                <span 
                                                    key={index}
                                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                                                >
                                                    {type}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="bg-blue-50 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-blue-800">Total New Rules:</span>
                                    <span className="text-lg font-bold text-blue-600">{notificationData.courseCount}</span>
                                </div>
                                {notificationData.detailedInfo && (
                                    <div className="mt-2 text-xs text-blue-600">
                                        Rules distributed across {notificationData.personalityTypes.length} personality types
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Auto-close indicator */}
                        <div className="mt-4 pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>Auto-closes in:</span>
                                <div className="flex items-center space-x-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span>30 seconds</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.6s ease-out;
                }
                
                @keyframes slideInUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slideInUp {
                    animation: slideInUp 0.8s ease-out;
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                .animate-pulse {
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                
                @keyframes bounce {
                    0%, 100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
                    50% { transform: translateY(0); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
                }
                .animate-bounce {
                    animation: bounce 1s infinite;
                }
                
                @keyframes shimmer {
                    0% { background-position: -200px 0; }
                    100% { background-position: calc(200px + 100%) 0; }
                }
                .animate-shimmer {
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200px 100%;
                    animation: shimmer 1.5s infinite;
                }
                
                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                
                .line-clamp-3 {
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                
                /* Custom scrollbar */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
                }
                
                /* Glass morphism effect */
                .glass {
                    background: rgba(255, 255, 255, 0.25);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.18);
                }
                
                /* Gradient text */
                .gradient-text {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
            `}</style>
        </Layout>
    );
};

export default RecommendationRulesManagement;