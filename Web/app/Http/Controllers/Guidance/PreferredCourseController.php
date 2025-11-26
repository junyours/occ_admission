<?php

namespace App\Http\Controllers\Guidance;

use App\Http\Controllers\Controller;
use App\Models\PreferredCourse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class PreferredCourseController extends Controller
{
    /**
     * Display preferred course analytics collected from examinee registrations.
     */
    public function index()
    {
        $user = Auth::user();
        $guidanceCounselor = $user->guidanceCounselor;

        $data = $this->collectCourseData();

        return Inertia::render('Guidance/PreferredCourses', [
            'user' => $user,
            'guidanceCounselor' => $guidanceCounselor,
            'stats' => [
                'totalSelections' => $data['stats']['totalSelections'],
                'distinctCourses' => $data['stats']['distinctCourses'],
                'lastUpdated' => optional($data['stats']['lastUpdated'])->toIso8601String(),
                'topCourse' => $data['stats']['topCourse'] ? [
                    'course_name' => $data['stats']['topCourse']['course_name'],
                    'count' => $data['stats']['topCourse']['count'],
                    'last_selected' => optional($data['stats']['topCourse']['last_selected'])->toIso8601String(),
                ] : null,
            ],
            'courses' => array_map(fn ($course) => [
                'course_name' => $course['course_name'],
                'count' => $course['count'],
                'last_selected' => optional($course['last_selected'])->toIso8601String(),
            ], $data['courses']),
            'trend' => PreferredCourse::selectRaw('DATE(created_at) as selection_date, COUNT(*) as total')
                ->where('created_at', '>=', now()->subDays(30))
                ->groupBy('selection_date')
                ->orderBy('selection_date')
                ->get()
                ->map(fn ($item) => [
                    'date' => $item->selection_date,
                    'count' => (int) $item->total,
                ]),
            'recentSelections' => array_map(fn ($entry) => [
                'course_name' => $entry['course_name'],
                'created_at' => optional($entry['created_at'])->toIso8601String(),
            ], $data['recentSelections']),
        ]);
    }

    /**
     * Collect preferred course data for reporting.
     *
     * @return array{stats: array<string, mixed>, courses: array<int, array<string, mixed>>, recentSelections: array<int, array<string, mixed>>}
     */
    protected function collectCourseData(): array
    {
        $courseStats = PreferredCourse::selectRaw('LOWER(course_name) as course_key, MIN(course_name) as display_name, COUNT(*) as total, MAX(created_at) as last_selected')
            ->groupBy(DB::raw('LOWER(course_name)'))
            ->orderByDesc('total')
            ->get();

        $totalSelections = $courseStats->sum('total');
        $distinctCourses = $courseStats->count();
        $topCourse = $courseStats->first();

        $courses = $courseStats->map(fn ($course) => [
            'course_name' => $course->display_name,
            'count' => (int) $course->total,
            'last_selected' => $course->last_selected ? Carbon::parse($course->last_selected) : null,
        ])->toArray();

        $recentSelections = PreferredCourse::orderByDesc('created_at')
            ->take(15)
            ->get()
            ->map(fn ($record) => [
                'course_name' => $record->course_name,
                'created_at' => optional($record->created_at),
            ])->toArray();

        return [
            'stats' => [
                'totalSelections' => $totalSelections,
                'distinctCourses' => $distinctCourses,
                'lastUpdated' => now(),
                'topCourse' => $topCourse ? [
                    'course_name' => $topCourse->display_name,
                    'count' => (int) $topCourse->total,
                    'last_selected' => $topCourse->last_selected ? Carbon::parse($topCourse->last_selected) : null,
                ] : null,
            ],
            'courses' => $courses,
            'recentSelections' => $recentSelections,
        ];
    }
}

