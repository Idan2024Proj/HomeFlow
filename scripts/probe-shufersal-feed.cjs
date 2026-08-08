const zlib = require("zlib");
const { promisify } = require("util");
const gunzip = promisify(zlib.gunzip);

function extractDownloadLinks(html) {
  const links = [];
  const re =
    /href="(https:\/\/pricesprodpublic\.blob\.core\.windows\.net[^"]+)"[^>]*>\s*לחץ להורדה/gi;
  let m;
  while ((m = re.exec(html))) links.push(m[1].replace(/&amp;/g, "&"));
  if (!links.length) {
    const re2 = /href="(https:\/\/[^"]+\.gz\?[^"]*)"/gi;
    while ((m = re2.exec(html))) links.push(m[1].replace(/&amp;/g, "&"));
  }
  return [...new Set(links)];
}

async function main() {
  for (const catID of [0, 1, 2, 3, 4, 5]) {
    const url = `https://prices.shufersal.co.il/FileObject/UpdateCategory?catID=${catID}&storeId=0&sort=Time&sortdir=DESC&page=1`;
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await r.text();
    const sampleName = (html.match(/Stores\d+|PriceFull\d+|Price\d+|PromoFull\d+|Promo\d+/i) ||
      [])[0];
    const links = extractDownloadLinks(html);
    console.log(
      "cat",
      catID,
      "sample",
      sampleName,
      "links",
      links.length,
      links[0]?.slice(0, 90),
    );
  }

  const storesHtml = await (
    await fetch(
      "https://prices.shufersal.co.il/FileObject/UpdateCategory?catID=5&storeId=0&sort=Time&sortdir=DESC&page=1",
      { headers: { "User-Agent": "Mozilla/5.0" } },
    )
  ).text();
  const storeCat = /Stores/i.test(storesHtml) ? 5 : 0;
  const storesPageHtml = /Stores/i.test(storesHtml)
    ? storesHtml
    : await (
        await fetch(
          "https://prices.shufersal.co.il/FileObject/UpdateCategory?catID=0&storeId=0&sort=Time&sortdir=DESC&page=1",
          { headers: { "User-Agent": "Mozilla/5.0" } },
        )
      ).text();
  console.log("using stores cat", storeCat, "hasStores", /Stores/i.test(storesPageHtml));

  const storeLinks = extractDownloadLinks(storesPageHtml);
  console.log("STORE LINKS", storeLinks.slice(0, 1).map((u) => u.slice(0, 120)));
  if (!storeLinks[0]) throw new Error("no stores link");

  const gz = Buffer.from(await (await fetch(storeLinks[0])).arrayBuffer());
  const xmlBuf = await gunzip(gz);
  const xml = xmlBuf.toString("utf8");
  console.log("STORES XML bytes", xmlBuf.length);
  console.log("STORES head", xml.slice(0, 400).replace(/\s+/g, " "));
  console.log("has hebrew", /[\u0590-\u05FF]/.test(xml));
  const storeCount =
    (xml.match(/<Store>/gi) || []).length || (xml.match(/<STORE>/gi) || []).length;
  console.log("storeCount", storeCount);

  const priceHtml = await (
    await fetch(
      "https://prices.shufersal.co.il/FileObject/UpdateCategory?catID=2&storeId=0&sort=Time&sortdir=DESC&page=1",
      { headers: { "User-Agent": "Mozilla/5.0" } },
    )
  ).text();
  const priceLinks = extractDownloadLinks(priceHtml);
  console.log(
    "PRICE sample name",
    (priceHtml.match(/PriceFull[^<\s"]+/i) || [])[0],
    "count",
    priceLinks.length,
  );
  if (!priceLinks[0]) throw new Error("no price link");

  const pgz = Buffer.from(await (await fetch(priceLinks[0])).arrayBuffer());
  const pxmlBuf = await gunzip(pgz);
  const pxml = pxmlBuf.toString("utf8");
  console.log("PRICE XML bytes", pxmlBuf.length);
  console.log("PRICE head", pxml.slice(0, 500).replace(/\s+/g, " "));
  console.log("price hebrew", /[\u0590-\u05FF]/.test(pxml));
  const itemCount =
    (pxml.match(/<Item>/gi) || []).length || (pxml.match(/<ITEM>/gi) || []).length;
  console.log("itemCount", itemCount);
  const names = [...pxml.matchAll(/<ItemName>([^<]+)<\/ItemName>/gi)]
    .slice(0, 5)
    .map((m) => m[1]);
  const names2 = names.length
    ? names
    : [...pxml.matchAll(/<ITEMNAME>([^<]+)<\/ITEMNAME>/gi)].slice(0, 5).map((m) => m[1]);
  console.log("sample names", names2);
  const firstItem = pxml.match(/<Item>[\s\S]*?<\/Item>/i);
  console.log("FIRST ITEM\n", firstItem && firstItem[0]);
}

main().catch((e) => {
  console.error("ERR", e);
  process.exit(1);
});
