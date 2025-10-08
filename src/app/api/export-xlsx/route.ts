import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Item = {
  part: string;
  specification?: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  supplier?: string;
  link?: string;
};

type ExportPayload = {
  items?: Item[];
  currency?: "EUR" | "USD" | "GBP";
  prompt?: string;
  subtotal?: number;
};

export async function POST(req: Request) {
  const payload = (await req.json()) as ExportPayload;
  const { items = [], currency = "EUR", prompt = "", subtotal = 0 } = payload ?? {};

  const rows: (string | number)[][] = [
    ["BOM generated from prompt:", prompt],
    [],
    ["Part", "Specification", "Qty", "Unit", `Unit Price (${currency})`, `Line Total (${currency})`, "Supplier", "Link"],
    ...items.map((it: Item) => [
      it.part ?? "",
      it.specification ?? "",
      it.quantity ?? 0,
      it.unit ?? "",
      it.unitPrice ?? "",
      it.unitPrice ? it.unitPrice * (it.quantity ?? 0) : "",
      it.supplier ?? "",
      it.link ?? "",
    ]),
    [],
    ["Subtotal", "", "", "", "", subtotal, "", ""],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "BOM");

  // ArrayBuffer jest akceptowany przez Response w środowisku edge/node
  const arrayBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

  return new Response(arrayBuffer, {
    status: 200,
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": 'attachment; filename="bom.xlsx"',
    },
  });
}
