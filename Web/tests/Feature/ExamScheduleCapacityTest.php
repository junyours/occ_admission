<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Examinee;
use App\Models\ExamineeRegistration;
use App\Models\ExamSchedule;
use App\Models\ExamRegistrationSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ExamScheduleCapacityTest extends TestCase
{
    use RefreshDatabase;

    public function test_cannot_assign_student_to_full_schedule()
    {
        // Create a guidance counselor user
        $guidanceUser = User::factory()->create(['role' => 'guidance_counselor']);
        
        // Create an examinee
        $examinee = Examinee::create([
            'accountId' => User::factory()->create(['role' => 'student'])->id,
            'name' => 'Test Student',
            'phone' => '1234567890',
            'address' => 'Test Address',
            'school_name' => 'Test School',
            'parent_name' => 'Test Parent',
            'parent_phone' => '0987654321',
            // parent_email removed
        ]);

        // Create a registration
        $registration = ExamineeRegistration::create([
            'examinee_id' => $examinee->id,
            'status' => 'registered',
            'registration_date' => now()->toDateString(),
        ]);

        // Create a full schedule (capacity 1, already has 1 student)
        $schedule = ExamSchedule::create([
            'exam_date' => now()->addDays(2)->toDateString(),
            'start_time' => '08:00:00',
            'end_time' => '16:00:00',
            'max_capacity' => 1,
            'current_registrations' => 1,
            'status' => 'full'
        ]);

        // Try to assign the student to the full schedule
        $response = $this->actingAs($guidanceUser)
            ->put("/guidance/update-exam-date/{$registration->id}", [
                'assigned_exam_date' => $schedule->exam_date
            ]);

        // Should get an error
        $response->assertSessionHasErrors(['error']);
        $this->assertStringContainsString('already full', session('errors')->first('error')[0]);
    }

    public function test_can_assign_student_to_available_schedule()
    {
        // Create a guidance counselor user
        $guidanceUser = User::factory()->create(['role' => 'guidance_counselor']);
        
        // Create an examinee
        $examinee = Examinee::create([
            'accountId' => User::factory()->create(['role' => 'student'])->id,
            'name' => 'Test Student',
            'phone' => '1234567890',
            'address' => 'Test Address',
            'school_name' => 'Test School',
            'parent_name' => 'Test Parent',
            'parent_phone' => '0987654321',
            // parent_email removed
        ]);

        // Create a registration
        $registration = ExamineeRegistration::create([
            'examinee_id' => $examinee->id,
            'status' => 'registered',
            'registration_date' => now()->toDateString(),
        ]);

        // Create an available schedule (capacity 2, has 1 student)
        $schedule = ExamSchedule::create([
            'exam_date' => now()->addDays(2)->toDateString(),
            'start_time' => '08:00:00',
            'end_time' => '16:00:00',
            'max_capacity' => 2,
            'current_registrations' => 1,
            'status' => 'open'
        ]);

        // Try to assign the student to the available schedule
        $response = $this->actingAs($guidanceUser)
            ->put("/guidance/update-exam-date/{$registration->id}", [
                'assigned_exam_date' => $schedule->exam_date
            ]);

        // Should succeed
        $response->assertSessionHas('success');
        
        // Check that the registration was updated
        $registration->refresh();
        $this->assertEquals($schedule->exam_date, $registration->assigned_exam_date);
        $this->assertEquals('assigned', $registration->status);
        
        // Check that the schedule capacity was incremented
        $schedule->refresh();
        $this->assertEquals(2, $schedule->current_registrations);
        $this->assertEquals('full', $schedule->status);
    }
}
