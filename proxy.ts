// Throwaway preview: no credentials or live data.
import { NextResponse } from "next/server";
export default function proxy() { return NextResponse.next(); }
