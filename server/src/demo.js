// Demo mode: used when no Ollama API key is configured (or MOCK_AI=true).
// Sample questions + simple rule-based feedback so the whole app can be tried offline.
// This is NOT AI evaluation, and the UI says so.

const TECHNICAL = {
  'Frontend Developer': [
    'Explain how the browser turns HTML, CSS and JavaScript into pixels on the screen.',
    'What is the difference between state and props in React, and when would you lift state up?',
    'How would you diagnose and fix a page that feels slow to load on mobile?',
    'Describe how CSS specificity and the cascade decide which rule wins.',
  ],
  'Backend Developer': [
    'How would you design a REST API for a to-do app, including error handling and validation?',
    'Explain the difference between authentication and authorization, with an example.',
    'What causes an N+1 query problem and how do you fix it?',
    'How would you make an endpoint safe to retry without creating duplicate records?',
  ],
  'Full-Stack Developer': [
    'Walk through what happens from a user clicking "Save" in a web form to the data being stored.',
    'How do you decide what logic belongs in the frontend and what belongs in the backend?',
    'How would you handle authentication for a single-page app talking to an API?',
    'Describe a caching strategy that spans the browser, API and database.',
  ],
  'Mobile App Developer': [
    'How do you keep a mobile app usable when the network is slow or offline?',
    'Explain the lifecycle of a screen in the platform you know best and common pitfalls.',
    'How would you reduce battery usage in an app that syncs data in the background?',
    'What would you test before publishing a new version of a mobile app?',
  ],
  'Data Analyst': [
    'How would you investigate a sudden 20% drop in weekly active users?',
    'Explain the difference between INNER JOIN and LEFT JOIN with a practical example.',
    'How do you handle missing or inconsistent values before building a report?',
    'How would you present a finding to a non-technical stakeholder?',
  ],
  'Data Scientist': [
    'Explain overfitting and three ways to reduce it.',
    'How do you choose evaluation metrics for an imbalanced classification problem?',
    'Describe how you would design an A/B test and decide when to stop it.',
    'How would you explain a model\'s prediction to a non-technical stakeholder?',
  ],
  'DevOps Engineer': [
    'Describe a CI/CD pipeline you would set up for a small web service.',
    'How would you roll out a risky change with minimal user impact?',
    'What is the difference between a container and a virtual machine?',
    'How would you investigate a service whose latency suddenly increased?',
  ],
  'QA / Test Engineer': [
    'How do you decide what to automate and what to test manually?',
    'Describe how you would test a login form, including edge cases.',
    'What makes an automated test flaky, and how do you fix it?',
    'How do you write a useful bug report?',
  ],
  'Product Manager': [
    'How do you prioritise a backlog when everything seems important?',
    'How would you measure the success of a new feature?',
    'Describe how you would validate an idea before committing engineering time.',
    'How do you say no to a stakeholder request while keeping the relationship?',
  ],
  'General HR Candidate': [
    'Walk me through your background and what brought you to this role.',
    'What does a good working relationship with a manager look like to you?',
    'How do you organise your work when several deadlines collide?',
    'What kind of team culture helps you do your best work?',
  ],
};

const BEHAVIORAL = [
  'Tell me about a time you had to learn something difficult quickly. What did you do?',
  'Describe a disagreement with a teammate and how you resolved it.',
  'Tell me about a mistake you made at work or in a project. What changed afterwards?',
  'Give an example of a time you took initiative without being asked.',
  'Describe a time you received critical feedback. How did you respond?',
  'Tell me about a project you are proud of and your specific contribution.',
];

function pick(pool, previous) {
  const fresh = pool.filter((q) => !previous.includes(q));
  const source = fresh.length ? fresh : pool;
  return source[Math.floor(Math.random() * source.length)];
}

export function demoQuestion(cfg) {
  const technical = TECHNICAL[cfg.role] || TECHNICAL['General HR Candidate'];
  let pool;
  if (cfg.interviewType === 'Technical') pool = technical;
  else if (cfg.interviewType === 'HR / Behavioral') pool = BEHAVIORAL;
  else pool = [...technical, ...BEHAVIORAL];

  let question = pick(pool, cfg.previousQuestions);
  if (cfg.topic && cfg.interviewType !== 'HR / Behavioral') {
    question = `${question} (Focus on: ${cfg.topic}.)`;
  }
  return question;
}

export function demoEvaluate({ answer }) {
  const words = answer.split(/\s+/).filter(Boolean).length;
  const hasExample = /(for example|for instance|e\.g\.|such as|in my (last|previous|current)|at my|when i)/i.test(answer);
  const hasReasoning = /(because|therefore|so that|trade-?off|however|as a result|which means)/i.test(answer);
  const hasStructure = /(first|second|then|finally|situation|task|action|result)/i.test(answer) || answer.includes('\n');

  let score = 2 + Math.min(3, Math.floor(words / 40));
  if (hasExample) score += 2;
  if (hasReasoning) score += 2;
  if (hasStructure) score += 1;
  if (words < 15) score = Math.min(score, 3);
  score = Math.max(0, Math.min(10, score));

  const strengths = [];
  const improvements = [];

  if (words >= 60) strengths.push('You gave a reasonably detailed answer.');
  else improvements.push('Add more detail — aim for roughly 60 to 150 words for a spoken answer.');

  if (hasExample) strengths.push('You used a concrete example.');
  else improvements.push('Support your point with a specific example from your experience.');

  if (hasReasoning) strengths.push('You explained your reasoning, not just the conclusion.');
  else improvements.push('Explain why — mention trade-offs or the reason behind your choices.');

  if (hasStructure) strengths.push('Your answer followed a visible order.');
  else improvements.push('Use a clear structure, for example: context, action, result.');

  if (!strengths.length) strengths.push('You attempted the question and gave a starting point.');

  return {
    summary:
      'Demo feedback: this was generated by simple built-in rules (length, examples, reasoning, structure), ' +
      'not by an AI model. Add an Ollama API key on the server for real evaluation.',
    strengths,
    improvements,
    suggestedApproach:
      'Open with a one-sentence answer, explain how or why in two or three points, add a short real example, ' +
      'and close with the outcome or lesson.',
    scoreEstimate: score,
  };
}
