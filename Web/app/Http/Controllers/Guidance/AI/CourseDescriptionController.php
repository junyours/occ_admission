<?php

namespace App\Http\Controllers\Guidance\AI;

use Illuminate\Http\Request;
use App\Models\CourseDescription;
use App\Http\Controllers\Controller;

class CourseDescriptionController extends Controller
{
    /**
     * Generate a description for a course based on its name
     */
    public function generateDescription(Request $request)
    {
        $request->validate([
            'course_name' => 'required|string|max:255'
        ]);

        $courseName = $request->input('course_name');
        
        // First try to get stored descriptions from database
        $storedDescriptions = CourseDescription::where('course_name', $courseName)
            ->orWhere('course_name', 'LIKE', '%' . $courseName . '%')
            ->orWhere('course_name', 'LIKE', '%' . strtolower($courseName) . '%')
            ->orWhere('course_name', 'LIKE', '%' . strtoupper($courseName) . '%')
            ->orderBy('is_manual', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        if ($storedDescriptions->count() > 0) {
            // Get a random description from stored ones
            $randomDescription = $storedDescriptions->random();
            $description = $randomDescription->description;
        } else {
            // Generate a new description if none stored
            $description = CourseDescription::generateRandomDescription($courseName);
        }

        return response()->json([
            'success' => true,
            'description' => $description,
            'course_name' => $courseName,
            'total_descriptions' => $storedDescriptions->count() > 0 ? $storedDescriptions->count() : 50
        ]);
    }

    /**
     * Store a description for a course
     */
    public function storeDescription(Request $request)
    {
        $request->validate([
            'course_name' => 'required|string|max:255',
            'description' => 'required|string',
            'is_manual' => 'boolean'
        ]);

        $courseDescription = CourseDescription::storeDescription(
            $request->input('course_name'),
            $request->input('description'),
            $request->input('is_manual', false)
        );

        return response()->json([
            'success' => true,
            'message' => 'Course description stored successfully',
            'data' => $courseDescription
        ]);
    }

    /**
     * Get all course descriptions for management
     */
    public function index()
    {
        $descriptions = CourseDescription::orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'descriptions' => $descriptions
        ]);
    }

    /**
     * Update a course description
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'course_name' => 'required|string|max:255',
            'description' => 'required|string',
            'is_manual' => 'boolean'
        ]);

        $courseDescription = CourseDescription::findOrFail($id);
        $courseDescription->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Course description updated successfully',
            'data' => $courseDescription
        ]);
    }

    /**
     * Delete a course description
     */
    public function destroy($id)
    {
        $courseDescription = CourseDescription::findOrFail($id);
        $courseDescription->delete();

        return response()->json([
            'success' => true,
            'message' => 'Course description deleted successfully'
        ]);
    }

    /**
     * Get statistics about course descriptions
     */
    public function getStats()
    {
        $stats = [
            'total_descriptions' => CourseDescription::count(),
            'manual_descriptions' => CourseDescription::manual()->count(),
            'auto_descriptions' => CourseDescription::where('is_manual', false)->count()
        ];

        return response()->json([
            'success' => true,
            'stats' => $stats
        ]);
    }
}
