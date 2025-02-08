require("dotenv").config();
const { AtpAgent, RichText } = require("@atproto/api");
const agent = new AtpAgent({ service: "https://bsky.social" });
const db = require("better-sqlite3")("record.db");
db.pragma("journal_mode = WAL");
const puppeteer = require("puppeteer");
const cron = require("node-cron");

async function main() {
  const blockedCategories = [
    "Articles in need of additional work",
    "Articles marked as irrelevant",
    "Articles marked for deletion",
    "Articles requiring change in tone",
    "Articles requiring expansion",
    "Articles under development",
    "Articles with deletion requests",
    "CAT",
    "Transcripts",
    "Websites",
    "Individuals",
    "Disambiguation pages",
  ];

  let blockedPages = [
    `Videos to Convert to Articles`,
    `Louis Rossmann - Video Directory`,
    `Other Channels - Video Directory`,
  ];
  for (cat = 0; cat < blockedCategories.length; cat++) {
    try {
      const resInit = await fetch(
        `https://wiki.rossmanngroup.com/api.php?action=query&format=json&list=categorymembers&formatversion=2&cmtitle=Category%3A${encodeURIComponent(blockedCategories[cat])}&cmtype=page&cmlimit=max`,
      );
      const res = await resInit.json();
      const addToBlocked = res.query.categorymembers.map((page) => {
        return page.title;
      });
      for (let page = 0; page < addToBlocked.length; page++) {
        if (blockedPages.indexOf(addToBlocked[page]) === -1) {
          blockedPages.push(addToBlocked[page]);
        }
      }
    } catch (err) {
      throw err;
    }
  }

  const getRandArticle = await fetch(
    "https://wiki.rossmanngroup.com/api.php?action=query&format=json&list=random&formatversion=2&rnnamespace=0&rnfilterredir=nonredirects&rnlimit=max",
  );
  const getRandArticleJson = await getRandArticle.json();
  const randArticleList = getRandArticleJson.query.random.map((page) => {
    return page.title;
  });

  //find article
  let article,
    articleIndex = 0;

  function filterBlocked() {
    article = undefined;
    while (!article) {
      if (blockedPages.indexOf(randArticleList[articleIndex]) === -1) {
        article = randArticleList[articleIndex];
        articleIndex++;
      } else {
        articleIndex++;
      }
    }
  }

  let isValid = false;
  while (!isValid) {
    const time = Date.now();
    filterBlocked();
    const stmt = db.prepare(`SELECT * FROM Posts WHERE title=?`).get(article);
    if (!stmt) {
      db.prepare(`INSERT INTO Posts (title, last_posted) VALUES (?,?)`).run([
        article,
        time,
      ]);
      isValid = true;
    } else {
      if ((time - stmt.last_posted) / 86400 > 60) {
        db.prepare(
          `UPDATE Posts SET last_posted = ${time} WHERE title = ${article}`,
        );
        isValid = true;
      } else {
        console.log(
          `Article "${article}" was skipped, posted ${(time - stmt.last_posted) / 864000000} days ago`,
        );
        continue;
      }
    }
  }

  /*TO-DO*/
  //continuation call if article list exhausted

  const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-session-crashed-bubble",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--noerrdialogs",
      "--disable-gpu",
    ],
  });
  const page = await browser.newPage();
  await page.goto(
    `https://wiki.rossmanngroup.com/wiki/${encodeURIComponent(article)}`,
  );
  const elemRemoveList = [
    ".vector-header-container",
    ".sitenotice",
    ".vector-page-toolbar-container",
    "#vector-page-titlebar-toc",
  ];
  for (let e = 0; e < elemRemoveList.length; e++) {
    await page.$eval(elemRemoveList[e], (element) => element.remove());
  }

  const dim = { w: 800, h: 600 };
  await page.setViewport({
    width: dim.w,
    height: dim.h,
    deviceScaleFactor: 1.5,
  });
  const img = await page.screenshot({
    fullPage: false,
    type: "png",
  });

  //post  hey everybody how's it going hope you're having a lovely day. HEHIGHYHALD
  await agent.login({
    identifier: process.env.BLUESKY_USERNAME,
    password: process.env.BLUESKY_PASSWORD,
  });
  const uploadedBlob = await agent.uploadBlob(img);
  const text = new RichText({
    text: `Hey everybody how's it going hope you're having a lovely day!\n\nToday's article is "${article}".\nhttps://wiki.rossmanngroup.com/wiki/${encodeURIComponent(article)}`,
  });
  await text.detectFacets(agent);

  const postRecord = {
    $type: "app.bsky.feed.post",
    text: text.text,
    facets: text.facets,
    createdAt: new Date().toISOString(),
    embed: {
      $type: "app.bsky.embed.images",
      images: [
        {
          alt: `A screenshot of the article "${article}" from the Consumer Action Taskforce Wiki`,
          image: uploadedBlob.data.blob,
          aspectRatio: { width: dim.w, height: dim.h },
        },
      ],
    },
  };

  await browser.close();
  await agent.post(postRecord);
}

cron.schedule("0 12 * * *", () => {
  main();
});
