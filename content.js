/* ------------------------------------------------------------------
   Starting content. Everything here can also be edited inside the site
   from the Create tab (the owner only), so you rarely need this file.
   - POSTS are articles (mostly reviews). Give each a unique "slug".
   - EDITS are 9:16 vertical videos:
       platform "youtube": id = the code in the URL (works for Shorts too)
       platform "vimeo":   id = the Vimeo number
       platform "file":    src = link to an .mp4 (optional thumb = image link)
------------------------------------------------------------------- */
const SITE = {
  name: "ripsulli",
  author: "ripsulli",
  intro: "Reviews in writing, and edits in 9:16. Two things I make, side by side.",
  status: "new reviews and edits every week",
  tagline: "Writer and video editor. Mostly reviews, plus vertical edits.",
  aboutTitle: "Two things I make",
  about: "<p>I write <strong>reviews</strong> and make <strong>vertical edits</strong>. They are two separate things: the articles are about whatever I have been watching, playing or buying, and the edits are their own thing, cut for 9:16.</p><p>Replace this with your own story. You can edit it any time in the Create tab.</p>",
  badge: "Open to collabs and commissions",
  photo: "",
  focus: [
    { title: "Reviews", text: "honest, detailed write-ups of things worth your time" },
    { title: "Vertical edits", text: "short edits cut for the 9:16 feed" },
    { title: "Beat sync", text: "cuts that land on the music, and know when to miss it" },
    { title: "Colour and mood", text: "grades and glow that keep an edit feeling like one thing" }
  ],
  contactNote: "Open to collaborations, review requests and edits for hire. Say hello.",
  email: "you@example.com",
  socials: [
    { name: "Instagram", url: "https://instagram.com/" },
    { name: "TikTok", url: "https://tiktok.com/" },
    { name: "YouTube", url: "https://youtube.com/" }
  ]
};

const POSTS = [
  { slug: "pocket-camera-review", title: "Review: a pocket camera worth carrying everywhere", date: "2026-10-28", tags: ["Reviews", "Gear"],
    excerpt: "Sample review. Small enough to forget it is there, good enough that you will not want to.",
    body: `<p>This is a sample review. Replace it with your own in the Create tab, or delete it.</p><h2>What I liked</h2><p>It fits in a jacket pocket and the photos hold up when you zoom in.</p><h2>What I did not</h2><p>The battery is the weak spot. Carry a spare.</p>` },
  { slug: "film-review-sample", title: "Review: the film that stays with you for a week", date: "2026-10-12", tags: ["Reviews", "Film"],
    excerpt: "Sample review. A quiet film that does a lot with very little.",
    body: `<p>Another sample. Reviews work best with a clear verdict near the top, then the reasons.</p><p>Say what it is, who it is for, and whether it is worth their time.</p>` },
  { slug: "budget-microphones-review", title: "Review: three budget microphones, tested properly", date: "2026-09-30", tags: ["Reviews", "Gear"],
    excerpt: "Sample review. Same room, same voice, three very different results.",
    body: `<p>A sample comparison. List what you tested and how, so readers can trust the result.</p>` },
  { slug: "album-review-sample", title: "Review: the album I cannot stop replaying", date: "2026-09-14", tags: ["Reviews", "Music"],
    excerpt: "Sample review. Eleven tracks, no filler, and one that I have played far too many times.",
    body: `<p>A sample music review. Describe the sound, pick a favourite track, and be honest about the weak one.</p>` }
];

const EDITS = [
  { id: "aqz-KE-bpKQ", platform: "youtube", title: "Sample edit one", tags: ["Beat sync"], duration: "0:30", date: "2026-10-20", desc: "Placeholder. Replace the id with one of your own YouTube Shorts, or upload a video in the Create tab." },
  { id: "eRsGyueVLvQ", platform: "youtube", title: "Sample edit two", tags: ["Transitions"], duration: "0:24", date: "2026-10-02", desc: "Topics like Beat sync and Transitions become filter buttons automatically." },
  { id: "R6MlUcmOul8", platform: "youtube", title: "Sample edit three", tags: ["Colour"], duration: "0:45", date: "2026-09-18", desc: "Add as many edits as you like." }
];
