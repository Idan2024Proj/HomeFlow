import { createAdminClient } from "@/lib/supabase/admin";
import { isSuspiciousPriceCount, normalizeProductName } from "@/lib/prices/normalize";
import {
  SHUFERSAL_CHAIN_EXTERNAL_ID,
  shufersalProvider,
} from "@/lib/prices/providers/shufersal";
import type { ImportedPriceItem, ImportedStore } from "@/lib/prices/types";

function requireAdmin() {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for price imports");
  }
  return admin;
}

export async function importShufersalStores(): Promise<{
  ok: boolean;
  count: number;
  message: string;
}> {
  const admin = requireAdmin();
  const files = await shufersalProvider.listFiles("stores");
  const newest = files[0];
  if (!newest) {
    return { ok: false, count: 0, message: "לא נמצא קובץ Stores של שופרסל" };
  }

  const xml = await shufersalProvider.downloadAndDecompress(newest.downloadUrl);
  const stores = shufersalProvider.parseStoresXml(xml);
  if (stores.length < 10) {
    return {
      ok: false,
      count: stores.length,
      message: `ייבוא חנויות חשוד (${stores.length} סניפים) — לא נשמר`,
    };
  }

  const { data: chain, error: chainError } = await admin
    .from("supermarket_chains")
    .upsert(
      {
        external_id: SHUFERSAL_CHAIN_EXTERNAL_ID,
        name: "שופרסל",
        provider: "shufersal",
      },
      { onConflict: "external_id" },
    )
    .select("id")
    .single();
  if (chainError || !chain) {
    return { ok: false, count: 0, message: chainError?.message ?? "chain upsert failed" };
  }

  const rows = stores.map((s: ImportedStore) => ({
    chain_id: chain.id,
    external_id: s.storeExternalId,
    sub_chain_external_id: s.subChainExternalId ?? null,
    name: s.name,
    address: s.address,
    city: s.city,
  }));

  // Upsert in chunks
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error } = await admin.from("supermarket_stores").upsert(chunk, {
      onConflict: "chain_id,external_id",
    });
    if (error) {
      return { ok: false, count: i, message: error.message };
    }
  }

  return {
    ok: true,
    count: rows.length,
    message: `יובאו/עודכנו ${rows.length} סניפי שופרסל מ־${newest.fileName}`,
  };
}

