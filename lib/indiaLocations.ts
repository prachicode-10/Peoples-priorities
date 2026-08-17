import { getIndiaPincode } from "india-pincode/browser";

export type VerifiedLocation = {
  pincode: string;
  state: string;
  district: string;
  area: string;
  areas: string[];
};

let pincodeDatabase:
  | Awaited<ReturnType<typeof getIndiaPincode>>
  | null = null;

let databasePromise:
  | Promise<Awaited<ReturnType<typeof getIndiaPincode>>>
  | null = null;

async function getDatabase() {
  if (pincodeDatabase) {
    return pincodeDatabase;
  }

  if (!databasePromise) {
    databasePromise = getIndiaPincode();
  }

  pincodeDatabase = await databasePromise;

  return pincodeDatabase;
}

export async function lookupIndiaPincode(
  pincode: string
): Promise<VerifiedLocation | null> {
  const cleaned = pincode
    .replace(/\D/g, "")
    .slice(0, 6);

  if (!/^[1-9][0-9]{5}$/.test(cleaned)) {
    return null;
  }

  try {
    const database = await getDatabase();

    const result = database.getByPincode(cleaned);

    if (!result.success) {
      return null;
    }

    const records = result.data?.data || [];

    if (records.length === 0) {
      return null;
    }

    const first = records[0];

    /*
     * Collect every area/post office returned
     * for this PIN code.
     */
    const areas = Array.from(
      new Set(
        records
          .map((record) => record.area || "")
          .map((area) => area.trim())
          .filter(Boolean)
      )
    );

    return {
      pincode: cleaned,
      state: first.state || "",
      district: first.district || "",
      area: first.area || "",
      areas,
    };
  } catch (error) {
    console.error(
      "PIN lookup failed:",
      error
    );

    return null;
  }
}