export const topics = [
  { id: 'technology', label: 'Technology' },
  { id: 'sports', label: 'Sports' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'science', label: 'Science' },
  { id: 'politics', label: 'Politics' },
  { id: 'economics', label: 'Economics' },
  { id: 'crime', label: 'Crime' },
  { id: 'video-games', label: 'Video Games' },
]

export const storyMap = {
  technology: [
    {
      id: 'tech-1',
      headline: 'OpenAI Sets GPT-5.5 Instant as ChatGPT Default',
      deck: 'OpenAI is pitching the faster default as a step toward more reliable daily use.',
      sources: 20,
      ago: '10h ago',
    },
    {
      id: 'tech-2',
      headline: 'Apple Confirms Encrypted RCS in iOS 26.5',
      deck: 'Availability rolls out gradually depending on carrier support and region.',
      sources: 32,
      ago: '7h ago',
    },
    {
      id: 'tech-3',
      headline: 'Google Revamps AI Search Links With Inline Citations',
      deck: 'The update aims to send more readers toward primary publishers.',
      sources: 9,
      ago: '1h ago',
    },
    {
      id: 'tech-4',
      headline: 'Anthropic Launches Finance Agents',
      deck: 'The move signals a broader push to turn Claude into deployed workplace software.',
      sources: 35,
      ago: '57m ago',
    },
  ],
  sports: [
    {
      id: 'sports-1',
      headline: 'Thunder Roll Past Lakers in Game 1',
      deck: 'OKC depth challenged the Lakers rotation ahead of Thursday Game 2.',
      sources: 515,
      ago: '1h ago',
    },
    {
      id: 'sports-2',
      headline: 'Saka Sends Arsenal to Champions League Final',
      deck: 'Arsenal arrives in Budapest unbeaten this campaign.',
      sources: 245,
      ago: '1h ago',
    },
    {
      id: 'sports-3',
      headline: 'NBA Lottery Overhaul Emerges as Frontrunner',
      deck: 'Flattened odds and new penalties target long-term tanking behavior.',
      sources: 9,
      ago: '1h ago',
    },
  ],
  entertainment: [
    {
      id: 'ent-1',
      headline: 'The Bear Drops Standalone Prequel “Gary”',
      deck: 'Viewers can watch it as a standalone title on Hulu.',
      sources: 76,
      ago: '53m ago',
    },
    {
      id: 'ent-2',
      headline: 'Rolling Stones Announce “Foreign Tongues”',
      deck: 'The 14-track set includes production from Andrew Watt.',
      sources: 38,
      ago: '6h ago',
    },
    {
      id: 'ent-3',
      headline: 'Disney Sets D23 Asia for Singapore in 2027',
      deck: 'The event marks a regional fan strategy across Asia Pacific.',
      sources: 11,
      ago: '50m ago',
    },
  ],
  science: [
    {
      id: 'sci-1',
      headline: 'Astronomers Detect Thin Atmosphere Beyond Pluto',
      deck: 'The finding challenges old models of volatile retention on small icy worlds.',
      sources: 22,
      ago: '2h ago',
    },
    {
      id: 'sci-2',
      headline: 'Eta Aquariid Meteor Shower Peaks Before Dawn',
      deck: 'A bright moon may reduce visibility to only a few meteors per hour.',
      sources: 26,
      ago: '11h ago',
    },
    {
      id: 'sci-3',
      headline: 'NASA Posts 12,000+ Artemis II Photos',
      deck: 'The release shifts public focus toward lander and mission readiness testing.',
      sources: 17,
      ago: '2h ago',
    },
  ],
  politics: [
    {
      id: 'pol-1',
      headline: 'Pulitzer Prizes Honor Coverage of Trump’s Second Term',
      deck: 'The awards spotlight press freedom pressures in a difficult media year.',
      sources: 22,
      ago: '3h ago',
    },
    {
      id: 'pol-2',
      headline: 'Senate Ban and Court Fights Reshape Prediction Markets',
      deck: 'Legal pressure is forcing regulators to define market bets more clearly.',
      sources: 26,
      ago: '1h ago',
    },
    {
      id: 'pol-3',
      headline: 'Texas GOP Runoff Poll Shows Tight Paxton-Cornyn Race',
      deck: 'Undecided voters remain the key swing bloc.',
      sources: 11,
      ago: '1h ago',
    },
  ],
  economics: [
    {
      id: 'eco-1',
      headline: 'Gas Prices Top $4.50 Nationwide',
      deck: 'Pump prices are lagging crude moves, delaying relief for drivers.',
      sources: 79,
      ago: '54m ago',
    },
    {
      id: 'eco-2',
      headline: 'Judge Clears Spirit Airlines Liquidation',
      deck: 'A fuel-price shock derailed the carrier’s restructuring path.',
      sources: 64,
      ago: '1h ago',
    },
    {
      id: 'eco-3',
      headline: 'SEC Weighs Semiannual Reporting Option',
      deck: 'The proposal opens a 60-day comment period for public companies.',
      sources: 28,
      ago: '1h ago',
    },
  ],
  crime: [
    {
      id: 'crime-1',
      headline: 'Secret Service Shoots Armed Suspect Near Monument',
      deck: 'MPD is leading the use-of-force review while prosecutors prepare charges.',
      sources: 88,
      ago: '1h ago',
    },
    {
      id: 'crime-2',
      headline: 'Houston Police Probe Apparent Murder-Suicide',
      deck: 'Investigators are awaiting forensic confirmation of identities.',
      sources: 33,
      ago: '54m ago',
    },
    {
      id: 'crime-3',
      headline: 'Manhunt Intensifies in Tennessee Case',
      deck: 'Officials expanded the search with federal and local coordination.',
      sources: 19,
      ago: '1h ago',
    },
  ],
  'video-games': [
    {
      id: 'games-1',
      headline: 'Take-Two Explains Console-First GTA 6 Launch',
      deck: 'Investors now watch for pricing updates at the next earnings call.',
      sources: 54,
      ago: '2h ago',
    },
    {
      id: 'games-2',
      headline: 'Xbox Sets New Boot Animation and Startup Chime',
      deck: 'The change aligns with a broader Xbox brand refresh.',
      sources: 5,
      ago: '1h ago',
    },
    {
      id: 'games-3',
      headline: 'Mina the Hollower Launches May 29',
      deck: 'Yacht Club confirms console and PC release at $19.99.',
      sources: 4,
      ago: '1h ago',
    },
  ],
}

export function getAllStories() {
  return Object.entries(storyMap).flatMap(([topicId, stories]) =>
    stories.map((story) => ({ ...story, topicId })),
  )
}
