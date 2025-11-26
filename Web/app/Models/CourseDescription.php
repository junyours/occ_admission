<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CourseDescription extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_name',
        'description',
        'is_manual'
    ];

    protected $casts = [
        'is_manual' => 'boolean'
    ];

    /**
     * Get a description for a course based on its name
     */
    public static function getDescription($courseName)
    {
        // Generate a new random description each time
        return self::generateRandomDescription($courseName);
    }

    /**
     * Generate a random description for a course
     */
    public static function generateRandomDescription($courseName)
    {
        $descriptions = [
            "The {$courseName} program offers comprehensive training and education designed to prepare students for successful careers in this dynamic field. Through a combination of theoretical knowledge and practical applications, students develop the essential skills needed to excel in their chosen profession.",
            
            "This {$courseName} course provides students with a solid foundation in the fundamental principles and advanced concepts of the discipline. Students will engage in hands-on learning experiences, collaborative projects, and real-world applications to build their expertise.",
            
            "The {$courseName} curriculum is carefully designed to equip students with both technical skills and critical thinking abilities. Through innovative teaching methods and industry-relevant projects, students gain practical experience that prepares them for professional success.",
            
            "Students enrolled in the {$courseName} program will explore cutting-edge theories and methodologies while developing practical skills through experiential learning opportunities. The program emphasizes both academic excellence and professional development.",
            
            "The {$courseName} course offers a unique blend of theoretical knowledge and practical application, preparing students for the challenges and opportunities in this evolving field. Students will develop analytical, problem-solving, and communication skills essential for career advancement.",
            
            "This comprehensive {$courseName} program provides students with the knowledge, skills, and competencies required to succeed in today's competitive professional environment. Through rigorous coursework and practical training, students build a strong foundation for their future careers.",
            
            "The {$courseName} curriculum focuses on developing well-rounded professionals who can adapt to changing industry demands. Students will learn through case studies, simulations, and real-world projects that mirror actual professional scenarios.",
            
            "Our {$courseName} program emphasizes innovation, creativity, and practical problem-solving skills. Students will engage with current industry trends and technologies while building a strong theoretical foundation for long-term career success.",
            
            "The {$courseName} course provides students with comprehensive training in both foundational concepts and advanced applications. Through a combination of classroom instruction and hands-on experience, students develop the expertise needed for professional excellence.",
            
            "Students in the {$courseName} program will benefit from a curriculum that balances academic rigor with practical relevance. The program prepares graduates to meet the challenges of a rapidly evolving professional landscape."
        ];

        // Return a random description
        return $descriptions[array_rand($descriptions)];
    }

    /**
     * Store a description for a course
     */
    public static function storeDescription($courseName, $description, $isManual = false)
    {
        return self::create([
            'course_name' => $courseName,
            'description' => $description,
            'is_manual' => $isManual
        ]);
    }

    /**
     * Get only manual descriptions
     */
    public function scopeManual($query)
    {
        return $query->where('is_manual', true);
    }
}
