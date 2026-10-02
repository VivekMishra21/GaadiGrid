import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const partnerEnquirySchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required").max(200),
  contactName: z.string().trim().min(1, "Contact name is required").max(120),
  phone: z.string().trim().min(6, "Enter a valid phone number").max(20),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
  businessType: z.string().trim().min(1, "Select a business type").max(100),
  city: z.string().trim().min(1, "City is required").max(100),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = partnerEnquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { message, ...rest } = parsed.data;
  await prisma.partnerEnquiry.create({ data: { ...rest, message: message || null } });

  return NextResponse.json({ ok: true }, { status: 201 });
}
