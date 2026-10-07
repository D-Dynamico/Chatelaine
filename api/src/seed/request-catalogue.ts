import type { Category } from '../domain/service-request.js';

/** Raw material for the demo requests, written for an internal IT service desk. */

export interface RequestTemplate {
  readonly category: Category;
  readonly title: string;
}

/** Everyday requests, visible to the employee who raised them. */
export const GENERAL_TEMPLATES: readonly RequestTemplate[] = [
  { category: 'HARDWARE', title: 'Laptop battery swells after charging' },
  { category: 'HARDWARE', title: 'Second monitor flickers when docked' },
  { category: 'HARDWARE', title: 'Keyboard missing the letter E key' },
  { category: 'HARDWARE', title: 'Headset microphone cuts out on calls' },
  { category: 'HARDWARE', title: 'Replacement charger for travel laptop' },
  { category: 'SOFTWARE', title: 'Spreadsheet add-in crashes on open' },
  { category: 'SOFTWARE', title: 'Install the design review tool' },
  { category: 'SOFTWARE', title: 'Calendar invites arrive an hour late' },
  { category: 'SOFTWARE', title: 'PDF exports lose their page numbers' },
  { category: 'SOFTWARE', title: 'Browser blocks the expenses portal' },
  { category: 'ACCESS', title: 'Shared drive access for the audit folder' },
  { category: 'ACCESS', title: 'Reset multi-factor device after phone change' },
  { category: 'ACCESS', title: 'Add me to the quarterly planning group' },
  { category: 'ACCESS', title: 'Read access to the vendor contracts site' },
  { category: 'NETWORK', title: 'VPN drops every few minutes from home' },
  { category: 'NETWORK', title: 'Meeting room screen will not cast' },
  { category: 'NETWORK', title: 'Guest wifi code for visiting auditors' },
  { category: 'NETWORK', title: 'Slow uploads to the file share' },
  { category: 'FACILITIES', title: 'Desk power socket is loose' },
  { category: 'FACILITIES', title: 'Badge does not open the third floor' },
  { category: 'FACILITIES', title: 'Printer on floor two jams on duplex' },
  { category: 'FACILITIES', title: 'Book the training room projector' },
  { category: 'FACILITIES', title: 'Locker key replacement' },
  { category: 'SOFTWARE', title: 'Email signature template is out of date' },
];

/** Requests IT handles privately, which is why their access level is Admin. */
export const ADMIN_TEMPLATES: readonly RequestTemplate[] = [
  { category: 'ACCESS', title: 'Suspicious sign-in alert on finance mailbox' },
  { category: 'ACCESS', title: 'Quarterly access review for payroll system' },
  { category: 'ACCESS', title: 'Revoke contractor accounts after project end' },
  { category: 'ACCESS', title: 'Elevated rights request for database console' },
  { category: 'NETWORK', title: 'Firewall rule change for the vendor link' },
  { category: 'NETWORK', title: 'Unusual outbound traffic from a desktop' },
  { category: 'HARDWARE', title: 'Lost laptop reported, remote wipe pending' },
  { category: 'SOFTWARE', title: 'Licence audit finding on design software' },
  { category: 'FACILITIES', title: 'Server room door left propped open' },
  { category: 'SOFTWARE', title: 'Phishing email reported by several staff' },
];

export const ASSIGNEES: readonly string[] = [
  'Meera Nair',
  'Vikram Menon',
  'Deepa Iyer',
  'Network team',
  'Facilities desk',
];

export const ADMIN_NOTES: readonly string[] = [
  'Security incident; details stay with the IT team.',
  'Waiting on sign-off from the data protection lead.',
  'Linked to an ongoing audit; do not share with the requester.',
  'Escalated to the vendor under the support contract.',
];

export const GENERAL_NOTES: readonly string[] = [
  'Asked the requester for a photo of the fault.',
  'Part ordered; delivery expected this week.',
  'Workaround shared; permanent fix pending.',
  'Duplicate of an earlier request; kept open for tracking.',
];
