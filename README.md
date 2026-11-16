# ripsulli: edits and blog

A static website with no build step. Pages: Home, Writing, Edits, About, and individual posts.

## Edit your content
Open `js/content.js`. Change the site name and text in `SITE`, add posts to `POSTS`, and add edits to `EDITS` (YouTube/Shorts id, Vimeo id, or a direct .mp4 link). Edits display in 9:16. Colours and fonts are variables at the top of `css/style.css`.

## Preview on your computer
Open `index.html` in a browser, or run `python3 -m http.server` in this folder.

## Put it on GitHub and the internet (free)
1. Create a new repository on github.com and upload every file in this folder (keep the `css` and `js` folders and the `.nojekyll` file).
2. In the repository go to Settings, then Pages. Under Build and deployment choose "Deploy from a branch", pick `main` and `/ (root)`, then Save.
3. After a minute your site is live at `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`.

Netlify, Vercel and Cloudflare Pages also work: drag the folder in, with no settings needed.

## Make the email box real
Create a form on Formspree, Buttondown or Mailchimp and paste its form URL into `subscribeAction` in `js/content.js`.

## The Create page (writing and uploading inside the site)
The Create tab is hidden from visitors. Open it by adding `#create` to your site address once on your own computer, and the link will then appear in the menu in your browser only. Use it to write posts and upload vertical edits. On a plain GitHub Pages site there is no server, so what you create is saved in the browser you used and is only visible to you. To publish for everyone:
- Posts: copy the text into a new block in `POSTS` in `js/content.js` (use `body` for HTML).
- Edits: put the .mp4 in an `edits/` folder in your repository, then add `{ platform: "file", src: "edits/yourfile.mp4", thumb: "edits/yourfile.jpg", title: "...", tag: "...", duration: "0:30", date: "2026-11-10" }` to `EDITS`. GitHub accepts files up to 100 MB each.
For uploads that appear for everyone automatically, host the site on a service with a backend, or use the Claude-hosted version.
