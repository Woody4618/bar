import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { LetMeBuy } from "./let_me_buy";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import idl from "./let_me_buy.json";

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

export const LET_ME_BUY_PROGRAM_ID = new PublicKey(
  "BUYuxRfhCMWavaUWxhGtPP3ksKEDZxCD5gzknk3JfAya"
);

const provider = new AnchorProvider(CONNECTION, null as any, {
  commitment: "confirmed",
});

export const LET_ME_BUY_PROGRAM = new Program<LetMeBuy>(idl as any, provider);

export const getReceiptsPDA = (barName: string) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("receipts"), Buffer.from(barName.toLowerCase())],
    LET_ME_BUY_PROGRAM_ID
  )[0];
};

export { TOKEN_PROGRAM_ID };
