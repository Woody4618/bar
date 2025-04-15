"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { encodeURL, createQR } from "@solana/pay";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";

interface TransactionRequestQRProps {
  instruction: string;
  barName: string;
  productName?: string;
  productMint?: string;
  productPrice?: number;
  productDecimals?: number;
  productQuantity?: number;
  tableNumber?: number;
}

export default function TransactionRequestQR({
  instruction,
  barName,
  productName = "",
  productMint = "",
  productPrice = 0,
  productDecimals = 6,
  productQuantity = 0,
  tableNumber = 1,
}: TransactionRequestQRProps) {
  const [isClient, setIsClient] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const { publicKey } = useWallet();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const generateUrl = useCallback(() => {
    if (!publicKey) return null;

    const params = new URLSearchParams();
    params.append("instruction", instruction);
    params.append("barName", barName);
    if (productName) params.append("productName", productName);
    if (productMint) params.append("productMint", productMint);
    if (productPrice) {
      params.append("productPrice", productPrice.toString());
      params.append("productDecimals", productDecimals.toString());
    }
    if (productQuantity)
      params.append("productQuantity", productQuantity.toString());
    if (tableNumber) params.append("tableNumber", tableNumber.toString());

    return `${window.location.origin}/api/transaction?${params.toString()}`;
  }, [
    publicKey,
    instruction,
    barName,
    productName,
    productMint,
    productPrice,
    productDecimals,
    productQuantity,
    tableNumber,
  ]);

  const url = useMemo(() => generateUrl(), [generateUrl]);

  useEffect(() => {
    if (!isClient || !qrRef.current || !url) return;

    const solanaUrl = encodeURL({ link: new URL(url) });
    const qr = createQR(solanaUrl, 360, "transparent");

    const currentRef = qrRef.current;
    currentRef.innerHTML = "";
    qr.append(currentRef);

    return () => {
      if (currentRef) {
        currentRef.innerHTML = "";
      }
    };
  }, [isClient, url]);

  if (!publicKey) return null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={qrRef}
        className="w-[360px] h-[360px] flex items-center justify-center bg-white rounded-2xl"
      >
        {!isClient && (
          <div className="animate-pulse flex items-center justify-center w-full h-full">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
}
