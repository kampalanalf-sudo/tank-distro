-- IUEA Community Radio — optional station pack (mirrors the app's built-in demo data).
-- Run after supabase/schema.sql if you want the cloud pre-populated.
-- (The app also auto-seeds an empty project on first connect.)

insert into radio_shows (id, slug, title, tagline, category, host, days, start_min, end_min, art, description) values
 ('show-breakfast','kansanga-breakfast-run','Kansanga Breakfast Run','Wake up the hill — news, talk & the first tracks of the day.','talk','Aisha Nakato','{1,2,3,4,5}',360,540,'./art/show-breakfast.png','The morning engine of IUEA Community Radio. Campus news, guild notices, staff interviews and a warm mix of Ugandan classics and new campus artists — plus the daily chapati index.'),
 ('show-syllabus','the-syllabus','The Syllabus','The study-skills hour: learn how to learn.','education','Ms. K. Babirye (Faculty of Education)','{3}',960,1020,'./art/show-syllabus.png','An education hour where lecturers and top students break down revision technique, exam strategy, research skills and academic wellness.'),
 ('show-grooves','ggaba-road-grooves','Ggaba Road Grooves','The campus mix — Afrobeats, dancehall, kadongo kamu & new wave.','music','DJ Kayole','{5}',1020,1140,'./art/show-grooves.png','Friday''s wind-down mix. Live requests from the halls, campus artist spotlights and a non-stop groove named after the road that runs past our gate.'),
 ('show-night','night-prep','Night Prep','Late-night focus beats & exam strategy for the library floor.','education','Mr. D. Okello','{0,1,2,3,4,5,6}',1320,1440,'./art/show-night.png','Ninety-minute lyric-free focus sets, midnight study tips and library shoutouts.'),
 ('show-guild','guild-square','Guild Square','The conversation floor — students and staff, one microphone.','talk','The Guild Voice (SRC)','{4}',1140,1260,'./art/show-guild.png','Produced with the Students'' Guild: debates, club spotlights, the anonymous whisper box and honest conversations about campus life.')
on conflict (id) do nothing;

insert into radio_episodes (id, show_id, title, blurb, audio_url, duration_s, published_at, plays, tags) values
 ('ep-breakfast-12','show-breakfast','Ep. 12 — Guild elections, hostel ballots & the chapati index','The guild elections timeline, a word from the Dean of Students on hostel allocations, and three tracks from our own campus artists.','./audio/ep-breakfast-01.mp3',66,now()-interval '1 day',412,'{news,guild,mornings}'),
 ('ep-syllabus-08','show-syllabus','Ep. 08 — How to read a textbook chapter and actually keep it','Survey, question, recall: the three-move method that turns reading into owning.','./audio/ep-syllabus-01.mp3',76,now()-interval '3 days',289,'{study,education,exams}'),
 ('ep-night-41','show-night','Ep. 41 — Focus beats & the past-paper rehearsal','Ninety minutes of lyric-free focus beats and the midnight exam-strategy segment.','./audio/ep-nightprep-01.mp3',67,now()-interval '2 days',356,'{focus,exams,late-night}'),
 ('ep-guild-19','show-guild','Ep. 19 — Balance: coursework, clubs, side hustles & sleep','The Debate Club chairperson and a Faculty of Science lecturer on the 45-minute study sprint.','./audio/ep-guildsquare-01.mp3',71,now()-interval '4 days',233,'{community,wellness,guild}')
on conflict (id) do nothing;

insert into radio_tracks (id, title, artist, genre, duration_s, rotation, plays) values
 ('tr-1','Sitya Loss','Eddy Kenzo','Afro-pop',214,'hot',96),
 ('tr-2','Bayuda','Jose Chameleone','Afro-beat',246,'hot',88),
 ('tr-3','Oli Omu','Sheebah Karungi','Dancehall',198,'hot',81),
 ('tr-4','Kwizera','Navio','Hip-hop',232,'warm',64),
 ('tr-5','Mozey Mo','Bebe Cool','Afro-beat',221,'warm',57),
 ('tr-6','Bali Baani','Irene Ntale','Soul',205,'warm',49),
 ('tr-7','Learning to Succeed (Station Anthem)','IUEA Choir','Choral',187,'classic',143),
 ('tr-8','Kansanga Nights','IUEA Staff Band','Live band',240,'classic',77),
 ('tr-9','Ggaba Sunset','The Maroon Quartet','Jazz fusion',263,'classic',61),
 ('tr-10','Maroon & Gold','Debating Society Acapella','Acapella',154,'classic',45)
on conflict (id) do nothing;

insert into radio_requests (id, song, artist, message, name, community, status, created_at, votes) values
 ('req-1','Sitya Loss','Eddy Kenzo','For my roommate Brian — happy birthday from the whole of Hostel Block C!','Charity N.','Hostel Block C','queued',now()-interval '38 minutes',14),
 ('req-2','Kansanga Nights','IUEA Staff Band','Requesting this for the staff common room — we hear our own band and we forget our stress.','Mr. Ssebina','Staff — Facilities','queued',now()-interval '95 minutes',9),
 ('req-3','Bali Baani','Irene Ntale','To everyone writing resits next week: this one is for your courage.','Ivan K.','3rd Year, Business','played',now()-interval '260 minutes',21)
on conflict (id) do nothing;

insert into radio_posts (id, author, role, kind, body, created_at, likes) values
 ('post-1','Guild President','Students'' Guild','announcement','Guild elections nomination forms close FRIDAY 5pm at the SRC office (Admin Block, 2nd floor). Debate night follows next Thursday, live on Guild Square.',now()-interval '3 hours',64),
 ('post-2','Robotics & Innovation Club','Club','club','48-hour build sprint starts next weekend in the Engineering workshop. Teams of 3–5, theme: Campus problems, campus solutions.',now()-interval '1 day',51),
 ('post-3','University Librarian','Staff — Library','announcement','Exam season: the main library extends to 2:00 AM from Monday, and Night Prep broadcasts a library-floor segment at midnight every night.',now()-interval '1 day',88),
 ('post-4','Doreen M.','2nd Year, Health Sciences','shoutout','Shoutout to Mama Naliwanga in the new canteen — she remembers everyone''s order and adds an extra piece of matooke when she sees you studying too hard.',now()-interval '2 days',132),
 ('post-5','Timothy O.','3rd Year, Software Engineering','post','Lost: a black scientific calculator, CASIO fx-991, with TO scratched behind the cover. Last seen in Lecture Hall 3.',now()-interval '2 days',12)
on conflict (id) do nothing;

insert into radio_comments (id, post_id, author, body, created_at) values
 ('c-1','post-1','Ronald (2nd Yr Law)','Will the debate be streamed for Ggaba road clients too?',now()-interval '2 hours'),
 ('c-2','post-1','Studio','Yes — Guild Square simulcasts here and on the WhatsApp channel.',now()-interval '96 minutes'),
 ('c-3','post-2','Aisha (1st Yr CS)','Can first years join or is it seniors only?',now()-interval '5 hours'),
 ('c-4','post-4','Studio','Read on air this morning — Mama Naliwanga says thank you!',now()-interval '210 minutes')
on conflict (id) do nothing;

insert into radio_polls (id, question, options, votes, closes_at) values
 ('poll-1','Where should the semester break bash happen?','{"Ggaba Beach","Campus Oval","Kansanga Gardens","Virtual mixtape party"}','{148,203,96,41}',now()+interval '5 days')
on conflict (id) do nothing;

insert into radio_chat (id, name, body, created_at, dj) values
 ('ch-1','Studio','Karibuni! You are locked to IUEA Community Radio — the voice of Kansanga.',now()-interval '52 minutes',true),
 ('ch-2','Peace A.','Good morning from the hostel! Please greet Block D, we are awake (barely).',now()-interval '44 minutes',false),
 ('ch-3','Mr. Lubega','Staff room listening. The chapati index segment is the only economics I trust.',now()-interval '37 minutes',false),
 ('ch-4','Studio','Request line is OPEN — drop your song + shoutout and DJ Kayole will pull from the queue at 5pm.',now()-interval '29 minutes',true),
 ('ch-5','Ivan K.','Night Prep carried me through last semester''s finals. Thank you Mr. Okello.',now()-interval '18 minutes',false),
 ('ch-6','Aisha (1st Yr CS)','First week on campus and this station already feels like home. Learning to succeed!',now()-interval '7 minutes',false)
on conflict (id) do nothing;

insert into radio_settings (id, stream_url, frequency, whatsapp, instagram, email) values
 (1,'','Online • 88.6 FM Kansanga','+256 700 000 000','@iuea.communityradio','studio@iuea.ac.ug')
on conflict (id) do update set frequency = excluded.frequency;

insert into radio_now_playing (id, kind, title, subtitle, art) values
 (1,'live','IUEA Community Radio','Live from the Kansanga studio — education, entertainment & community','./art/station-cover.png')
on conflict (id) do nothing;
