import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { SolanaBar } from "./solana_bar";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import idl from "./solana_bar.json";


export const CONNECTION = new Connection(
  process.env.NEXT_PUBLIC_RPC
    ? process.env.NEXT_PUBLIC_RPC
    : "http://localhost:8899",
  {
    wsEndpoint: process.env.NEXT_PUBLIC_WSS_RPC
      ? process.env.NEXT_PUBLIC_WSS_RPC
      : "ws://localhost:8900",
    commitment: "confirmed",
  }
);

export const SOLANA_BAR_PROGRAM_ID = new PublicKey(
  "barqFQ2m1YsNTQwfj3hnEN7svuppTa6V2hKAHPpBiX9"
);

const provider = new AnchorProvider(CONNECTION, null as any, {
  commitment: "confirmed",
});

export const SOLANA_BAR_PROGRAM = new Program<SolanaBar>(idl as any, provider);

export const getReceiptsPDA = (barName: string) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("receipts"), Buffer.from(barName.toLowerCase())],
    SOLANA_BAR_PROGRAM_ID
  )[0];
};

export { TOKEN_PROGRAM_ID };
