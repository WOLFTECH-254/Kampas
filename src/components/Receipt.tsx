import { useRef } from 'react';
import { toPng } from 'html-to-image';
import { Download, CheckCircle } from 'lucide-react';

interface OrderItem {
  product: { title: string; images: { url: string }[] };
  quantity: number;
  price: number;
}

interface ReceiptProps {
  order: {
    id: string;
    status: string;
    total: number;
    createdAt: string;
    items: OrderItem[];
  };
  buyerName?: string;
}

export default function Receipt({ order, buyerName }: ReceiptProps) {
  const ref = useRef<HTMLDivElement>(null);

  const download = async () => {
    if (!ref.current) return;
    try {
      const dataUrl = await toPng(ref.current, { cacheBust: true, pixelRatio: 2, backgroundColor: '#fff' });
      const link = document.createElement('a');
      link.download = `kampas-receipt-${order.id.slice(-6).toUpperCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) { console.error('Receipt download failed', err); }
  };

  const date = new Date(order.createdAt);
  const formatted = date.toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const time = date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-3">
      <div ref={ref} className="bg-white border border-gray-200 rounded-2xl p-6 max-w-sm mx-auto shadow-sm">
        {/* Header */}
        <div className="text-center mb-5">
          <img src="/kampas-logo.jpg" alt="Kampas" className="w-10 h-10 rounded-xl object-cover mx-auto mb-2" />
          <h2 className="font-black text-lg text-gray-900">Kampas</h2>
          <p className="text-xs text-gray-400">Order Receipt</p>
        </div>

        {/* Status */}
        <div className="flex items-center justify-center gap-2 mb-5 bg-green-50 border border-green-200 rounded-xl py-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-sm font-bold text-green-700">{order.status.replace(/_/g,' ')}</span>
        </div>

        {/* Order meta */}
        <div className="space-y-1 text-xs mb-4">
          <div className="flex justify-between text-gray-500">
            <span>Order ID</span>
            <span className="font-mono font-bold text-gray-900">#{order.id.slice(-6).toUpperCase()}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Date</span>
            <span className="text-gray-700">{formatted}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Time</span>
            <span className="text-gray-700">{time}</span>
          </div>
          {buyerName && (
            <div className="flex justify-between text-gray-500">
              <span>Buyer</span>
              <span className="text-gray-700 font-semibold">{buyerName}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t-2 border-dashed border-gray-200 my-4" />

        {/* Items */}
        <div className="space-y-2 mb-4">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex-1 min-w-0 mr-2">
                <p className="font-semibold text-gray-900 truncate">{item.product.title}</p>
                <p className="text-gray-400">Qty × {item.quantity}</p>
              </div>
              <span className="font-bold text-gray-900 flex-shrink-0">KSH {item.price.toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t-2 border-dashed border-gray-200 my-4" />

        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="font-bold text-gray-900">Total Paid</span>
          <span className="font-black text-xl text-pink-500">KSH {order.total.toLocaleString()}</span>
        </div>

        {/* Footer */}
        <div className="text-center mt-5 pt-4 border-t border-gray-100">
          <p className="text-[10px] text-gray-400">Thank you for shopping on Kampas 🛍️</p>
          <p className="text-[10px] text-gray-400">kampas.co.ke</p>
        </div>
      </div>

      <button
        onClick={download}
        className="w-full max-w-sm mx-auto flex items-center justify-center gap-2 bg-white border border-pink-200 text-gray-700 text-sm font-semibold py-2.5 rounded-xl hover:bg-pink-50 hover:border-pink-400 transition-colors"
      >
        <Download className="w-4 h-4 text-pink-500" />
        Download Receipt
      </button>
    </div>
  );
}
