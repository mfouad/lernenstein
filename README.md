# Lernenstein

Learn German through songs. Lernenstein shows a song's lyrics line by line, with
a small English gloss under each word and grammar decorations (verb, noun,
connector, …), while the song plays in a YouTube player next to the lyrics.

## How content works

Lernenstein **does not host lyrics or any other copyrighted material.**

The repository contains only a song **index**. Each entry holds:

| Field         | Example                                   |
|---------------|-------------------------------------------|
| `title`       | Song title                                |
| `artist`      | Artist name                               |
| `youtubeId`   | ID of an official, embeddable YouTube video |
| `lyricsUrl`   | Link to the lyrics at an external source (e.g. [LRCLIB](https://lrclib.net)) |

When you open a song, your browser fetches the lyrics from the external source
at runtime and keeps a copy on your device, so a song you opened once still
works if the source goes away. Grammar tags, word positions and translations
are produced in your browser (a German–English dictionary built from
Wiktionary, grammar rules, and a translation model that runs locally). They
are stored on your device and never committed to this repository.

The dictionary is one file, `public/dict/de-en.json` (about 14.5 MB, about
3 MB gzipped). The app downloads it the first time you open a song, keeps it in
IndexedDB and downloads it again only when a new build changes it.

Public-domain songs and poems (folk songs, Goethe, Heine, Rilke) are the
exception: their texts and annotations ship with the app in `public/pd/`.

## Development

```bash
npm install
npm run dev        # app at http://localhost:5173
npm test           # unit and component tests
npm run test:e2e   # browser tests (Playwright)
npm run build:dict # rebuild public/dict/de-en.json from Wiktionary data
                   # (needs .cache/kaikki-de.jsonl, see scripts/build-dict.ts)
npm run build:pd   # rebuild the public-domain fixtures
```

Playback uses the official
[YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)
and follows YouTube's terms: the player stays visible and nothing is
downloaded.

## License

The code is released under the [MIT License](LICENSE).

The MIT License covers only this project's code and song index. Lyrics, audio
and video belong to their respective rights holders and are not part of this
project.

The dictionary in `public/dict/` is derived from Wiktionary via kaikki.org and
is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
(see `public/dict/ATTRIBUTION.md`). Public-domain texts in `public/pd/` name
their source in each file.
