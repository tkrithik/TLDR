/**
 * @typedef {object} StorySource
 * @property {string} name
 * @property {string} url
 * @property {boolean} verified
 * @property {string} note
 */

/**
 * @typedef {object} DisputedClaim
 * @property {string} claim
 * @property {'unverified' | 'debunked' | 'confirmed'} status
 * @property {string} note
 */

/**
 * @typedef {object} StorySection
 * @property {string} title
 * @property {string[]} paragraphs
 */

/**
 * @typedef {object} StoryDetail
 * @property {string} id
 * @property {string} topicId
 * @property {string} topicLabel
 * @property {string} headline
 * @property {string} deck
 * @property {number} sourceCount
 * @property {string} ago
 * @property {number} readMinutes
 * @property {string} published
 * @property {string} tldr
 * @property {StorySection[]} sections
 * @property {string[]} keyPoints
 * @property {{ time: string, event: string }[]} timeline
 * @property {string[]} userImpact
 * @property {StorySource[]} citations
 * @property {DisputedClaim[]} disputedClaims
 * @property {{ label: string, to: string }[]} relatedLinks
 */

export {}
