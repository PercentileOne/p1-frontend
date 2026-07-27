export interface LearnModule {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  tags: string[];
}

export const LEARN_MODULES: LearnModule[] = [
  { id: 'lm-tech-depth', title: 'Advanced Problem Solving & Algorithmic Thinking', description: 'Master the patterns interviewers test: time complexity, recursion, and step-by-step decomposition.', estimatedMinutes: 45, difficulty: 'Advanced', category: 'Software Engineering', tags: ['technical depth', 'problem solving', 'algorithm'] },
  { id: 'lm-system-design', title: 'System Design Fundamentals', description: 'Learn how to architect scalable systems — load balancing, caching, databases, and trade-off reasoning.', estimatedMinutes: 60, difficulty: 'Advanced', category: 'Software Engineering', tags: ['system design', 'architecture'] },
  { id: 'lm-code-quality', title: 'Clean Code & Code Review', description: 'Write code that communicates intent. Understand the principles senior engineers look for in a review.', estimatedMinutes: 30, difficulty: 'Intermediate', category: 'Software Engineering', tags: ['code quality', 'clean code', 'technical depth'] },
  { id: 'lm-testing', title: 'Test-Driven Development in Practice', description: 'Shift from writing tests after the fact to using them as a design tool — with real examples.', estimatedMinutes: 35, difficulty: 'Intermediate', category: 'Software Engineering', tags: ['testing', 'code quality'] },
  { id: 'lm-tech-docs', title: 'Technical Documentation That Gets Read', description: 'How to write READMEs, API docs, and decision records that actually help your team.', estimatedMinutes: 20, difficulty: 'Beginner', category: 'Software Engineering', tags: ['documentation', 'communication'] },
  { id: 'lm-leadership-pressure', title: 'Leadership Under Pressure', description: 'Stay composed, make good decisions, and bring people with you when everything is on fire.', estimatedMinutes: 30, difficulty: 'Intermediate', category: 'Leadership', tags: ['leadership', 'resilience', 'delivery pace'] },
  { id: 'lm-stakeholder-mgmt', title: 'Stakeholder Management', description: 'Map your stakeholders, manage expectations, and turn difficult relationships into advocates.', estimatedMinutes: 25, difficulty: 'Intermediate', category: 'Leadership', tags: ['stakeholder management', 'communication', 'client management'] },
  { id: 'lm-team-leadership', title: 'Team Leadership & Motivation', description: 'Understand what actually motivates people and how to build a team that performs without micromanagement.', estimatedMinutes: 30, difficulty: 'Intermediate', category: 'Leadership', tags: ['team leadership', 'leadership', 'staff development'] },
  { id: 'lm-staff-dev', title: 'Coaching & Staff Development', description: 'How to give feedback that lands, run 1:1s that matter, and help people grow on the job.', estimatedMinutes: 25, difficulty: 'Intermediate', category: 'Leadership', tags: ['staff development', 'coaching methodology', 'leadership'] },
  { id: 'lm-commercial', title: 'Commercial Awareness for Interviews', description: 'Understand profit margins, market dynamics, and how to talk about business impact confidently.', estimatedMinutes: 30, difficulty: 'Intermediate', category: 'Leadership', tags: ['commercial awareness', 'kpi delivery', 'domain knowledge'] },
  { id: 'lm-communication', title: 'Effective Communication in Interviews', description: 'Structure your answers with clarity, speak with confidence, and land your key points every time.', estimatedMinutes: 20, difficulty: 'Beginner', category: 'Communication', tags: ['communication', 'confidence', 'clarity'] },
  { id: 'lm-presenting', title: 'Confident Presenting & Public Speaking', description: 'Control nerves, own the room, and deliver ideas that stick — whether to 2 people or 200.', estimatedMinutes: 25, difficulty: 'Intermediate', category: 'Communication', tags: ['communication', 'presentation', 'patient communication', 'parent communication'] },
  { id: 'lm-client-rel', title: 'Client Relationship Management', description: 'Build trust with clients, handle difficult conversations, and turn one-off engagements into long-term relationships.', estimatedMinutes: 30, difficulty: 'Intermediate', category: 'Communication', tags: ['client management', 'retention skills', 'relationship building'] },
  { id: 'lm-speed-pressure', title: 'Speed Under Pressure Simulation', description: 'Techniques for maintaining accuracy and composure during high-volume, fast-turnaround situations.', estimatedMinutes: 20, difficulty: 'Intermediate', category: 'Performance', tags: ['speed under pressure', 'time management', 'consistency'] },
  { id: 'lm-time-mgmt', title: 'Time Management & Prioritisation', description: 'The frameworks that high performers use to decide what to do first when everything feels urgent.', estimatedMinutes: 20, difficulty: 'Beginner', category: 'Performance', tags: ['time management', 'delivery pace', 'reliability'] },
  { id: 'lm-resilience', title: 'Building Resilience & Bouncing Back', description: 'How to recover from setbacks, reframe failure, and maintain performance through difficult periods.', estimatedMinutes: 20, difficulty: 'Beginner', category: 'Performance', tags: ['resilience', 'reliability', 'physical fitness'] },
  { id: 'lm-kpi', title: 'Understanding & Hitting KPIs', description: 'How to read, own, and drive your numbers — and talk about them convincingly in interviews.', estimatedMinutes: 25, difficulty: 'Intermediate', category: 'Performance', tags: ['kpi delivery', 'commercial awareness', 'retail operations'] },
  { id: 'lm-customer-service', title: 'Exceptional Customer Service', description: 'The mindset, language, and habits that turn ordinary interactions into memorable customer experiences.', estimatedMinutes: 20, difficulty: 'Beginner', category: 'Customer & Sales', tags: ['customer service', 'upselling', 'brand knowledge'] },
  { id: 'lm-upselling', title: 'Upselling & Positive Sales Techniques', description: 'Recommend additions confidently and authentically — without ever feeling pushy.', estimatedMinutes: 25, difficulty: 'Intermediate', category: 'Customer & Sales', tags: ['upselling', 'closing skills', 'retention skills'] },
  { id: 'lm-closing', title: 'The Art of Closing', description: 'Move deals, decisions, and conversations forward — the techniques top closers use every day.', estimatedMinutes: 30, difficulty: 'Advanced', category: 'Customer & Sales', tags: ['closing skills', 'negotiation', 'objection handling'] },
  { id: 'lm-objections', title: 'Handling Objections Confidently', description: 'Turn "no" or "maybe" into a productive conversation — with frameworks that actually work.', estimatedMinutes: 25, difficulty: 'Intermediate', category: 'Customer & Sales', tags: ['objection handling', 'closing skills', 'negotiation'] },
  { id: 'lm-negotiation', title: 'Negotiation Skills', description: 'Prepare, anchor, listen, and close — the four moves of every successful negotiation.', estimatedMinutes: 35, difficulty: 'Intermediate', category: 'Customer & Sales', tags: ['negotiation', 'commercial awareness', 'stakeholder management'] },
  { id: 'lm-food-safety', title: 'Food Safety Protocols & Hygiene', description: 'HACCP principles, temperature control, allergen awareness, and the habits every food professional needs.', estimatedMinutes: 25, difficulty: 'Beginner', category: 'Hospitality', tags: ['food safety', 'kitchen hygiene', 'hygiene'] },
  { id: 'lm-retail-ops', title: 'Retail Operations Essentials', description: 'Stock management, visual merchandising, opening/closing procedures, and loss prevention fundamentals.', estimatedMinutes: 30, difficulty: 'Intermediate', category: 'Retail', tags: ['retail operations', 'stock management', 'loss prevention'] },
  { id: 'lm-patient-comms', title: 'Patient Communication & Empathy', description: 'How to break difficult news, explain complex information simply, and build trust quickly.', estimatedMinutes: 30, difficulty: 'Intermediate', category: 'Healthcare', tags: ['patient communication', 'empathy', 'communication'] },
  { id: 'lm-safeguarding', title: 'Safeguarding Principles & Practice', description: 'Recognise signs of harm, understand duty of care, and navigate reporting procedures correctly.', estimatedMinutes: 35, difficulty: 'Intermediate', category: 'Healthcare', tags: ['safeguarding', 'professional boundaries', 'documentation'] },
  { id: 'lm-classroom-mgmt', title: 'Classroom Management Techniques', description: 'Set expectations, build routines, and de-escalate disruption — without losing the class.', estimatedMinutes: 30, difficulty: 'Intermediate', category: 'Education', tags: ['classroom management', 'behaviour management', 'student engagement'] },
  { id: 'lm-problem-solving', title: 'Structured Problem Solving', description: 'From first principles to actionable solutions — frameworks like MECE, 5 Whys, and issue trees.', estimatedMinutes: 25, difficulty: 'Intermediate', category: 'Problem Solving', tags: ['problem solving', 'analytical thinking', 'decision-making'] },
  { id: 'lm-teamwork', title: 'High-Performance Teamwork', description: 'How effective teams communicate, handle conflict, and deliver together under pressure.', estimatedMinutes: 20, difficulty: 'Beginner', category: 'Professional Skills', tags: ['teamwork', 'communication', 'reliability'] },
  { id: 'lm-professionalism', title: 'Professionalism & Reliability', description: 'The habits, mindset, and behaviours that make colleagues and clients trust you completely.', estimatedMinutes: 15, difficulty: 'Beginner', category: 'Professional Skills', tags: ['reliability', 'professionalism', 'consistency'] },
  { id: 'lm-domain-knowledge', title: 'Industry Knowledge for Interviews', description: 'How to research a company and sector quickly so you can speak with authority on any topic raised.', estimatedMinutes: 30, difficulty: 'Beginner', category: 'Professional Skills', tags: ['domain knowledge', 'brand knowledge', 'curriculum knowledge'] },
];

export function mapImprovementAreasToLearnModules(improvementAreas: string[]): LearnModule[] {
  if (!improvementAreas.length) return [];
  const normalised = improvementAreas.map(a => a.toLowerCase().trim());
  const scored = LEARN_MODULES.map(mod => {
    let score = 0;
    for (const area of normalised) {
      for (const tag of mod.tags) {
        if (tag.includes(area) || area.includes(tag)) score += 2;
        else if (tag.split(' ').some(w => area.includes(w) && w.length > 3)) score += 1;
      }
    }
    return { mod, score };
  });
  return scored
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || a.mod.estimatedMinutes - b.mod.estimatedMinutes)
    .map(x => x.mod);
}
