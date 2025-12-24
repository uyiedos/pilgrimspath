
import React, { useState } from 'react';
import Button from './Button';

interface TicketPurchaseModalProps {
  title: string;
  pricePerTicket: number;
  userBalance: number;
  onConfirm: (quantity: number) => void;
  onClose: () => void;
  isProcessing?: boolean;
}

const TicketPurchaseModal: React.FC<TicketPurchaseModalProps> = ({ 
  title, 
  pricePerTicket, 
  userBalance, 
  onConfirm, 
  onClose,
  isProcessing = false
}) => {
  const [quantity, setQuantity] = useState(1);
  const totalCost = quantity * pricePerTicket;
  const canAfford = userBalance >= totalCost;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-gray-900 border-4 border-yellow-500 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>
        
        <h3 className="text-xl font-retro text-yellow-500 uppercase text-center mb-1">Acquire Tickets</h3>
        <p className="text-xs text-gray-400 text-center font-mono mb-6">{title}</p>

        <div className="space-y-6">
            <div className="bg-black/40 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 bg-gray-800 rounded-xl text-white font-bold hover:bg-gray-700"
                >-</button>
                <div className="text-center">
                    <span className="text-3xl font-mono font-bold text-white">{quantity}</span>
                    <span className="text-[10px] text-gray-500 block uppercase">Tickets</span>
                </div>
                <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 bg-gray-800 rounded-xl text-white font-bold hover:bg-gray-700"
                >+</button>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                    <span>Price per ticket:</span>
                    <span>{pricePerTicket} XP</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-white border-t border-white/10 pt-2">
                    <span>Total Cost:</span>
                    <span className={canAfford ? 'text-green-400' : 'text-red-500'}>{totalCost.toLocaleString()} XP</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                    <span>Your Balance:</span>
                    <span>{userBalance.toLocaleString()} XP</span>
                </div>
            </div>

            <Button 
                onClick={() => onConfirm(quantity)}
                disabled={!canAfford || isProcessing}
                className={`w-full py-4 rounded-xl text-sm ${canAfford ? 'bg-green-600 hover:bg-green-500 border-green-400' : 'bg-gray-700 border-gray-600 opacity-50 cursor-not-allowed'}`}
            >
                {isProcessing ? 'Processing...' : canAfford ? 'CONFIRM PURCHASE' : 'INSUFFICIENT XP'}
            </Button>
        </div>
      </div>
    </div>
  );
};

export default TicketPurchaseModal;
