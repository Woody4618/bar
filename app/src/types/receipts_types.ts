import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export type Receipts = {
  receipts: Array<{
    receiptId: BN;
    buyer: PublicKey;
    wasDelivered: boolean;
    price: BN;
    timestamp: BN;
    tableNumber: number;
    productName: string;
  }>;
  totalPurchases: BN;
  storeName: string;
  authority: PublicKey;
  products: Array<{
    price: BN;
    decimals: number;
    mint: PublicKey;
    name: string;
  }>;
};
