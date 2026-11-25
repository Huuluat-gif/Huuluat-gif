# Bundled English pronunciation data

`en_US.txt` is the unchanged General American English wordlist from
[open-dict-data/ipa-dict](https://github.com/open-dict-data/ipa-dict), pinned to
commit `972cd67dd5f96bc5660e28070cde26e3928abcd7` and retrieved 2026-11-17.

- Source: https://raw.githubusercontent.com/open-dict-data/ipa-dict/972cd67dd5f96bc5660e28070cde26e3928abcd7/data/en_US.txt
- SHA-256: `2af6f154a5c363275f052d1f85acedef38ed185ca9745aa4314be77f6b70de67`
- Size: 3,180,267 bytes; 125,927 tab-separated entries.
- Repository license: MIT, Copyright (c) 2016 dohliam; reproduced in `IPA-DICT-LICENSE.txt`.
- The upstream [Credits](https://github.com/open-dict-data/ipa-dict/blob/972cd67dd5f96bc5660e28070cde26e3928abcd7/README.md#credits)
  identify the US English data as a modified version of
  [cmudict-ipa](https://github.com/lingz/cmudict-ipa), with stress markers added
  using [syllabify](https://github.com/kylebgorman/syllabify).
- cmudict-ipa license: MIT, Copyright (c) 2016 Lingliang Zhang; reproduced in
  `CMUDICT-IPA-LICENSE.txt` from https://raw.githubusercontent.com/lingz/cmudict-ipa/master/LICENSE.

Lowf looks up exact word spellings after lowercasing and normalizing curly
apostrophes. It returns the recorded IPA and all recorded pronunciation variants;
it does not infer pronunciation, choose a grammatical sense, or generate IPA for
unknown words. The upstream describes the data as broadly phonemic and compiled
using manual and semi-automatic methods; pronunciation may vary by dialect.

Only this US English dataset is included. Other upstream language datasets have
different licenses and are not part of this bundle.

The server loads the dictionary once per process, with byte, entry, word and IPA
length bounds. Words absent from this dataset fall back to Free Dictionary API.
Text translation remains provided by MyMemory. This file and the licenses must
be retained when redistributing the source or deploying the bundled dictionary.
