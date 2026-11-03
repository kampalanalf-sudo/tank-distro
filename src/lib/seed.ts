import type { RadioData } from "./types";

/** Local-first demo dataset: mirrors supabase/seed.sql so the station is never empty. */

const daysAgo = (n: number, h = 9) => {
  const d = new Date(Date.now() - n * 86400000);
  d.setHours(h, 24 - (n % 5) * 4, 0, 0);
  return d.toISOString();
};
const minsAgo = (n: number) => new Date(Date.now() - n * 60000).toISOString();
const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString();

export const SEED: RadioData = {
  shows: [
    {
      id: "show-breakfast",
      slug: "kansanga-breakfast-run",
      title: "Kansanga Breakfast Run",
      tagline: "Wake up the hill — news, talk & the first tracks of the day.",
      category: "talk",
      host: "Aisha Nakato",
      days: [1, 2, 3, 4, 5],
      startMin: 6 * 60,
      endMin: 9 * 60,
      art: "./art/show-breakfast.png",
      description:
        "The morning engine of IUEA Community Radio. Campus news, guild notices, staff interviews and a warm mix of Ugandan classics and new campus artists — plus the daily chapati index.",
    },
    {
      id: "show-syllabus",
      slug: "the-syllabus",
      title: "The Syllabus",
      tagline: "The study-skills hour: learn how to learn.",
      category: "education",
      host: "Ms. K. Babirye (Faculty of Education)",
      days: [3],
      startMin: 16 * 60,
      endMin: 17 * 60,
      art: "./art/show-syllabus.png",
      description:
        "An education hour where lecturers and top students break down revision technique, exam strategy, research skills and academic wellness. Send your study questions to the studio.",
    },
    {
      id: "show-grooves",
      slug: "ggaba-road-grooves",
      title: "Ggaba Road Grooves",
      tagline: "The campus mix — Afrobeats, dancehall, kadongo kamu & new wave.",
      category: "music",
      host: "DJ Kayole",
      days: [5],
      startMin: 17 * 60,
      endMin: 19 * 60,
      art: "./art/show-grooves.png",
      description:
        "Friday's wind-down mix. Live requests from the halls, campus artist spotlights and a non-stop groove named after the road that runs past our gate.",
    },
    {
      id: "show-night",
      slug: "night-prep",
      title: "Night Prep",
      tagline: "Late-night focus beats & exam strategy for the library floor.",
      category: "education",
      host: "Mr. D. Okello",
      days: [0, 1, 2, 3, 4, 5, 6],
      startMin: 22 * 60,
      endMin: 24 * 60,
      art: "./art/show-night.png",
      description:
        "Ninety-minute lyric-free focus sets, midnight study tips and library shoutouts. The quiet companion for everyone burning the midnight oil at IUEA.",
    },
    {
      id: "show-guild",
      slug: "guild-square",
      title: "Guild Square",
      tagline: "The conversation floor — students and staff, one microphone.",
      category: "talk",
      host: "The Guild Voice (SRC)",
      days: [4],
      startMin: 19 * 60,
      endMin: 21 * 60,
      art: "./art/show-guild.png",
      description:
        "Produced with the Students' Guild: debates, club spotlights, the anonymous whisper box and honest conversations about campus life, balance and belonging.",
    },
  ],

  episodes: [
    {
      id: "ep-breakfast-12",
      showId: "show-breakfast",
      title: "Ep. 12 — Guild elections, hostel ballots & the chapati index",
      blurb:
        "The guild elections timeline, a word from the Dean of Students on hostel allocations, and three tracks from our own campus artists. Shoutout to the 2nd-year software engineers who cleaned the basketball court.",
      audioUrl: "./audio/ep-breakfast-01.mp3",
      durationS: 66,
      publishedAt: daysAgo(1, 7),
      plays: 412,
      tags: ["news", "guild", "mornings"],
    },
    {
      id: "ep-syllabus-08",
      showId: "show-syllabus",
      title: "Ep. 08 — How to read a textbook chapter and actually keep it",
      blurb:
        "Survey, question, recall: the three-move method that turns reading into owning. Answering a first-year business student's question about forgetting everything by Friday.",
      audioUrl: "./audio/ep-syllabus-01.mp3",
      durationS: 76,
      publishedAt: daysAgo(3, 16),
      plays: 289,
      tags: ["study skills", "education", "exams"],
    },
    {
      id: "ep-night-41",
      showId: "show-night",
      title: "Ep. 41 — Focus beats & the past-paper rehearsal",
      blurb:
        "Ninety minutes of lyric-free focus beats, the midnight exam-strategy segment, and greetings to the fourth floor of the library. Past papers are not revision — they are rehearsal.",
      audioUrl: "./audio/ep-nightprep-01.mp3",
      durationS: 67,
      publishedAt: daysAgo(2, 22),
      plays: 356,
      tags: ["focus", "exams", "late night"],
    },
    {
      id: "ep-guild-19",
      showId: "show-guild",
      title: "Ep. 19 — Balance: coursework, clubs, side hustles & sleep",
      blurb:
        "The Debate Club chairperson and a Faculty of Science lecturer on the 45-minute study sprint, plus whisper-box confessions and the great canteen chapati verdict.",
      audioUrl: "./audio/ep-guildsquare-01.mp3",
      durationS: 71,
      publishedAt: daysAgo(4, 19),
      plays: 233,
      tags: ["community", "wellness", "guild"],
    },
  ],

  tracks: [
    { id: "tr-1", title: "Sitya Loss", artist: "Eddy Kenzo", genre: "Afro-pop", durationS: 214, rotation: "hot", plays: 96 },
    { id: "tr-2", title: "Bayuda", artist: "Jose Chameleone", genre: "Afro-beat", durationS: 246, rotation: "hot", plays: 88 },
    { id: "tr-3", title: "Oli Omu", artist: "Sheebah Karungi", genre: "Dancehall", durationS: 198, rotation: "hot", plays: 81 },
    { id: "tr-4", title: "Kwizera", artist: "Navio", genre: "Hip-hop", durationS: 232, rotation: "warm", plays: 64 },
    { id: "tr-5", title: "Mozey Mo", artist: "Bebe Cool", genre: "Afro-beat", durationS: 221, rotation: "warm", plays: 57 },
    { id: "tr-6", title: "Bali Baani", artist: "Irene Ntale", genre: "Soul", durationS: 205, rotation: "warm", plays: 49 },
    { id: "tr-7", title: "Learning to Succeed (Station Anthem)", artist: "IUEA Choir", genre: "Choral", durationS: 187, rotation: "classic", plays: 143 },
    { id: "tr-8", title: "Kansanga Nights", artist: "IUEA Staff Band", genre: "Live band", durationS: 240, rotation: "classic", plays: 77 },
    { id: "tr-9", title: "Ggaba Sunset", artist: "The Maroon Quartet", genre: "Jazz fusion", durationS: 263, rotation: "classic", plays: 61 },
    { id: "tr-10", title: "Maroon & Gold", artist: "Debating Society Acapella", genre: "Acapella", durationS: 154, rotation: "classic", plays: 45 },
  ],

  requests: [
    {
      id: "req-1",
      song: "Sitya Loss",
      artist: "Eddy Kenzo",
      message: "For my roommate Brian — happy birthday from the whole of Hostel Block C! Put it loud at 6pm.",
      name: "Charity N.",
      community: "Hostel Block C",
      status: "queued",
      createdAt: minsAgo(38),
      votes: 14,
    },
    {
      id: "req-2",
      song: "Kansanga Nights",
      artist: "IUEA Staff Band",
      message: "Requesting this for the staff common room — we hear our own band and we forget our stress.",
      name: "Mr. Ssebina",
      community: "Staff — Facilities",
      status: "queued",
      createdAt: minsAgo(95),
      votes: 9,
    },
    {
      id: "req-3",
      song: "Bali Baani",
      artist: "Irene Ntale",
      message: "To everyone writing resits next week: this one is for your courage.",
      name: "Ivan K.",
      community: "3rd Year, Business",
      status: "played",
      createdAt: minsAgo(260),
      votes: 21,
    },
  ],

  posts: [
    {
      id: "post-1",
      author: "Guild President",
      role: "Students' Guild",
      kind: "announcement",
      body: "Guild elections nomination forms close FRIDAY 5pm at the SRC office (Admin Block, 2nd floor). Every list needs a returning officer's stamp — do not wait for the last hour, as always. Debate night follows next Thursday, live on Guild Square.",
      createdAt: daysAgo(0, 8),
      likes: 64,
      comments: [
        { id: "c-1", author: "Ronald (2nd Yr Law)", body: "Will the debate be streamed for Ggaba road clients too?", createdAt: minsAgo(120) },
        { id: "c-2", author: "Studio", body: "Yes — Guild Square simulcasts here and on the WhatsApp channel.", createdAt: minsAgo(96) },
      ],
    },
    {
      id: "post-2",
      author: "Robotics & Innovation Club",
      role: "Club",
      kind: "club",
      body: "48-hour build sprint starts next weekend in the Engineering workshop. Teams of 3–5, theme: 'Campus problems, campus solutions.' The winning team presents live on Kansanga Breakfast Run. Register at the club table outside the library.",
      createdAt: daysAgo(1, 13),
      likes: 51,
      comments: [{ id: "c-3", author: "Aisha (1st Yr CS)", body: "Can first years join or is it seniors only?", createdAt: minsAgo(300) }],
    },
    {
      id: "post-3",
      author: "University Librarian",
      role: "Staff — Library",
      kind: "announcement",
      body: "Exam season: the main library extends to 2:00 AM from Monday, and Night Prep will broadcast a 'library floor' segment at midnight every night. Quiet zones remain quiet zones — the radio is for your ears, not the reading room speakers.",
      createdAt: daysAgo(1, 10),
      likes: 88,
      comments: [],
    },
    {
      id: "post-4",
      author: "Doreen M.",
      role: "2nd Year, Health Sciences",
      kind: "shoutout",
      body: "Shoutout to Mama Naliwanga in the new canteen — she remembers everyone's order and adds an extra piece of matooke when she sees you studying too hard. Campus mother, truly. We love you!",
      createdAt: daysAgo(2, 12),
      likes: 132,
      comments: [{ id: "c-4", author: "Studio", body: "Read on air this morning — Mama Naliwanga says thank you and the chapati queue is her love language.", createdAt: minsAgo(210) }],
    },
    {
      id: "post-5",
      author: "Timothy O.",
      role: "3rd Year, Software Engineering",
      kind: "post",
      body: "Lost: a black scientific calculator, CASIO fx-991, with 'TO' scratched behind the cover. Last seen in Lecture Hall 3 during the Tuesday statistics class. If found, please leave it with the studio or the faculty office. Reward: airtime and eternal gratitude.",
      createdAt: daysAgo(2, 17),
      likes: 12,
      comments: [],
    },
  ],

  polls: [
    {
      id: "poll-1",
      question: "Where should the semester break bash happen?",
      options: ["Ggaba Beach", "Campus Oval", "Kansanga Gardens", "Virtual mixtape party"],
      votes: [148, 203, 96, 41],
      closesAt: inDays(5),
    },
  ],

  chat: [
    { id: "ch-1", name: "Studio", body: "Karibuni! You are locked to IUEA Community Radio — the voice of Kansanga.", createdAt: minsAgo(52), dj: true },
    { id: "ch-2", name: "Peace A.", body: "Good morning from the hostel! Please greet Block D, we are awake (barely).", createdAt: minsAgo(44) },
    { id: "ch-3", name: "Mr. Lubega", body: "Staff room listening. The chapati index segment is the only economics I trust.", createdAt: minsAgo(37) },
    { id: "ch-4", name: "Studio", body: "Request line is OPEN — drop your song + shoutout below and DJ Kayole will pull from the queue at 5pm.", createdAt: minsAgo(29), dj: true },
    { id: "ch-5", name: "Ivan K.", body: "Night Prep carried me through last semester's finals. Thank you Mr. Okello.", createdAt: minsAgo(18) },
    { id: "ch-6", name: "Aisha (1st Yr CS)", body: "First week on campus and this station already feels like home. Learning to succeed!", createdAt: minsAgo(7) },
  ],

  nowPlaying: {
    kind: "live",
    title: "IUEA Community Radio",
    subtitle: "Live from the Kansanga studio — education, entertainment & community",
    art: "./art/station-cover.png",
  },

  settings: {
    streamUrl: "",
    frequency: "Online • 88.6 FM Kansanga",
    whatsapp: "+256 700 000 000",
    instagram: "@iuea.communityradio",
    email: "studio@iuea.ac.ug",
  },
};
