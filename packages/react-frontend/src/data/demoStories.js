/**
 * Full demo article bodies for clickable story pages (prototype).
 */

/** @type {Record<string, import('./storyTypes').StoryDetail>} */
export const demoStoryDetails = {
  'tech-1': {
    id: 'tech-1',
    topicId: 'technology',
    topicLabel: 'Technology',
    headline: 'OpenAI Sets GPT-5.5 Instant as ChatGPT Default',
    deck: 'OpenAI is pitching the faster default as a step toward more reliable daily use.',
    sourceCount: 20,
    ago: '10h ago',
    readMinutes: 6,
    published: 'May 26, 2026 · 9:14 AM PT',
    tldr:
      'OpenAI is rolling out GPT-5.5 Instant as the default model in ChatGPT for most users, prioritizing lower latency and steadier answers on everyday tasks. Heavier “reasoning” models remain available for coding, math, and long documents. The shift reflects a bet that speed and predictability matter more than raw capability for the majority of sessions.',
    sections: [
      {
        title: 'What changed',
        paragraphs: [
          'Starting this week, new and returning ChatGPT users on Free, Plus, and Team tiers will see GPT-5.5 Instant selected automatically when they open a chat. The model is tuned for sub‑second first-token latency on typical prompts and for shorter, more direct replies unless the user asks for depth.',
          'OpenAI says Instant shares the same safety stack as its larger GPT-5.5 variants but uses a narrower context window for routine queries to keep costs predictable. Power users can still switch to GPT-5.5 Thinking or GPT-5.5 Pro from the model picker; those options are unchanged.',
          'Enterprise customers get a staged rollout: admins can pin Instant as default, allow opt-in only, or block it until internal review completes.',
        ],
      },
      {
        title: 'Why OpenAI is doing this now',
        paragraphs: [
          'In a briefing, product leads cited internal telemetry showing that more than 70% of ChatGPT messages are under 120 words and rarely require multi-step reasoning. Shipping a faster default, they argued, reduces abandonment on mobile and makes the product feel more like a daily utility than a research tool.',
          'The move also follows competitive pressure from Google’s Gemini “fast” tier and Anthropic’s Claude Haiku-class defaults in consumer apps. Analysts note that default-model decisions strongly shape perceived quality, even when advanced models remain one click away.',
        ],
      },
      {
        title: 'What early testers reported',
        paragraphs: [
          'Beta testers said Instant is noticeably snappier on brainstorming, email drafts, and short explanations, with fewer overly long disclaimers. Several reported more consistent formatting for lists and tables.',
          'Trade-offs showed up in edge cases: multi-file analysis, nuanced policy questions, and step-by-step proofs still favored Thinking mode. A minority of testers saw occasional over-confidence on niche medical and legal prompts—areas OpenAI says it is monitoring with extra classifiers.',
        ],
      },
    ],
    keyPoints: [
      'GPT-5.5 Instant becomes the default ChatGPT model for most consumer and team users.',
      'Instant optimizes latency and brevity; Thinking and Pro remain for harder tasks.',
      'Enterprise rollouts are admin-controlled; no change to API model IDs yet.',
      'OpenAI claims the same safety layer as larger GPT-5.5 models with a smaller context budget on routine chats.',
      'Competitors have pushed similar “fast default” strategies in consumer AI apps.',
    ],
    timeline: [
      { time: 'Mar 2026', event: 'GPT-5.5 family announced with Instant, Thinking, and Pro variants.' },
      { time: 'Apr 2026', event: 'Limited beta of Instant as default for 5% of Plus users.' },
      { time: 'May 26, 2026', event: 'Global default switch begins; model picker labels updated.' },
      { time: 'Jun 2026', event: 'Enterprise controls and usage analytics dashboard slated.' },
    ],
    userImpact: [
      'Mobile users should see faster first replies and less “wall of text” unless they ask for detail.',
      'Custom GPTs and plugins inherit the workspace default unless creators pin another model.',
      'Developers using the ChatGPT UI for prototyping may need to switch manually to Thinking for code reviews.',
    ],
    citations: [
      {
        name: 'OpenAI Blog',
        url: 'https://openai.com/blog',
        verified: true,
        note: 'Primary announcement and rollout schedule.',
      },
      {
        name: 'The Verge',
        url: 'https://www.theverge.com',
        verified: true,
        note: 'Hands-on comparison of Instant vs Thinking latency.',
      },
      {
        name: 'Reuters',
        url: 'https://www.reuters.com',
        verified: true,
        note: 'Enterprise rollout and competitive context.',
      },
      {
        name: 'Ars Technica',
        url: 'https://arstechnica.com',
        verified: true,
        note: 'Technical overview of context limits and safety stack.',
      },
      {
        name: 'TechCrunch',
        url: 'https://techcrunch.com',
        verified: true,
        note: 'Investor reaction and API pricing implications.',
      },
    ],
    disputedClaims: [
      {
        claim: '“GPT-5.5 Instant is fully equivalent to Pro on coding benchmarks.”',
        status: 'unverified',
        note: 'Circulating on social posts; not supported by OpenAI materials or independent tests we found.',
      },
    ],
    relatedLinks: [
      { label: 'Technology topic feed', to: '/topics/technology' },
      { label: 'All topics', to: '/topics' },
    ],
  },
}

/**
 * @param {string} storyId
 * @returns {import('./storyTypes').StoryDetail | null}
 */
export function getDemoStory(storyId) {
  return demoStoryDetails[storyId] ?? null
}

export const DEMO_STORY_ID = 'tech-1'
