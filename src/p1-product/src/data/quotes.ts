export interface Quote {
  cat: string
  col: string
  bg: string
  text: string
  author: string
}

export const quotes: Quote[] = [
  { cat: 'STOIC',   col: '#6366F1', bg: 'rgba(99,102,241,0.1)',  text: 'Waste no more time arguing about what a good man should be. Be one.',                           author: 'Marcus Aurelius' },
  { cat: 'FOUNDER', col: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  text: "You don't build a business. You build people, and then people build the business.",              author: 'Zig Ziglar' },
  { cat: 'P1',      col: '#10B981', bg: 'rgba(16,185,129,0.1)',  text: 'Every data point you add is a decision made with more clarity.',                                 author: 'P1 Intelligence' },
  { cat: 'GROWTH',  col: '#6366F1', bg: 'rgba(99,102,241,0.1)',  text: 'The secret of getting ahead is getting started.',                                                author: 'Mark Twain' },
  { cat: 'MINDSET', col: '#EF4444', bg: 'rgba(239,68,68,0.1)',   text: "Whether you think you can or you think you can't — you're right.",                              author: 'Henry Ford' },
  { cat: 'SUCCESS', col: '#10B981', bg: 'rgba(16,185,129,0.1)',  text: 'Your habits are the compound interest of your identity.',                                        author: 'James Clear' },
  { cat: 'STOIC',   col: '#6366F1', bg: 'rgba(99,102,241,0.1)',  text: 'You have power over your mind — not outside events. Realise this, and you will find strength.',  author: 'Marcus Aurelius' },
  { cat: 'FOUNDER', col: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  text: 'The best time to plant a tree was 20 years ago. The second best time is now.',                  author: 'Chinese Proverb' },
  { cat: 'P1',      col: '#10B981', bg: 'rgba(16,185,129,0.1)',  text: "Track what matters. Ignore what doesn't. Win anyway.",                                           author: 'P1 Intelligence' },
]
