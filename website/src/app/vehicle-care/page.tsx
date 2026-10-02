import { CataloguePage } from "@/components/site/catalogue-page";
import { VehicleCareInspection } from "@/components/site/vehicle-care-inspection";
import { VEHICLE_CARE_CATEGORIES } from "@/lib/backend/types";

export const metadata = {
  title: "Vehicle Care",
  description: "Browse AC service, denting-painting, tyre and battery services from verified GaadiGrid partners.",
};

export default function VehicleCarePage() {
  return (
    <CataloguePage
      title="Vehicle Care"
      description="AC servicing, denting-painting, tyres, batteries and general service — everything that keeps your vehicle ready for the road."
      categories={VEHICLE_CARE_CATEGORIES}
      emptyMessage="No vehicle care partners listed yet in this area — check back soon."
      hero={{
        src: "/images/vehicle-care-hero.png",
        alt: "A GaadiGrid technician inspecting an engine bay with a diagnostic tablet",
        eyebrow: "Vehicle Care",
        heading: "Expert care for every drive",
        description:
          "AC servicing, denting-painting, tyres, batteries and general service — booked directly with verified local technicians.",
        buttonLabel: "Explore Vehicle Care",
      }}
    >
      <VehicleCareInspection />
    </CataloguePage>
  );
}
