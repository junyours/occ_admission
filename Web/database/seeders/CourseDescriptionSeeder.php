<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\CourseDescription;

class CourseDescriptionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $descriptions = [
            // Information Technology Courses - BSIT (Enhanced Descriptions with Career Paths)
            [
                'course_name' => 'BSIT',
                'description' => 'Bachelor of Science in Information Technology provides comprehensive training in computer programming, database management, and network administration. Students learn Java, Python, SQL, and web technologies to develop business applications. Career opportunities include Software Developer, Database Administrator, Network Engineer, IT Support Specialist, Systems Analyst, Web Developer, Mobile App Developer, IT Project Manager, Cybersecurity Specialist, and Cloud Solutions Architect.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'BSIT program focuses on practical IT skills including system administration, software development, and IT project management. Students gain hands-on experience with Windows/Linux servers, programming languages, and database systems.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'Information Technology degree covers web development, mobile app creation, and database design. Students learn HTML/CSS, JavaScript, PHP, MySQL, and mobile development frameworks for creating digital solutions.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'BSIT curriculum emphasizes business technology integration and IT service management. Students study enterprise systems, ITIL frameworks, and business process automation using modern IT tools and methodologies.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'Information Technology program prepares students for IT support, network administration, and software development roles. Covers computer hardware, networking protocols, programming fundamentals, and IT security basics.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'BSIT degree focuses on database administration, network security, and software testing. Students learn SQL Server, Oracle databases, network protocols, and quality assurance methodologies for enterprise environments.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'Information Technology course covers cloud computing, virtualization, and IT infrastructure management. Students work with AWS, Azure, VMware, and learn to deploy and manage cloud-based solutions.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'BSIT program emphasizes cybersecurity fundamentals, ethical hacking, and digital forensics. Students learn network security, penetration testing, security tools, and incident response procedures.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'Information Technology degree prepares students for business analyst and IT consultant roles. Covers requirements analysis, system design, project management, and business process modeling.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'BSIT curriculum includes enterprise resource planning systems, customer relationship management, and business intelligence tools. Students learn SAP, Salesforce, and data analytics platforms.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'Information Technology program focuses on mobile application development and responsive web design. Students learn React Native, Flutter, Bootstrap, and modern web development frameworks.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'BSIT degree covers IT governance, risk management, and compliance standards. Students study COBIT, ITIL, ISO standards, and learn to implement IT policies and procedures.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'Information Technology course emphasizes data analytics, business intelligence, and reporting tools. Students learn Power BI, Tableau, Excel advanced features, and data visualization techniques.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'BSIT program prepares students for DevOps and continuous integration roles. Covers Git, Jenkins, Docker, Kubernetes, and automated deployment practices for modern software development.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'Information Technology degree focuses on e-commerce platforms, digital marketing tools, and online business solutions. Students learn Shopify, WooCommerce, Google Analytics, and digital marketing technologies.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'The BSIT program emphasizes practical application of technology solutions in real-world scenarios. Students develop skills in software engineering, cloud computing, and emerging technologies while building a strong foundation in computer science principles.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'Information Technology degree prepares students for dynamic careers in the digital economy. The curriculum covers mobile app development, data analytics, artificial intelligence, and enterprise systems integration.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'BSIT program focuses on creating innovative technology solutions for business challenges. Students learn database design, network security, web technologies, and project management methodologies.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'Information Technology course develops expertise in system administration, software testing, and IT service management. Students gain hands-on experience with industry-standard tools and technologies.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'The BSIT curriculum emphasizes digital transformation and technology innovation. Students explore machine learning, blockchain technology, and Internet of Things (IoT) applications.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'Information Technology program prepares students for roles in software development, IT consulting, and technology leadership. Covers agile methodologies, DevOps practices, and quality assurance.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'BSIT degree focuses on building scalable and secure technology solutions. Students learn about cloud architecture, cybersecurity frameworks, and enterprise software development.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'Information Technology course emphasizes user experience design and human-computer interaction. Students develop skills in UI/UX design, accessibility, and user-centered development approaches.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'The BSIT program covers emerging technologies like virtual reality, augmented reality, and 5G networks. Students learn to implement cutting-edge solutions for modern business needs.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'Information Technology degree prepares students for cybersecurity careers with focus on ethical hacking, digital forensics, and security architecture. Includes hands-on labs and real-world scenarios.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'BSIT program emphasizes data-driven decision making and business intelligence. Students learn data mining, statistical analysis, and visualization techniques for organizational insights.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'Information Technology course focuses on enterprise resource planning and business process automation. Students develop skills in SAP, Oracle, and other enterprise software platforms.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'The BSIT curriculum includes mobile computing, wireless networks, and distributed systems. Students learn to design and implement solutions for mobile-first business environments.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'Information Technology program emphasizes software quality assurance and testing methodologies. Students learn automated testing, performance optimization, and continuous integration practices.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'BSIT degree covers network design, routing protocols, and telecommunications systems. Students gain expertise in Cisco technologies, network security, and infrastructure management.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'Information Technology course focuses on e-commerce platforms, digital marketing technologies, and online business solutions. Students learn to build scalable web applications.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'The BSIT program emphasizes IT governance, risk management, and compliance frameworks. Students learn about COBIT, ITIL, and other industry standards for IT service management.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'Information Technology degree prepares students for cloud computing careers with focus on AWS, Azure, and Google Cloud platforms. Includes certification preparation and hands-on projects.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'BSIT program covers software architecture patterns, microservices, and containerization technologies. Students learn Docker, Kubernetes, and modern application deployment strategies.',
                'is_manual' => false
            ],
            // BS Computer Science (Accurate Descriptions)
            [
                'course_name' => 'BS Computer Science',
                'description' => 'Bachelor of Science in Computer Science provides strong foundation in programming, algorithms, and data structures. Students learn Java, C++, Python, and study computer architecture, operating systems, and software engineering principles.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'Computer Science program emphasizes mathematical foundations including calculus, discrete mathematics, and linear algebra. Students develop algorithmic thinking and problem-solving skills through programming and computer theory.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'BS Computer Science curriculum covers software engineering, database systems, and computer networks. Students learn software development methodologies, SQL programming, and network protocols for building scalable applications.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'Computer Science degree focuses on artificial intelligence, machine learning, and data science. Students study algorithms, statistical analysis, and implement AI models using Python, TensorFlow, and data visualization tools.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'Computer Science program prepares students for software development careers. Covers object-oriented programming, design patterns, web technologies, and mobile app development using industry-standard tools and frameworks.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'The BS Computer Science curriculum emphasizes mathematical foundations and algorithmic thinking. Students explore discrete mathematics, calculus, linear algebra, and their applications in computing.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'Computer Science degree prepares students for software engineering careers with focus on object-oriented programming, design patterns, and software architecture principles.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'BS Computer Science program covers artificial intelligence and machine learning fundamentals. Students learn neural networks, natural language processing, and intelligent system design.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'Computer Science course emphasizes database systems and information management. Students develop skills in SQL, NoSQL databases, data modeling, and database administration.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'The Computer Science curriculum includes computer networks and distributed systems. Students learn network protocols, socket programming, and distributed computing principles.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'Computer Science program focuses on operating systems and system programming. Students explore process management, memory allocation, file systems, and kernel development.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'BS Computer Science degree emphasizes cybersecurity and cryptography. Students learn encryption algorithms, security protocols, and ethical hacking techniques.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'Computer Science course covers web technologies and full-stack development. Students learn HTML, CSS, JavaScript, server-side programming, and web application frameworks.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'The Computer Science program emphasizes mobile application development. Students learn iOS and Android development, mobile UI/UX design, and cross-platform development frameworks.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'Computer Science degree focuses on game development and computer graphics. Students explore 3D modeling, game engines, physics simulation, and interactive media design.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'BS Computer Science program covers data science and big data analytics. Students learn statistical analysis, data visualization, and machine learning algorithms for data insights.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'Computer Science course emphasizes software testing and quality assurance. Students develop skills in unit testing, integration testing, and automated testing frameworks.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'The Computer Science curriculum includes parallel and concurrent programming. Students learn multi-threading, parallel algorithms, and distributed computing architectures.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'Computer Science program focuses on cloud computing and virtualization. Students explore cloud platforms, containerization, and scalable application deployment strategies.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'Computer Science degree emphasizes human-computer interaction and user experience design. Students learn usability testing, interface design, and accessibility principles.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'BS Computer Science program covers computational biology and bioinformatics. Students explore algorithms for DNA sequencing, protein structure prediction, and biological data analysis.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'Computer Science course focuses on robotics and automation systems. Students learn control systems, sensor integration, and autonomous system programming.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'The Computer Science curriculum emphasizes software project management and agile methodologies. Students learn Scrum, Kanban, and collaborative development practices.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'Computer Science program covers quantum computing and advanced algorithms. Students explore quantum algorithms, quantum cryptography, and future computing paradigms.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Information Systems',
                'description' => 'Bachelor of Science in Information Systems combines business knowledge with technology skills. Students learn to design, implement, and manage information systems that support business operations.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Information Systems',
                'description' => 'Information Systems program bridges the gap between business and technology. Students develop skills in database design, business analysis, and system integration for organizational efficiency.',
                'is_manual' => false
            ],

            // Business and Management Courses
            [
                'course_name' => 'BS Business Administration',
                'description' => 'Bachelor of Science in Business Administration develops leadership skills, strategic thinking, and entrepreneurial mindset. Students learn management principles, marketing strategies, and business operations.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Business Administration',
                'description' => 'Business Administration program prepares students for leadership roles in various industries. Covers organizational behavior, financial management, and strategic planning for business success.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Accountancy',
                'description' => 'Bachelor of Science in Accountancy prepares students for professional accounting careers. The program covers financial reporting, auditing, taxation, and business law.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Accountancy',
                'description' => 'Accountancy program develops expertise in financial analysis, cost management, and regulatory compliance. Students learn to prepare and analyze financial statements for decision-making.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Management',
                'description' => 'Bachelor of Science in Management focuses on organizational leadership, team dynamics, and strategic planning. Students develop skills in human resource management and organizational development.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Management',
                'description' => 'Management program emphasizes leadership development and organizational effectiveness. Students learn change management, conflict resolution, and performance optimization strategies.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Marketing',
                'description' => 'Bachelor of Science in Marketing develops creative communication skills and consumer behavior analysis. Students learn market research, brand management, and digital marketing strategies.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Marketing',
                'description' => 'Marketing program focuses on customer relationship management and market positioning. Students develop skills in advertising, sales management, and marketing analytics.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Entrepreneurship',
                'description' => 'Bachelor of Science in Entrepreneurship fosters innovation, risk-taking, and business development. Students learn business model design, startup management, and venture financing.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Entrepreneurship',
                'description' => 'Entrepreneurship program emphasizes creative problem-solving and opportunity recognition. Students develop skills in business planning, market validation, and growth strategies.',
                'is_manual' => false
            ],

            // Engineering Courses
            [
                'course_name' => 'BS Engineering',
                'description' => 'Bachelor of Science in Engineering emphasizes mathematical analysis, scientific principles, and systematic problem-solving. Students develop technical skills and innovation capabilities.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Engineering',
                'description' => 'Engineering program focuses on design thinking and technical innovation. Students learn to apply scientific principles to solve complex real-world problems.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Civil Engineering',
                'description' => 'Bachelor of Science in Civil Engineering focuses on infrastructure development and environmental sustainability. Students learn structural design, transportation systems, and construction management.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Civil Engineering',
                'description' => 'Civil Engineering program emphasizes sustainable development and community infrastructure. Students develop skills in structural analysis, geotechnical engineering, and project management.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Mechanical Engineering',
                'description' => 'Bachelor of Science in Mechanical Engineering focuses on machine design and manufacturing processes. Students learn thermodynamics, fluid mechanics, and mechanical systems design.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Mechanical Engineering',
                'description' => 'Mechanical Engineering program emphasizes innovation in product design and manufacturing. Students develop skills in CAD/CAM, robotics, and automation systems.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Electrical Engineering',
                'description' => 'Bachelor of Science in Electrical Engineering focuses on electrical systems and electronics. Students learn circuit design, power systems, and control systems engineering.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Electrical Engineering',
                'description' => 'Electrical Engineering program emphasizes renewable energy and smart grid technologies. Students develop skills in power electronics, telecommunications, and automation.',
                'is_manual' => false
            ],

            // Healthcare and Medical Courses
            [
                'course_name' => 'BS Nursing',
                'description' => 'Bachelor of Science in Nursing develops patient care skills, medical knowledge, and compassionate service. Students learn clinical procedures, health assessment, and nursing interventions.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Nursing',
                'description' => 'Nursing program emphasizes evidence-based practice and patient-centered care. Students develop critical thinking skills and clinical decision-making abilities.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Medical Technology',
                'description' => 'Bachelor of Science in Medical Technology focuses on laboratory diagnostics and medical research. Students learn clinical laboratory procedures, diagnostic testing, and research methodologies.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Medical Technology',
                'description' => 'Medical Technology program emphasizes accuracy and precision in diagnostic testing. Students develop skills in laboratory management and quality assurance.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Pharmacy',
                'description' => 'Bachelor of Science in Pharmacy focuses on drug development and patient medication management. Students learn pharmaceutical chemistry, pharmacology, and clinical pharmacy practice.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Pharmacy',
                'description' => 'Pharmacy program emphasizes medication safety and therapeutic outcomes. Students develop skills in drug interactions, dosage calculations, and patient counseling.',
                'is_manual' => false
            ],

            // Psychology and Social Sciences
            [
                'course_name' => 'BS Psychology',
                'description' => 'Bachelor of Science in Psychology explores human behavior, mental processes, and emotional intelligence. Students learn research methods, counseling techniques, and psychological assessment.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Psychology',
                'description' => 'Psychology program emphasizes understanding human cognition and behavior. Students develop skills in psychological testing, therapy techniques, and research design.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Social Work',
                'description' => 'Bachelor of Science in Social Work focuses on community development and social justice. Students learn case management, community organizing, and social policy analysis.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Social Work',
                'description' => 'Social Work program emphasizes advocacy and empowerment of vulnerable populations. Students develop skills in crisis intervention, family therapy, and program development.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Sociology',
                'description' => 'Bachelor of Science in Sociology explores social structures and human interactions. Students learn social research methods, cultural analysis, and social change theories.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Sociology',
                'description' => 'Sociology program emphasizes understanding social inequalities and community dynamics. Students develop skills in data analysis, social policy, and community research.',
                'is_manual' => false
            ],

            // Education Courses
            [
                'course_name' => 'BS Education',
                'description' => 'Bachelor of Science in Education prepares students for teaching careers. The program covers instructional methods, curriculum design, classroom management, and student development.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Education',
                'description' => 'Education program emphasizes student-centered learning and educational innovation. Students develop skills in assessment design, differentiated instruction, and educational technology.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Elementary Education',
                'description' => 'Bachelor of Science in Elementary Education focuses on teaching young learners. Students learn child development, early literacy, and elementary curriculum design.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Elementary Education',
                'description' => 'Elementary Education program emphasizes creating engaging learning environments for children. Students develop skills in classroom management and age-appropriate instruction.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Secondary Education',
                'description' => 'Bachelor of Science in Secondary Education prepares teachers for high school settings. Students learn adolescent development, subject-specific pedagogy, and assessment strategies.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Secondary Education',
                'description' => 'Secondary Education program emphasizes preparing students for college and career readiness. Students develop skills in curriculum planning and student engagement.',
                'is_manual' => false
            ],

            // Arts and Communication
            [
                'course_name' => 'BS Communication Arts',
                'description' => 'Bachelor of Science in Communication Arts develops storytelling, media production, and public speaking skills. Students learn journalism, broadcasting, and digital media production.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Communication Arts',
                'description' => 'Communication Arts program emphasizes effective communication across various media platforms. Students develop skills in content creation, audience analysis, and media ethics.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Journalism',
                'description' => 'Bachelor of Science in Journalism focuses on news reporting and media ethics. Students learn investigative reporting, multimedia storytelling, and media law.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Journalism',
                'description' => 'Journalism program emphasizes truth-seeking and public service through media. Students develop skills in fact-checking, digital journalism, and media production.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Multimedia Arts',
                'description' => 'Bachelor of Science in Multimedia Arts combines creativity with technology. Students learn graphic design, video production, web design, and digital animation.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Multimedia Arts',
                'description' => 'Multimedia Arts program emphasizes digital creativity and visual storytelling. Students develop skills in user experience design, interactive media, and creative software applications.',
                'is_manual' => false
            ],

            // Tourism and Hospitality
            [
                'course_name' => 'BS Tourism Management',
                'description' => 'Bachelor of Science in Tourism Management focuses on travel industry operations and destination management. Students learn tourism planning, hospitality services, and cultural tourism.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Tourism Management',
                'description' => 'Tourism Management program emphasizes sustainable tourism and customer service excellence. Students develop skills in tour operations, event management, and tourism marketing.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Hotel and Restaurant Management',
                'description' => 'Bachelor of Science in Hotel and Restaurant Management focuses on hospitality operations and service management. Students learn food service, accommodation management, and hospitality marketing.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Hotel and Restaurant Management',
                'description' => 'Hotel and Restaurant Management program emphasizes quality service and operational efficiency. Students develop skills in revenue management, guest relations, and hospitality technology.',
                'is_manual' => false
            ],

            // Agriculture and Environmental Sciences
            [
                'course_name' => 'BS Agriculture',
                'description' => 'Bachelor of Science in Agriculture focuses on sustainable farming and agricultural technology. Students learn crop production, animal husbandry, and agricultural economics.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Agriculture',
                'description' => 'Agriculture program emphasizes food security and environmental sustainability. Students develop skills in precision farming, agricultural biotechnology, and farm management.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Environmental Science',
                'description' => 'Bachelor of Science in Environmental Science focuses on environmental protection and sustainability. Students learn environmental monitoring, conservation biology, and environmental policy.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Environmental Science',
                'description' => 'Environmental Science program emphasizes climate change mitigation and ecosystem management. Students develop skills in environmental assessment, waste management, and renewable energy.',
                'is_manual' => false
            ],

            // Aviation and Transportation
            [
                'course_name' => 'BS Aviation Management',
                'description' => 'Bachelor of Science in Aviation Management focuses on airline operations and aviation safety. Students learn flight operations, airport management, and aviation regulations.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Aviation Management',
                'description' => 'Aviation Management program emphasizes safety management and operational efficiency. Students develop skills in air traffic control, aviation security, and fleet management.',
                'is_manual' => false
            ],

            // Maritime and Marine Sciences
            [
                'course_name' => 'BS Marine Transportation',
                'description' => 'Bachelor of Science in Marine Transportation focuses on maritime operations and navigation. Students learn ship operations, maritime law, and marine safety.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Marine Transportation',
                'description' => 'Marine Transportation program emphasizes maritime safety and international shipping. Students develop skills in navigation, cargo handling, and maritime regulations.',
                'is_manual' => false
            ],

            // Criminology and Law Enforcement
            [
                'course_name' => 'BS Criminology',
                'description' => 'Bachelor of Science in Criminology focuses on crime prevention and criminal justice. Students learn criminal law, forensic science, and law enforcement procedures.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Criminology',
                'description' => 'Criminology program emphasizes understanding criminal behavior and justice administration. Students develop skills in crime analysis, investigation techniques, and community policing.',
                'is_manual' => false
            ],

            // Architecture and Design
            [
                'course_name' => 'BS Architecture',
                'description' => 'Bachelor of Science in Architecture focuses on building design and urban planning. Students learn architectural design, building technology, and sustainable architecture.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Architecture',
                'description' => 'Architecture program emphasizes creative design and environmental responsibility. Students develop skills in architectural drawing, building codes, and construction management.',
                'is_manual' => false
            ],

            // Interior Design
            [
                'course_name' => 'BS Interior Design',
                'description' => 'Bachelor of Science in Interior Design focuses on creating functional and aesthetic spaces. Students learn space planning, color theory, and furniture design.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Interior Design',
                'description' => 'Interior Design program emphasizes creating environments that enhance human well-being. Students develop skills in lighting design, material selection, and sustainable design.',
                'is_manual' => false
            ],

            // ===== ENHANCED DESCRIPTIONS WITH CAREER PATHS =====
            
            // BSIT - Additional Comprehensive Descriptions
            [
                'course_name' => 'BSIT',
                'description' => 'Information Technology degree specializing in enterprise software development and business intelligence. Students master Java, C#, .NET, SQL Server, Oracle databases, and business process automation. Graduates become Software Engineers, Business Analysts, ERP Consultants, Data Analysts, IT Consultants, Solution Architects, Technical Project Managers, and Digital Transformation Specialists.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'BSIT program emphasizing cybersecurity, ethical hacking, and digital forensics. Students learn penetration testing, network security, incident response, and security architecture. Career paths include Cybersecurity Analyst, Information Security Officer, Penetration Tester, Security Consultant, Digital Forensics Expert, Risk Assessment Specialist, and Compliance Auditor.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'Information Technology course focusing on cloud computing, DevOps, and infrastructure automation. Students work with AWS, Azure, Docker, Kubernetes, and CI/CD pipelines. Graduates become Cloud Engineers, DevOps Specialists, Site Reliability Engineers, Infrastructure Architects, Platform Engineers, and Automation Specialists.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'BSIT curriculum covering mobile app development, cross-platform frameworks, and user experience design. Students learn React Native, Flutter, iOS/Android development, and mobile UI/UX principles. Career opportunities include Mobile App Developer, Frontend Developer, UI/UX Designer, Mobile Product Manager, and Cross-Platform Developer.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BSIT',
                'description' => 'Information Technology program specializing in data science, machine learning, and artificial intelligence. Students master Python, R, TensorFlow, data visualization, and statistical analysis. Graduates become Data Scientists, Machine Learning Engineers, AI Specialists, Business Intelligence Analysts, and Research Scientists.',
                'is_manual' => false
            ],

            // BS Computer Science - Enhanced Descriptions
            [
                'course_name' => 'BS Computer Science',
                'description' => 'Computer Science degree emphasizing software engineering, algorithm design, and system architecture. Students develop expertise in multiple programming languages, design patterns, and software development methodologies. Career paths include Software Engineer, Systems Architect, Technical Lead, Research Scientist, Algorithm Developer, and Software Consultant.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'BS Computer Science program focusing on artificial intelligence, machine learning, and robotics. Students learn neural networks, computer vision, natural language processing, and autonomous systems. Graduates become AI Engineers, Machine Learning Scientists, Robotics Engineers, Computer Vision Specialists, and AI Research Scientists.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'Computer Science curriculum emphasizing game development, computer graphics, and interactive media. Students master game engines, 3D modeling, physics simulation, and virtual reality development. Career opportunities include Game Developer, Graphics Programmer, VR/AR Developer, Game Designer, Technical Artist, and Interactive Media Specialist.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Computer Science',
                'description' => 'Computer Science program specializing in cybersecurity, cryptography, and secure software development. Students learn encryption algorithms, security protocols, vulnerability assessment, and secure coding practices. Graduates become Security Engineers, Cryptographers, Security Researchers, Penetration Testers, and Security Architects.',
                'is_manual' => false
            ],

            // BS Nursing - Enhanced Descriptions with Healthcare Keywords
            [
                'course_name' => 'BS Nursing',
                'description' => 'Bachelor of Science in Nursing develops compassionate patient care skills, clinical expertise, and evidence-based practice. Students learn bedside nursing, health assessment, medication administration, and patient advocacy. Graduates become Registered Nurses, Clinical Nurse Specialists, Nurse Educators, Public Health Nurses, and Healthcare Administrators.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Nursing',
                'description' => 'Nursing program emphasizing critical care, emergency medicine, and trauma nursing. Students develop skills in intensive care, emergency response, patient monitoring, and life-saving interventions. Career paths include Critical Care Nurse, Emergency Room Nurse, Flight Nurse, Trauma Nurse, and Intensive Care Specialist.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Nursing',
                'description' => 'BS Nursing curriculum focusing on community health, public health nursing, and health promotion. Students learn population health, disease prevention, health education, and community outreach. Graduates become Community Health Nurses, Public Health Specialists, Health Educators, School Nurses, and Wellness Coordinators.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Nursing',
                'description' => 'Nursing program specializing in pediatric care, maternal-child health, and family-centered care. Students develop expertise in child development, family dynamics, and specialized pediatric procedures. Career opportunities include Pediatric Nurse, Neonatal Nurse, Labor and Delivery Nurse, Family Nurse Practitioner, and Child Health Specialist.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Nursing',
                'description' => 'Bachelor of Science in Nursing emphasizing mental health, psychiatric nursing, and therapeutic communication. Students learn mental health assessment, crisis intervention, therapeutic relationships, and psychiatric care. Graduates become Psychiatric Nurses, Mental Health Specialists, Crisis Intervention Specialists, and Behavioral Health Coordinators.',
                'is_manual' => false
            ],

            // BS Business Administration - Enhanced Descriptions
            [
                'course_name' => 'BS Business Administration',
                'description' => 'Business Administration degree developing leadership skills, strategic thinking, and entrepreneurial mindset. Students learn management principles, organizational behavior, and business strategy. Career paths include Business Manager, Operations Director, Entrepreneur, Business Consultant, and Corporate Executive.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Business Administration',
                'description' => 'BS Business Administration program emphasizing international business, global markets, and cross-cultural management. Students develop skills in international trade, global strategy, and multicultural leadership. Graduates become International Business Managers, Global Operations Directors, Export/Import Specialists, and International Consultants.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Business Administration',
                'description' => 'Business Administration curriculum focusing on human resource management, talent development, and organizational psychology. Students learn recruitment, training, performance management, and employee relations. Career opportunities include HR Manager, Talent Acquisition Specialist, Training Coordinator, and Organizational Development Consultant.',
                'is_manual' => false
            ],

            // BS Accountancy - Enhanced Descriptions
            [
                'course_name' => 'BS Accountancy',
                'description' => 'Accountancy program developing expertise in financial reporting, auditing, and taxation. Students master accounting principles, financial analysis, and regulatory compliance. Graduates become Certified Public Accountants, Financial Analysts, Auditors, Tax Specialists, and Financial Controllers.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Accountancy',
                'description' => 'BS Accountancy curriculum emphasizing forensic accounting, fraud examination, and financial investigation. Students learn fraud detection, litigation support, and financial crime investigation. Career paths include Forensic Accountant, Fraud Examiner, Financial Investigator, and Litigation Support Specialist.',
                'is_manual' => false
            ],

            // BS Psychology - Enhanced Descriptions
            [
                'course_name' => 'BS Psychology',
                'description' => 'Psychology degree exploring human behavior, mental processes, and emotional intelligence. Students develop skills in psychological assessment, counseling techniques, and research methods. Career opportunities include Clinical Psychologist, Counseling Psychologist, Research Analyst, Human Resources Specialist, and Mental Health Counselor.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Psychology',
                'description' => 'BS Psychology program emphasizing industrial-organizational psychology and workplace behavior. Students learn employee assessment, organizational development, and workplace psychology. Graduates become I/O Psychologists, HR Specialists, Training and Development Managers, and Organizational Consultants.',
                'is_manual' => false
            ],

            // BS Education - Enhanced Descriptions
            [
                'course_name' => 'BS Education',
                'description' => 'Education program preparing students for teaching careers with focus on instructional design and student development. Students learn curriculum planning, classroom management, and educational technology. Career paths include Elementary Teacher, Secondary Teacher, Curriculum Specialist, Educational Administrator, and Instructional Designer.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Education',
                'description' => 'BS Education curriculum emphasizing special education, inclusive teaching, and learning disabilities. Students develop skills in differentiated instruction, behavior management, and adaptive learning. Graduates become Special Education Teachers, Learning Support Specialists, Educational Therapists, and Inclusion Coordinators.',
                'is_manual' => false
            ],

            // BS Engineering - Enhanced Descriptions
            [
                'course_name' => 'BS Engineering',
                'description' => 'Engineering program emphasizing mathematical analysis, scientific principles, and systematic problem-solving. Students develop technical skills in design, analysis, and innovation. Career opportunities include Design Engineer, Project Engineer, Research Engineer, Engineering Manager, and Technical Consultant.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Civil Engineering',
                'description' => 'Civil Engineering degree focusing on infrastructure development, structural design, and environmental sustainability. Students learn construction management, transportation systems, and urban planning. Graduates become Structural Engineers, Construction Managers, Transportation Engineers, and Environmental Engineers.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Mechanical Engineering',
                'description' => 'Mechanical Engineering program emphasizing machine design, manufacturing processes, and thermal systems. Students develop skills in CAD/CAM, robotics, and automation. Career paths include Mechanical Design Engineer, Manufacturing Engineer, Robotics Engineer, and HVAC Specialist.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Electrical Engineering',
                'description' => 'Electrical Engineering curriculum focusing on power systems, electronics, and control systems. Students learn circuit design, renewable energy, and smart grid technologies. Graduates become Electrical Design Engineers, Power Systems Engineers, Electronics Engineers, and Control Systems Specialists.',
                'is_manual' => false
            ],

            // BS Communication Arts - Enhanced Descriptions
            [
                'course_name' => 'BS Communication Arts',
                'description' => 'Communication Arts program developing storytelling, media production, and public speaking skills. Students learn journalism, broadcasting, and digital media creation. Career opportunities include Media Producer, Broadcast Journalist, Public Relations Specialist, Content Creator, and Communication Manager.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Communication Arts',
                'description' => 'BS Communication Arts curriculum emphasizing digital marketing, social media management, and brand communication. Students develop skills in content strategy, audience engagement, and digital analytics. Graduates become Digital Marketing Specialists, Social Media Managers, Brand Managers, and Content Strategists.',
                'is_manual' => false
            ],

            // BS Tourism Management - Enhanced Descriptions
            [
                'course_name' => 'BS Tourism Management',
                'description' => 'Tourism Management program focusing on travel industry operations, destination management, and sustainable tourism. Students learn tourism planning, hospitality services, and cultural tourism. Career paths include Tourism Manager, Travel Coordinator, Destination Marketing Specialist, and Tourism Development Officer.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Tourism Management',
                'description' => 'BS Tourism Management curriculum emphasizing event management, conference planning, and hospitality operations. Students develop skills in event coordination, venue management, and customer service. Graduates become Event Planners, Conference Coordinators, Hospitality Managers, and Tourism Consultants.',
                'is_manual' => false
            ],

            // BS Hotel and Restaurant Management - Enhanced Descriptions
            [
                'course_name' => 'BS Hotel and Restaurant Management',
                'description' => 'Hotel and Restaurant Management program focusing on hospitality operations, service excellence, and revenue management. Students learn food service, accommodation management, and guest relations. Career opportunities include Hotel Manager, Restaurant Manager, Food Service Director, and Hospitality Operations Manager.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Hotel and Restaurant Management',
                'description' => 'BS Hotel and Restaurant Management curriculum emphasizing culinary arts, food safety, and menu development. Students develop skills in kitchen management, food preparation, and quality control. Graduates become Executive Chef, Food and Beverage Manager, Culinary Consultant, and Restaurant Operations Specialist.',
                'is_manual' => false
            ],

            // BS Criminology - Enhanced Descriptions
            [
                'course_name' => 'BS Criminology',
                'description' => 'Criminology program focusing on crime prevention, criminal justice, and law enforcement. Students learn criminal law, forensic science, and investigation techniques. Career paths include Police Officer, Criminal Investigator, Forensic Specialist, Probation Officer, and Security Manager.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Criminology',
                'description' => 'BS Criminology curriculum emphasizing cybercrime investigation, digital forensics, and cybersecurity. Students develop skills in computer forensics, cyber investigation, and digital evidence analysis. Graduates become Cybercrime Investigators, Digital Forensics Specialists, Cybersecurity Analysts, and Computer Crime Specialists.',
                'is_manual' => false
            ],

            // BS Architecture - Enhanced Descriptions
            [
                'course_name' => 'BS Architecture',
                'description' => 'Architecture program focusing on building design, urban planning, and sustainable architecture. Students learn architectural design, building technology, and construction management. Career opportunities include Architect, Urban Planner, Building Designer, Construction Manager, and Architectural Consultant.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Architecture',
                'description' => 'BS Architecture curriculum emphasizing green building design, environmental sustainability, and energy-efficient architecture. Students develop skills in sustainable design, LEED certification, and environmental planning. Graduates become Sustainable Design Architects, Green Building Consultants, Environmental Designers, and Energy Efficiency Specialists.',
                'is_manual' => false
            ],

            // BS Interior Design - Enhanced Descriptions
            [
                'course_name' => 'BS Interior Design',
                'description' => 'Interior Design program focusing on space planning, aesthetic design, and functional environments. Students learn color theory, furniture design, and material selection. Career paths include Interior Designer, Space Planner, Furniture Designer, Design Consultant, and Residential Designer.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Interior Design',
                'description' => 'BS Interior Design curriculum emphasizing commercial design, hospitality interiors, and retail space design. Students develop skills in commercial planning, hospitality design, and retail environment creation. Graduates become Commercial Interior Designers, Hospitality Designers, Retail Space Planners, and Corporate Design Specialists.',
                'is_manual' => false
            ],

            // BS Medical Technology - Enhanced Descriptions
            [
                'course_name' => 'BS Medical Technology',
                'description' => 'Medical Technology program focusing on laboratory diagnostics, clinical testing, and medical research. Students learn laboratory procedures, diagnostic testing, and quality assurance. Career opportunities include Medical Technologist, Laboratory Manager, Clinical Laboratory Scientist, and Diagnostic Specialist.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Medical Technology',
                'description' => 'BS Medical Technology curriculum emphasizing molecular diagnostics, genetic testing, and advanced laboratory techniques. Students develop skills in DNA analysis, molecular biology, and specialized testing procedures. Graduates become Molecular Technologists, Genetic Testing Specialists, Research Laboratory Scientists, and Advanced Diagnostic Technicians.',
                'is_manual' => false
            ],

            // BS Pharmacy - Enhanced Descriptions
            [
                'course_name' => 'BS Pharmacy',
                'description' => 'Pharmacy program focusing on drug development, medication management, and pharmaceutical care. Students learn pharmaceutical chemistry, pharmacology, and clinical pharmacy practice. Career paths include Pharmacist, Clinical Pharmacist, Pharmaceutical Researcher, Drug Information Specialist, and Pharmacy Manager.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Pharmacy',
                'description' => 'BS Pharmacy curriculum emphasizing hospital pharmacy, clinical pharmacy, and patient care. Students develop skills in medication therapy management, drug interactions, and patient counseling. Graduates become Hospital Pharmacists, Clinical Pharmacy Specialists, Medication Therapy Management Pharmacists, and Patient Care Coordinators.',
                'is_manual' => false
            ],

            // BS Social Work - Enhanced Descriptions
            [
                'course_name' => 'BS Social Work',
                'description' => 'Social Work program focusing on community development, social justice, and client advocacy. Students learn case management, community organizing, and social policy analysis. Career opportunities include Social Worker, Case Manager, Community Organizer, Social Services Coordinator, and Family Support Specialist.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Social Work',
                'description' => 'BS Social Work curriculum emphasizing mental health social work, crisis intervention, and therapeutic support. Students develop skills in counseling, crisis management, and mental health advocacy. Graduates become Mental Health Social Workers, Crisis Intervention Specialists, Therapeutic Support Workers, and Behavioral Health Coordinators.',
                'is_manual' => false
            ],

            // BS Marketing - Enhanced Descriptions
            [
                'course_name' => 'BS Marketing',
                'description' => 'Marketing program developing creative communication skills and consumer behavior analysis. Students learn market research, brand management, and digital marketing strategies. Career paths include Marketing Manager, Brand Manager, Digital Marketing Specialist, Market Research Analyst, and Advertising Executive.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Marketing',
                'description' => 'BS Marketing curriculum emphasizing e-commerce, online marketing, and digital customer engagement. Students develop skills in social media marketing, email marketing, and online advertising. Graduates become E-commerce Managers, Social Media Marketing Specialists, Digital Campaign Managers, and Online Marketing Coordinators.',
                'is_manual' => false
            ],

            // BS Entrepreneurship - Enhanced Descriptions
            [
                'course_name' => 'BS Entrepreneurship',
                'description' => 'Entrepreneurship program fostering innovation, business development, and startup management. Students learn business model design, venture financing, and growth strategies. Career opportunities include Entrepreneur, Startup Founder, Business Development Manager, Innovation Consultant, and Venture Capital Analyst.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Entrepreneurship',
                'description' => 'BS Entrepreneurship curriculum emphasizing social entrepreneurship, sustainable business, and impact investing. Students develop skills in social innovation, sustainable business models, and community development. Graduates become Social Entrepreneurs, Impact Investment Specialists, Sustainable Business Consultants, and Community Development Coordinators.',
                'is_manual' => false
            ],

            // BS Agriculture - Enhanced Descriptions
            [
                'course_name' => 'BS Agriculture',
                'description' => 'Agriculture program focusing on sustainable farming, agricultural technology, and food production. Students learn crop production, animal husbandry, and agricultural economics. Career paths include Agricultural Engineer, Farm Manager, Agricultural Consultant, Crop Specialist, and Agricultural Extension Officer.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Agriculture',
                'description' => 'BS Agriculture curriculum emphasizing precision farming, agricultural biotechnology, and sustainable agriculture. Students develop skills in GPS farming, genetic engineering, and environmental conservation. Graduates become Precision Agriculture Specialists, Agricultural Biotechnologists, Sustainable Farming Consultants, and Environmental Agriculture Coordinators.',
                'is_manual' => false
            ],

            // BS Environmental Science - Enhanced Descriptions
            [
                'course_name' => 'BS Environmental Science',
                'description' => 'Environmental Science program focusing on environmental protection, sustainability, and conservation. Students learn environmental monitoring, conservation biology, and environmental policy. Career opportunities include Environmental Scientist, Conservation Specialist, Environmental Consultant, Sustainability Coordinator, and Environmental Policy Analyst.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Environmental Science',
                'description' => 'BS Environmental Science curriculum emphasizing climate change mitigation, renewable energy, and environmental impact assessment. Students develop skills in carbon footprint analysis, renewable energy systems, and environmental auditing. Graduates become Climate Change Specialists, Renewable Energy Consultants, Environmental Impact Assessors, and Carbon Management Coordinators.',
                'is_manual' => false
            ],

            // BS Aviation Management - Enhanced Descriptions
            [
                'course_name' => 'BS Aviation Management',
                'description' => 'Aviation Management program focusing on airline operations, aviation safety, and airport management. Students learn flight operations, aviation regulations, and safety management systems. Career paths include Aviation Manager, Airport Operations Manager, Flight Operations Coordinator, Aviation Safety Inspector, and Air Traffic Controller.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Aviation Management',
                'description' => 'BS Aviation Management curriculum emphasizing aviation security, emergency management, and crisis response. Students develop skills in security protocols, emergency procedures, and risk management. Graduates become Aviation Security Specialists, Emergency Response Coordinators, Aviation Risk Managers, and Crisis Management Specialists.',
                'is_manual' => false
            ],

            // BS Marine Transportation - Enhanced Descriptions
            [
                'course_name' => 'BS Marine Transportation',
                'description' => 'Marine Transportation program focusing on maritime operations, navigation, and ship management. Students learn ship operations, maritime law, and marine safety procedures. Career opportunities include Ship Captain, Marine Engineer, Port Operations Manager, Maritime Safety Inspector, and Marine Transportation Coordinator.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Marine Transportation',
                'description' => 'BS Marine Transportation curriculum emphasizing international shipping, logistics, and supply chain management. Students develop skills in cargo handling, international trade, and maritime logistics. Graduates become Maritime Logistics Specialists, International Shipping Coordinators, Cargo Operations Managers, and Supply Chain Analysts.',
                'is_manual' => false
            ],

            // BS Multimedia Arts - Enhanced Descriptions
            [
                'course_name' => 'BS Multimedia Arts',
                'description' => 'Multimedia Arts program combining creativity with technology in digital media production. Students learn graphic design, video production, web design, and digital animation. Career paths include Multimedia Designer, Video Producer, Web Designer, Digital Artist, and Creative Director.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Multimedia Arts',
                'description' => 'BS Multimedia Arts curriculum emphasizing user experience design, interactive media, and digital storytelling. Students develop skills in UX/UI design, interactive applications, and digital content creation. Graduates become UX/UI Designers, Interactive Media Specialists, Digital Content Creators, and User Experience Researchers.',
                'is_manual' => false
            ],

            // BS Journalism - Enhanced Descriptions
            [
                'course_name' => 'BS Journalism',
                'description' => 'Journalism program focusing on news reporting, media ethics, and investigative journalism. Students learn multimedia storytelling, fact-checking, and media law. Career opportunities include News Reporter, Investigative Journalist, Broadcast Journalist, Digital Media Producer, and News Editor.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Journalism',
                'description' => 'BS Journalism curriculum emphasizing digital journalism, social media reporting, and online content creation. Students develop skills in digital storytelling, social media management, and online publishing. Graduates become Digital Journalists, Social Media Reporters, Online Content Managers, and Digital Media Specialists.',
                'is_manual' => false
            ],

            // BS Sociology - Enhanced Descriptions
            [
                'course_name' => 'BS Sociology',
                'description' => 'Sociology program exploring social structures, human interactions, and social change. Students learn social research methods, cultural analysis, and community development. Career paths include Social Researcher, Community Development Specialist, Social Policy Analyst, Cultural Consultant, and Social Services Coordinator.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Sociology',
                'description' => 'BS Sociology curriculum emphasizing social inequality, diversity studies, and social justice advocacy. Students develop skills in social analysis, community organizing, and policy development. Graduates become Social Justice Advocates, Diversity Coordinators, Community Organizers, and Social Policy Researchers.',
                'is_manual' => false
            ],

            // BS Elementary Education - Enhanced Descriptions
            [
                'course_name' => 'BS Elementary Education',
                'description' => 'Elementary Education program focusing on teaching young learners and child development. Students learn early literacy, elementary curriculum design, and classroom management. Career opportunities include Elementary Teacher, Early Childhood Educator, Curriculum Specialist, Educational Administrator, and Learning Support Teacher.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Elementary Education',
                'description' => 'BS Elementary Education curriculum emphasizing special education, inclusive teaching, and learning support. Students develop skills in differentiated instruction, behavior management, and adaptive learning strategies. Graduates become Special Education Teachers, Learning Support Specialists, Inclusive Education Coordinators, and Educational Therapists.',
                'is_manual' => false
            ],

            // BS Secondary Education - Enhanced Descriptions
            [
                'course_name' => 'BS Secondary Education',
                'description' => 'Secondary Education program preparing teachers for high school settings and adolescent development. Students learn subject-specific pedagogy, assessment strategies, and student engagement techniques. Career paths include High School Teacher, Subject Specialist, Educational Coordinator, Academic Advisor, and Curriculum Developer.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Secondary Education',
                'description' => 'BS Secondary Education curriculum emphasizing college preparation, career readiness, and academic counseling. Students develop skills in academic advising, college preparation, and career guidance. Graduates become Academic Counselors, College Preparation Specialists, Career Guidance Counselors, and Student Success Coordinators.',
                'is_manual' => false
            ],

            // BS Management - Enhanced Descriptions
            [
                'course_name' => 'BS Management',
                'description' => 'Management program focusing on organizational leadership, team dynamics, and strategic planning. Students develop skills in human resource management, organizational development, and change management. Career opportunities include Operations Manager, Human Resources Manager, Project Manager, Organizational Development Specialist, and Management Consultant.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Management',
                'description' => 'BS Management curriculum emphasizing supply chain management, operations optimization, and quality management. Students develop skills in process improvement, supply chain coordination, and operational efficiency. Graduates become Supply Chain Managers, Operations Analysts, Quality Assurance Managers, and Process Improvement Specialists.',
                'is_manual' => false
            ],

            // BS Information Systems - Enhanced Descriptions
            [
                'course_name' => 'BS Information Systems',
                'description' => 'Information Systems program combining business knowledge with technology skills for organizational efficiency. Students learn system design, business analysis, and technology integration. Career paths include Systems Analyst, Business Analyst, IT Consultant, Database Administrator, and Information Systems Manager.',
                'is_manual' => false
            ],
            [
                'course_name' => 'BS Information Systems',
                'description' => 'BS Information Systems curriculum emphasizing enterprise systems, business process automation, and digital transformation. Students develop skills in ERP systems, workflow automation, and business intelligence. Graduates become Enterprise Systems Specialists, Business Process Analysts, Digital Transformation Consultants, and Business Intelligence Developers.',
                'is_manual' => false
            ]
        ];

        foreach ($descriptions as $description) {
            CourseDescription::create($description);
        }
    }
}
