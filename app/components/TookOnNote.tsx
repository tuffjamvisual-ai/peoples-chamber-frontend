import { departmentById, type QuestionDepartment } from '@/lib/question-departments';

const link = { display: 'inline-block', padding: '10px 0', color: '#14100d', textDecoration: 'underline' };

// A department that took on another's functions (owner, 6 Nov 2026): the Cabinet Office, from Science, Innovation and Technology.
// The statement that moved them is in the page's Sources fold (tookOnSource), not in this line (Cowork ENTRY 369 #15).
export default function TookOnNote({ department }: { department: QuestionDepartment | undefined }) {
  const note = department?.tookOn;
  const from = departmentById(note?.from);
  if (!note || !from) return null;
  return (
    <p style={{ margin: '0 0 12px', fontSize: '15px', lineHeight: 1.6, color: '#14100d' }}>
      Took on {note.what} from <a href={`/questions/department/${from.slug}`} style={link}>{note.fromLabel}</a>.
    </p>
  );
}

// The statement, for the page's Sources fold.
export const tookOnSource = (department: QuestionDepartment | undefined) =>
  department?.tookOn ? { label: department.tookOn.source.label, href: department.tookOn.source.url } : null;
