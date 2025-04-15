import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { SolanaBar } from "./solana_bar";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import idl from "./solana_bar.json";

// Debug logs
console.log("NEXT_PUBLIC_RPC:", process.env.NEXT_PUBLIC_RPC);
console.log("NEXT_PUBLIC_WSS_RPC:", process.env.NEXT_PUBLIC_WSS_RPC);
console.log("NEXT_PUBLIC_PROGRAM_ID:", process.env.NEXT_PUBLIC_PROGRAM_ID);

let CONNECTION: Connection;
try {
  CONNECTION = new Connection(
    process.env.NEXT_PUBLIC_RPC || "http://localhost:8899",
    {
      wsEndpoint: process.env.NEXT_PUBLIC_WSS_RPC || "ws://localhost:8900",
      commitment: "confirmed",
    }
  );
  console.log("Connection established successfully");
} catch (error) {
  console.error("Failed to establish connection:", error);
  throw error;
}

export { CONNECTION };

export const SOLANA_BAR_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ||
    "barqFQ2m1YsNTQwfj3hnEN7svuppTa6V2hKAHPpBiX9"
);

let provider: AnchorProvider;
try {
  provider = new AnchorProvider(CONNECTION, null as any, {
    commitment: "confirmed",
  });
  console.log("Provider created successfully");
} catch (error) {
  console.error("Failed to create provider:", error);
  throw error;
}

let SOLANA_BAR_PROGRAM: Program<SolanaBar>;
try {
  SOLANA_BAR_PROGRAM = new Program<SolanaBar>(idl as any, provider);
  console.log("Program initialized successfully");
} catch (error) {
  console.error("Failed to initialize program:", error);
  throw error;
}

export { SOLANA_BAR_PROGRAM };

export const getReceiptsPDA = (barName: string) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("receipts"), Buffer.from(barName.toLowerCase())],
    SOLANA_BAR_PROGRAM_ID
  )[0];
};

export { TOKEN_PROGRAM_ID };
