import { CataloguePage } from "@/components/site/catalogue-page";
import { CAR_WASH_CATEGORIES } from "@/lib/backend/types";

export const metadata = {
  title: "Car Wash",
  description: "Book a car wash or detailing service from a verified GaadiGrid partner in Noida.",
};

export default function CarWashPage() {
  return (
    <CataloguePage
      title="Car Wash"
      description="Exterior washes and interior detailing from verified local partners — pick a time that works and book in a couple of taps."
      categories={CAR_WASH_CATEGORIES}
      emptyMessage="No car wash partners listed yet in this area — check back soon, or try Vehicle Care."
    />
  );
}
