import { redirect } from 'next/navigation';

/** Learn always opens on a module; there is no useful "all modules" view. */
export default function LearnIndexPage() {
  redirect('/learn/reading');
}
