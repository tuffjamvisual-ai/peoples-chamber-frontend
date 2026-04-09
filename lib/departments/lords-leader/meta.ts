import type { DepartmentMeta } from '../types';

const meta: DepartmentMeta = {
  slug: 'lords-leader',
  name: 'Office of the Leader of the House of Lords',
  shortName: 'Lords Leader',
  minister: 'Baroness Smith of Basildon',
  ministerParty: 'labour',
  ministerPhoto: 'https://assets.publishing.service.gov.uk/media/66882fcc899a6f92e5d9cddf/s465_baroness-smith.jpg',
  controlZones: [
    'Lords Business',
    'Lords Reform',
    'Hereditary Peers',
    'Life Peers Appointments',
    'Lords Procedure',
    'Government Bills in Lords',
    'Lords Amendments',
    'Lords Committees',
    'Lords Attendance',
    'Lords Expenses'
  ],
  description: 'Manages government business in the House of Lords. Lords reform and the role of unelected peers in blocking legislation are the defining issues.',
  streetContext: '',
};

export default meta;
