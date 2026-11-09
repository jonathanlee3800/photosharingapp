import { redirect } from 'next/navigation';

// The projector is a host screen. Old links go there, which asks anyone not signed in to log in.
export default async function OldProjectorLink({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  redirect(`/host/${encodeURIComponent(eventId)}/projector`);
}
