import { createClient } from "@supabase/supabase-js";
import { normalizeProductName } from "./parse-xml";
import type { ImportedPriceItem, ImportedStore } from "./types";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function upsertChain(params: {
  externalId: string;
  name: string;
  provider: string;
}) {
  const sb = admin();
  const { data, error } = await sb
    .from("supermarket_chains")
    .upsert(
      {
        external_id: params.externalId,
        name: params.name,
        provider: params.provider,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "external_id" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function upsertStores(
  chainId: string,
  stores: ImportedStore[],
): Promise<Map<string, string>> {
  const sb = admin();
  const map = new Map<string, string>();
  for (const store of stores) {
    const { data, error } = await sb
      .from("supermarket_stores")
      .upsert(
        {
          chain_id: chainId,
          external_id: store.storeExternalId,
          sub_chain_external_id: store.subChainExternalId ?? null,
          name: store.name,
          address: store.address,
          city: store.city,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "chain_id,external_id" },
      )
      .select("id, external_id")
      .single();
    if (error) throw error;
    map.set(data.external_id as string, data.id as string);
  }
  return map;
}

export async function importPricesForStore(params: {
  chainId: string;
  storeId: string;
  items: ImportedPriceItem[];
  sourceFile: string;
}): Promise<{ imported: number }> {
  const sb = admin();
  if (params.items.length < 50) {
    throw new Error("Refusing import: too few products (possible feed failure)");
  }

  await sb.from("store_import_status").upsert(
    {
      store_id: params.storeId,
      feed_type: "prices",
      status: "running",
      source_file: params.sourceFile,
      row_count: 0,
      error_message: null,
      started_at: new Date().toISOString(),
      finished_at: null,
    },
    { onConflict: "store_id,feed_type" },
  );

  let imported = 0;
  const chunkSize = 200;
  try {
    for (let i = 0; i < params.items.length; i += chunkSize) {
      const chunk = params.items.slice(i, i + chunkSize);
      for (const item of chunk) {
        const { data: product, error: productError } = await sb
          .from("supermarket_products")
          .upsert(
            {
              product_code: item.productCode,
              barcode: item.barcode,
              name: item.name,
              normalized_name: normalizeProductName(item.name),
              manufacturer: item.manufacturer,
              unit_of_measure: item.unitOfMeasure,
              quantity: item.quantity,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "product_code" },
          )
          .select("id")
          .single();
        if (productError) throw productError;

        const { data: existing } = await sb
          .from("latest_store_prices")
          .select("price")
          .eq("store_id", params.storeId)
          .eq("product_id", product.id)
          .maybeSingle();

        const { error: priceError } = await sb.from("latest_store_prices").upsert(
          {
            store_id: params.storeId,
            product_id: product.id,
            price: item.price,
            unit_price: item.unitPrice,
            allow_discount: item.allowDiscount,
            source_updated_at: item.sourceUpdatedAt?.toISOString() ?? null,
            imported_at: new Date().toISOString(),
          },
          { onConflict: "store_id,product_id" },
        );
        if (priceError) throw priceError;

        if (!existing || Number(existing.price) !== item.price) {
          await sb.from("price_history").insert({
            store_id: params.storeId,
            product_id: product.id,
            price: item.price,
            source_updated_at: item.sourceUpdatedAt?.toISOString() ?? null,
          });
        }
        imported += 1;
      }
    }

    await sb.from("store_import_status").upsert(
      {
        store_id: params.storeId,
        feed_type: "prices",
        status: "success",
        source_file: params.sourceFile,
        row_count: imported,
        error_message: null,
        finished_at: new Date().toISOString(),
      },
      { onConflict: "store_id,feed_type" },
    );

    return { imported };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await sb.from("store_import_status").upsert(
      {
        store_id: params.storeId,
        feed_type: "prices",
        status: "failed",
        source_file: params.sourceFile,
        row_count: imported,
        error_message: message,
        finished_at: new Date().toISOString(),
      },
      { onConflict: "store_id,feed_type" },
    );
    throw error;
  }
}
