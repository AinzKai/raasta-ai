import { createFileRoute, redirect } from "@tanstack/react-router";

/** Service pages are journeys now: keep old links working by sending them straight to the journey. */
export const Route = createFileRoute("/services/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/chat", search: { service: params.slug } });
  },
});
