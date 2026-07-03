import AsyncStorage from '@react-native-async-storage/async-storage';

const DAILY_QUOTE_STORAGE_KEY = 'mindflow_daily_quote';

export const JOURNAL_QUOTES: string[] = [
  'Fill your paper with the breathings of your heart. — William Wordsworth',
  'Journal writing is a voyage to the interior. — Christina Baldwin',
  'What we write down, we remember. What we remember, we understand.',
  'The unexamined life is not worth living. — Socrates',
  'Writing is a way of talking without being interrupted. — Jules Renard',
  'In the journal I do not just express myself more openly than I could to any person; I create myself. — Susan Sontag',
  'Document the moments you feel most in love with yourself.',
  'Your story matters. Write it down.',
  'A page a day keeps the chaos at bay.',
  'Slow down — your thoughts deserve room to land.',
  'Today is worth remembering.',
  'Be patient with yourself. Growth happens in the small entries.',
  'Fill your page with the ache and the joy of it.',
  'There is no greater agony than bearing an untold story inside you. — Maya Angelou',
  'Journaling is like whispering to one\'s self and listening at the same time. — Mina Murray',
  'The act of writing is the act of discovering what you believe. — David Hare',
  'I can shake off everything as I write; my sorrows disappear, my courage is reborn. — Anne Frank',
  'Write it on your heart that every day is the best day in the year. — Ralph Waldo Emerson',
  'A diary is an assault course for your blunt instincts. — Enid Bagnold',
  'Keeping a journal will absolutely change your life. — Oprah Winfrey',
  'We do not remember days, we remember moments.',
  'Tell your story. Nobody else can tell it the way you can.',
  'The pages don\'t judge — they just hold what you give them.',
  'Write hard and clear about what hurts. — Ernest Hemingway',
  'A journal is a place to be completely honest with yourself.',
  'You are the author of your own life. Write boldly.',
  'Every entry is a small act of self-respect.',
  'Some days the pen feels heavy — write anyway.',
  'Memory fades. Ink remembers.',
  'Your thoughts deserve a witness — even if it is just you.',
  'Look back, but don\'t stare.',
  'Today\'s entry is tomorrow\'s perspective.',
  'Healing is often just paying attention to yourself, one page at a time.',
  'Write what should not be forgotten. — Isabel Allende',
  'The story of your life is worth the ink.',
  'Capture the ordinary — it becomes precious with time.',
  'Reflection is the quiet work of growth.',
  'A small entry today can change how you see a whole season later.',
  'The most powerful word you can write is the truth.',
  'Be gentle with the person writing this entry.',
  'You don\'t need the right words — you just need your words.',
  'Even unfinished thoughts deserve a page.',
  'What you notice today, you understand tomorrow.',
  'Write the version of today only you could tell.',
  'Some entries are letters to your future self.',
  'A messy page beats a perfect memory.',
  'You are allowed to take up space on this page.',
  'There is no wrong way to feel — only honest ways to write it.',
  'Let today\'s entry be unfiltered.',
  'Small moments, written down, become a life.',
  'The blank page is an invitation, not a test.',
  'Writing it down makes it real — and real things can be healed.',
  'Your handwriting carries more truth than you think.',
  'One honest sentence is worth more than ten polished ones.',
  'This page has no opinions about you — only space for you.',
  'Notice the small good things; they add up.',
  'A feeling named is a feeling tamed.',
  'Write toward clarity, not perfection.',
  'You will not always remember how today felt. Write it down.',
  'The quietest moments often make the best entries.',
  'Let your journal hold what your voice can\'t.',
  'Progress is easier to see in hindsight — keep the record.',
  'Some days you write to vent. Some days you write to celebrate. Both matter.',
  'Your story is still being written — today\'s page is proof.',
  'Write the truth, even the inconvenient parts.',
  'A journal is a mirror that doesn\'t judge.',
  'You are not behind. You are exactly where your story is.',
  'What you survived today is worth a sentence.',
  'Gratitude grows faster when it\'s written down.',
  'This is your space. No one else gets a vote.',
  'You don\'t have to have it figured out to write about it.',
  'Even a single line today is a kept promise to yourself.',
  'The pen remembers what the mind lets go.',
  'Write today like it matters, because it does.',
  'A bad day, written honestly, is still good material for growth.',
  'You are allowed to be proud of small things — write them down.',
  'Your future self will thank you for today\'s entry.',
  'The page does not need you to perform — just to show up.',
  'There\'s a version of peace that only comes from naming things.',
  'Today\'s feelings deserve today\'s words.',
  'Writing is how some of us find out what we actually think. — Joan Didion',
  'The discipline of writing something down is the first step toward making it happen. — Lee Iacocca',
  'Fill these pages with your becoming.',
  'You don\'t find your voice by staying silent.',
  'There is comfort in routine, and a journal is one of the gentlest.',
  'Write until the noise in your head goes quiet.',
  'Even chaos looks clearer once it\'s on the page.',
  'You are the narrator. Choose your words with care, but don\'t overthink them.',
  'The page can hold what you\'re not ready to say out loud.',
  'A single entry can be the start of understanding a whole pattern.',
  'You owe your story nothing but honesty.',
  'The smallest details often tell the biggest truths.',
  'Today, write for no one but yourself.',
  'Your growth is easier to trust when you can see it in your own words.',
  'Even on quiet days, something is worth writing.',
  'The page is patient. Take your time.',
  'Some truths only come out through the act of writing them.',
  'You are not too much for this page.',
  'Write as if no one will ever read it, and everyone will understand it.',
  'This entry doesn\'t need to be good. It just needs to be yours.',
  'The version of you writing this is doing better than you think.',
  'Let today\'s words be kind, even when the day wasn\'t.',
  'A page filled honestly is never a page wasted.',
  'Trust the process, even the messy entries.',
  'Some of your best ideas are hiding in your worst days — write them down.',
  'Your story is allowed to have plot twists.',
];

export function randomQuote(): string {
  return JOURNAL_QUOTES[Math.floor(Math.random() * JOURNAL_QUOTES.length)];
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Returns today's quote, persisted across app restarts. Picks a new random
 * quote only when the stored date no longer matches today.
 */
export async function getDailyQuote(): Promise<string> {
  const today = todayKey();
  try {
    const raw = await AsyncStorage.getItem(DAILY_QUOTE_STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as { date: string; quote: string };
      if (saved.date === today) return saved.quote;
    }
  } catch (e) {
    console.error('Failed to read daily quote:', e);
  }

  const quote = randomQuote();
  await AsyncStorage.setItem(DAILY_QUOTE_STORAGE_KEY, JSON.stringify({ date: today, quote }))
    .catch((e) => console.error('Failed to save daily quote:', e));
  return quote;
}
