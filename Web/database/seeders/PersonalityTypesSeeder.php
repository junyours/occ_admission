<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PersonalityType;

class PersonalityTypesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     */
    public function run(): void
    {
        $personalityTypes = [
            ['type' => 'ISTJ', 'title' => 'The Inspector', 'description' => 'Quiet, serious, and dependable. Practical, matter-of-fact, realistic, and responsible. Decide logically what should be done and work toward it steadily, regardless of distractions. Take pleasure in making everything orderly and organized. Value traditions and loyalty.'],
            ['type' => 'ISFJ', 'title' => 'The Protector', 'description' => 'Quiet, friendly, responsible, and conscientious. Committed and steady in meeting their obligations. Thorough, painstaking, and accurate. Loyal, considerate, notice and remember specifics about people who are important to them. Strive to create an orderly and harmonious environment.'],
            ['type' => 'INFJ', 'title' => 'The Advocate', 'description' => 'Seek meaning and connection in ideas, relationships, and material possessions. Want to understand what motivates people and are insightful about others. Conscientious and committed to their firm values. Develop a clear vision about how best to serve the common good.'],
            ['type' => 'INTJ', 'title' => 'The Architect', 'description' => 'Have original minds and great drive for implementing their ideas and achieving their goals. Quickly see patterns in external events and develop long-range explanatory perspectives. When committed, organize a job and carry it through. Skeptical and independent, have high standards of competence.'],
            ['type' => 'ISTP', 'title' => 'The Crafter', 'description' => 'Tolerant and flexible, quiet observers until a problem appears, then act quickly to find workable solutions. Analyze what makes things work and readily get through large amounts of data to isolate the core of practical problems. Interested in cause and effect, value efficiency.'],
            ['type' => 'ISFP', 'title' => 'The Artist', 'description' => 'Quiet, friendly, sensitive, and kind. Enjoy the present moment, what\'s going on around them. Like to have their own space and to work within their own time frame. Loyal and committed to their values and to people who are important to them. Dislike disagreements and conflicts.'],
            ['type' => 'INFP', 'title' => 'The Mediator', 'description' => 'Idealistic, loyal to their values and to people who are important to them. Want to live a life that is congruent with their values. Curious, quick to see possibilities, can be catalysts for implementing ideas. Seek to understand people and to help them fulfill their potential.'],
            ['type' => 'INTP', 'title' => 'The Thinker', 'description' => 'Seek to develop logical explanations for everything that interests them. Theoretical and abstract, interested more in ideas than in social interaction. Quiet, contained, flexible, and adaptable. Have unusual ability to focus in depth to solve problems in their area of interest.'],
            ['type' => 'ESTP', 'title' => 'The Persuader', 'description' => 'Flexible and tolerant, take a pragmatic approach focused on immediate results. Bored by theories and conceptual explanations; want to act energetically to solve the problem. Focus on the here and now, spontaneous, enjoy each moment they can be active with others.'],
            ['type' => 'ESFP', 'title' => 'The Performer', 'description' => 'Outgoing, friendly, and accepting. Exuberant lovers of life, people, and material comforts. Enjoy working with others to make things happen. Bring common sense and a realistic approach to their work and make work fun. Flexible and spontaneous, adapt readily to new people.'],
            ['type' => 'ENFP', 'title' => 'The Champion', 'description' => 'Warmly enthusiastic and imaginative. See life as full of possibilities. Make connections between events and information very quickly, and confidently proceed based on the patterns they see. Want a lot of affirmation from others, and readily give appreciation and support.'],
            ['type' => 'ENTP', 'title' => 'The Debater', 'description' => 'Quick, ingenious, stimulating, alert, and outspoken. Resourceful in solving new and challenging problems. Adept at generating conceptual possibilities and then analyzing them strategically. Good at reading other people. Bored by routine, will seldom do the same thing the same way.'],
            ['type' => 'ESTJ', 'title' => 'The Director', 'description' => 'Practical, realistic, matter-of-fact. Decisive, quickly move to implement decisions. Organize projects and people to get things done, focus on getting results in the most efficient way possible. Take care of routine details. Have a clear set of logical standards.'],
            ['type' => 'ESFJ', 'title' => 'The Caregiver', 'description' => 'Warmhearted, conscientious, and cooperative. Want harmony in their environment, work with determination to establish it. Like to work with others to complete tasks accurately and on time. Loyal, follow through even in small matters. Notice what others need in their day-to-day lives.'],
            ['type' => 'ENFJ', 'title' => 'The Giver', 'description' => 'Warm, empathetic, responsive, and responsible. Highly attuned to the emotions, needs, and motivations of others. Find potential in everyone, want to help others fulfill their potential. May act as catalysts for individual and group growth. Sociable, facilitate others in a group.'],
            ['type' => 'ENTJ', 'title' => 'The Commander', 'description' => 'Frank, decisive, assume leadership readily. Quickly see illogical and inefficient procedures and policies, develop and implement comprehensive systems to solve organizational problems. Enjoy long-term planning and goal setting. Usually well informed, well read, enjoy expanding their knowledge.']
        ];

        foreach ($personalityTypes as $type) {
            PersonalityType::updateOrCreate(
                ['type' => $type['type']],
                $type
            );
        }
    }
} 