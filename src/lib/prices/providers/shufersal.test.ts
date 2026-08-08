import { describe, expect, it } from "vitest";
import { shufersalProvider } from "./shufersal";

describe("shufersalProvider parsers", () => {
  it("parses stores with Hebrew names", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Chain>
  <ChainID>7290027600007</ChainID>
  <ChainName>שופרסל</ChainName>
  <SubChains>
    <SubChain>
      <SubChainID>1</SubChainID>
      <Stores>
        <Store>
          <StoreID>357</StoreID>
          <StoreName>שלי אשדוד</StoreName>
          <Address>הרצל 1</Address>
          <City>אשדוד</City>
        </Store>
      </Stores>
    </SubChain>
  </SubChains>
</Chain>`;
    const stores = shufersalProvider.parseStoresXml(xml);
    expect(stores).toHaveLength(1);
    expect(stores[0]).toMatchObject({
      chainExternalId: "7290027600007",
      storeExternalId: "357",
      name: "שלי אשדוד",
      city: "אשדוד",
    });
  });

  it("parses price items and skips invalid prices", () => {
    const xml = `<Root>
      <ChainID>7290027600007</ChainID>
      <StoreID>357</StoreID>
      <Items>
        <Item>
          <ItemCode>123</ItemCode>
          <ItemName>חלב תנובה 3%</ItemName>
          <ItemPrice>7.11</ItemPrice>
          <ManufactureName>תנובה</ManufactureName>
          <AllowDiscount>1</AllowDiscount>
          <PriceUpdateTime>2026-08-01T10:00:00</PriceUpdateTime>
        </Item>
        <Item>
          <ItemCode>999</ItemCode>
          <ItemName>פסול</ItemName>
          <ItemPrice>0</ItemPrice>
        </Item>
      </Items>
    </Root>`;
    const items = shufersalProvider.parsePricesXml(xml);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      productCode: "123",
      name: "חלב תנובה 3%",
      price: 7.11,
      storeExternalId: "357",
      allowDiscount: true,
    });
  });
});
