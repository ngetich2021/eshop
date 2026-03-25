// app/sale/sold/_components/ReceiptModal.tsx
"use client";

import { useRef } from "react";
import { X, Printer } from "lucide-react";

type SaleItem = {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  discount: number;
};

type Sale = {
  id: string;
  soldByName: string;
  items: SaleItem[];
  totalAmount: number;
  paymentMethod: string;
  shop: string;
  shopLocation: string;
  shopTel: string;
  date: string;
  createdAt: string;
};

type Props = {
  sale: Sale;
  onClose: () => void;
};

export default function ReceiptModal({ sale, onClose }: Props) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = receiptRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Receipt - ${sale.shop}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', monospace; font-size: 12px; padding: 16px; max-width: 300px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .shop-name { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 4px; }
            .total-row { font-size: 14px; font-weight: bold; }
            .footer { text-align: center; margin-top: 12px; font-size: 11px; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const receiptNo = sale.id.slice(-6).toUpperCase();

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-gray-800">Receipt Preview</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-green-700"
            >
              <Printer size={15} /> Print
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* RECEIPT CONTENT */}
        <div className="p-5 overflow-y-auto max-h-[70vh]">
          <div
            ref={receiptRef}
            className="font-mono text-xs border border-dashed border-gray-300 rounded-xl p-5 bg-white"
          >
            {/* SHOP HEADER */}
            <div className="shop-name text-center text-base font-bold mb-1">{sale.shop}</div>
            <div className="center text-center text-gray-600 text-xs">
              {sale.shopLocation && <div>{sale.shopLocation}</div>}
              {sale.shopTel && <div>Tel: {sale.shopTel}</div>}
            </div>

            <div className="divider border-t border-dashed border-gray-400 my-3" />

            <div className="bold text-center font-bold text-sm mb-2">RECEIPT</div>

            {/* META */}
            <div className="flex justify-between text-xs mb-1">
              <span>NO:</span><span className="font-bold">{receiptNo}</span>
            </div>
            <div className="flex justify-between text-xs mb-1">
              <span>Date:</span><span>{sale.date}</span>
            </div>
            <div className="flex justify-between text-xs mb-1">
              <span>Mode:</span><span className="capitalize">{sale.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-xs mb-1">
              <span>ServedBy:</span><span>{sale.soldByName}</span>
            </div>

            <div className="divider border-t border-dashed border-gray-400 my-3" />

            {/* ITEMS HEADER */}
            <div className="flex justify-between font-bold text-xs mb-1">
              <span className="flex-1">Item</span>
              <span className="w-10 text-center">Qty</span>
              <span className="w-20 text-right">Cost</span>
            </div>
            <div className="border-t border-dashed border-gray-300 mb-2" />

            {/* ITEMS */}
            {sale.items.map((item, i) => (
              <div key={item.id} className="flex justify-between text-xs mb-1">
                <span className="flex-1 truncate pr-1">{i + 1}. {item.productName}</span>
                <span className="w-10 text-center">{item.quantity}</span>
                <span className="w-20 text-right">
                  KSh {((item.price - item.discount) * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}

            <div className="border-t border-dashed border-gray-300 my-2" />

            {/* TOTAL */}
            <div className="flex justify-between font-bold text-sm">
              <span>Amount:</span>
              <span>KSh {sale.totalAmount.toLocaleString()}</span>
            </div>

            <div className="border-t border-dashed border-gray-300 my-3" />

            {/* FOOTER */}
            <div className="text-center text-xs text-gray-500">
              Thank you for shopping with us!<br />
              Come again 🙏
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}