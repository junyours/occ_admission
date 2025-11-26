<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Course;

class CourseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $courses = [
            [
                'course_code' => 'BSIT',
                'course_name' => 'Bachelor of Science in Information Technology',
                'description' => 'A comprehensive program that prepares students for careers in technology and information systems. This course covers programming, database management, network administration, web development, cybersecurity, and software engineering. Students learn analytical and problem-solving skills through hands-on projects and theoretical foundations. The program emphasizes innovation, leadership in technology, and practical application of information technology solutions. Graduates are equipped for roles in software development, IT management, system analysis, data analytics, and technology consulting. The curriculum includes modern technologies such as artificial intelligence, cloud computing, and digital transformation.',
                'passing_rate' => 75,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'course_code' => 'BSBA-FM',
                'course_name' => 'Bachelor of Science in Business Administration - Financial Management',
                'description' => 'A specialized business program focusing on financial analysis, investment management, and corporate finance. Students develop strong analytical and strategic thinking skills in financial planning, risk management, and investment decision-making. The curriculum covers financial markets, accounting principles, economic analysis, and business strategy. Graduates are prepared for careers in banking, investment firms, corporate finance, financial consulting, and entrepreneurship. The program emphasizes practical application through case studies, financial modeling, and real-world projects. Students learn leadership skills, decision-making processes, and innovative approaches to financial management.',
                'passing_rate' => 80,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'course_code' => 'BSBA-MM',
                'course_name' => 'Bachelor of Science in Business Administration - Marketing Management',
                'description' => 'A dynamic program that prepares students for careers in marketing, advertising, and brand management. Students learn creative and strategic approaches to market analysis, consumer behavior, digital marketing, and brand development. The curriculum covers marketing research, advertising, public relations, sales management, and international marketing. Graduates are equipped for roles in marketing agencies, corporate marketing departments, entrepreneurship, and business consulting. The program emphasizes innovation, communication skills, and practical marketing strategies. Students develop leadership abilities, analytical thinking, and creative problem-solving skills through hands-on projects and real-world applications.',
                'passing_rate' => 78,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'course_code' => 'BSed',
                'course_name' => 'Bachelor of Science in Education',
                'description' => 'A comprehensive teacher education program that prepares students for careers in teaching and educational leadership. Students learn pedagogical theories, classroom management, curriculum development, and educational psychology. The program emphasizes practical teaching experience through internships and student teaching. Graduates are qualified to teach in elementary and secondary schools, with strong communication, leadership, and organizational skills. The curriculum includes research methods, educational technology, and innovative teaching strategies. Students develop empathy, patience, and the ability to inspire and motivate learners. The program prepares educators who can adapt to diverse learning environments and contribute to educational innovation.',
                'passing_rate' => 85,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'course_code' => 'BEed',
                'course_name' => 'Bachelor of Elementary Education',
                'description' => 'A specialized program designed for teaching at the elementary level, focusing on child development and early education. Students learn age-appropriate teaching methods, child psychology, and curriculum design for young learners. The program emphasizes hands-on experience with children through practicum and teaching demonstrations. Graduates are equipped with strong communication skills, patience, and creativity needed for elementary education. The curriculum covers multiple subjects, classroom management, and educational technology integration. Students develop leadership skills in educational settings and learn to create inclusive, supportive learning environments. The program prepares teachers who can inspire curiosity and foster a love for learning in young children.',
                'passing_rate' => 88,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($courses as $course) {
            Course::create($course);
        }

        $this->command->info('Courses seeded successfully!');
        $this->command->info('Seeded courses:');
        foreach ($courses as $course) {
            $this->command->info("- {$course['course_code']}: {$course['course_name']}");
        }
    }
}
