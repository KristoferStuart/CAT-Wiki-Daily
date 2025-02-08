# CAT Wiki Daily Article for Bluesky

Post a random article daily (default at noon, your server time) on Bluesky!

![Sample article post](https://mammoth-bronze-starfish.myfilebase.com/ipfs/QmQNeWrvT4XmS7FNM3bUstzv3FywDrETiD6j3qF86graMn "Sample article post")

## Features

- Rejects articles undesired categories
    - Articles in need of additional work
    - Articles marked as irrelevant
    - Articles marked for deletion
    - Articles requiring change in tone
    - Articles requiring expansion
    - Articles under development
    - Articles with deletion requests
    - CAT
    - Transcripts
    - Websites
    - Individuals
    - Disambiguation pages
- Generates, uploads, and attaches a preview image of the article page
- Uses `better-sqlite3` to prevent reposting an article within 90 days
- Greets the world with positivity

## .env variables

```env
BLUESKY_USERNAME="your_username"
BLUESKY_PASSWORD="your_password"
```
