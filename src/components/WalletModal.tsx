
import { X } from 'lucide-react';
import WalletTopup from './WalletTopup';

interface Props {
  open:     boolean;
  onClose:  () => void;
  onSuccess?: (balance: number) => void;
}

export default function WalletModal({ open, onClose, onSuccess }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-pink-100">
          <div>
            <h2 className="font-bold text-lg">Top Up Wallet</h2>
            <p className="text-xs text-gray-400 mt-0.5">Pay via M-Pesa STK Push</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          <WalletTopup onSuccess={(bal) => { onSuccess?.(bal); setTimeout(onClose, 2000); }} />
        </div>
      </div>
    </div>
  );
}
