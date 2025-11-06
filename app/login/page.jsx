"use client";

import { useSearchParams } from "next/navigation";
import CorpLogin from "../(corp)/components/CorpLogin";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const errorParam = searchParams?.get("error") ?? null;
  
  // Convert the error string from URL to an Error object if it exists
  const initialError = errorParam ? new Error(errorParam) : null;

  return <CorpLogin error={initialError} />;
}
