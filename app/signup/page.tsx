import { redirect } from 'next/navigation';

// /signup is kept as a back-compat path that now redirects to the
// canonical magazine /login page (which has both signup and login modes).
export default function SignupPage() {
  redirect('/login?mode=signup');
}
