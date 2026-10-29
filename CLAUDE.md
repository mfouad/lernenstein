# CLAUDE.md

## Content rule: no copyrighted material in the repo

This is an open-source (MIT) project. **Never add lyrics or any other
copyrighted material to the repository**, not even a single line, as sample
data, test fixtures, seed files, screenshots, docs or code comments.

This includes:
- Song lyrics, full or partial, in any language
- Translations, glosses or grammar annotations of real lyrics (these are
  derivative works)
- Audio, video, album art or artist photos
- Content scraped or copied from lyrics sites

The repo may only contain a song **index**: `title`, `artist`, `youtubeId`,
`lyricsUrl` (a link to LRCLIB or another external source). Lyrics are fetched
at runtime in the user's browser, and anything derived from them stays on the
user's device.

For tests, demos and examples, use **invented placeholder text** that you
write yourself (e.g. "Ich gehe heute in den Park"), never real song lines.

### Exceptions

- **Public-domain texts** (author dead more than 70 years, or traditional
  folk songs with no known author) may live in `public/pd/<slug>.json`, with
  full annotations. Each file names its source and, for a known author, the
  death year. Check the dates before adding one: Hesse (†1962) and Kästner
  (†1974) are *not* public domain.
- **The dictionary** (`public/dict/de-en.json`) is built from Wiktionary data
  (CC BY-SA, credited in `public/dict/ATTRIBUTION.md`). It may cover words
  that appear in songs, but only as an unordered word list: no line numbers,
  word order, counts or anything else that ties a word to a song.
  `npm run build:dict` builds it from all of German Wiktionary and also writes
  its version to `src/analysis/dictVersion.json`; rerun `npm run build:pd`
  afterwards.
- Build scripts may fetch lyrics to collect that word list, but must never
  write the lyrics, or anything derived from them other than the word list, to
  disk.

## Dependencies

Ask before adding any dependency. Don't hand-build what a popular library
already does.

If a task seems to need real lyrics in the repo, stop and ask instead.

## YouTube

Use only the official IFrame Player API. Keep the player visible (at least
200×200 px), don't overlay it, don't hide ads, and never download or extract
audio or video.
