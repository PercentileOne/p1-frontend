export interface Quote {
  cat: string
  col: string
  bg: string
  text: string
  author: string
}

export const quotes: Quote[] = [
  // Set A — cards[0] cycles through these (indices 0,3,6,9,12,15,18)
  { cat: 'STOIC',      col: '#6366F1', bg: 'rgba(99,102,241,0.1)',  text: 'Waste no more time arguing about what a good man should be. Be one.',                            author: 'Marcus Aurelius' },
  { cat: 'FOUNDER',    col: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  text: "You don't build a business. You build people, and then people build the business.",               author: 'Zig Ziglar' },
  { cat: 'P1',         col: '#10B981', bg: 'rgba(16,185,129,0.1)',  text: 'Every data point you add is a decision made with more clarity.',                                  author: 'P1 Intelligence' },
  { cat: 'RESILIENCE', col: '#6366F1', bg: 'rgba(99,102,241,0.1)',  text: 'Success is not final, failure is not fatal — it is the courage to continue that counts.',        author: 'Winston Churchill' },
  { cat: 'MINDSET',    col: '#EF4444', bg: 'rgba(239,68,68,0.1)',   text: "Whether you think you can or you think you can't — you're right.",                               author: 'Henry Ford' },
  { cat: 'FOCUS',      col: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  text: 'The successful warrior is the average person with laser-like focus.',                             author: 'Bruce Lee' },
  { cat: 'P1',         col: '#10B981', bg: 'rgba(16,185,129,0.1)',  text: 'Measure your life in progress, not in perfection.',                                               author: 'P1 Intelligence' },

  // Set B — card[1] cycles through these (indices 1,4,7,10,13,16,19)
  { cat: 'GROWTH',     col: '#6366F1', bg: 'rgba(99,102,241,0.1)',  text: 'The secret of getting ahead is getting started.',                                                 author: 'Mark Twain' },
  { cat: 'SUCCESS',    col: '#10B981', bg: 'rgba(16,185,129,0.1)',  text: 'Your habits are the compound interest of your identity.',                                         author: 'James Clear' },
  { cat: 'LEADERSHIP', col: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  text: 'It always seems impossible until it is done.',                                                    author: 'Nelson Mandela' },
  { cat: 'FOUNDER',    col: '#EF4444', bg: 'rgba(239,68,68,0.1)',   text: "The people who are crazy enough to think they can change the world are the ones who do.",         author: 'Steve Jobs' },
  { cat: 'GROWTH',     col: '#6366F1', bg: 'rgba(99,102,241,0.1)',  text: 'Luck is what happens when preparation meets opportunity.',                                        author: 'Seneca' },
  { cat: 'P1',         col: '#10B981', bg: 'rgba(16,185,129,0.1)',  text: 'Your percentile rank is not a score. It is a mirror.',                                            author: 'P1 Intelligence' },
  { cat: 'MINDSET',    col: '#EF4444', bg: 'rgba(239,68,68,0.1)',   text: 'You may not control all the events that happen to you, but you can decide not to be reduced by them.', author: 'Maya Angelou' },

  // Set C — card[2] cycles through these (indices 2,5,8,11,14,17,20)
  { cat: 'STOIC',      col: '#6366F1', bg: 'rgba(99,102,241,0.1)',  text: 'You have power over your mind — not outside events. Realise this, and you will find strength.',   author: 'Marcus Aurelius' },
  { cat: 'SUCCESS',    col: '#10B981', bg: 'rgba(16,185,129,0.1)',  text: 'Whatever the mind can conceive and believe, it can achieve.',                                     author: 'Napoleon Hill' },
  { cat: 'FOUNDER',    col: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  text: 'The best time to plant a tree was 20 years ago. The second best time is now.',                   author: 'Chinese Proverb' },
  { cat: 'FOCUS',      col: '#6366F1', bg: 'rgba(99,102,241,0.1)',  text: 'Most people overestimate what they can do in a year and underestimate what they can do in ten.',  author: 'Bill Gates' },
  { cat: 'RESILIENCE', col: '#EF4444', bg: 'rgba(239,68,68,0.1)',   text: 'Rock bottom became the solid foundation on which I rebuilt my life.',                             author: 'J.K. Rowling' },
  { cat: 'P1',         col: '#10B981', bg: 'rgba(16,185,129,0.1)',  text: "Track what matters. Ignore what doesn't. Win anyway.",                                            author: 'P1 Intelligence' },
  { cat: 'LEADERSHIP', col: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  text: 'Management is doing things right. Leadership is doing the right things.',                        author: 'Peter Drucker' },
]