export async function importShufersalStorePrices(options: {
  storeExternalId: string;
}): Promise<{
  ok: boolean;
  count: number;
  message: string;
  sample?: Array<{ name: string; price: number }>;
}> {
  const admin = requireAdmin();
  const storeExternalId = String(Number(options.storeExternalId));

  const { data: chain, error: chainLookupError } = await admin
    .from("supermarket_chains")
    .select("id")
    .eq("external_id", SHUFERSAL_CHAIN_EXTERNAL_ID)
    .maybeSingle();
  if (chainLookupError) {
    return {
      ok: false,
      count: 0,
      message: `שגיאה בקריאת supermarket_chains: ${chainLookupError.message}`,
    };
  }
  if (!chain) {
    return {
      ok: false,
      count: 0,
      message: "ראשית הריצו ייבוא Stores (supermarket_chains חסר)",
    };
  }

  const { data: store, error: storeLookupError } = await admin
    .from("supermarket_stores")
    .select("id, name, city")
    .eq("chain_id", chain.id)
    .eq("external_id", storeExternalId)
    .maybeSingle();
  if (storeLookupError) {
    return {
      ok: false,
      count: 0,
      message: `שגיאה בקריאת supermarket_stores: ${storeLookupError.message}`,
    };
  }
  if (!store) {
    return {
      ok: false,
      count: 0,
      message: `סניף ${storeExternalId} לא נמצא — הריצו ייבוא Stores`,
    };
  }

  await admin.from("store_import_status").upsert({
    store_id: store.id,
    last_attempt_at: new Date().toISOString(),
    last_status: "failed",
  });

  const files = await shufersalProvider.listFiles("priceFull", {
    storeExternalId,
  });
  const newest = files[0];
  if (!newest) {
    await admin
      .from("store_import_status")
      .update({
        last_status: "failed",
        last_error: "no PriceFull file",
        last_attempt_at: new Date().toISOString(),
      })
      .eq("store_id", store.id);
    return { ok: false, count: 0, message: `לא נמצא PriceFull לסניף ${storeExternalId}` };
  }

  const xml = await shufersalProvider.downloadAndDecompress(newest.downloadUrl);
  const items = shufersalProvider.parsePricesXml(xml);

  const { data: prevStatus } = await admin
    .from("store_import_status")
    .select("last_item_count")
    .eq("store_id", store.id)
    .maybeSingle();

  if (isSuspiciousPriceCount(items.length, prevStatus?.last_item_count ?? null)) {
    await admin
      .from("store_import_status")
      .update({
        last_status: "suspicious",
        last_error: `suspicious count ${items.length}`,
        last_item_count: items.length,
        last_source_file: newest.fileName,
        last_attempt_at: new Date().toISOString(),
      })
      .eq("store_id", store.id);
    return {
      ok: false,
      count: items.length,
      message: `ייבוא חשוד (${items.length} מוצרים) — המחירים הקודמים נשמרו`,
    };
  }

  // Upsert products then prices in chunks
  const productIdByCode = new Map<string, string>();
  for (let i = 0; i < items.length; i += 150) {
    const chunk = items.slice(i, i + 150);
    const productRows = chunk.map((item: ImportedPriceItem) => ({
      chain_id: chain.id,
      product_code: item.productCode,
      barcode: item.barcode,
      name: item.name,
      manufacturer: item.manufacturer,
      manufacturer_item_description: item.manufacturerItemDescription,
      unit_of_measure: item.unitOfMeasure,
      quantity: item.quantity,
      normalized_name: normalizeProductName(item.name),
    }));
    const { data: upserted, error } = await admin
      .from("supermarket_products")
      .upsert(productRows, { onConflict: "chain_id,product_code" })
      .select("id, product_code");
    if (error) {
      await admin
        .from("store_import_status")
        .update({
          last_status: "failed",
          last_error: error.message,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("store_id", store.id);
      return { ok: false, count: i, message: error.message };
    }
    for (const row of upserted ?? []) {
      productIdByCode.set(row.product_code as string, row.id as string);
    }
  }

  const importedAt = new Date().toISOString();
  for (let i = 0; i < items.length; i += 150) {
    const chunk = items.slice(i, i + 150);
    const priceRows = [];
    const historyRows = [];
    for (const item of chunk) {
      const productId = productIdByCode.get(item.productCode);
      if (!productId) continue;
      priceRows.push({
        store_id: store.id,
        product_id: productId,
        price: item.price,
        unit_price: item.unitPrice,
        allow_discount: item.allowDiscount,
        source_updated_at: item.sourceUpdatedAt?.toISOString() ?? null,
        imported_at: importedAt,
      });
      historyRows.push({
        store_id: store.id,
        product_id: productId,
        price: item.price,
        unit_price: item.unitPrice,
        source_updated_at: item.sourceUpdatedAt?.toISOString() ?? null,
        imported_at: importedAt,
      });
    }

    const { error: priceError } = await admin
      .from("latest_store_prices")
      .upsert(priceRows, { onConflict: "store_id,product_id" });
    if (priceError) {
      await admin
        .from("store_import_status")
        .update({
          last_status: "failed",
          last_error: priceError.message,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("store_id", store.id);
      return { ok: false, count: i, message: priceError.message };
    }

    const { error: historyError } = await admin.from("price_history").insert(historyRows);
    if (historyError) {
      // History failure should not wipe latest — report soft fail after success path
      console.error("price_history insert failed", historyError.message);
    }
  }

  await admin.from("store_import_status").upsert({
    store_id: store.id,
    last_success_at: importedAt,
    last_attempt_at: importedAt,
    last_status: "success",
    last_error: null,
    last_item_count: items.length,
    last_source_file: newest.fileName,
  });

  return {
    ok: true,
    count: items.length,
    message: `יובאו ${items.length} מחירים לסניף ${store.name || storeExternalId} (${newest.fileName})`,
    sample: items.slice(0, 5).map((i) => ({ name: i.name, price: i.price })),
  };
}
